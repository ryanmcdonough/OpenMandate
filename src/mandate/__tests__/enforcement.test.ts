// Tests: New enforcement processors — data-access, citation, limits, and human review

import { describe, it, expect, beforeEach } from "vitest";
import { MandateParser } from "../parser.js";
import { createDataAccessProcessor } from "../processors/data-access.processor.js";
import { createCitationProcessor } from "../processors/citation.processor.js";
import { createLimitsProcessor } from "../processors/limits.processor.js";
import { createDisclaimerProcessor } from "../processors/disclaimer.processor.js";
import { resetLimitsState } from "../processors/limits.processor.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Mandate } from "../schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANDATE_PATH = resolve(__dirname, "../../../packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml");
const mandate = MandateParser.fromFile(MANDATE_PATH);

/** Creates a mock abort function that records the call. Use ctx.reason to read the result. */
function makeAbort() {
    const ctx = { reason: null as string | null, options: null as any };
    const fn = (reason: string, options?: any) => { ctx.reason = reason; ctx.options = options; };
    return { fn, ctx };
}

// =============================================
// DATA ACCESS PROCESSOR
// =============================================

describe("Data Access Processor", () => {
    const processor = createDataAccessProcessor(mandate);

    it("allows tool calls with no file arguments", async () => {
        const { fn, ctx } = makeAbort();
        await processor.processOutputStep!({
            messages: [{ role: "assistant", content: "Here is the info" }],
            toolCalls: [{ toolName: "legislation-lookup", args: { query: "Housing Act" } }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).toBeNull();
    });

    it("allows files with permitted extensions", async () => {
        const { fn, ctx } = makeAbort();
        await processor.processOutputStep!({
            messages: [], toolCalls: [{ toolName: "doc-reader", args: { file: "contract.pdf" } }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).toBeNull();
    });

    it("blocks files with prohibited extensions (.exe)", async () => {
        const { fn, ctx } = makeAbort();
        await processor.processOutputStep!({
            messages: [], toolCalls: [{ toolName: "doc-reader", args: { file: "malware.exe" } }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).not.toBeNull();
        expect(ctx.reason!).toContain(".exe");
    });

    it("blocks files with prohibited extensions (.js)", async () => {
        const { fn, ctx } = makeAbort();
        await processor.processOutputStep!({
            messages: [], toolCalls: [{ toolName: "doc-reader", args: { file: "script.js" } }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).not.toBeNull();
        expect(ctx.reason!).toContain(".js");
    });

    it("blocks write operations when mandate is read-only", async () => {
        const readOnlyMandate = {
            ...mandate,
            capabilities: {
                ...mandate.capabilities,
                data_access: [
                    { scope: "user_uploads", permissions: ["read"], file_types: [".pdf"] },
                ],
            },
        } as unknown as Mandate;
        const readOnlyProcessor = createDataAccessProcessor(readOnlyMandate);

        const { fn, ctx } = makeAbort();
        await readOnlyProcessor.processOutputStep!({
            messages: [], toolCalls: [{ toolName: "file-write", args: { path: "output.txt", content: "data" } }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).not.toBeNull();
        expect(ctx.reason!).toContain("Write operations are not permitted");
    });

    it("allows .pdf with tenant-rights mandate", async () => {
        const { fn, ctx } = makeAbort();
        await processor.processOutputStep!({
            messages: [], toolCalls: [{ toolName: "doc-reader", args: { path: "tenancy.pdf" } }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).toBeNull();
    });
});

// =============================================
// CITATION PROCESSOR
// =============================================

describe("Citation Processor", () => {
    const citationMandate = {
        ...mandate,
        requirements: {
            ...mandate.requirements,
            citations: {
                required: true,
                format: "inline",
                min_per_claim: 1,
                allowed_sources: ["uk_primary_legislation"],
                blocked_sources: ["wikipedia", "reddit"],
            },
        },
    } as unknown as Mandate;
    const processor = createCitationProcessor(citationMandate);

    it("allows short responses without citations", async () => {
        const { fn, ctx } = makeAbort();
        await processor.processOutputResult!({
            messages: [{ role: "assistant", content: "Yes, you can." }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).toBeNull();
    });

    it("allows long responses with legislation citations", async () => {
        const { fn, ctx } = makeAbort();
        const text = "A".repeat(300) + " Under the Housing Act 2004, s.213, landlords must protect deposits.";
        await processor.processOutputResult!({
            messages: [{ role: "assistant", content: text }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).toBeNull();
    });

    it("blocks substantive responses without citations", async () => {
        const { fn, ctx } = makeAbort();
        const text = "A".repeat(300) + " Your landlord must protect your deposit. You can claim it back.";
        await processor.processOutputResult!({
            messages: [{ role: "assistant", content: text }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).not.toBeNull();
        expect(ctx.reason!).toContain("lacks citations");
    });

    it("blocks responses citing Wikipedia", async () => {
        const { fn, ctx } = makeAbort();
        await processor.processOutputResult!({
            messages: [{ role: "assistant", content: "According to wikipedia.org/wiki/Housing, your rights include..." }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).not.toBeNull();
        expect(ctx.reason!).toContain("blocked source");
    });

    it("blocks responses citing Reddit", async () => {
        const { fn, ctx } = makeAbort();
        await processor.processOutputResult!({
            messages: [{ role: "assistant", content: "As discussed on reddit.com/r/legaladvice, you should..." }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).not.toBeNull();
        expect(ctx.reason!).toContain("blocked source");
    });

    it("allows responses with case law citations", async () => {
        const { fn, ctx } = makeAbort();
        const text = "A".repeat(300) + " As established in [2024] EWCA Civ 123, the court held that...";
        await processor.processOutputResult!({
            messages: [{ role: "assistant", content: text }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).toBeNull();
    });

    it("is a no-op when citations are not required", async () => {
        const noReqMandate = {
            ...mandate,
            requirements: {
                ...mandate.requirements,
                citations: { ...mandate.requirements.citations, required: false },
            },
        } as unknown as Mandate;
        const noop = createCitationProcessor(noReqMandate);
        const { fn, ctx } = makeAbort();
        const text = "A".repeat(300) + " No citations here at all.";
        await noop.processOutputResult!({
            messages: [{ role: "assistant", content: text }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).toBeNull();
    });
});

// =============================================
// LIMITS PROCESSOR
// =============================================

describe("Limits Processor", () => {
    beforeEach(() => resetLimitsState());

    it("allows first message within limits", async () => {
        const proc = createLimitsProcessor(mandate);
        const { fn, ctx } = makeAbort();
        await proc.processInput!({
            messages: [{ role: "user", content: "Hello" }],
            abort: fn, retryCount: 0, state: {},
        });
        expect(ctx.reason).toBeNull();
    });

    it("truncates response exceeding max_tokens_per_turn", async () => {
        const proc = createLimitsProcessor(mandate);
        const longResponse = "A".repeat(40000);
        const result = await proc.processOutputResult!({
            messages: [{ role: "assistant", content: longResponse }],
            abort: () => { }, retryCount: 0, state: {},
        });
        const output = (result as any[])[0].content;
        expect(output.length).toBeLessThan(longResponse.length);
        expect(output).toContain("[Response truncated");
    });

    it("allows response within token limits", async () => {
        const proc = createLimitsProcessor(mandate);
        const short = "Your deposit must be protected within 30 days.";
        const result = await proc.processOutputResult!({
            messages: [{ role: "assistant", content: short }],
            abort: () => { }, retryCount: 0, state: {},
        });
        expect((result as any[])[0].content).toBe(short);
    });

    it("blocks when max_turns_per_session is exceeded", async () => {
        const lowTurnMandate = {
            ...mandate,
            limits: { ...mandate.limits, max_turns_per_session: 2 },
        } as unknown as Mandate;
        const proc = createLimitsProcessor(lowTurnMandate);

        const a1 = makeAbort();
        await proc.processInput!({
            messages: [{ role: "user", content: "Hi" }], abort: a1.fn, retryCount: 0, state: {},
        });
        expect(a1.ctx.reason).toBeNull();

        const a2 = makeAbort();
        await proc.processInput!({
            messages: [{ role: "user", content: "How?" }], abort: a2.fn, retryCount: 0, state: {},
        });
        expect(a2.ctx.reason).toBeNull();

        const a3 = makeAbort();
        await proc.processInput!({
            messages: [{ role: "user", content: "Why?" }], abort: a3.fn, retryCount: 0, state: {},
        });
        expect(a3.ctx.reason).not.toBeNull();
        expect(a3.ctx.reason!).toContain("Session limit reached");
    });
});

// =============================================
// HUMAN REVIEW ENFORCEMENT
// =============================================

describe("Human Review Enforcement", () => {
    const processor = createDisclaimerProcessor(mandate);

    it("injects human review prompt when document is generated", async () => {
        const result = await processor.processOutputResult!({
            messages: [{
                role: "assistant",
                content: "[DRAFT — LETTER BEFORE ACTION]\n\nDear Landlord,\n\nI am writing to demand the return of my deposit...",
            }],
            abort: () => { }, retryCount: 0, state: {},
        });
        expect((result as any[])[0].content).toContain("Please review");
    });

    it("injects human review prompt when deadline is mentioned", async () => {
        const result = await processor.processOutputResult!({
            messages: [{
                role: "assistant",
                content: "You must act before the deadline expires. The time limit is 30 days from the date of the notice.",
            }],
            abort: () => { }, retryCount: 0, state: {},
        });
        expect((result as any[])[0].content).toContain("Please review");
    });

    it("does not inject review prompt for simple responses", async () => {
        const result = await processor.processOutputResult!({
            messages: [{
                role: "assistant",
                content: "Yes, tenants have rights under the Housing Act.",
            }],
            abort: () => { }, retryCount: 0, state: {},
        });
        expect((result as any[])[0].content).not.toContain("⚠️");
    });
});
