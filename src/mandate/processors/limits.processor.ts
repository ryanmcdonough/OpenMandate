// src/mandate/processors/limits.processor.ts
// Input step processor: enforces rate limits and resource budgets from mandate

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";

/**
 * Enforces rate limits and resource budgets from the mandate.
 * Checks:
 *   1. max_turns_per_session — counts turns via processor state
 *   2. max_tokens_per_turn — estimates output token count (4 chars ≈ 1 token)
 *   3. token_budget_daily — tracks cumulative daily token usage in-memory
 *   4. timeout_seconds — sets a start timestamp and checks elapsed time
 *   5. max_concurrent_sessions — tracks active sessions (basic in-memory counter)
 *
 * Uses both processInput (for session/turn tracking) and processOutputResult
 * (for token counting after response).
 */

// Global session tracking (simple in-memory, resets on restart)
const activeSessions = new Map<string, { turns: number; startedAt: number }>();
let dailyTokensUsed = 0;
let lastResetDate = new Date().toDateString();

function resetDailyIfNeeded(): void {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        dailyTokensUsed = 0;
        lastResetDate = today;
    }
}

export function createLimitsProcessor(mandate: Mandate): Processor {
    const limits = mandate.limits;

    return {
        id: "mandate-limits",

        async processInput({ messages, abort, state }) {
            resetDailyIfNeeded();

            // Generate a session ID from the first user message or use a default
            const sessionId = (state as any).__sessionId || "default";

            // Initialize or increment session turn count
            if (!activeSessions.has(sessionId)) {
                // Check concurrent session limit
                if (activeSessions.size >= limits.max_concurrent_sessions) {
                    abort(
                        "Maximum concurrent sessions reached. Please try again later."
                    );
                }
                activeSessions.set(sessionId, {
                    turns: 0,
                    startedAt: Date.now(),
                });
            }

            const session = activeSessions.get(sessionId)!;
            session.turns++;

            // Check turn limit
            if (session.turns > limits.max_turns_per_session) {
                activeSessions.delete(sessionId);
                abort(
                    `Session limit reached (${limits.max_turns_per_session} turns). ` +
                    "Please start a new conversation."
                );
            }

            // Check timeout
            const elapsedSeconds = (Date.now() - session.startedAt) / 1000;
            if (elapsedSeconds > limits.timeout_seconds) {
                activeSessions.delete(sessionId);
                abort(
                    "Session has timed out. Please start a new conversation."
                );
            }

            // Check daily token budget before processing
            if (limits.token_budget_daily && dailyTokensUsed >= limits.token_budget_daily) {
                abort(
                    "Daily token budget has been exhausted. Service will resume tomorrow."
                );
            }

            // Store session ID for output tracking
            (state as any).__sessionId = sessionId;
            (state as any).__turnStartTime = Date.now();

            return messages;
        },

        async processOutputResult({ messages, abort }) {
            resetDailyIfNeeded();

            const lastAssistantMsg = messages.findLast((m: any) => m.role === "assistant");
            if (!lastAssistantMsg) return messages;

            const text = typeof lastAssistantMsg.content === "string"
                ? lastAssistantMsg.content
                : JSON.stringify(lastAssistantMsg.content);

            // Estimate token count: ~4 characters per token
            const estimatedTokens = Math.ceil(text.length / 4);

            // Check max_tokens_per_turn
            if (estimatedTokens > limits.max_tokens_per_turn) {
                // Don't abort — the response is already generated, but log it
                // and truncate the content to the limit
                const maxChars = limits.max_tokens_per_turn * 4;
                const truncated = text.substring(0, maxChars) +
                    "\n\n---\n_[Response truncated — exceeded maximum length for this mandate]_";

                const updated = [...messages];
                const idx = messages.findLastIndex((m: any) => m.role === "assistant");
                if (idx !== -1) {
                    updated[idx] = { ...messages[idx], content: truncated };
                }
                return updated;
            }

            // Track daily token usage
            dailyTokensUsed += estimatedTokens;

            return messages;
        },
    };
}

/** Exported for testing — reset the global state */
export function resetLimitsState(): void {
    activeSessions.clear();
    dailyTokensUsed = 0;
    lastResetDate = new Date().toDateString();
}

/** Exported for testing — get current usage */
export function getLimitsState(): { activeSessions: number; dailyTokensUsed: number } {
    return {
        activeSessions: activeSessions.size,
        dailyTokensUsed,
    };
}
