# Getting Started with OpenMandate

Welcome! This guide will take you from `npm init` to running a fully governed AI agent in your terminal. We'll build a simple "Tenant Rights" agent based on the provided `uk-law` skill pack, but the concepts apply universally to any domain.

By the end of this tutorial, you will:
1. Initialize a Mastra + OpenMandate project
2. Write a declarative Mandate (YAML)
3. Create a Tool and a Skill Pack
4. Run an interactive chat loop with your agent

---

## 1. Prerequisites & Installation

OpenMandate extends [Mastra.ai](https://mastra.ai/docs), meaning you get all of Mastra's features (Model Routing, Workflows, RAG) with OpenMandate's strict, declarative governance layered on top.

```bash
# 1. Clone the repository
git clone https://github.com/ryanmcdonough/openmandate.git
cd openmandate

# 2. Install dependencies
npm install

# 3. Configure API Keys
cp .env.example .env
# Open .env and add either ANTHROPIC_API_KEY or OPENAI_API_KEY
```

> **Note on Mastra:** The OpenMandate codebase already includes `@mastra/core`. If you are completely new to Mastra, you can read about their core primitives in the [Mastra Documentation](https://mastra.ai/docs/getting-started/introduction).

---

## 2. Writing Your First Mandate (YAML)

Everything an OpenMandate agent can or cannot do is defined in a YAML file. Create a file called `tenant-rights.mandate.yaml`. (In this repo, one is already located at `packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml`).

Here is a simplified example:

```yaml
version: "1.0"
metadata:
  name: "tenant-rights-eaw"
  skill_packs: ["uk-law"]

capabilities:
  tools: ["legislation-lookup", "deadline-calculator"]

prohibitions:
  actions: ["provide_legal_advice", "represent_as_solicitor"]

requirements:
  disclaimers:
    - trigger: "always"
      text: "This is legal information, not legal advice."
      placement: "end"

scope:
  allowed: ["GB-EAW"]
  behavior_on_unsupported: "escalate"
```

You can validate that your mandate is syntactically and logically correct using the built-in CLI:

```bash
npx tsx src/cli/index.ts validate packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml
```

---

## 3. Building Tools & Skill Packs

Agents need tools, but in OpenMandate, tools aren't passed directly to the agent. They belong to **Skill Packs**, which the Mandate imports.

### Building a Tool
Tools are built using Mastra's standard `createTool` method.

> **Mastra Docs Signpost:** [How to build Tools in Mastra](https://mastra.ai/docs/local-dev/tools)

```typescript
// packages/skill-uk-law/tools/deadline-calculator.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const deadlineCalculatorTool = createTool({
    id: "deadline-calculator",
    description: "Calculates statutory response deadlines for legal notices.",
    inputSchema: z.object({
        notice_type: z.enum(["section_21", "section_8"]),
        service_date: z.string()
    }),
    outputSchema: z.object({
        deadline_date: z.string(),
        notes: z.string()
    }),
    execute: async ({ context }) => {
        // ... calculation logic ...
        return { deadline_date: "2026-04-20", notes: "Minimum 2 months." };
    }
});
```

### Wrapping it in a Skill Pack
A Skill Pack groups your tools together and registers them under a single `id` that the Mandate can require.

> **OpenMandate Docs Signpost:** [Building Skill Packs Deep-Dive](./building-skills.md)

```typescript
// packages/skill-uk-law/index.ts
import type { SkillPack } from "@openmandate/core/skills/types.js";
import { deadlineCalculatorTool } from "./tools/deadline-calculator.js";

export const ukLawSkillPack: SkillPack = {
    id: "uk-law",
    name: "UK Law",
    description: "Legal tools for UK jurisdictions.",
    version: "0.1.0",
    tools: {
        "deadline-calculator": deadlineCalculatorTool // Key matches capabilities.tools!
    },
    systemPromptFragment: "You are a legal assistant for England and Wales.",
};
```

---

## 4. Running the Agent

Now that you have a Mandate and a Skill Pack, it's time to run it. OpenMandate's `createMandatedAgent` handles reading the YAML, picking the allowed tools out of the Skill Pack, and building the Mastra Agent instance.

Create a script `run.ts`:

```typescript
import "dotenv/config";
import { createAnthropic } from "@ai-sdk/anthropic";
import { SkillPackRegistry } from "./src/skills/registry.js";
import { createMandatedAgent } from "./src/mastra/agents/factory.js";
import { ukLawSkillPack } from "./packages/skill-uk-law/index.js";

const anthropic = createAnthropic();
const model = anthropic("claude-sonnet-4-5-20250929");

// 1. Register Skill Pack
const skillRegistry = new SkillPackRegistry();
skillRegistry.register(ukLawSkillPack);
await skillRegistry.setupAll();

// 2. Create the Agent
const tenantRightsAgent = createMandatedAgent({
    mandatePath: "./packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml",
    model,
    skillRegistry,
    description: "Helps tenants understand their rights.",
});

// 3. Run a generation
async function main() {
    console.log("Thinking...");
    const result = await tenantRightsAgent.generate("My landlord gave me a Section 21 notice yesterday.");
    
    // The processor chain validates the output (e.g. adding the required disclaimer)
    console.log("Agent:", result.text);
}

main();
```

Run your code!

```bash
npx tsx run.ts
```

---

## 5. Trying the Interactive Chat

The codebase comes with a pre-configured, interactive `chat.ts` script that boots up a "Triage Agent" which dynamically routes your questions to the correct governed agent.

To try it out immediately:

```bash
npm run chat
# or npx tsx examples/chat.ts
```

```text
🤖 OpenMandate — Interactive Chat
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Talk to the triage agent. It will route you to
the right specialist based on your needs.

Available specialists:
  • tenant-rights-eaw: Helps tenants in England & Wales with housing rights...

You: Can you help me write a letter to my landlord?
⏳ Thinking...
Agent: I can help you draft a formal letter. What is the issue?
```

## Next Steps

- **Deepen your framework knowledge**: Read the [Architecture Guide](./architecture.md) to understand exactly how the Processor Chain intercepts, validates, and logs LLM inputs/outputs.
- **Audit your agents**: Learn how to use the `npx tsx src/cli/index.ts audit` command to inspect the SQLite database of stopped tool calls and blocked responses.
- **Connect to chat apps**: Check out `examples/whatsapp.ts` to see how you can bridge these agents into real-world communication platforms.
