// src/bridges/telegram.ts
// Telegram messaging bridge

import TelegramBot from "node-telegram-bot-api";
import type { Bridge, BridgeMessage } from "./types.js";

export class TelegramBridge implements Bridge {
    platform = "telegram";
    private bot: TelegramBot;
    private handler?: (msg: BridgeMessage) => Promise<string>;

    constructor(
        private token: string,
        private generateFn: (text: string, threadId: string, userId: string) => Promise<string>
    ) {
        this.bot = new TelegramBot(token, { polling: true });
    }

    async start() {
        this.bot.on("message", async (msg) => {
            if (!msg.text) return;

            const threadId = `telegram-${msg.chat.id}`;
            const userId = `telegram-user-${msg.from?.id}`;

            try {
                const response = await this.generateFn(msg.text, threadId, userId);

                // Telegram has a 4096 char limit — split if needed
                if (response.length <= 4096) {
                    await this.bot.sendMessage(msg.chat.id, response, {
                        parse_mode: "Markdown",
                    });
                } else {
                    const chunks = splitMessage(response, 4096);
                    for (const chunk of chunks) {
                        await this.bot.sendMessage(msg.chat.id, chunk, {
                            parse_mode: "Markdown",
                        });
                    }
                }
            } catch (error: any) {
                // If a processor aborted, the error message IS the response
                await this.bot.sendMessage(
                    msg.chat.id,
                    error.message || "I encountered an issue processing your request.",
                );
            }
        });

        console.log("🤖 Telegram bridge started");
    }

    async stop() {
        this.bot.stopPolling();
        console.log("🛑 Telegram bridge stopped");
    }

    onMessage(handler: (msg: BridgeMessage) => Promise<string>) {
        this.handler = handler;
    }
}

function splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        // Try to split at a newline near the limit
        let splitIdx = remaining.lastIndexOf("\n", maxLength);
        if (splitIdx === -1 || splitIdx < maxLength * 0.5) {
            // Fall back to splitting at a space
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
