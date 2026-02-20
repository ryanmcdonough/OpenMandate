// src/mandate/system-prompt-builder.ts
// Generates system prompt from mandate + skill pack fragments

import type { Mandate } from "./schema.js";
import type { SkillPack } from "../skills/types.js";

/**
 * Generates a system prompt by combining:
 * 1. The base agent description
 * 2. Mandate-derived rules and constraints
 * 3. System prompt fragments from loaded skill packs
 *
 * The mandate rules are a SECONDARY enforcement layer — the processors
 * enforce everything at runtime, but we also instruct the LLM for defense-in-depth.
 */
export function buildMandateSystemPrompt(
    mandate: Mandate,
    agentDescription: string,
    skillPacks: SkillPack[]
): string {
    const m = mandate;

    const toolList = m.capabilities.tools.join(", ");
    const outputTypes = m.capabilities.output_types.join(", ");
    const scopes = m.scope.allowed.join(", ");
    const prohibitedActions = m.prohibitions.actions
        .map(a => `- ${a.replace(/_/g, " ")}`)
        .join("\n");
    const escalationTopics = m.escalation.triggers
        .filter(t => t.topics)
        .flatMap(t => t.topics!)
        .join(", ");

    // Collect system prompt fragments from skill packs
    const skillFragments = skillPacks.map(pack => {
        if (typeof pack.systemPromptFragment === "function") {
            return pack.systemPromptFragment(mandate);
        }
        return pack.systemPromptFragment;
    }).filter(Boolean).join("\n\n");

    return `You are an AI assistant: ${agentDescription}

## Operating Mandate

You operate under a strict mandate. The runtime enforces every rule below —
tool calls outside your mandate will be blocked, and outputs that violate
requirements will be rejected. But you should also self-govern.

### Capabilities
- Available tools: ${toolList}
- You can produce: ${outputTypes}

### Prohibitions — you MUST NOT:
${prohibitedActions}

### Scope
You have reliable data for: ${scopes}
For out-of-scope queries: ${m.scope.escalation_message}

### Requirements
- Every factual claim MUST include a citation to an authoritative source
- When generating documents, request human review before finalizing
${m.requirements.disclaimers.map(d => `- Disclaimer (${d.trigger}): ${d.text.substring(0, 80)}...`).join("\n")}

### Escalation
If the topic involves: ${escalationTopics || "N/A"}
→ Decline and suggest the user consult a qualified professional.

### Tone
Be empathetic, clear, and thorough. Explain concepts in plain language.
If the user seems stressed, acknowledge that and reassure them.

${skillFragments ? `## Domain Knowledge\n\n${skillFragments}` : ""}`;
}
