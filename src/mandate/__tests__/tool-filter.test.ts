// Tests: Tool filter — whitelist + prohibition filtering

import { describe, it, expect } from "vitest";
import { MandateParser } from "../parser.js";
import { filterToolsByMandate } from "../tool-filter.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANDATE_PATH = resolve(__dirname, "../../../packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml");

// Mock tools representing all tools a skill pack might provide
const mockAllTools: Record<string, any> = {
    "formal-letter": { id: "formal-letter", name: "Formal Letter Drafting" },
    "legislation-lookup": { id: "legislation-lookup", name: "Legislation Lookup" },
    "deadline-calculator": { id: "deadline-calculator", name: "Deadline Calculator" },
    "case-law-search": { id: "case-law-search", name: "Case Law Search" },
    "email-send": { id: "email-send", name: "Email Sender" },
    "shell-execute": { id: "shell-execute", name: "Shell Execute" },
    "browser-navigate": { id: "browser-navigate", name: "Browser Navigate" },
    "calendar-create": { id: "calendar-create", name: "Calendar Create" },
    "calendar-delete": { id: "calendar-delete", name: "Calendar Delete" },
    "payment-stripe": { id: "payment-stripe", name: "Payment Stripe" },
    "payment-paypal": { id: "payment-paypal", name: "Payment PayPal" },
    "file-write": { id: "file-write", name: "File Write" },
};

describe("filterToolsByMandate", () => {
    const mandate = MandateParser.fromFile(MANDATE_PATH);

    it("returns only whitelisted tools", () => {
        const filtered = filterToolsByMandate(mockAllTools, mandate);
        const filteredIds = Object.keys(filtered);

        // Should include tools from capabilities.tools that aren't prohibited
        for (const toolId of mandate.capabilities.tools) {
            if (!mandate.prohibitions.tools.includes(toolId)) {
                expect(filteredIds).toContain(toolId);
            }
        }
    });

    it("excludes tools not in the whitelist", () => {
        const filtered = filterToolsByMandate(mockAllTools, mandate);
        expect(filtered["email-send"]).toBeUndefined();
        expect(filtered["shell-execute"]).toBeUndefined();
        expect(filtered["browser-navigate"]).toBeUndefined();
    });

    it("excludes wildcard-prohibited tools", () => {
        const filtered = filterToolsByMandate(mockAllTools, mandate);
        // calendar-* and payment-* are in prohibitions
        expect(filtered["calendar-create"]).toBeUndefined();
        expect(filtered["calendar-delete"]).toBeUndefined();
        expect(filtered["payment-stripe"]).toBeUndefined();
        expect(filtered["payment-paypal"]).toBeUndefined();
    });

    it("excludes explicitly prohibited tools even if whitelisted", () => {
        // Create a mandate where a tool is both allowed and explicitly prohibited
        const contradictoryMandate = {
            ...mandate,
            capabilities: { ...mandate.capabilities, tools: ["email-send", "formal-letter"] },
            prohibitions: { ...mandate.prohibitions, tools: ["email-send", "calendar-*", "payment-*"] },
        };
        const filtered = filterToolsByMandate(mockAllTools, contradictoryMandate);
        expect(filtered["email-send"]).toBeUndefined();
        expect(filtered["formal-letter"]).toBeDefined();
    });

    it("returns empty object when no tools match", () => {
        const emptyMandate = {
            ...mandate,
            capabilities: { ...mandate.capabilities, tools: ["nonexistent-tool"] },
        };
        const filtered = filterToolsByMandate(mockAllTools, emptyMandate);
        expect(Object.keys(filtered)).toHaveLength(0);
    });

    it("handles empty tool records", () => {
        const filtered = filterToolsByMandate({}, mandate);
        expect(Object.keys(filtered)).toHaveLength(0);
    });
});
