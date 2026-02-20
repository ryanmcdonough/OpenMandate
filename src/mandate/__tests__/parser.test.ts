// Tests: MandateParser — YAML → validated Mandate objects

import { describe, it, expect } from "vitest";
import { MandateParser } from "../parser.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANDATE_PATH = resolve(__dirname, "../../../packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml");

describe("MandateParser", () => {
    describe("fromFile", () => {
        it("parses the tenant-rights-eaw mandate without errors", () => {
            const mandate = MandateParser.fromFile(MANDATE_PATH);
            expect(mandate).toBeDefined();
            expect(mandate.version).toBe("1.0");
            expect(mandate.metadata.name).toBe("tenant-rights-eaw");
        });

        it("extracts all metadata fields", () => {
            const mandate = MandateParser.fromFile(MANDATE_PATH);
            expect(mandate.metadata.author).toBe("openmandate");
            expect(mandate.metadata.tags).toContain("housing");
            expect(mandate.metadata.skill_packs).toContain("uk-law");
        });

        it("parses capabilities correctly", () => {
            const mandate = MandateParser.fromFile(MANDATE_PATH);
            expect(mandate.capabilities.tools).toContain("formal-letter");
            expect(mandate.capabilities.tools).toContain("legislation-lookup");
            expect(mandate.capabilities.tools).toContain("deadline-calculator");
            expect(mandate.capabilities.data_access.length).toBeGreaterThan(0);
        });

        it("parses prohibitions correctly", () => {
            const mandate = MandateParser.fromFile(MANDATE_PATH);
            expect(mandate.prohibitions.actions).toContain("provide_legal_advice");
            expect(mandate.prohibitions.actions).toContain("represent_as_solicitor");
            expect(mandate.prohibitions.data).toContain("financial_accounts");
        });

        it("parses scope configuration", () => {
            const mandate = MandateParser.fromFile(MANDATE_PATH);
            expect(mandate.scope.allowed).toContain("GB-EAW");
            expect(mandate.scope.behavior_on_unsupported).toBe("escalate");
            expect(mandate.scope.escalation_message).toBeDefined();
        });

        it("parses escalation triggers", () => {
            const mandate = MandateParser.fromFile(MANDATE_PATH);
            expect(mandate.escalation.triggers.length).toBeGreaterThan(0);

            const topicTrigger = mandate.escalation.triggers.find(
                t => t.condition === "topic_match"
            );
            expect(topicTrigger).toBeDefined();
            expect(topicTrigger!.topics!.length).toBeGreaterThan(0);
            expect(topicTrigger!.action).toBe("refuse_and_redirect");
        });

        it("parses requirements correctly", () => {
            const mandate = MandateParser.fromFile(MANDATE_PATH);
            expect(mandate.requirements.disclaimers.length).toBeGreaterThan(0);
            expect(mandate.requirements.citations.required).toBe(true);
            expect(mandate.requirements.audit.log_level).toBe("full");
        });

        it("parses limits correctly", () => {
            const mandate = MandateParser.fromFile(MANDATE_PATH);
            expect(mandate.limits.max_tokens_per_turn).toBeGreaterThan(0);
            expect(mandate.limits.max_tool_calls_per_turn).toBeGreaterThan(0);
            expect(mandate.limits.timeout_seconds).toBeGreaterThan(0);
        });

        it("throws on non-existent file", () => {
            expect(() => MandateParser.fromFile("/nonexistent/file.yaml")).toThrow();
        });
    });

    describe("fromString", () => {
        it("parses valid YAML string", () => {
            const yaml = `
version: "1.0"
metadata:
  name: "test-mandate"
  description: "Test mandate"
  author: "test"
  created: "2026-01-01"
  tags: ["test"]
  skill_packs: ["uk-law"]
capabilities:
  tools: ["legislation-lookup"]
  data_access:
    - scope: "user_uploads"
      permissions: ["read"]
  output_types: ["rights_summary"]
prohibitions:
  tools: ["email-send"]
  actions: ["provide_legal_advice"]
  data: ["financial_accounts"]
requirements:
  disclaimers:
    - trigger: "always"
      text: "This is not legal advice."
      placement: "end"
  citations:
    required: true
    format: "inline"
    min_per_claim: 1
    allowed_sources: ["uk_primary_legislation"]
    blocked_sources: ["wikipedia"]
  human_review:
    required_before: ["finalize_document"]
    review_prompt: "Please review."
  audit:
    log_level: "full"
    include_llm_calls: true
    include_tool_calls: true
    retention_days: 90
scope:
  allowed: ["GB-EAW"]
  behavior_on_unsupported: "escalate"
  escalation_message: "Not supported."
escalation:
  triggers:
    - condition: "topic_match"
      topics: ["criminal_defence"]
      action: "refuse_and_redirect"
      message: "Please consult a solicitor."
      resources: ["Law Society: https://solicitors.lawsociety.org.uk"]
limits:
  max_tokens_per_turn: 4000
  max_tool_calls_per_turn: 5
  max_turns_per_session: 50
  max_concurrent_sessions: 3
  token_budget_daily: 100000
  timeout_seconds: 60
`;
            const mandate = MandateParser.fromString(yaml);
            expect(mandate.metadata.name).toBe("test-mandate");
            expect(mandate.capabilities.tools).toEqual(["legislation-lookup"]);
        });

        it("throws on invalid YAML — missing required fields", () => {
            const yaml = `
version: "1.0"
metadata:
  name: "incomplete"
`;
            expect(() => MandateParser.fromString(yaml)).toThrow();
        });
    });

    describe("validate", () => {
        it("returns success for valid mandates", () => {
            const result = MandateParser.validate(MANDATE_PATH);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        it("returns errors for invalid files", () => {
            // Create a temp validation with bad path
            const result = MandateParser.validate("/nonexistent/mandate.yaml");
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
        });
    });

    describe("all mandate templates parse", () => {
        const templates = [
            "tenant-rights-eaw.mandate.yaml",
            "employment-rights.mandate.yaml",
            "contract-reviewer.mandate.yaml",
            "general-legal-uk.mandate.yaml",
        ];

        for (const template of templates) {
            it(`parses ${template}`, () => {
                const path = resolve(__dirname, `../../../packages/skill-uk-law/mandates/${template}`);
                const mandate = MandateParser.fromFile(path);
                expect(mandate.metadata.name).toBeDefined();
                expect(mandate.version).toBe("1.0");
                expect(mandate.capabilities.tools.length).toBeGreaterThan(0);
            });
        }
    });
});
