// src/skills/registry.ts
// Central registry for loaded skill packs

import type { SkillPack, Processor } from "./types.js";
import type { Mandate } from "../mandate/schema.js";

/**
 * Central registry for all loaded skill packs.
 * The agent factory uses this to discover available tools and processors.
 */
export class SkillPackRegistry {
    private packs: Map<string, SkillPack> = new Map();

    /** Register a skill pack */
    register(pack: SkillPack): void {
        if (this.packs.has(pack.id)) {
            throw new Error(`Skill pack "${pack.id}" is already registered`);
        }
        this.packs.set(pack.id, pack);
    }

    /** Unregister a skill pack */
    unregister(id: string): boolean {
        return this.packs.delete(id);
    }

    /** Get a specific skill pack */
    get(id: string): SkillPack | undefined {
        return this.packs.get(id);
    }

    /** Check if a skill pack is registered */
    has(id: string): boolean {
        return this.packs.has(id);
    }

    /** Get all registered packs */
    getAll(): SkillPack[] {
        return [...this.packs.values()];
    }

    /** Get all registered pack IDs */
    getIds(): string[] {
        return [...this.packs.keys()];
    }

    /**
     * Aggregate all tools from all registered skill packs into a single record.
     * Tool IDs must be unique across packs — collisions throw an error.
     */
    getAllTools(): Record<string, any> {
        const tools: Record<string, any> = {};
        for (const pack of this.packs.values()) {
            for (const [id, tool] of Object.entries(pack.tools)) {
                if (tools[id]) {
                    throw new Error(
                        `Tool ID collision: "${id}" is provided by both ` +
                        `"${tools[id].__skillPackId}" and "${pack.id}"`
                    );
                }
                tools[id] = { ...tool, __skillPackId: pack.id };
            }
        }
        return tools;
    }

    /**
     * Collect all input processors from all registered packs.
     */
    getAllInputProcessors(): ((mandate: Mandate) => Processor)[] {
        return this.getAll().flatMap(p => p.inputProcessors || []);
    }

    /**
     * Collect all output processors from all registered packs.
     */
    getAllOutputProcessors(): ((mandate: Mandate) => Processor)[] {
        return this.getAll().flatMap(p => p.outputProcessors || []);
    }

    /** Run setup hooks for all registered packs */
    async setupAll(): Promise<void> {
        for (const pack of this.packs.values()) {
            if (pack.setup) await pack.setup();
        }
    }
}
