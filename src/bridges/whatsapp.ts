// src/bridges/whatsapp.ts
// WhatsApp Business Cloud API bridge
//
// Prerequisites:
//   1. Meta Business account → https://business.facebook.com
//   2. WhatsApp Business API app → https://developers.facebook.com
//   3. Permanent access token (System User token recommended for production)
//   4. Phone number ID from your WhatsApp Business API setup
//   5. Webhook verified with your verify token
//
// Environment variables:
//   WHATSAPP_ACCESS_TOKEN   — Meta Graph API access token
//   WHATSAPP_PHONE_ID       — Your WhatsApp phone number ID
//   WHATSAPP_VERIFY_TOKEN   — Webhook verification token (you choose this)
//   WHATSAPP_PORT            — Port for webhook server (default: 3000)

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import type { Bridge, BridgeMessage } from "./types.js";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface WhatsAppBridgeConfig {
    /** Meta Graph API access token */
    accessToken: string;
    /** WhatsApp Business phone number ID */
    phoneNumberId: string;
    /** Webhook verification token (you define this, Meta verifies it) */
    verifyToken: string;
    /** Port for the webhook HTTP server (default: 3000) */
    port?: number;
    /** Function to generate agent responses */
    generateFn: (text: string, threadId: string, userId: string) => Promise<string>;
}

export class WhatsAppBridge implements Bridge {
    platform = "whatsapp";
    private handler?: (msg: BridgeMessage) => Promise<string>;
    private server?: ReturnType<typeof createServer>;
    private config: Required<Omit<WhatsAppBridgeConfig, "generateFn">> & {
        generateFn: WhatsAppBridgeConfig["generateFn"];
    };

    constructor(config: WhatsAppBridgeConfig) {
        this.config = {
            ...config,
            port: config.port ?? 3000,
        };
    }

    async start() {
        this.server = createServer(async (req, res) => {
            try {
                if (req.method === "GET") {
                    this.handleVerification(req, res);
                } else if (req.method === "POST") {
                    await this.handleWebhook(req, res);
                } else {
                    res.writeHead(405);
                    res.end();
                }
            } catch (error: any) {
                console.error("[WhatsApp Bridge] Server error:", error.message);
                res.writeHead(500);
                res.end("Internal Server Error");
            }
        });

        this.server.listen(this.config.port, () => {
            console.log(`📱 WhatsApp bridge listening on port ${this.config.port}`);
            console.log(`   Webhook URL: https://your-domain.com/webhook`);
            console.log(`   Point Meta's webhook config to this URL`);
        });
    }

    async stop() {
        return new Promise<void>((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log("🛑 WhatsApp bridge stopped");
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    onMessage(handler: (msg: BridgeMessage) => Promise<string>) {
        this.handler = handler;
    }

    // ─── Webhook Verification (GET) ────────────────────────────

    private handleVerification(req: IncomingMessage, res: ServerResponse) {
        const url = new URL(req.url || "/", `http://localhost:${this.config.port}`);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === this.config.verifyToken) {
            console.log("[WhatsApp] Webhook verified ✓");
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(challenge);
        } else {
            console.warn("[WhatsApp] Webhook verification failed — token mismatch");
            res.writeHead(403);
            res.end("Forbidden");
        }
    }

    // ─── Incoming Message (POST) ───────────────────────────────

    private async handleWebhook(req: IncomingMessage, res: ServerResponse) {
        const body = await readBody(req);

        // Acknowledge immediately — WhatsApp requires a 200 within 20s
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));

        // Parse the webhook payload
        let payload: any;
        try {
            payload = JSON.parse(body);
        } catch {
            console.warn("[WhatsApp] Invalid JSON in webhook body");
            return;
        }

        // Extract messages from the webhook event
        const entries = payload?.entry ?? [];
        for (const entry of entries) {
            const changes = entry?.changes ?? [];
            for (const change of changes) {
                const value = change?.value;
                if (value?.messaging_product !== "whatsapp") continue;

                const messages = value?.messages ?? [];
                for (const msg of messages) {
                    // Only handle text messages for now
                    if (msg.type !== "text") {
                        await this.sendMessage(
                            msg.from,
                            "I can only process text messages at the moment. Please type your question.",
                        );
                        continue;
                    }

                    const userText = msg.text?.body;
                    if (!userText) continue;

                    const userId = `whatsapp-${msg.from}`;
                    const threadId = `whatsapp-${msg.from}`;

                    console.log(`[WhatsApp] ${msg.from}: ${userText}`);

                    try {
                        const response = await this.config.generateFn(userText, threadId, userId);
                        await this.sendMessage(msg.from, response);
                    } catch (error: any) {
                        // Processor aborts come through as errors
                        await this.sendMessage(msg.from, error.message || "I encountered an issue.");
                    }
                }
            }
        }
    }

    // ─── Send Message via Cloud API ────────────────────────────

    private async sendMessage(to: string, text: string) {
        // WhatsApp has a ~4096 char limit per message
        const chunks = splitMessage(text, 4000);

        for (const chunk of chunks) {
            try {
                const response = await fetch(
                    `${GRAPH_API_BASE}/${this.config.phoneNumberId}/messages`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${this.config.accessToken}`,
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to,
                            type: "text",
                            text: { body: chunk },
                        }),
                    },
                );

                if (!response.ok) {
                    const error = await response.text();
                    console.error(`[WhatsApp] Send failed (${response.status}): ${error}`);
                }
            } catch (error: any) {
                console.error(`[WhatsApp] Send error: ${error.message}`);
            }
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString()));
        req.on("error", reject);
    });
}

function splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        let splitIdx = remaining.lastIndexOf("\n", maxLength);
        if (splitIdx === -1 || splitIdx < maxLength * 0.5) {
            splitIdx = remaining.lastIndexOf(" ", maxLength);
        }
        if (splitIdx === -1) {
            splitIdx = maxLength;
        }

        chunks.push(remaining.substring(0, splitIdx));
        remaining = remaining.substring(splitIdx).trimStart();
    }

    return chunks;
}
