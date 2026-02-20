// src/mandate/processors/escalation.processor.ts
// Input processor: scans for escalation triggers defined in the mandate

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";

// Default keyword expansions. Skill packs can register additional mappings.
const defaultKeywordExpansions: Record<string, string[]> = {};
const registeredExpansions: Map<string, Record<string, string[]>> = new Map();

/** Skill packs call this to register topic → keyword mappings */
export function registerEscalationKeywords(
    skillPackId: string,
    expansions: Record<string, string[]>
): void {
    registeredExpansions.set(skillPackId, expansions);
}

/** Get all registered keyword expansions (for testing) */
export function getRegisteredExpansions(): Map<string, Record<string, string[]>> {
    return registeredExpansions;
}

export function createEscalationProcessor(mandate: Mandate): Processor {
    const topicTriggers = mandate.escalation.triggers.filter(t => t.condition === "topic_match");
    const distressTrigger = mandate.escalation.triggers.find(t => t.condition === "user_distress_detected");

    // Merge all registered keyword expansions
    const allExpansions = { ...defaultKeywordExpansions };
    for (const expansions of registeredExpansions.values()) {
        Object.assign(allExpansions, expansions);
    }

    // Build keyword sets from escalation topics
    const topicKeywords: Map<string, { keywords: string[]; trigger: typeof topicTriggers[0] }> = new Map();
    for (const trigger of topicTriggers) {
        if (!trigger.topics) continue;
        const keywords = trigger.topics.flatMap(topic => {
            // Use registered expansions if available, else fall back to topic name
            return allExpansions[topic] || [topic.replace(/_/g, " ")];
        });
        topicKeywords.set(trigger.condition + "-" + trigger.topics.join(","), { keywords, trigger });
    }

    // Distress detection keywords (universal, not domain-specific)
    const distressKeywords = [
        "desperate", "no way out", "can't take it", "losing everything",
        "threat", "threatened", "scared for my life", "help me please",
        "don't know what to do", "emergency",
    ];

    return {
        id: "mandate-escalation",

        async processInput({ messages, abort }) {
            const lastUserMsg = messages.findLast((m: any) => m.role === "user");
            if (!lastUserMsg) return messages;

            const text = typeof lastUserMsg.content === "string"
                ? lastUserMsg.content
                : JSON.stringify(lastUserMsg.content);
            const lowerText = text.toLowerCase();

            // Check topic-based escalation
            for (const [, { keywords, trigger }] of topicKeywords) {
                const matched = keywords.some(kw => lowerText.includes(kw));
                if (matched) {
                    if (trigger.action === "refuse_and_redirect" || trigger.action === "refuse") {
                        let message = trigger.message;
                        if (trigger.resources) {
                            message += "\n\n" + trigger.resources.join("\n");
                        }
                        abort(message);
                    }
                    break;
                }
            }

            // Check distress detection
            if (distressTrigger) {
                const isDistressed = distressKeywords.some(kw => lowerText.includes(kw));
                if (isDistressed) {
                    let message = distressTrigger.message;
                    if (distressTrigger.resources) {
                        message += "\n\n" + distressTrigger.resources.join("\n");
                    }
                    abort(message);
                }
            }

            return messages;
        },
    };
}
