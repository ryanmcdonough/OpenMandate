// packages/skill-uk-law/processors/jurisdiction.processor.ts
// UK-specific jurisdiction validation processor

import type { Mandate } from "@openmandate/core/mandate/schema.js";

/**
 * Validates that user queries reference UK jurisdictions covered by the mandate.
 * Detects mentions of specific jurisdictions and warns/blocks if unsupported.
 */

const jurisdictionKeywords: Record<string, string[]> = {
    "GB-EAW": [
        "england", "wales", "english law", "welsh", "county court",
        "high court", "crown court", "magistrates",
    ],
    "GB-SCT": [
        "scotland", "scottish law", "scots law", "sheriff court",
        "court of session",
    ],
    "GB-NIR": [
        "northern ireland", "ni law", "belfast",
    ],
    // Non-UK jurisdictions to detect and redirect
    "US": [
        "united states", "usa", "american law", "state law", "federal law",
        "first amendment", "fifth amendment",
    ],
    "EU": [
        "european union", "eu law", "european court", "echr",
        "european convention",
    ],
    "AU": [
        "australia", "australian law",
    ],
    "CA": [
        "canada", "canadian law",
    ],
};

export function createJurisdictionProcessor(mandate: Mandate): {
    id: string;
    processInput?: (params: { messages: any[]; abort: (reason: string) => void }) => Promise<any[]>;
} {
    const allowedScopes = new Set(mandate.scope.allowed);

    return {
        id: "uk-law-jurisdiction",

        async processInput({ messages, abort }: { messages: any[]; abort: (reason: string) => void }) {
            const lastUserMsg = messages.findLast((m: any) => m.role === "user");
            if (!lastUserMsg) return messages;

            const text = typeof lastUserMsg.content === "string"
                ? lastUserMsg.content
                : JSON.stringify(lastUserMsg.content);
            const lowerText = text.toLowerCase();

            // Check for non-UK jurisdiction references
            for (const [jurisdiction, keywords] of Object.entries(jurisdictionKeywords)) {
                // Skip UK jurisdictions
                if (jurisdiction.startsWith("GB-")) continue;

                const matched = keywords.some((kw: string) => lowerText.includes(kw));
                if (matched) {
                    if (mandate.scope.behavior_on_unsupported === "refuse" ||
                        mandate.scope.behavior_on_unsupported === "escalate") {
                        abort(
                            `I'm specifically configured for UK law (${[...allowedScopes].join(", ")}). ` +
                            `I detected a reference to ${jurisdiction} law, which I cannot reliably advise on. ` +
                            mandate.scope.escalation_message
                        );
                    }
                    break;
                }
            }

            // Check for UK jurisdictions not in scope
            for (const [jurisdiction, keywords] of Object.entries(jurisdictionKeywords)) {
                if (!jurisdiction.startsWith("GB-")) continue;
                if (allowedScopes.has(jurisdiction)) continue;

                const matched = keywords.some((kw: string) => lowerText.includes(kw));
                if (matched) {
                    if (mandate.scope.behavior_on_unsupported === "refuse" ||
                        mandate.scope.behavior_on_unsupported === "escalate") {
                        abort(mandate.scope.escalation_message);
                    }
                    break;
                }
            }

            return messages;
        },
    };
}
