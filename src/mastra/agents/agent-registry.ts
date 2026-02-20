// src/mastra/agents/agent-registry.ts
// Registry for mandated agents — used by the triage agent to discover routing targets

import type { Agent } from "@mastra/core/agent";

export interface RegisteredAgent {
    /** Agent/mandate ID, e.g. "tenant-rights-eaw" */
    id: string;
    /** Human-readable description of what this agent does */
    description: string;
    /** Mandate name (usually same as id) */
    mandateName: string;
    /** Searchable tags for classification, e.g. ["housing", "tenancy"] */
    tags: string[];
    /** The actual Mastra Agent instance */
    agent: Agent;
}

/**
 * Central registry for all mandated agents.
 * The triage agent reads this to know which specialists are available.
 */
export class AgentRegistry {
    private agents: Map<string, RegisteredAgent> = new Map();

    /** Register a mandated agent */
    register(entry: RegisteredAgent): void {
        if (this.agents.has(entry.id)) {
            throw new Error(`Agent "${entry.id}" is already registered`);
        }
        this.agents.set(entry.id, entry);
    }

    /** Get a specific agent by ID */
    get(id: string): RegisteredAgent | undefined {
        return this.agents.get(id);
    }

    /** Get all registered agents */
    getAll(): RegisteredAgent[] {
        return [...this.agents.values()];
    }

    /** Get all agent IDs */
    getIds(): string[] {
        return [...this.agents.keys()];
    }

    /** Check if an agent is registered */
    has(id: string): boolean {
        return this.agents.has(id);
    }

    /**
     * Build a summary of all agents for the triage system prompt.
     * Each entry includes the ID, description, and tags.
     */
    buildAgentSummary(): string {
        const entries = this.getAll();
        if (entries.length === 0) {
            return "No specialist agents are currently available.";
        }
        return entries
            .map(
                (a) =>
                    `- **${a.id}**: ${a.description}\n  Tags: ${a.tags.join(", ")}`
            )
            .join("\n\n");
    }
}
