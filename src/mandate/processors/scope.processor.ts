// src/mandate/processors/scope.processor.ts
// Input processor: validates scope constraints against mandate's allowed list

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";

/**
 * Scope keyword registry. Skill packs register keywords that map
 * to scope identifiers, allowing the processor to detect scope
 * violations from user input.
 */
const registeredScopeKeywords: Map<string, Record<string, string[]>> = new Map();

/** Skill packs call this to register scope → keyword mappings */
export function registerScopeKeywords(
    skillPackId: string,
    keywords: Record<string, string[]>
): void {
    registeredScopeKeywords.set(skillPackId, keywords);
}

export function createScopeProcessor(mandate: Mandate): Processor {
    const allowedScopes = new Set(mandate.scope.allowed);

    // Merge all registered scope keywords
    const allScopeKeywords: Record<string, string[]> = {};
    for (const keywords of registeredScopeKeywords.values()) {
        Object.assign(allScopeKeywords, keywords);
    }

    return {
        id: "mandate-scope",

        async processInput({ messages, abort }) {
            const lastUserMsg = messages.findLast((m: any) => m.role === "user");
            if (!lastUserMsg) return messages;

            const text = typeof lastUserMsg.content === "string"
                ? lastUserMsg.content
                : JSON.stringify(lastUserMsg.content);
            const lowerText = text.toLowerCase();

            // Check if the input references any scope that's not in allowed list
            for (const [scope, keywords] of Object.entries(allScopeKeywords)) {
                if (allowedScopes.has(scope)) continue; // This scope is allowed

                const matched = keywords.some(kw => lowerText.includes(kw.toLowerCase()));
                if (matched) {
                    if (mandate.scope.behavior_on_unsupported === "refuse") {
                        abort(mandate.scope.escalation_message);
                    } else if (mandate.scope.behavior_on_unsupported === "escalate") {
                        abort(mandate.scope.escalation_message);
                    }
                    // "warn_and_attempt" — let it through but the LLM will see the scope rules
                    break;
                }
            }

            return messages;
        },
    };
}
