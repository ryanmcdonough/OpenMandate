// src/bridges/types.ts
// Messaging bridge interface

export interface BridgeMessage {
    platform: string;
    userId: string;
    threadId: string;
    text: string;
    timestamp: string;
}

export interface Bridge {
    platform: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    onMessage(handler: (msg: BridgeMessage) => Promise<string>): void;
}
