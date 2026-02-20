// src/mandate/schema.ts
// Full Mandate Zod schema + TypeScript types

import { z } from "zod";

// === Sub-schemas ===

const DataAccessRuleSchema = z.object({
    scope: z.string(),
    permissions: z.array(z.enum(["read", "write"])),
    file_types: z.array(z.string()).optional(),
    databases: z.array(z.string()).optional(),
});

const DisclaimerRuleSchema = z.object({
    trigger: z.enum(["always", "on_document_generation", "on_legal_claim", "on_claim", "custom"]),
    text: z.string(),
    placement: z.enum(["start", "end", "both"]),
    custom_pattern: z.string().optional(),
});

const CitationRequirementsSchema = z.object({
    required: z.boolean(),
    format: z.enum(["inline", "footnote", "end"]),
    min_per_claim: z.number().int().min(0),
    allowed_sources: z.array(z.string()),
    blocked_sources: z.array(z.string()),
});

const HumanReviewConfigSchema = z.object({
    required_before: z.array(z.string()),
    review_prompt: z.string(),
});

const AuditConfigSchema = z.object({
    log_level: z.enum(["full", "actions_only", "errors_only"]),
    include_llm_calls: z.boolean(),
    include_tool_calls: z.boolean(),
    retention_days: z.number().int().min(1),
});

const EscalationTriggerSchema = z.object({
    condition: z.string(),
    threshold: z.number().optional(),
    topics: z.array(z.string()).optional(),
    action: z.enum(["warn_user", "refuse_and_redirect", "provide_resources", "disclose_and_defer", "refuse"]),
    message: z.string(),
    resources: z.array(z.string()).optional(),
});

const ScopeConfigSchema = z.object({
    allowed: z.array(z.string()),
    behavior_on_unsupported: z.enum(["escalate", "refuse", "warn_and_attempt"]),
    escalation_message: z.string(),
});

const MandateLimitsSchema = z.object({
    max_tokens_per_turn: z.number().int().min(1),
    max_tool_calls_per_turn: z.number().int().min(1),
    max_turns_per_session: z.number().int().min(1),
    max_concurrent_sessions: z.number().int().min(1),
    token_budget_daily: z.number().int().min(1),
    timeout_seconds: z.number().int().min(1),
});

// === Main Mandate Schema ===

export const MandateSchema = z.object({
    version: z.string(),
    metadata: z.object({
        name: z.string(),
        description: z.string(),
        author: z.string(),
        created: z.string(),
        tags: z.array(z.string()),
        skill_packs: z.array(z.string()).optional(),
    }),
    capabilities: z.object({
        tools: z.array(z.string()),
        data_access: z.array(DataAccessRuleSchema),
        output_types: z.array(z.string()),
    }),
    prohibitions: z.object({
        tools: z.array(z.string()),
        actions: z.array(z.string()),
        data: z.array(z.string()),
    }),
    requirements: z.object({
        disclaimers: z.array(DisclaimerRuleSchema),
        citations: CitationRequirementsSchema,
        human_review: HumanReviewConfigSchema,
        audit: AuditConfigSchema,
    }),
    scope: ScopeConfigSchema,
    escalation: z.object({
        triggers: z.array(EscalationTriggerSchema),
    }),
    limits: MandateLimitsSchema,
});

// Infer TypeScript type from Zod schema
export type Mandate = z.infer<typeof MandateSchema>;

// Re-export sub-types for convenience
export type DataAccessRule = z.infer<typeof DataAccessRuleSchema>;
export type DisclaimerRule = z.infer<typeof DisclaimerRuleSchema>;
export type CitationRequirements = z.infer<typeof CitationRequirementsSchema>;
export type HumanReviewConfig = z.infer<typeof HumanReviewConfigSchema>;
export type AuditConfig = z.infer<typeof AuditConfigSchema>;
export type EscalationTrigger = z.infer<typeof EscalationTriggerSchema>;
export type ScopeConfig = z.infer<typeof ScopeConfigSchema>;
export type MandateLimits = z.infer<typeof MandateLimitsSchema>;
