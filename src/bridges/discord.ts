// src/bridges/discord.ts
// Discord messaging bridge

import { Client, Events, GatewayIntentBits } from "discord.js";
import type { Bridge, BridgeMessage } from "./types.js";

export class DiscordBridge implements Bridge {
    platform = "discord";
    private client: Client;
    private handler?: (msg: BridgeMessage) => Promise<string>;

    constructor(
        private token: string,
        private generateFn: (text: string, threadId: string, userId: string) => Promise<string>
    ) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
        });
    }

    async start() {
        this.client.on(Events.MessageCreate, async (message) => {
            // Ignore bot messages
            if (message.author.bot) return;

            // Only respond to DMs or when @mentioned
            const isMentioned = message.mentions.has(this.client.user!);
            const isDM = !message.guild;

            if (!isDM && !isMentioned) return;

            const text = message.content
                .replace(/<@!?\d+>/g, "") // Remove mention
                .trim();

            if (!text) return;

            const threadId = `discord-${message.channel.id}`;
            const userId = `discord-user-${message.author.id}`;

            try {
                await message.channel.sendTyping();
                const response = await this.generateFn(text, threadId, userId);

                // Discord has a 2000 char limit
                if (response.length <= 2000) {
                    await message.reply(response);
                } else {
                    const chunks = splitMessage(response, 2000);
                    for (let i = 0; i < chunks.length; i++) {
                        if (i === 0) {
                            await message.reply(chunks[i]);
                        } else {
                            await message.channel.send(chunks[i]);
                        }
                    }
                }
            } catch (error: any) {
                await message.reply(
                    error.message || "I encountered an issue processing your request."
                );
            }
        });

        this.client.once(Events.ClientReady, (readyClient) => {
            console.log(`🤖 Discord bridge started as ${readyClient.user.tag}`);
        });

        await this.client.login(this.token);
    }

    async stop() {
        await this.client.destroy();
        console.log("🛑 Discord bridge stopped");
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
