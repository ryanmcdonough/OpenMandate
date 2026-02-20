// src/mastra/agents/triage.ts
// Triage Agent — classifies user intent and routes to the correct mandated agent

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { AgentRegistry } from "./agent-registry.js";
import {
    type EscalationHandler,
    type EscalationRequest,
    ConsoleEscalationHandler,
    generateReferenceId,
} from "./escalation-handler.js";

export interface CreateTriageAgentOptions {
    agentRegistry: AgentRegistry;
    model: any;
    /** Optional escalation handler. Defaults to ConsoleEscalationHandler. */
    escalationHandler?: EscalationHandler;
}

/**
 * Creates a triage agent that routes users to the right specialist.
 *
 * The triage agent:
 * 1. Has a system prompt listing all available specialist agents
 * 2. Uses the LLM to classify intent from the user's message
 * 3. Calls the `route-to-agent` tool to hand off to the target agent
 * 4. If no specialist matches, uses `escalate-to-human` to create a handoff record
 * 5. If intent is ambiguous, asks a clarifying question before routing
 *
 * The triage agent has NO mandate — it's a lightweight router, not a domain agent.
 * All mandate enforcement happens on the target agent after handoff.
 */
export function createTriageAgent(options: CreateTriageAgentOptions): Agent {
    const {
        agentRegistry,
        model,
        escalationHandler = new ConsoleEscalationHandler(),
    } = options;

    // Build the agent summary for the system prompt
    const agentSummary = agentRegistry.buildAgentSummary();
    const agentIds = agentRegistry.getIds();

    // === Route Tool ===
    const routeToAgentTool = createTool({
        id: "route-to-agent",
        description:
            "Routes the user's message to a specialist agent. " +
            "Call this tool when you have identified the right specialist for the user's needs. " +
            "Pass the agent ID and the user's original message (or a refined version).",
        inputSchema: z.object({
            agent_id: z
                .string()
                .describe(
                    `The ID of the specialist agent to route to. Available: ${agentIds.join(", ")}`
                ),
            user_message: z
                .string()
                .describe(
                    "The user's message to forward to the specialist. " +
                    "Include relevant context from the triage conversation."
                ),
        }),
        outputSchema: z.object({
            response: z.string().describe("The specialist agent's response"),
            agent_id: z.string().describe("The ID of the agent that handled the request"),
            routed: z.boolean().describe("Whether routing was successful"),
        }),
        execute: async (args: any) => {
            // Mastra may pass input as { context }, directly, or nested
            const input = args?.context ?? args;
            const registered = agentRegistry.get(input.agent_id);
            if (!registered) {
                return {
                    response:
                        `I couldn't find a specialist for "${input.agent_id}". ` +
                        `Available specialists: ${agentIds.join(", ")}`,
                    agent_id: input.agent_id,
                    routed: false,
                };
            }

            try {
                const result = await registered.agent.generate(input.user_message);
                const text =
                    typeof result.text === "string"
                        ? result.text
                        : JSON.stringify(result.text);
                return {
                    response: text,
                    agent_id: input.agent_id,
                    routed: true,
                };
            } catch (error: any) {
                // Processor aborts come through as errors — their message IS the response
                return {
                    response: error.message || "The specialist encountered an issue.",
                    agent_id: input.agent_id,
                    routed: true,
                };
            }
        },
    });

    // === Escalate to Human Tool ===
    const escalateToHumanTool = createTool({
        id: "escalate-to-human",
        description:
            "Escalates the conversation to a human operator. Use this when: " +
            "(1) no specialist agent can handle the user's request, " +
            "(2) the user explicitly asks to speak to a person, or " +
            "(3) the situation requires human judgement that AI cannot provide.",
        inputSchema: z.object({
            reason: z
                .string()
                .describe(
                    "Why this is being escalated, e.g. 'No specialist available for immigration law' " +
                    "or 'User requested to speak with a human'"
                ),
            user_message: z
                .string()
                .describe("The user's original message or a summary of their needs"),
            conversation_summary: z
                .string()
                .describe(
                    "Brief summary of the triage conversation so the human has context"
                ),
            agents_considered: z
                .array(z.string())
                .default([])
                .describe(
                    "IDs of specialist agents that were considered but didn't match"
                ),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            reference_id: z.string(),
            message: z.string(),
        }),
        execute: async (args: any) => {
            // Mastra may pass input as { context }, directly, or nested
            const input = args?.context ?? args;
            const request: EscalationRequest = {
                referenceId: generateReferenceId(),
                userMessage: input.user_message,
                reason: input.reason,
                conversationSummary: input.conversation_summary,
                platform: "unknown", // Will be enriched by bridges in future
                userId: "unknown",
                timestamp: new Date().toISOString(),
                agentsConsidered: input.agents_considered || [],
            };

            const result = await escalationHandler.escalate(request);

            return {
                success: result.success,
                reference_id: result.referenceId,
                message: result.message,
            };
        },
    });

    const instructions = `You are the OpenMandate Triage Assistant. Your role is to understand what the user needs and connect them with the right specialist agent — or escalate to a human if no specialist is available.

## How You Work

1. Read the user's message carefully
2. Identify which specialist agent is the best fit
3. Use the \`route-to-agent\` tool to forward their message to the specialist
4. Return the specialist's response directly — do NOT add your own commentary around it

## Available Specialist Agents

${agentSummary}

## Routing Guidelines

- If the user's intent is **clear**, route immediately. Do not ask unnecessary questions.
  Example: "My landlord won't return my deposit" → route to tenant-rights agent
- If the user's intent is **ambiguous**, ask **ONE** clarifying question, then route.
  Example: "I need legal help" → "Could you tell me a bit more? Is this about housing/tenancy, employment, consumer rights, or something else?"
- If **no specialist matches**, use the \`escalate-to-human\` tool to connect them with a person.
- If the **user asks to speak to a person**, use \`escalate-to-human\` immediately — do not try to convince them to use an AI specialist.

## Human Escalation

Use the \`escalate-to-human\` tool when:
- The user's topic doesn't match any available specialist
- The user explicitly requests human assistance ("can I speak to someone?", "I want a real person")
- The situation seems too complex or sensitive for AI handling

When escalating, provide:
- A clear reason why you're escalating
- The user's original message
- A summary of your conversation
- Which specialists you considered (if any)

After escalating, relay the reference ID and confirmation to the user so they can track their request.

## Important

- You are a router, not a domain expert. **Never** answer domain questions yourself.
- Always route to a specialist or escalate — your job is to get the user to the right place.
- When the specialist responds, relay their response directly without modification.`;

    return new Agent({
        id: "triage",
        name: "OpenMandate Triage",
        instructions,
        model,
        tools: {
            "route-to-agent": routeToAgentTool,
            "escalate-to-human": escalateToHumanTool,
        },
    } as any);
}
