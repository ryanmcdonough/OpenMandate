// src/mastra/agents/factory.ts
// Creates a Mastra Agent with full mandate enforcement

import { Agent } from "@mastra/core/agent";

import { MandateParser } from "../../mandate/parser.js";
import { filterToolsByMandate } from "../../mandate/tool-filter.js";
import { buildMandateSystemPrompt } from "../../mandate/system-prompt-builder.js";
import { createEscalationProcessor } from "../../mandate/processors/escalation.processor.js";
import { createScopeProcessor } from "../../mandate/processors/scope.processor.js";
import { createToolGateProcessor } from "../../mandate/processors/tool-gate.processor.js";
import { createDataAccessProcessor } from "../../mandate/processors/data-access.processor.js";
import { createOutputValidatorProcessor } from "../../mandate/processors/output-validator.processor.js";
import { createCitationProcessor } from "../../mandate/processors/citation.processor.js";
import { createDisclaimerProcessor } from "../../mandate/processors/disclaimer.processor.js";
import { createLimitsProcessor } from "../../mandate/processors/limits.processor.js";
import { createAuditProcessor } from "../../mandate/processors/audit.processor.js";
import { AuditLogger } from "../../audit/logger.js";
import type { SkillPackRegistry } from "../../skills/registry.js";

interface CreateMandatedAgentOptions {
    mandatePath: string;
    model: any;                 // AI SDK model instance or string
    description: string;        // Human description for system prompt
    skillRegistry: SkillPackRegistry;
    auditDbPath?: string;
}

/**
 * Creates a Mastra Agent with full mandate enforcement.
 *
 * This is the key function — it:
 * 1. Parses the mandate YAML
 * 2. Validates that required skill packs are loaded
 * 3. Aggregates tools from skill packs, filters via mandate
 * 4. Builds system prompt from mandate + skill pack fragments
 * 5. Assembles processor chain: core processors + skill pack processors
 * 6. Wires all processors into the Mastra Agent constructor
 * 7. Returns a standard Mastra Agent that's fully governed
 */
export function createMandatedAgent(options: CreateMandatedAgentOptions): Agent {
    const {
        mandatePath,
        model,
        description,
        skillRegistry,
        auditDbPath = "./data/audit/audit.db",
    } = options;

    // 1. Parse and validate the mandate
    const mandate = MandateParser.fromFile(mandatePath);

    // 2. Validate required skill packs are registered
    const requiredPacks = mandate.metadata.skill_packs || [];
    const loadedPacks = [];
    for (const packId of requiredPacks) {
        const pack = skillRegistry.get(packId);
        if (!pack) {
            throw new Error(
                `Mandate "${mandate.metadata.name}" requires skill pack "${packId}" ` +
                `but it is not registered. Install it with: npm install @openmandate/skill-${packId}`
            );
        }
        loadedPacks.push(pack);
    }

    // 3. Aggregate tools from all registered skill packs, then filter by mandate
    const allTools = skillRegistry.getAllTools();
    const allowedTools = filterToolsByMandate(allTools, mandate);

    // 4. Build system prompt from mandate + skill pack fragments
    const instructions = buildMandateSystemPrompt(mandate, description, loadedPacks);

    // 5. Create audit logger
    const auditLogger = new AuditLogger(auditDbPath);

    // 6. Build processor chains — core + skill pack processors
    const skillInputProcessors = loadedPacks
        .flatMap(p => p.inputProcessors || [])
        .map(factory => factory(mandate));

    const skillOutputProcessors = loadedPacks
        .flatMap(p => p.outputProcessors || [])
        .map(factory => factory(mandate));

    // Core input processors (run before LLM sees the message)
    // Order: limits → escalation → scope
    const inputProcessors = [
        createLimitsProcessor(mandate),         // Check rate limits first
        createEscalationProcessor(mandate),     // Check for sensitive topics
        createScopeProcessor(mandate),          // Check jurisdiction/scope
        ...skillInputProcessors,                // Skill-pack-specific checks
    ];

    // Core output processors (run after LLM responds)
    // Order: tool-gate → data-access → output-validator → citation → disclaimer → audit
    const outputProcessors = [
        createToolGateProcessor(mandate, auditLogger),   // Block prohibited tool calls
        createDataAccessProcessor(mandate),              // Enforce file type + write restrictions
        createOutputValidatorProcessor(mandate),         // Block prohibited action language
        createCitationProcessor(mandate),                // Enforce citation requirements
        createDisclaimerProcessor(mandate),              // Inject disclaimers + human review prompt
        ...skillOutputProcessors,                        // Skill-pack-specific output checks
        createAuditProcessor(mandate, auditLogger),      // Log everything (always last)
    ];

    // 7. Assemble the Mastra Agent with full processor wiring
    return new Agent({
        id: mandate.metadata.name,
        name: mandate.metadata.name,
        instructions,
        model,
        tools: allowedTools,
        inputProcessors,
        outputProcessors,
    } as any);
}

export type { CreateMandatedAgentOptions };
