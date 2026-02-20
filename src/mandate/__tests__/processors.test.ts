// Tests: Core processors — escalation, scope, disclaimer, output-validator

import { describe, it, expect, beforeAll } from "vitest";
import { MandateParser } from "../parser.js";
import { createEscalationProcessor, registerEscalationKeywords } from "../processors/escalation.processor.js";
import { createScopeProcessor, registerScopeKeywords } from "../processors/scope.processor.js";
import { createDisclaimerProcessor } from "../processors/disclaimer.processor.js";
import { createOutputValidatorProcessor, registerProhibitedActionPatterns } from "../processors/output-validator.processor.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANDATE_PATH = resolve(__dirname, "../../../packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml");

function makeUserMessage(text: string) {
    return { role: "user", content: text };
}

function makeAssistantMessage(text: string) {
    return { role: "assistant", content: text };
}

describe("EscalationProcessor", () => {
    const mandate = MandateParser.fromFile(MANDATE_PATH);

    beforeAll(() => {
        // Register UK-law keywords so escalation can detect topics
        registerEscalationKeywords("uk-law-test", {
            criminal_defence: ["criminal", "arrested", "charged with"],
            immigration_asylum: ["deportation", "asylum", "immigration"],
        });
    });

    it("passes through normal messages", async () => {
        const processor = createEscalationProcessor(mandate);
        const messages = [makeUserMessage("What are my tenant rights regarding deposit protection?")];
        let aborted = false;

        const result = await processor.processInput!({
            messages,
            abort: () => { aborted = true; },
        });

        expect(aborted).toBe(false);
        expect(result).toHaveLength(1);
    });

    it("aborts on criminal topic", async () => {
        const processor = createEscalationProcessor(mandate);
        const messages = [makeUserMessage("I've been arrested and need criminal defence help")];
        let abortReason = "";

        await processor.processInput!({
            messages,
            abort: (reason: string) => { abortReason = reason; },
        });

        expect(abortReason).not.toBe("");
        expect(abortReason).toContain("solicitor");
    });

    it("aborts on immigration topic", async () => {
        const processor = createEscalationProcessor(mandate);
        const messages = [makeUserMessage("I'm facing deportation, what should I do?")];
        let abortReason = "";

        await processor.processInput!({
            messages,
            abort: (reason: string) => { abortReason = reason; },
        });

        expect(abortReason).not.toBe("");
    });

    it("detects user distress", async () => {
        const processor = createEscalationProcessor(mandate);
        const messages = [makeUserMessage("I'm desperate, I don't know what to do, help me please")];
        let abortReason = "";

        await processor.processInput!({
            messages,
            abort: (reason: string) => { abortReason = reason; },
        });

        expect(abortReason).not.toBe("");
        expect(abortReason.toLowerCase()).toContain("difficult time");
    });

    it("only checks the LAST user message", async () => {
        const processor = createEscalationProcessor(mandate);
        const messages = [
            makeUserMessage("I've been arrested"),  // Sensitive — but it's not the last
            makeAssistantMessage("I understand"),
            makeUserMessage("What is the tenancy deposit limit?"),  // Normal — last message
        ];
        let aborted = false;

        await processor.processInput!({
            messages,
            abort: () => { aborted = true; },
        });

        expect(aborted).toBe(false);
    });
});

describe("ScopeProcessor", () => {
    const mandate = MandateParser.fromFile(MANDATE_PATH);

    beforeAll(() => {
        registerScopeKeywords("uk-law-test", {
            "GB-EAW": ["england", "wales"],
            "GB-SCT": ["scotland", "scottish law"],
            "GB-NIR": ["northern ireland"],
        });
    });

    it("allows messages about England & Wales", async () => {
        const processor = createScopeProcessor(mandate);
        let aborted = false;
        await processor.processInput!({
            messages: [makeUserMessage("What are tenant rights in England?")],
            abort: () => { aborted = true; },
        });
        expect(aborted).toBe(false);
    });

    it("escalates on Scottish law queries when not in scope", async () => {
        const processor = createScopeProcessor(mandate);
        let abortReason = "";
        await processor.processInput!({
            messages: [makeUserMessage("What are tenant rights under Scottish law?")],
            abort: (reason: string) => { abortReason = reason; },
        });
        expect(abortReason).not.toBe("");
    });

    it("passes through messages with no jurisdiction keywords", async () => {
        const processor = createScopeProcessor(mandate);
        let aborted = false;
        await processor.processInput!({
            messages: [makeUserMessage("How much deposit can a landlord take?")],
            abort: () => { aborted = true; },
        });
        expect(aborted).toBe(false);
    });
});

