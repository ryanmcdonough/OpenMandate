// src/mandate/composer.ts
// Compose mandates for multi-agent workflows

import type { Mandate } from "./schema.js";

/**
 * Composes multiple mandates into a single effective mandate.
 * Used in multi-agent workflows where an orchestrator needs to
 * understand the combined capabilities and restrictions.
 *
 * Rules:
 * - Capabilities: intersection (only tools all mandates allow)
 * - Prohibitions: union (anything any mandate prohibits)
 * - Limits: most restrictive values
 * - Scope: intersection (only scopes all mandates cover)
 * - Disclaimers: union (all disclaimers from all mandates)
 */
export function composeMandates(mandates: Mandate[]): Mandate {
    if (mandates.length === 0) {
        throw new Error("Cannot compose zero mandates");
    }

    if (mandates.length === 1) {
        return mandates[0];
    }

    const base = mandates[0];

    // Capabilities: intersection of tools
    const toolSets = mandates.map(m => new Set(m.capabilities.tools));
    const intersectedTools = [...toolSets[0]].filter(tool =>
        toolSets.every(set => set.has(tool))
    );

    // Prohibitions: union
    const allProhibitedTools = [...new Set(mandates.flatMap(m => m.prohibitions.tools))];
    const allProhibitedActions = [...new Set(mandates.flatMap(m => m.prohibitions.actions))];
    const allProhibitedData = [...new Set(mandates.flatMap(m => m.prohibitions.data))];

    // Scope: intersection
    const scopeSets = mandates.map(m => new Set(m.scope.allowed));
    const intersectedScopes = [...scopeSets[0]].filter(scope =>
        scopeSets.every(set => set.has(scope))
    );

    // Limits: most restrictive
    const composedLimits = {
        max_tokens_per_turn: Math.min(...mandates.map(m => m.limits.max_tokens_per_turn)),
        max_tool_calls_per_turn: Math.min(...mandates.map(m => m.limits.max_tool_calls_per_turn)),
        max_turns_per_session: Math.min(...mandates.map(m => m.limits.max_turns_per_session)),
        max_concurrent_sessions: Math.min(...mandates.map(m => m.limits.max_concurrent_sessions)),
        token_budget_daily: Math.min(...mandates.map(m => m.limits.token_budget_daily)),
        timeout_seconds: Math.min(...mandates.map(m => m.limits.timeout_seconds)),
    };

    // Disclaimers: union (deduplicate by text)
    const seenDisclaimers = new Set<string>();
    const allDisclaimers = mandates.flatMap(m => m.requirements.disclaimers).filter(d => {
        if (seenDisclaimers.has(d.text)) return false;
        seenDisclaimers.add(d.text);
        return true;
    });

    // Escalation: union of all triggers
    const allTriggers = mandates.flatMap(m => m.escalation.triggers);

    return {
        version: base.version,
        metadata: {
            name: `composed-${mandates.map(m => m.metadata.name).join("-")}`,
            description: `Composed mandate from: ${mandates.map(m => m.metadata.name).join(", ")}`,
            author: "system",
            created: new Date().toISOString().split("T")[0],
            tags: [...new Set(mandates.flatMap(m => m.metadata.tags))],
            skill_packs: [...new Set(mandates.flatMap(m => m.metadata.skill_packs || []))],
        },
        capabilities: {
            tools: intersectedTools,
            data_access: base.capabilities.data_access, // Use base's data access
            output_types: [...new Set(mandates.flatMap(m => m.capabilities.output_types))],
        },
        prohibitions: {
            tools: allProhibitedTools,
            actions: allProhibitedActions,
            data: allProhibitedData,
        },
        requirements: {
            disclaimers: allDisclaimers,
            citations: base.requirements.citations, // Use most strict
            human_review: base.requirements.human_review,
            audit: {
                log_level: "full", // Always full for composed mandates
                include_llm_calls: true,
                include_tool_calls: true,
                retention_days: Math.max(...mandates.map(m => m.requirements.audit.retention_days)),
            },
        },
        scope: {
            allowed: intersectedScopes,
            behavior_on_unsupported: "escalate",
            escalation_message: base.scope.escalation_message,
        },
        escalation: {
            triggers: allTriggers,
        },
        limits: composedLimits,
    };
}
