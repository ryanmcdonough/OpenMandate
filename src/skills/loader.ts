// src/skills/loader.ts
// Resolves skill packs from node_modules or local paths

import type { SkillPack } from "./types.js";

/**
 * Attempts to load a skill pack by ID.
 * Tries multiple resolution strategies:
 * 1. Direct package name: @openmandate/skill-{id}
 * 2. Scoped package: openmandate-skill-{id}
 * 3. Local path resolution
 */
export async function loadSkillPack(idOrPath: string): Promise<SkillPack> {
    const strategies = [
        `@openmandate/skill-${idOrPath}`,
        `openmandate-skill-${idOrPath}`,
        idOrPath,
    ];

    for (const strategy of strategies) {
        try {
            const module = await import(strategy);
            const pack: SkillPack = module.default || module[Object.keys(module)[0]];

            if (!pack || !pack.id || !pack.name || !pack.tools) {
                continue;
            }

            return pack;
        } catch {
            continue;
        }
    }

    throw new Error(
        `Could not load skill pack "${idOrPath}". Tried:\n` +
        strategies.map(s => `  - ${s}`).join("\n") +
        `\n\nInstall it with: npm install @openmandate/skill-${idOrPath}`
    );
}

/**
 * Discovers installed skill packs by checking for the OpenMandate
 * marker in package.json.
 */
export async function discoverSkillPacks(): Promise<string[]> {
    // This would scan node_modules for packages with
    // { "openmandate": { "type": "skill-pack" } } in package.json
    // For now, return empty — skill packs are explicitly registered
    return [];
}
