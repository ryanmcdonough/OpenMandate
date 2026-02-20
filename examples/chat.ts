#!/usr/bin/env npx tsx
// examples/chat.ts
// Interactive CLI chat — talk to the triage agent in your terminal
//
// Usage:
//   npx tsx examples/chat.ts
//   npm run chat
//
// Requires: ANTHROPIC_API_KEY or OPENAI_API_KEY in .env

import "dotenv/config";
import { createInterface } from "readline";
import { createAnthropic } from "@ai-sdk/anthropic";
import { SkillPackRegistry } from "../src/skills/registry.js";
import { AgentRegistry } from "../src/mastra/agents/agent-registry.js";
import { createMandatedAgent } from "../src/mastra/agents/factory.js";
import { createTriageAgent } from "../src/mastra/agents/triage.js";
import { ConsoleEscalationHandler } from "../src/mastra/agents/escalation-handler.js";
import { ukLawSkillPack } from "../packages/skill-uk-law/index.js";
import { coreSkillPack } from "../packages/skill-core/index.js";

// ─── Bootstrap ───────────────────────────────────────────────

// Create the model instance (AI SDK requires an actual instance, not a string)
const anthropic = createAnthropic();
const model = anthropic("claude-sonnet-4-5-20250929");

// 1. Skill packs
const skillRegistry = new SkillPackRegistry();
skillRegistry.register(ukLawSkillPack);
skillRegistry.register(coreSkillPack);
await skillRegistry.setupAll();

// 2. Mandated agents
const tenantRightsAgent = createMandatedAgent({
    mandatePath: "./packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml",
    model,
    skillRegistry,
    description:
        "Helps tenants in England & Wales understand their rights, calculate deadlines, " +
        "research relevant legislation, and draft correspondence to landlords.",
});

// 3. Agent registry
const agentRegistry = new AgentRegistry();
agentRegistry.register({
    id: "tenant-rights-eaw",
    description:
        "Helps tenants in England & Wales with housing rights — deposit disputes, " +
        "eviction notices (Section 21/Section 8), disrepair, and tenancy issues. " +
        "Can research legislation, calculate deadlines, and draft formal letters.",
    mandateName: "tenant-rights-eaw",
    tags: ["housing", "tenancy", "landlord", "deposit", "eviction", "disrepair", "england-wales"],
    agent: tenantRightsAgent,
});

// 4. Triage agent
const triageAgent = createTriageAgent({
    agentRegistry,
    model,
    escalationHandler: new ConsoleEscalationHandler(),
});

// ─── Interactive Chat ────────────────────────────────────────

console.log("\n🤖 OpenMandate — Interactive Chat");
console.log("━".repeat(50));
console.log("Talk to the triage agent. It will route you to");
console.log("the right specialist based on your needs.\n");
console.log("Available specialists:");
agentRegistry.getAll().forEach((a) => {
    console.log(`  • ${a.id}: ${a.description.slice(0, 80)}...`);
});
console.log('\nType "exit" or "quit" to stop.\n');

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});

const prompt = () => {
    rl.question("You: ", async (input) => {
        const trimmed = input.trim();
        if (!trimmed) {
            prompt();
            return;
        }

        if (["exit", "quit", "q"].includes(trimmed.toLowerCase())) {
            console.log("\n👋 Session ended.\n");
            rl.close();
            return;
        }

        try {
            console.log("\n⏳ Thinking...\n");
            const result = await triageAgent.generate(trimmed);
            const text = typeof result.text === "string" ? result.text : JSON.stringify(result.text);
            console.log(`Agent: ${text}\n`);
        } catch (error: any) {
            // Processor aborts come through as errors — the message IS the response
            console.log(`Agent: ${error.message}\n`);
        }

        prompt();
    });
};

prompt();
