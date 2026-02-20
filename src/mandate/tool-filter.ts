// src/mandate/tool-filter.ts
// Filter tools based on mandate whitelist and prohibitions

import type { Mandate } from "./schema.js";

/**
 * Given ALL available tools (aggregated from skill packs) and a mandate,
 * return only the tools the mandate allows. This filtering happens BEFORE
 * we create the Mastra Agent — the agent literally never sees disallowed tools.
 */
export function filterToolsByMandate(
    allTools: Record<string, any>,
    mandate: Mandate
): Record<string, any> {
    const allowedIds = new Set(mandate.capabilities.tools);
    const prohibitedExact = new Set(
        mandate.prohibitions.tools.filter(t => !t.includes("*"))
    );
    const prohibitedPrefixes = mandate.prohibitions.tools
        .filter(t => t.includes("*"))
        .map(t => t.replace("-*", "").replace("*", ""));

    const filtered: Record<string, any> = {};

    for (const [key, tool] of Object.entries(allTools)) {
        const toolId = tool.id || key;

        // Must be in whitelist
        if (!allowedIds.has(toolId)) continue;

        // Must not be in explicit prohibition list
        if (prohibitedExact.has(toolId)) continue;

        // Must not match any wildcard prohibition
        if (prohibitedPrefixes.some(prefix => toolId.startsWith(prefix))) continue;

        filtered[key] = tool;
    }

    return filtered;
}
