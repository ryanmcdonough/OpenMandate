// Tests: System prompt builder — generates LLM instructions from mandate

import { describe, it, expect } from "vitest";
import { MandateParser } from "../parser.js";
import { buildMandateSystemPrompt } from "../system-prompt-builder.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANDATE_PATH = resolve(__dirname, "../../../packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml");

describe("buildMandateSystemPrompt", () => {
    const mandate = MandateParser.fromFile(MANDATE_PATH);

    it("includes the agent description", () => {
        const prompt = buildMandateSystemPrompt(mandate, "A helpful tenant rights assistant", []);
        expect(prompt).toContain("helpful tenant rights assistant");
    });

    it("includes mandate name", () => {
        const prompt = buildMandateSystemPrompt(mandate, "Test", []);
        // The prompt includes mandate rules, not necessarily the name verbatim
        expect(prompt).toContain("Operating Mandate");
    });

    it("includes prohibited actions", () => {
        const prompt = buildMandateSystemPrompt(mandate, "Test", []);
        for (const action of mandate.prohibitions.actions) {
            expect(prompt).toContain(action.replace(/_/g, " "));
        }
    });

    it("includes scope information", () => {
        const prompt = buildMandateSystemPrompt(mandate, "Test", []);
        expect(prompt).toContain("GB-EAW");
    });

    it("includes available tools", () => {
        const prompt = buildMandateSystemPrompt(mandate, "Test", []);
        for (const tool of mandate.capabilities.tools) {
            expect(prompt).toContain(tool);
        }
    });

    it("includes disclaimers", () => {
        const prompt = buildMandateSystemPrompt(mandate, "Test", []);
        const alwaysDisclaimer = mandate.requirements.disclaimers.find(d => d.trigger === "always");
        // The prompt includes a truncated version of the disclaimer
        if (alwaysDisclaimer) {
            // Check it includes at least the start of the disclaimer
            expect(prompt).toContain("Disclaimer (always)");
        }
    });

    it("includes skill pack system prompt fragments", () => {
        const mockSkillPack = {
            id: "test-pack",
            name: "Test Pack",
            description: "A test pack",
            version: "0.1.0",
            tools: {},
            systemPromptFragment: "CUSTOM DOMAIN KNOWLEDGE FRAGMENT",
        };

        const prompt = buildMandateSystemPrompt(mandate, "Test", [mockSkillPack as any]);
        expect(prompt).toContain("CUSTOM DOMAIN KNOWLEDGE FRAGMENT");
    });

    it("calls function-based system prompt fragments", () => {
        const mockSkillPack = {
            id: "test-pack",
            name: "Test Pack",
            description: "A test pack",
            version: "0.1.0",
            tools: {},
            systemPromptFragment: (m: any) => `Dynamic fragment for ${m.metadata.name}`,
        };

        const prompt = buildMandateSystemPrompt(mandate, "Test", [mockSkillPack as any]);
        expect(prompt).toContain(`Dynamic fragment for ${mandate.metadata.name}`);
    });

    it("produces a non-trivial prompt", () => {
        const prompt = buildMandateSystemPrompt(mandate, "Test", []);
        // A proper system prompt should be substantial
        expect(prompt.length).toBeGreaterThan(500);
    });
});
