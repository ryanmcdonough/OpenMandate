// src/mandate/processors/output-validator.processor.ts
// Output result processor: validates final output against mandate requirements

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";

// Pattern registry — skill packs can add domain-specific patterns
const registeredPatterns: Map<string, { action: string; pattern: RegExp }[]> = new Map();

/** Skill packs call this to register action → regex patterns */
export function registerProhibitedActionPatterns(
    skillPackId: string,
    patterns: { action: string; pattern: RegExp }[]
): void {
    registeredPatterns.set(skillPackId, patterns);
}

/** Get all registered patterns (for testing) */
export function getRegisteredPatterns(): Map<string, { action: string; pattern: RegExp }[]> {
    return registeredPatterns;
}

export function createOutputValidatorProcessor(mandate: Mandate): Processor {
    return {
        id: "mandate-output-validator",

        async processOutputResult({ messages, abort }) {
            const lastAssistantMsg = messages.findLast((m: any) => m.role === "assistant");
            if (!lastAssistantMsg) return messages;

            const text = typeof lastAssistantMsg.content === "string"
                ? lastAssistantMsg.content
                : JSON.stringify(lastAssistantMsg.content);

            // Check prohibited action language using all registered patterns
            if (mandate.prohibitions.actions.length > 0) {
                const allPatterns = [...registeredPatterns.values()].flat();
                for (const { action, pattern } of allPatterns) {
                    if (mandate.prohibitions.actions.includes(action) && pattern.test(text)) {
                        abort(
                            "I need to rephrase — I cannot " +
                            `${action.replace(/_/g, " ")}. Let me try again with proper framing.`
                        );
                    }
                }
            }

            // Citation enforcement is handled by the dedicated citation.processor.ts

            return messages;
        },
    };
}
