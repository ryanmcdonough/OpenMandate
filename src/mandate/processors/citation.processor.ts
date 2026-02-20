// src/mandate/processors/citation.processor.ts
// Output result processor: enforces citation requirements from mandate

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";

/**
 * Enforces citation requirements from the mandate.
 * Checks:
 *   1. Substantive responses (>200 chars) must contain citation patterns
 *   2. Blocked sources (Wikipedia, Reddit, etc.) must not appear in output
 *
 * Runs as an output result processor (after final response, before delivery).
 * If citations are missing, aborts with retry: true to force the LLM to add them.
 */
export function createCitationProcessor(mandate: Mandate): Processor {
    const citationConfig = mandate.requirements.citations;
    if (!citationConfig.required) {
        // If citations are not required, return a no-op processor
        return {
            id: "mandate-citation",
            async processOutputResult({ messages }) { return messages; },
        };
    }

    const blockedSources = citationConfig.blocked_sources || [];

    // URL patterns for blocked sources
    const blockedPatterns = blockedSources.map(source => {
        const patterns: RegExp[] = [];
        if (source === "wikipedia") patterns.push(/wikipedia\.org/i, /\bwikipedia\b/i);
        else if (source === "reddit") patterns.push(/reddit\.com/i, /\breddit\b/i);
        else if (source === "social_media") patterns.push(/twitter\.com|x\.com|facebook\.com|instagram\.com|tiktok\.com/i);
        else if (source === "blogs") patterns.push(/\bblog\b/i, /medium\.com/i, /wordpress\.com/i);
        else patterns.push(new RegExp(source.replace(/_/g, "[\\s_]"), "i"));
        return { source, patterns };
    });

    // Citation detection patterns (legislation, case law, URLs, section references)
    const citationPatterns = [
        /\bAct\s+\d{4}\b/,                     // "Act 2004"
        /\bs\.\d+/,                              // "s.213"
        /\bss?\.\s*\d+/,                        // "ss.213-215"
        /\bSection\s+\d+/i,                     // "Section 21"
        /\[?\d{4}\]?\s+[A-Z][A-Za-z]+(?:\s+[A-Za-z]+)*\s+\d+/,  // "[2024] EWCA Civ 123" / "2024 EWHC 456"
        /v\.\s+/,                               // "Smith v. Jones" (case citation)
        /legislation\.gov\.uk/i,                 // legislation.gov.uk URL
        /§\s*\d+/,                              // § 123
        /https?:\/\/[^\s]+/,                    // Any URL
    ];

    return {
        id: "mandate-citation",

        async processOutputResult({ messages, abort, retryCount }) {
            const lastAssistantMsg = messages.findLast((m: any) => m.role === "assistant");
            if (!lastAssistantMsg) return messages;

            const text = typeof lastAssistantMsg.content === "string"
                ? lastAssistantMsg.content
                : JSON.stringify(lastAssistantMsg.content);

            // Check 1: Blocked sources
            for (const { source, patterns } of blockedPatterns) {
                for (const pattern of patterns) {
                    if (pattern.test(text)) {
                        if (retryCount < 2) {
                            abort(
                                `Response references "${source}" which is a blocked source. ` +
                                `Use authoritative sources only: ${(citationConfig.allowed_sources || []).join(", ")}`,
                                { retry: true }
                            );
                        } else {
                            abort(
                                `I'm unable to provide a response using only authoritative sources for this query.`
                            );
                        }
                    }
                }
            }

            // Check 2: Citation presence for substantive responses
            const isSubstantive = text.length > 200;
            if (isSubstantive) {
                const hasCitations = citationPatterns.some(p => p.test(text));
                if (!hasCitations) {
                    if (retryCount < 2) {
                        abort(
                            "Response lacks citations. All substantive legal information must cite " +
                            "relevant legislation, case law, or authoritative sources.",
                            { retry: true }
                        );
                    }
                    // After 2 retries, let it through — the disclaimer processor
                    // will still append the "not legal advice" disclaimer
                }
            }

            return messages;
        },
    };
}
