# OpenMandate

> **AI agents that know their boundaries.**

Built on [Mastra](https://mastra.ai). Governed by mandates. Extended by skill packs.

OpenMandate is an open-source framework for building AI agents that operate under strict, machine-enforced mandates. Every tool call is gated. Every output is validated. Every action is logged.

The core framework is **domain-agnostic**. Domain expertise is delivered through **Skill Packs** — pluggable modules that bring tools, processors, and mandate templates for specific verticals.

Ships with **UK Law** as the first skill pack — powered by [legislation.gov.uk](https://legislation.gov.uk) and the [National Archives Find Case Law API](https://caselaw.nationalarchives.gov.uk).

## Quick Start

```bash
# Install dependencies
npm install

# Validate a mandate
npx tsx src/cli/index.ts validate ./packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml

# Inspect agent permissions
npx tsx src/cli/index.ts inspect ./packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml

# Speak to the interactive chat agent
npm run chat

# Start development server (Mastra Studio)
npm run dev
```

For a full step-by-step tutorial on building your own agent from scratch, please see the **[Getting Started Guide](./docs/getting-started.md)**.

## Architecture

```
OpenMandate = Mastra + Mandate Layer + Skill Packs + Messaging Bridges
```

### Mandate Layer (Core Innovation)

A domain-agnostic governance engine that enforces declarative YAML policies at runtime via Mastra processors:

- **Tool Gating** — whitelist model; tools not in the mandate are never seen by the agent
- **Output Validation** — checks for prohibited action language, citation requirements
- **Escalation** — detects sensitive topics and distress signals, redirects appropriately
- **Disclaimers** — auto-injects required disclaimers based on trigger rules
- **Audit Logging** — every interaction logged to SQLite for compliance

### Skill Packs

Pluggable modules that bring domain expertise:

| Component | Purpose |
|---|---|
| **Tools** | Mastra `createTool()` definitions for domain-specific actions |
| **Processors** | Domain-specific input/output processors |
| **Prompt Fragments** | Domain knowledge injected into agent instructions |
| **Mandate Templates** | Pre-built YAML mandates users can extend |
| **Evals** | Domain-specific evaluation suites |

### Messaging Bridges

Connect agents to messaging platforms:
- **CLI** — Terminal bridge for development
- **Telegram** — Polling-based Telegram bot
- **Discord** — DM and mention-based Discord bot

## Mandate YAML

Mandates are declarative YAML files that define what an agent can and cannot do:

```yaml
version: "1.0"
metadata:
  name: "tenant-rights-eaw"
  skill_packs: ["uk-law"]

capabilities:
  tools: ["formal-letter", "legislation-lookup", "deadline-calculator"]

prohibitions:
  actions: ["provide_legal_advice", "represent_as_solicitor"]

scope:
  allowed: ["GB-EAW"]
  behavior_on_unsupported: "escalate"

escalation:
  triggers:
    - condition: "topic_match"
      topics: ["criminal_defence", "immigration_asylum"]
      action: "refuse_and_redirect"
```

## CLI

```bash
# Validate mandate schema and consistency
npx tsx src/cli/index.ts validate <mandate.yaml>

# Show agent permissions and restrictions
npx tsx src/cli/index.ts inspect <mandate.yaml>

# View audit logs
npx tsx src/cli/index.ts audit --status blocked --limit 10
npx tsx src/cli/index.ts audit --stats
```

## Creating a Skill Pack

1. Create a new package under `packages/`:
```bash
mkdir -p packages/skill-healthcare/{tools,processors,prompts,mandates,data}
```

2. Implement the `SkillPack` interface:
```typescript
import type { SkillPack } from "../../src/skills/types.js";

export const healthcareSkillPack: SkillPack = {
  id: "healthcare",
  name: "Healthcare Compliance",
  tools: { /* ... */ },
  systemPromptFragment: "You are a healthcare information assistant...",
};
```

3. Register in your entry point:
```typescript
import { healthcareSkillPack } from "../packages/skill-healthcare/index.js";
registry.register(healthcareSkillPack);
```

## Documentation

- **[Getting Started](./docs/getting-started.md)** — A step-by-step tutorial on how to install OpenMandate, write a mandate, and build your first agent
- **[Architecture & Reference](./docs/architecture.md)** — System design, mandate YAML reference, processor chain, CLI, audit, and configuration
- **[Building Skill Packs](./docs/building-skills.md)** — Developer guide for creating custom skill packs with tools, processors, prompts, and mandate templates

## Tech Stack

- **Framework**: [Mastra](https://mastra.ai) (`@mastra/core`, `@mastra/memory`)
- **Language**: TypeScript (ESM)
- **LLM**: Vercel AI SDK (via Mastra's model routing)
- **Validation**: Zod
- **Storage**: LibSQL + better-sqlite3
- **Config**: YAML mandates
- **Testing**: Vitest

## License

MIT
