// src/skills/types.ts
// SkillPack interface — the contract all skill packs must implement

import type { Mandate } from "../mandate/schema.js";

/**
 * A Processor is a middleware that runs before/after LLM calls.
 * This mirrors Mastra's Processor interface with the fields we use.
 */
export interface Processor {
    id: string;
    processInput?: (params: {
        messages: any[];
        abort: (reason: string, options?: { retry?: boolean }) => void;
        state: Record<string, unknown>;
        retryCount: number;
    }) => Promise<any[]>;
    processOutputStep?: (params: {
        messages: any[];
        toolCalls?: any[];
        abort: (reason: string, options?: { retry?: boolean }) => void;
        retryCount: number;
        state: Record<string, unknown>;
    }) => Promise<any[]>;
    processOutputResult?: (params: {
        messages: any[];
        abort: (reason: string, options?: { retry?: boolean }) => void;
        retryCount: number;
        state: Record<string, unknown>;
    }) => Promise<any[]>;
}

/**
 * A SkillPack is a pluggable module that adds domain-specific capabilities
 * to OpenMandate agents. It provides tools, processors, prompt fragments,
 * mandate templates, and evals for a particular vertical.
 */
export interface SkillPack {
    /** Unique identifier, e.g., "uk-law", "healthcare", "finance" */
    id: string;

    /** Human-readable name */
    name: string;

    /** Description of what this skill pack covers */
    description: string;

    /** Semantic version of the skill pack */
    version: string;

    /**
     * All tools this skill pack provides.
     * Keys are tool IDs that mandates reference (e.g., "formal-letter").
     * The mandate's capabilities.tools whitelist controls which are active.
     */
    tools: Record<string, any>;

    /**
     * Optional domain-specific processors.
     * These are added to the agent's processor chain alongside the core
     * mandate processors. They run in the order provided.
     */
    inputProcessors?: ((mandate: Mandate) => Processor)[];
    outputProcessors?: ((mandate: Mandate) => Processor)[];

    /**
     * System prompt fragment injected into the agent's instructions.
     * This provides domain context the LLM needs.
     * Can be a string or a function that receives the mandate for dynamic generation.
     */
    systemPromptFragment: string | ((mandate: Mandate) => string);

    /**
     * Paths to pre-built mandate YAML templates shipped with this pack.
     * Users can copy and customise these, or reference them directly.
     */
    mandateTemplates?: string[];

    /**
     * Domain-specific eval scorers for Mastra's eval system.
     */
    evals?: Record<string, any>;

    /**
     * Optional setup hook — called once when the skill pack is loaded.
     * Can be used to verify API keys, warm caches, etc.
     */
    setup?: () => Promise<void>;
}
