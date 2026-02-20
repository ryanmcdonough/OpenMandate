// Tests: MandateValidator — semantic consistency checks

import { describe, it, expect } from "vitest";
import { MandateParser } from "../parser.js";
import { validateMandateConsistency } from "../validator.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANDATE_PATH = resolve(__dirname, "../../../packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml");

function makeMandate(overrides: Record<string, any> = {}) {
    const base = MandateParser.fromFile(MANDATE_PATH);
    return { ...base, ...overrides };
}

describe("validateMandateConsistency", () => {
    it("validates the tenant-rights mandate as consistent", () => {
        const mandate = MandateParser.fromFile(MANDATE_PATH);
        const result = validateMandateConsistency(mandate);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("detects tool in both capabilities and prohibitions", () => {
        const mandate = makeMandate({
            capabilities: { tools: ["formal-letter", "email-send"], data_access: [], output_types: [] },
            prohibitions: { tools: ["email-send"], actions: [], data: [] },
        });
        const result = validateMandateConsistency(mandate);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("email-send");
    });

    it("detects wildcard prohibition matching a capability", () => {
        const mandate = makeMandate({
            capabilities: { tools: ["payment-stripe", "legislation-lookup"], data_access: [], output_types: [] },
            prohibitions: { tools: ["payment-*"], actions: [], data: [] },
        });
        const result = validateMandateConsistency(mandate);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes("payment-stripe"))).toBe(true);
    });

    it("warns when no skill packs are listed but tools are defined", () => {
        const mandate = makeMandate({
            metadata: {
                name: "no-packs",
                description: "No packs",
                author: "test",
                created: "2026-01-01",
                tags: [],
                // skill_packs purposely omitted (undefined)
            },
        });
        const result = validateMandateConsistency(mandate);
        expect(result.warnings.some(w => w.includes("skill_packs"))).toBe(true);
    });

    it("detects topic_match trigger without topics", () => {
        const mandate = makeMandate({
            escalation: {
                triggers: [
                    { condition: "topic_match", topics: [], action: "refuse_and_redirect", message: "Blocked" },
                ],
            },
        });
        const result = validateMandateConsistency(mandate);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes("topic_match"))).toBe(true);
    });

    it("detects confidence_below trigger without threshold", () => {
        const mandate = makeMandate({
            escalation: {
                triggers: [
                    { condition: "confidence_below", action: "warn_user", message: "Low confidence" },
                ],
            },
        });
        const result = validateMandateConsistency(mandate);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes("confidence_below"))).toBe(true);
    });

    it("warns when max_tokens_per_turn exceeds daily budget", () => {
        const mandate = makeMandate({
            limits: {
                max_tokens_per_turn: 1000000,
                max_tool_calls_per_turn: 5,
                max_turns_per_session: 50,
                max_concurrent_sessions: 3,
                token_budget_daily: 500,
                timeout_seconds: 60,
            },
        });
        const result = validateMandateConsistency(mandate);
        expect(result.warnings.some(w => w.includes("max_tokens_per_turn"))).toBe(true);
    });

    it("warns when citations required but min_per_claim is 0", () => {
        const mandate = makeMandate({
            requirements: {
                ...MandateParser.fromFile(MANDATE_PATH).requirements,
                citations: {
                    required: true,
                    format: "inline" as const,
                    min_per_claim: 0,
                    allowed_sources: [],
                    blocked_sources: [],
                },
            },
        });
        const result = validateMandateConsistency(mandate);
        expect(result.warnings.some(w => w.includes("min_per_claim"))).toBe(true);
    });

    it("validates all 4 mandate templates as consistent", () => {
        const templates = [
            "tenant-rights-eaw.mandate.yaml",
            "employment-rights.mandate.yaml",
            "contract-reviewer.mandate.yaml",
            "general-legal-uk.mandate.yaml",
        ];

        for (const template of templates) {
            const path = resolve(__dirname, `../../../packages/skill-uk-law/mandates/${template}`);
            const mandate = MandateParser.fromFile(path);
            const result = validateMandateConsistency(mandate);
            expect(result.valid, `${template} should be valid: ${result.errors.join(", ")}`).toBe(true);
        }
    });
});
