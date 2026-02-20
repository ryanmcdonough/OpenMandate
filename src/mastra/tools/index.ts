// src/mastra/tools/index.ts
// Tool registry — aggregates tools from skill packs
// Tool registration is handled by the SkillPackRegistry.
// This module provides utility functions for tool management.

import type { SkillPackRegistry } from "../../skills/registry.js";
import type { Mandate } from "../../mandate/schema.js";
import { filterToolsByMandate } from "../../mandate/tool-filter.js";

/**
 * Get all tools available for a specific mandate.
 * Tools are aggregated from skill packs and filtered by mandate rules.
 */
export function getToolsForMandate(
    registry: SkillPackRegistry,
    mandate: Mandate
): Record<string, any> {
    const allTools = registry.getAllTools();
    return filterToolsByMandate(allTools, mandate);
}

/**
 * List all available tools across all registered skill packs.
 */
export function listAllTools(registry: SkillPackRegistry): { id: string; skillPack: string; description?: string }[] {
    const allTools = registry.getAllTools();
    return Object.entries(allTools).map(([id, tool]) => ({
        id,
        skillPack: tool.__skillPackId || "unknown",
        description: tool.description,
    }));
}
