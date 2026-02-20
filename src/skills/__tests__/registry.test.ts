// Tests: SkillPackRegistry — registration, tool aggregation, collision detection

import { describe, it, expect, beforeEach } from "vitest";
import { SkillPackRegistry } from "../registry.js";
import type { SkillPack } from "../types.js";

function makeMockSkillPack(
    id: string,
    tools: Record<string, any> = {},
    overrides: Partial<SkillPack> = {}
): SkillPack {
    return {
        id,
        name: `Mock ${id}`,
        description: `Mock skill pack ${id}`,
        version: "0.1.0",
        tools,
        systemPromptFragment: `System prompt for ${id}`,
        ...overrides,
    };
}

describe("SkillPackRegistry", () => {
    let registry: SkillPackRegistry;

    beforeEach(() => {
        registry = new SkillPackRegistry();
    });

    describe("register / get / has", () => {
        it("registers and retrieves a skill pack", () => {
            const pack = makeMockSkillPack("test-pack");
            registry.register(pack);
            expect(registry.has("test-pack")).toBe(true);
            expect(registry.get("test-pack")).toBe(pack);
        });

        it("returns undefined for unregistered packs", () => {
            expect(registry.get("nonexistent")).toBeUndefined();
            expect(registry.has("nonexistent")).toBe(false);
        });

        it("throws on duplicate registration", () => {
            const pack = makeMockSkillPack("duplicate");
            registry.register(pack);
            expect(() => registry.register(pack)).toThrow("already registered");
        });
    });

    describe("unregister", () => {
        it("removes a registered pack", () => {
            registry.register(makeMockSkillPack("removable"));
            expect(registry.unregister("removable")).toBe(true);
            expect(registry.has("removable")).toBe(false);
        });

        it("returns false for unregistered pack", () => {
            expect(registry.unregister("nonexistent")).toBe(false);
        });
    });

    describe("getAll / getIds", () => {
        it("returns all registered packs", () => {
            registry.register(makeMockSkillPack("a"));
            registry.register(makeMockSkillPack("b"));
            registry.register(makeMockSkillPack("c"));

            expect(registry.getAll()).toHaveLength(3);
            expect(registry.getIds()).toEqual(expect.arrayContaining(["a", "b", "c"]));
        });
    });

    describe("getAllTools", () => {
        it("aggregates tools from all packs", () => {
            registry.register(makeMockSkillPack("pack-a", {
                "tool-1": { id: "tool-1" },
                "tool-2": { id: "tool-2" },
            }));
            registry.register(makeMockSkillPack("pack-b", {
                "tool-3": { id: "tool-3" },
            }));

            const tools = registry.getAllTools();
            expect(Object.keys(tools)).toEqual(expect.arrayContaining(["tool-1", "tool-2", "tool-3"]));
        });

        it("tags tools with __skillPackId", () => {
            registry.register(makeMockSkillPack("origin-pack", {
                "my-tool": { id: "my-tool" },
            }));

            const tools = registry.getAllTools();
            expect(tools["my-tool"].__skillPackId).toBe("origin-pack");
        });

        it("throws on tool ID collision", () => {
            registry.register(makeMockSkillPack("pack-1", {
                "collision": { id: "collision" },
            }));
            registry.register(makeMockSkillPack("pack-2", {
                "collision": { id: "collision" },
            }));

            expect(() => registry.getAllTools()).toThrow("collision");
        });
    });

    describe("setupAll", () => {
        it("calls setup hook on each pack", async () => {
            const setupCalls: string[] = [];

            registry.register(makeMockSkillPack("pack-a", {}, {
                setup: async () => { setupCalls.push("a"); },
            }));
            registry.register(makeMockSkillPack("pack-b", {}, {
                setup: async () => { setupCalls.push("b"); },
            }));

            await registry.setupAll();
            expect(setupCalls).toEqual(["a", "b"]);
        });

        it("handles packs without setup hooks", async () => {
            registry.register(makeMockSkillPack("no-setup"));
            await expect(registry.setupAll()).resolves.not.toThrow();
        });
    });
});
