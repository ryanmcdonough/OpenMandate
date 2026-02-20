// src/mandate/processors/disclaimer.processor.ts
// Output result processor: injects required disclaimers and human review prompts

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";

/**
 * Injects required disclaimers and human review prompts into agent output.
 * Runs after output validation — this always succeeds (never aborts).
 * Fully generic — reads disclaimer and human_review rules from the mandate YAML.
 */
export function createDisclaimerProcessor(mandate: Mandate): Processor {
    const humanReviewConfig = mandate.requirements.human_review;

    // Detect patterns that suggest a document was generated or a deadline was provided
    const reviewTriggerPatterns: Record<string, RegExp> = {
        finalize_document: /\b(dear |to whom|re:|subject:|letter before action|formal grievance|cease and desist|DRAFT)/i,
        send_correspondence: /\b(send|dispatch|email|post|deliver)\b.*\b(letter|correspondence|notice)\b/i,
        provide_deadline: /\b(deadline|expires?|time limit|within \d+ days|must act before)\b/i,
    };

    return {
        id: "mandate-disclaimer",

        async processOutputResult({ messages }) {
            const lastAssistantIdx = messages.findLastIndex((m: any) => m.role === "assistant");
            if (lastAssistantIdx === -1) return messages;

            const msg = messages[lastAssistantIdx];
            let text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

            // 1. Inject disclaimers
            for (const disclaimer of mandate.requirements.disclaimers) {
                let shouldTrigger = false;

                if (disclaimer.trigger === "always") {
                    shouldTrigger = true;
                } else if (disclaimer.trigger === "on_document_generation") {
                    shouldTrigger = text.length > 500 || /\b(dear |to whom|re:|subject:)/i.test(text);
                } else if (disclaimer.trigger === "on_claim" || disclaimer.trigger === "on_legal_claim") {
                    shouldTrigger = /\bunder\s+(section|§)|statute|legal right|regulation/i.test(text);
                } else if (disclaimer.trigger === "custom" && disclaimer.custom_pattern) {
                    shouldTrigger = new RegExp(disclaimer.custom_pattern, "i").test(text);
                }

                if (shouldTrigger && !text.includes(disclaimer.text)) {
                    const formatted = `\n\n---\n_${disclaimer.text}_`;
                    if (disclaimer.placement === "start" || disclaimer.placement === "both") {
                        text = `_${disclaimer.text}_\n\n---\n\n` + text;
                    }
                    if (disclaimer.placement === "end" || disclaimer.placement === "both") {
                        text = text + formatted;
                    }
                }
            }

            // 2. Inject human review prompt when required
            if (humanReviewConfig?.required_before?.length) {
                const requiresReview = humanReviewConfig.required_before.some(trigger => {
                    const pattern = reviewTriggerPatterns[trigger];
                    return pattern ? pattern.test(text) : false;
                });

                if (requiresReview && !text.includes(humanReviewConfig.review_prompt)) {
                    text = text + `\n\n---\n⚠️ **${humanReviewConfig.review_prompt}**`;
                }
            }

            const updated = [...messages];
            updated[lastAssistantIdx] = { ...msg, content: text };
            return updated;
        },
    };
}

