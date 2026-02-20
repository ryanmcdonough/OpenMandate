// src/mandate/validator.ts
// Logical consistency checks beyond schema validation

import type { Mandate } from "./schema.js";

export interface ValidationResult {
    valid: boolean;
    warnings: string[];
    errors: string[];
}

/**
 * Validates a parsed Mandate for logical consistency.
 * Schema validation (Zod) ensures structure; this checks semantics.
 */
export function validateMandateConsistency(mandate: Mandate): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 1. Tools in capabilities should not also appear in prohibitions
    const allowedTools = new Set(mandate.capabilities.tools);
    const prohibitedExact = mandate.prohibitions.tools.filter(t => !t.includes("*"));
    const prohibitedPrefixes = mandate.prohibitions.tools
        .filter(t => t.includes("*"))
        .map(t => t.replace("-*", "").replace("*", ""));

    for (const tool of allowedTools) {
        if (prohibitedExact.includes(tool)) {
            errors.push(
                `Tool "${tool}" is listed in both capabilities.tools and prohibitions.tools. ` +
                `This is contradictory — the tool will be blocked at runtime.`
            );
        }

        const matchingPrefix = prohibitedPrefixes.find(prefix => tool.startsWith(prefix));
        if (matchingPrefix) {
            errors.push(
                `Tool "${tool}" matches wildcard prohibition "${matchingPrefix}-*". ` +
                `It is in capabilities.tools but will be blocked by the wildcard prohibition.`
            );
        }
    }

    // 2. Skill packs referenced should be listed
    if (!mandate.metadata.skill_packs || mandate.metadata.skill_packs.length === 0) {
        if (mandate.capabilities.tools.length > 0) {
            warnings.push(
                `No skill_packs listed in metadata, but ${mandate.capabilities.tools.length} tools are ` +
                `declared in capabilities. Tools must be provided by registered skill packs.`
            );
        }
    }

    // 3. Escalation triggers should have valid structure
    for (const trigger of mandate.escalation.triggers) {
        if (trigger.condition === "topic_match" && (!trigger.topics || trigger.topics.length === 0)) {
            errors.push(
                `Escalation trigger with condition "topic_match" has no topics defined.`
            );
        }
        if (trigger.condition === "confidence_below" && trigger.threshold === undefined) {
            errors.push(
                `Escalation trigger with condition "confidence_below" has no threshold defined.`
            );
        }
        if ((trigger.action === "refuse_and_redirect" || trigger.action === "provide_resources") &&
            (!trigger.resources || trigger.resources.length === 0)) {
            warnings.push(
                `Escalation trigger with action "${trigger.action}" has no resources listed. ` +
                `Consider adding resources for user guidance.`
            );
        }
    }

    // 4. Disclaimer triggers should be valid
    for (const disclaimer of mandate.requirements.disclaimers) {
        if (disclaimer.trigger === "custom" && !disclaimer.custom_pattern) {
            errors.push(
                `Disclaimer with trigger "custom" must define a custom_pattern regex.`
            );
        }
    }

    // 5. Limits sanity checks
    if (mandate.limits.max_tokens_per_turn > mandate.limits.token_budget_daily) {
        warnings.push(
            `max_tokens_per_turn (${mandate.limits.max_tokens_per_turn}) exceeds ` +
            `token_budget_daily (${mandate.limits.token_budget_daily}). A single turn ` +
            `could exhaust the daily budget.`
        );
    }

    // 6. Scope should have at least one entry
    if (mandate.scope.allowed.length === 0) {
        warnings.push(
            `No allowed scopes defined. The agent will trigger scope escalation on every query.`
        );
    }

    // 7. Citation requirements consistency
    if (mandate.requirements.citations.required && mandate.requirements.citations.min_per_claim === 0) {
        warnings.push(
            `Citations are required but min_per_claim is 0. Consider setting min_per_claim to at least 1.`
        );
    }

    return {
        valid: errors.length === 0,
        warnings,
        errors,
    };
}
