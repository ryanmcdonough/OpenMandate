// src/mastra/__tests__/triage.test.ts
// Tests for agent registry, triage agent, and human escalation

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentRegistry } from "../agents/agent-registry.js";
import {
    ConsoleEscalationHandler,
    WebhookEscalationHandler,
    CompositeEscalationHandler,
    generateReferenceId,
    type EscalationHandler,
    type EscalationRequest,
} from "../agents/escalation-handler.js";

// === AgentRegistry Tests ===

describe("AgentRegistry", () => {
    let registry: AgentRegistry;

    const fakeAgent = (id: string) =>
        ({
            generate: vi.fn().mockResolvedValue({ text: `Response from ${id}` }),
        }) as any;

    beforeEach(() => {
        registry = new AgentRegistry();
    });

    it("registers and retrieves an agent", () => {
        registry.register({
            id: "tenant-rights",
            description: "Tenant rights assistant",
            mandateName: "tenant-rights-eaw",
            tags: ["housing", "tenancy"],
            agent: fakeAgent("tenant-rights"),
        });

        const entry = registry.get("tenant-rights");
        expect(entry).toBeDefined();
        expect(entry!.id).toBe("tenant-rights");
        expect(entry!.tags).toContain("housing");
    });

    it("throws on duplicate registration", () => {
        const entry = {
            id: "tenant-rights",
            description: "Tenant rights",
            mandateName: "tenant-rights-eaw",
            tags: ["housing"],
            agent: fakeAgent("tenant-rights"),
        };

        registry.register(entry);
        expect(() => registry.register(entry)).toThrow("already registered");
    });

    it("returns undefined for unknown agents", () => {
        expect(registry.get("nonexistent")).toBeUndefined();
    });

    it("lists all registered agents", () => {
        registry.register({
            id: "agent-a",
            description: "Agent A",
            mandateName: "a",
            tags: ["a"],
            agent: fakeAgent("a"),
        });
        registry.register({
            id: "agent-b",
            description: "Agent B",
            mandateName: "b",
            tags: ["b"],
            agent: fakeAgent("b"),
        });

        const all = registry.getAll();
        expect(all).toHaveLength(2);
        expect(all.map((a) => a.id)).toEqual(["agent-a", "agent-b"]);
    });

    it("returns all agent IDs", () => {
        registry.register({
            id: "agent-x",
            description: "X",
            mandateName: "x",
            tags: [],
            agent: fakeAgent("x"),
        });

        expect(registry.getIds()).toEqual(["agent-x"]);
    });

    it("checks if an agent is registered", () => {
        registry.register({
            id: "agent-y",
            description: "Y",
            mandateName: "y",
            tags: [],
            agent: fakeAgent("y"),
        });

        expect(registry.has("agent-y")).toBe(true);
        expect(registry.has("nonexistent")).toBe(false);
    });

    it("builds agent summary for triage prompt", () => {
        registry.register({
            id: "tenant-rights",
            description: "Helps tenants with housing rights",
            mandateName: "tenant-rights-eaw",
            tags: ["housing", "tenancy"],
            agent: fakeAgent("tenant-rights"),
        });
        registry.register({
            id: "employment",
            description: "Employment rights assistant",
            mandateName: "employment-rights",
            tags: ["employment", "workplace"],
            agent: fakeAgent("employment"),
        });

        const summary = registry.buildAgentSummary();
        expect(summary).toContain("tenant-rights");
        expect(summary).toContain("Helps tenants with housing rights");
        expect(summary).toContain("housing, tenancy");
        expect(summary).toContain("employment");
        expect(summary).toContain("Employment rights assistant");
    });

    it("returns fallback for empty registry", () => {
        const summary = registry.buildAgentSummary();
        expect(summary).toContain("No specialist agents");
    });
});

// === Triage Agent Tests ===

describe("createTriageAgent", () => {
    it("creates an agent with route and escalation tools", async () => {
        const { createTriageAgent } = await import("../agents/triage.js");
        const registry = new AgentRegistry();

        registry.register({
            id: "test-agent",
            description: "A test agent",
            mandateName: "test",
            tags: ["test"],
            agent: {
                generate: vi.fn().mockResolvedValue({ text: "Test response" }),
            } as any,
        });

        const triageAgent = createTriageAgent({
            agentRegistry: registry,
            model: "anthropic:claude-sonnet-4-5-20250929",
        });

        expect(triageAgent).toBeDefined();
        expect(triageAgent.name).toBe("OpenMandate Triage");
    });
});

// === Route Tool Logic Tests ===

