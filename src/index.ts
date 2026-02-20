// src/index.ts
// OpenMandate — Mastra entry point

import { Mastra } from "@mastra/core";
import { SkillPackRegistry } from "./skills/registry.js";
import { AgentRegistry } from "./mastra/agents/agent-registry.js";

// Import skill packs
import { ukLawSkillPack } from "../packages/skill-uk-law/index.js";

// Create global skill pack registry
const registry = new SkillPackRegistry();
registry.register(ukLawSkillPack);

// Run setup hooks (registers keyword expansions, action patterns, etc.)
await registry.setupAll();

// Import agent factories
import { createAnthropic } from "@ai-sdk/anthropic";
import { createMandatedAgent } from "./mastra/agents/factory.js";
import { createTriageAgent } from "./mastra/agents/triage.js";
import { ConsoleEscalationHandler } from "./mastra/agents/escalation-handler.js";

// Create model instance
const anthropic = createAnthropic();
const model = anthropic("claude-sonnet-4-5-20250929");

// Create mandated agents
const tenantRightsAgent = createMandatedAgent({
    mandatePath: "./packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml",
    model: model,
    skillRegistry: registry,
    description:
        "Helps tenants in England & Wales understand their rights, calculate deadlines, " +
        "research relevant legislation, and draft correspondence to landlords. " +
        "Covers deposit protection disputes, Section 21/Section 8 notices, disrepair, " +
        "and housing conditions. References the Housing Act 1988, Housing Act 2004, " +
        "Landlord and Tenant Act 1985, and related statutory instruments.",
});

// Register agents in the agent registry (used by triage)
const agentRegistry = new AgentRegistry();
agentRegistry.register({
    id: "tenant-rights-eaw",
    description:
        "Helps tenants in England & Wales with housing rights — deposit disputes, " +
        "eviction notices (Section 21/Section 8), disrepair complaints, and tenancy issues. " +
        "Can research legislation, calculate deadlines, and draft formal letters.",
    mandateName: "tenant-rights-eaw",
    tags: ["housing", "tenancy", "landlord", "deposit", "eviction", "disrepair", "england-wales"],
    agent: tenantRightsAgent,
});

// Create triage agent (entry point for users who don't know which specialist they need)
// In production, replace ConsoleEscalationHandler with WebhookEscalationHandler
// to forward escalations to a ticketing system, Slack, email, etc.
const triageAgent = createTriageAgent({
    agentRegistry,
    model,
    escalationHandler: new ConsoleEscalationHandler(),
});

// Create Mastra instance — triage is the primary entry point
export const mastra = new Mastra({
    agents: {
        triageAgent,
        tenantRightsAgent,
    },
});
