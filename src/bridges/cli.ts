// src/bridges/cli.ts
// Terminal bridge for dev/testing — interact with an agent via stdin/stdout

import { createInterface } from "readline";
import type { Bridge, BridgeMessage } from "./types.js";

export class CliBridge implements Bridge {
    platform = "cli";
    private handler?: (msg: BridgeMessage) => Promise<string>;
    private rl?: ReturnType<typeof createInterface>;
    private running = false;

    constructor(
        private agentName: string = "OpenMandate"
    ) { }

    async start() {
        this.running = true;

        this.rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log(`\n🤖 ${this.agentName} — Terminal Bridge`);
        console.log("━".repeat(50));
        console.log("Type your message and press Enter.");
        console.log('Type "exit" or "quit" to stop.\n');

        const prompt = () => {
            if (!this.running) return;

            this.rl!.question("You: ", async (input) => {
                const trimmed = input.trim();
                if (!trimmed) {
                    prompt();
                    return;
                }

                if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
                    await this.stop();
                    return;
                }

                if (this.handler) {
                    const msg: BridgeMessage = {
                        platform: "cli",
                        userId: "cli-user",
                        threadId: "cli-session",
                        text: trimmed,
                        timestamp: new Date().toISOString(),
                    };

                    try {
                        console.log();
                        const response = await this.handler(msg);
                        console.log(`\n${this.agentName}: ${response}\n`);
                    } catch (error: any) {
                        // Processor aborts come through as errors — their message IS the response
                        console.log(`\n${this.agentName}: ${error.message}\n`);
                    }
                }

                prompt();
            });
        };

        prompt();
    }

    async stop() {
        this.running = false;
        if (this.rl) {
            this.rl.close();
        }
        console.log("\n👋 Session ended.\n");
    }

    onMessage(handler: (msg: BridgeMessage) => Promise<string>) {
        this.handler = handler;
    }
}
