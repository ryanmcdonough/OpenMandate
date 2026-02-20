// src/mastra/agents/escalation-handler.ts
// Configurable human escalation handlers for the triage agent

import crypto from "crypto";

// === Types ===

export interface EscalationRequest {
    /** Unique reference for this escalation (auto-generated) */
    referenceId: string;
    /** The user's original message */
    userMessage: string;
    /** Why the agent is escalating */
    reason: string;
    /** Summary of conversation context */
    conversationSummary: string;
    /** Which platform the user is on */
    platform: string;
    /** User identifier from the bridge */
    userId: string;
    /** Timestamp of the escalation */
    timestamp: string;
    /** IDs of agents that were considered but didn't match */
    agentsConsidered: string[];
}

export interface EscalationResult {
    /** Whether the escalation was successfully submitted */
    success: boolean;
    /** Reference ID for the user to track */
    referenceId: string;
    /** Human-readable confirmation message */
    message: string;
}

/**
 * Interface for escalation handlers.
 * Firms implement this to plug into their existing workflows
 * (ticketing, email, Slack, PMS, etc.)
 */
export interface EscalationHandler {
    /** Handler name (for logging) */
    name: string;
    /** Process an escalation request */
    escalate(request: EscalationRequest): Promise<EscalationResult>;
}

// === Built-in Handlers ===

/**
 * Console handler — logs escalations to stdout.
 * Useful for development and testing.
 */
export class ConsoleEscalationHandler implements EscalationHandler {
    name = "console";

    async escalate(request: EscalationRequest): Promise<EscalationResult> {
        console.log("\n🚨 HUMAN ESCALATION REQUESTED");
        console.log("━".repeat(50));
        console.log(`  Reference: ${request.referenceId}`);
        console.log(`  Time:      ${request.timestamp}`);
        console.log(`  User:      ${request.userId} (${request.platform})`);
        console.log(`  Reason:    ${request.reason}`);
        console.log(`  Message:   ${request.userMessage}`);
        if (request.agentsConsidered.length > 0) {
            console.log(`  Tried:     ${request.agentsConsidered.join(", ")}`);
        }
        console.log(`  Context:   ${request.conversationSummary}`);
        console.log("━".repeat(50));

        return {
            success: true,
            referenceId: request.referenceId,
            message: "Escalation logged to console.",
        };
    }
}

/**
 * Webhook handler — POSTs escalation data to a configurable URL.
 * Integrates with ticketing systems, Slack, PMS, etc.
 */
export class WebhookEscalationHandler implements EscalationHandler {
    name = "webhook";

    constructor(
        private url: string,
        private headers: Record<string, string> = {},
    ) { }

    async escalate(request: EscalationRequest): Promise<EscalationResult> {
        try {
            const response = await fetch(this.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...this.headers,
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                return {
                    success: false,
                    referenceId: request.referenceId,
                    message: `Webhook returned ${response.status}. Your reference is ${request.referenceId}.`,
                };
            }

            return {
                success: true,
                referenceId: request.referenceId,
                message: `Your request has been forwarded to our team. Reference: ${request.referenceId}`,
            };
        } catch (error: any) {
            return {
                success: false,
                referenceId: request.referenceId,
                message: `Unable to reach escalation service. Reference: ${request.referenceId}`,
            };
        }
    }
}

/**
 * Composite handler — sends to multiple handlers (e.g., log + webhook).
 * Returns the result from the first handler, but fires all.
 */
export class CompositeEscalationHandler implements EscalationHandler {
    name = "composite";

    constructor(private handlers: EscalationHandler[]) { }

    async escalate(request: EscalationRequest): Promise<EscalationResult> {
        const results = await Promise.allSettled(
            this.handlers.map((h) => h.escalate(request)),
        );

        // Return the first successful result, or the last failure
        for (const result of results) {
            if (result.status === "fulfilled" && result.value.success) {
                return result.value;
            }
        }

        const lastResult = results[results.length - 1];
        if (lastResult.status === "fulfilled") {
            return lastResult.value;
        }

        return {
            success: false,
            referenceId: request.referenceId,
            message: `Escalation could not be processed. Reference: ${request.referenceId}`,
        };
    }
}

// === Helpers ===

/** Generate a unique reference ID for an escalation */
export function generateReferenceId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString("hex");
    return `ESC-${timestamp}-${random}`.toUpperCase();
}
