// Tests: Mandate composition — merging multiple mandates

import { describe, it, expect } from "vitest";
import { MandateParser } from "../parser.js";
import { composeMandates } from "../composer.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadMandate(template: string) {
    return MandateParser.fromFile(
        resolve(__dirname, `../../../packages/skill-uk-law/mandates/${template}`)
    );
}

describe("composeMandates", () => {
    it("throws on empty array", () => {
        expect(() => composeMandates([])).toThrow("Cannot compose zero mandates");
    });

    it("returns the mandate unchanged for single-element array", () => {
        const mandate = loadMandate("tenant-rights-eaw.mandate.yaml");
        const composed = composeMandates([mandate]);
        expect(composed).toBe(mandate); // Same reference
    });

    it("intersects capabilities.tools", () => {
        const tenant = loadMandate("tenant-rights-eaw.mandate.yaml");
        const contract = loadMandate("contract-reviewer.mandate.yaml");
        const composed = composeMandates([tenant, contract]);

        // Only tools in BOTH mandates should survive
        for (const tool of composed.capabilities.tools) {
            expect(tenant.capabilities.tools).toContain(tool);
            expect(contract.capabilities.tools).toContain(tool);
        }
    });

    it("unions prohibitions", () => {
        const tenant = loadMandate("tenant-rights-eaw.mandate.yaml");
        const employment = loadMandate("employment-rights.mandate.yaml");
        const composed = composeMandates([tenant, employment]);

        // All prohibitions from both mandates should be present
        for (const action of tenant.prohibitions.actions) {
            expect(composed.prohibitions.actions).toContain(action);
        }
        for (const action of employment.prohibitions.actions) {
            expect(composed.prohibitions.actions).toContain(action);
        }
    });

    it("uses most restrictive limits", () => {
        const tenant = loadMandate("tenant-rights-eaw.mandate.yaml");
        const contract = loadMandate("contract-reviewer.mandate.yaml");
        const composed = composeMandates([tenant, contract]);

        expect(composed.limits.max_tokens_per_turn).toBe(
            Math.min(tenant.limits.max_tokens_per_turn, contract.limits.max_tokens_per_turn)
        );
        expect(composed.limits.max_tool_calls_per_turn).toBe(
            Math.min(tenant.limits.max_tool_calls_per_turn, contract.limits.max_tool_calls_per_turn)
        );
    });

    it("intersects scopes", () => {
        const tenant = loadMandate("tenant-rights-eaw.mandate.yaml");
        const employment = loadMandate("employment-rights.mandate.yaml");
        const composed = composeMandates([tenant, employment]);

        // Both mandates scope to GB-EAW, so that should be in the intersection
        expect(composed.scope.allowed).toContain("GB-EAW");
    });

    it("deduplicates disclaimers", () => {
        const tenant = loadMandate("tenant-rights-eaw.mandate.yaml");
        const composed = composeMandates([tenant, tenant]); // Same mandate twice

        // Should deduplicate disclaimers with identical text
        const texts = composed.requirements.disclaimers.map(d => d.text);
        const uniqueTexts = [...new Set(texts)];
        expect(texts.length).toBe(uniqueTexts.length);
    });

    it("generates composed metadata name", () => {
        const tenant = loadMandate("tenant-rights-eaw.mandate.yaml");
        const employment = loadMandate("employment-rights.mandate.yaml");
        const composed = composeMandates([tenant, employment]);

        expect(composed.metadata.name).toContain("composed");
        expect(composed.metadata.name).toContain(tenant.metadata.name);
        expect(composed.metadata.name).toContain(employment.metadata.name);
    });
});