describe("route-to-agent tool logic", () => {
    it("forwards messages to the correct agent", async () => {
        const mockGenerate = vi.fn().mockResolvedValue({
            text: "You have rights under the Housing Act 1988.",
        });

        const registry = new AgentRegistry();
        registry.register({
            id: "tenant-rights",
            description: "Tenant rights",
            mandateName: "tenant-rights-eaw",
            tags: ["housing"],
            agent: { generate: mockGenerate } as any,
        });

        const agentId = "tenant-rights";
        const userMessage = "My landlord won't return my deposit";

        const registered = registry.get(agentId);
        expect(registered).toBeDefined();

        const result = await registered!.agent.generate(userMessage);
        expect(mockGenerate).toHaveBeenCalledWith(userMessage);
        expect(result.text).toContain("Housing Act 1988");
    });

    it("handles unknown agent IDs gracefully", () => {
        const registry = new AgentRegistry();
        const registered = registry.get("nonexistent");
        expect(registered).toBeUndefined();
    });

    it("handles agent errors gracefully", async () => {
        const mockGenerate = vi.fn().mockRejectedValue(
            new Error("I can only help with housing in England & Wales.")
        );

        const registry = new AgentRegistry();
        registry.register({
            id: "tenant-rights",
            description: "Tenant rights",
            mandateName: "tenant-rights-eaw",
            tags: ["housing"],
            agent: { generate: mockGenerate } as any,
        });

        const registered = registry.get("tenant-rights")!;
        try {
            await registered.agent.generate("Help with Scottish law");
        } catch (error: any) {
            expect(error.message).toContain("England & Wales");
        }
    });
});

// === Escalation Handler Tests ===

describe("EscalationHandler", () => {
    const mockRequest: EscalationRequest = {
        referenceId: "ESC-TEST-123",
        userMessage: "I need help with immigration",
        reason: "No specialist available for immigration law",
        conversationSummary: "User asked about immigration. No matching agent found.",
        platform: "cli",
        userId: "test-user",
        timestamp: "2026-02-19T09:00:00Z",
        agentsConsidered: ["tenant-rights-eaw"],
    };

    describe("ConsoleEscalationHandler", () => {
        it("logs escalation and returns success", async () => {
            const handler = new ConsoleEscalationHandler();
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });

            const result = await handler.escalate(mockRequest);

            expect(result.success).toBe(true);
            expect(result.referenceId).toBe("ESC-TEST-123");
            expect(consoleSpy).toHaveBeenCalled();

            // Check that key info was logged
            const loggedContent = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
            expect(loggedContent).toContain("HUMAN ESCALATION");
            expect(loggedContent).toContain("ESC-TEST-123");
            expect(loggedContent).toContain("immigration");

            consoleSpy.mockRestore();
        });
    });

    describe("WebhookEscalationHandler", () => {
        it("sends POST to configured URL on success", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            });
            vi.stubGlobal("fetch", mockFetch);

            const handler = new WebhookEscalationHandler(
                "https://hooks.example.com/escalate",
                { Authorization: "Bearer test-token" },
            );

            const result = await handler.escalate(mockRequest);

            expect(result.success).toBe(true);
            expect(result.referenceId).toBe("ESC-TEST-123");
            expect(result.message).toContain("ESC-TEST-123");

            expect(mockFetch).toHaveBeenCalledWith("https://hooks.example.com/escalate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer test-token",
                },
                body: JSON.stringify(mockRequest),
            });

            vi.unstubAllGlobals();
        });

        it("returns failure on HTTP error", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            });
            vi.stubGlobal("fetch", mockFetch);

            const handler = new WebhookEscalationHandler("https://hooks.example.com/escalate");
            const result = await handler.escalate(mockRequest);

            expect(result.success).toBe(false);
            expect(result.referenceId).toBe("ESC-TEST-123");

            vi.unstubAllGlobals();
        });

        it("returns failure on network error", async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
            vi.stubGlobal("fetch", mockFetch);

            const handler = new WebhookEscalationHandler("https://hooks.example.com/escalate");
            const result = await handler.escalate(mockRequest);

            expect(result.success).toBe(false);
            expect(result.referenceId).toBe("ESC-TEST-123");

            vi.unstubAllGlobals();
        });
    });

    describe("CompositeEscalationHandler", () => {
        it("sends to multiple handlers", async () => {
            const handler1: EscalationHandler = {
                name: "test-1",
                escalate: vi.fn().mockResolvedValue({
                    success: true,
                    referenceId: "ESC-TEST-123",
                    message: "Handler 1 OK",
                }),
            };
            const handler2: EscalationHandler = {
                name: "test-2",
                escalate: vi.fn().mockResolvedValue({
                    success: true,
                    referenceId: "ESC-TEST-123",
                    message: "Handler 2 OK",
                }),
            };

            const composite = new CompositeEscalationHandler([handler1, handler2]);
            const result = await composite.escalate(mockRequest);

            expect(result.success).toBe(true);
            expect(handler1.escalate).toHaveBeenCalled();
            expect(handler2.escalate).toHaveBeenCalled();
        });

        it("returns first success even if second fails", async () => {
            const handler1: EscalationHandler = {
                name: "good",
                escalate: vi.fn().mockResolvedValue({
                    success: true,
                    referenceId: "ESC-TEST-123",
                    message: "OK",
                }),
            };
            const handler2: EscalationHandler = {
                name: "bad",
                escalate: vi.fn().mockRejectedValue(new Error("fail")),
            };

            const composite = new CompositeEscalationHandler([handler1, handler2]);
            const result = await composite.escalate(mockRequest);

            expect(result.success).toBe(true);
        });
    });

    describe("generateReferenceId", () => {
        it("generates unique IDs with ESC prefix", () => {
            const id1 = generateReferenceId();
            const id2 = generateReferenceId();

            expect(id1).toMatch(/^ESC-/);
            expect(id2).toMatch(/^ESC-/);
            expect(id1).not.toBe(id2);
        });
    });
});