describe("DisclaimerProcessor", () => {
    const mandate = MandateParser.fromFile(MANDATE_PATH);

    it("appends disclaimer to assistant output", async () => {
        const processor = createDisclaimerProcessor(mandate);
        const messages = [
            makeUserMessage("Tell me about deposit protection"),
            makeAssistantMessage("Your landlord must protect your deposit within 30 days."),
        ];

        const result = await processor.processOutputResult!({
            messages,
            abort: () => { },
        });

        const assistantMsg = result.find((m: any) => m.role === "assistant");
        expect(assistantMsg).toBeDefined();

        // The "always" disclaimer should be injected
        const alwaysDisclaimer = mandate.requirements.disclaimers.find(d => d.trigger === "always");
        if (alwaysDisclaimer) {
            expect(assistantMsg.content).toContain(alwaysDisclaimer.text);
        }
    });

    it("does not duplicate disclaimers", async () => {
        const processor = createDisclaimerProcessor(mandate);
        const alwaysDisclaimer = mandate.requirements.disclaimers.find(d => d.trigger === "always");
        if (!alwaysDisclaimer) return;

        // Pre-include the disclaimer text
        const messages = [
            makeUserMessage("Question"),
            makeAssistantMessage(`Answer. ${alwaysDisclaimer.text}`),
        ];

        const result = await processor.processOutputResult!({
            messages,
            abort: () => { },
        });

        const assistantMsg = result.find((m: any) => m.role === "assistant");
        // Count occurrences of the disclaimer text
        const count = (assistantMsg.content.match(new RegExp(alwaysDisclaimer.text.substring(0, 30), "g")) || []).length;
        expect(count).toBe(1);
    });

    it("returns messages unchanged when no assistant message exists", async () => {
        const processor = createDisclaimerProcessor(mandate);
        const messages = [makeUserMessage("Question")];

        const result = await processor.processOutputResult!({
            messages,
            abort: () => { },
        });

        expect(result).toEqual(messages);
    });
});

describe("OutputValidatorProcessor", () => {
    const mandate = MandateParser.fromFile(MANDATE_PATH);

    beforeAll(() => {
        registerProhibitedActionPatterns("uk-law-test", [
            {
                action: "provide_legal_advice",
                pattern: /\b(I advise you to|my legal advice is)\b/i,
            },
            {
                action: "represent_as_solicitor",
                pattern: /\b(as your solicitor|I am your lawyer)\b/i,
            },
        ]);
    });

    it("passes clean assistant output", async () => {
        const processor = createOutputValidatorProcessor(mandate);
        const messages = [
            makeUserMessage("What are my rights?"),
            makeAssistantMessage("Under the Housing Act 2004, your landlord must protect your deposit."),
        ];
        let aborted = false;

        await processor.processOutputResult!({
            messages,
            abort: () => { aborted = true; },
        });

        expect(aborted).toBe(false);
    });

    it("blocks output containing legal advice language", async () => {
        const processor = createOutputValidatorProcessor(mandate);
        const messages = [
            makeUserMessage("What should I do?"),
            makeAssistantMessage("I advise you to file a claim in county court immediately."),
        ];
        let abortReason = "";

        await processor.processOutputResult!({
            messages,
            abort: (reason: string) => { abortReason = reason; },
        });

        expect(abortReason).not.toBe("");
        expect(abortReason).toContain("provide legal advice");
    });

    it("blocks output impersonating a solicitor", async () => {
        const processor = createOutputValidatorProcessor(mandate);
        const messages = [
            makeUserMessage("Can you help?"),
            makeAssistantMessage("As your solicitor, I recommend we proceed with litigation."),
        ];
        let abortReason = "";

        await processor.processOutputResult!({
            messages,
            abort: (reason: string) => { abortReason = reason; },
        });

        expect(abortReason).not.toBe("");
        expect(abortReason).toContain("represent as solicitor");
    });
});
