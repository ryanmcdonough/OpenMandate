# Building Skill Packs

Skill packs are pluggable modules that give OpenMandate agents domain expertise. A skill pack bundles **tools**, **processors**, **prompt fragments**, **mandate templates**, and an optional **setup hook** into a single registrable package.

The framework ships with [UK Law](https://github.com/ryanmcdonough/openmandate/tree/main/packages/skill-uk-law) as the reference skill pack. This guide walks through every component you need to build your own.

---

## Directory Structure

```
packages/skill-{id}/
├── index.ts                    # Entry point — exports the SkillPack object
├── package.json                # npm metadata + openmandate marker
├── setup.ts                    # Optional setup hook
├── tools/
│   ├── index.ts                # Re-exports all tools
│   ├── my-tool.ts              # One file per tool
│   └── another-tool.ts
├── processors/
│   └── my-domain.processor.ts  # Domain-specific processors
├── prompts/
│   └── domain-context.ts       # System prompt fragment builder
├── mandates/
│   ├── use-case-a.mandate.yaml # Pre-built mandate templates
│   └── use-case-b.mandate.yaml
└── data/
    └── reference-data.ts       # Static domain data (deadlines, keywords, etc.)
```

### `package.json`

```json
{
    "name": "@openmandate/skill-healthcare",
    "version": "0.1.0",
    "type": "module",
    "description": "Healthcare compliance skill pack for OpenMandate",
    "main": "index.ts",
    "openmandate": {
        "type": "skill-pack"
    },
    "dependencies": {
        "zod": "^3.23.0"
    },
    "peerDependencies": {
        "@mastra/core": "latest"
    },
    "license": "MIT"
}
```

The `"openmandate": { "type": "skill-pack" }` marker enables future auto-discovery from `node_modules`.

---

## The `SkillPack` Interface

Every skill pack must implement this interface from `src/skills/types.ts`:

```typescript
interface SkillPack {
    id: string;                  // Unique identifier, e.g. "healthcare"
    name: string;                // Human-readable name
    description: string;         // What this skill pack covers
    version: string;             // Semantic version

    // Domain tools (keys = IDs that mandates reference)
    tools: Record<string, any>;

    // Domain-specific processors (optional)
    inputProcessors?: ((mandate: Mandate) => Processor)[];
    outputProcessors?: ((mandate: Mandate) => Processor)[];

    // System prompt fragment (string or mandate-aware builder)
    systemPromptFragment: string | ((mandate: Mandate) => string);

    // Pre-built mandate YAML templates (optional)
    mandateTemplates?: string[];

    // Domain-specific eval scorers (optional)
    evals?: Record<string, any>;

    // One-time setup hook (optional)
    setup?: () => Promise<void>;
}
```

### How Each Field Is Used

| Field | Used By | Purpose |
|---|---|---|
| `id` | Registry, loader, mandate `skill_packs` | Links mandates to skill packs |
| `tools` | Factory → `filterToolsByMandate()` | Only tools listed in the mandate's `capabilities.tools` are exposed to the agent |
| `inputProcessors` | Factory → `inputProcessors` | Run before LLM sees the message (after core processors) |
| `outputProcessors` | Factory → `outputProcessors` | Run after LLM responds (before audit, after core processors) |
| `systemPromptFragment` | `buildMandateSystemPrompt()` | Injected into the agent's system instructions |
| `mandateTemplates` | CLI `validate`/`inspect` | Users can reference or copy these templates |
| `setup` | `registry.setupAll()` | Called once at boot — register keywords, warm caches |

---

## Tools

Tools are the primary way skill packs give agents capabilities. Each tool is created with Mastra's `createTool()` and defines:

- **Input schema** (Zod) — what the LLM must provide
- **Output schema** (Zod) — what the tool returns
- **Execute function** — the actual implementation

### Creating a Tool

```typescript
// tools/patient-lookup.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const patientLookupTool = createTool({
    id: "patient-lookup",
    description:
        "Looks up patient rights and complaint procedures for NHS and " +
        "private healthcare providers in the UK.",
    inputSchema: z.object({
        query: z.string().describe("Search term, e.g., 'NHS complaint procedure'"),
        provider_type: z.enum(["nhs", "private", "all"]).default("all"),
    }),
    outputSchema: z.object({
        results: z.array(z.object({
            title: z.string(),
            summary: z.string(),
            source_url: z.string(),
        })),
        source: z.string(),
    }),
    execute: async ({ context: input }) => {
        // Implementation here — call APIs, query databases, etc.
        return {
            results: [/* ... */],
            source: "NHS Choices (OGL v3.0)",
        };
    },
});
```

### Tool ID Convention

The tool's `id` must match the key used in the `tools` record on the `SkillPack` object, and must match what mandates reference in `capabilities.tools`:

```typescript
// In the SkillPack:
tools: {
    "patient-lookup": patientLookupTool,   // key = id
    "complaint-draft": complaintDraftTool,
}
```

```yaml
# In the mandate:
capabilities:
  tools:
    - "patient-lookup"      # References the key above
    - "complaint-draft"
```

Tools **not** listed in the mandate's `capabilities.tools` are never exposed to the agent — the tool gate processor blocks them.

### Tool Design Guidelines

1. **Descriptive `id`** — Use kebab-case: `legislation-lookup`, `deadline-calculator`
2. **Rich descriptions** — The LLM uses the description to decide when to call the tool
3. **Typed schemas** — Use Zod `.describe()` on every field so the LLM knows what to provide
4. **Source attribution** — Return the data source so citations can be traced
5. **Error handling** — Return structured error info rather than throwing

---

## Processors

Processors are middleware that run at specific points in the agent's execution lifecycle. Skill packs can provide domain-specific processors that run alongside the core mandate processors.

### Lifecycle Hooks

```
User message
    │
    ▼
┌──────────────────┐
│   processInput   │  ← Validate input before LLM sees it
└──────────────────┘
    │
    ▼
   LLM generates response (may include tool calls)
    │
    ▼
┌────────────────────────┐
│   processOutputStep    │  ← Validate each step (tool calls, intermediate results)
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│   processOutputResult  │  ← Validate/transform the final response
└────────────────────────┘
    │
    ▼
Response delivered to user
```

### Processor Interface

```typescript
interface Processor {
    id: string;

    processInput?: (params: {
        messages: any[];
        abort: (reason: string, options?: { retry?: boolean }) => void;
        state: Record<string, unknown>;
        retryCount: number;
    }) => Promise<any[]>;

    processOutputStep?: (params: {
        messages: any[];
        toolCalls?: any[];
        abort: (reason: string, options?: { retry?: boolean }) => void;
        retryCount: number;
        state: Record<string, unknown>;
    }) => Promise<any[]>;

    processOutputResult?: (params: {
        messages: any[];
        abort: (reason: string, options?: { retry?: boolean }) => void;
        retryCount: number;
        state: Record<string, unknown>;
    }) => Promise<any[]>;
}
```

### The `abort()` Mechanism

Call `abort(reason)` to block the interaction. The reason string is returned to the user as the response.

- `abort("reason")` — Hard stop. Interaction ends.
- `abort("reason", { retry: true })` — Soft block. The LLM is asked to try again with the reason as feedback. After `retryCount` reaches 2, subsequent aborts are hard stops.

### Creating a Domain Processor

Skill pack processors are **factory functions** — they receive the parsed mandate and return a `Processor`:

```typescript
// processors/hipaa.processor.ts
import type { Mandate } from "@openmandate/core/mandate/schema.js";

export function createHipaaProcessor(mandate: Mandate) {
    // Pre-compute patterns from the mandate at creation time
    const sensitivePatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/,    // SSN
        /\bMRN[-:]?\s*\d+\b/i,       // Medical Record Number
    ];

    return {
        id: "healthcare-hipaa",

        async processOutputResult({ messages, abort }) {
            const lastMsg = messages.findLast((m: any) => m.role === "assistant");
            if (!lastMsg) return messages;

            const text = typeof lastMsg.content === "string"
                ? lastMsg.content
                : JSON.stringify(lastMsg.content);

            // Check for PHI in output
            for (const pattern of sensitivePatterns) {
                if (pattern.test(text)) {
                    abort(
                        "Response may contain protected health information (PHI). " +
                        "I cannot include patient-identifiable data in responses.",
                        { retry: true }
                    );
                }
            }

            return messages;
        },
    };
}
```

### Registering Processors

Add factory functions to the `inputProcessors` or `outputProcessors` arrays on your skill pack:

```typescript
export const healthcareSkillPack: SkillPack = {
    // ...
    inputProcessors: [
        createSymptomScreenProcessor,   // Checks for medical emergency language
    ],
    outputProcessors: [
        createHipaaProcessor,           // Blocks PHI in responses
    ],
};
```

The factory approach means each processor receives the mandate and can adapt its behaviour based on declared rules. When the agent factory assembles the processor chain, skill pack processors run **after** core mandate processors.

---

## Prompt Fragments

A prompt fragment injects domain knowledge into the agent's system instructions. It can be a static string or a function that receives the mandate for dynamic generation.

### Static Fragment

```typescript
systemPromptFragment: `## Healthcare Domain Context

You are a healthcare information assistant.
You provide general health information, NOT medical advice.
Always recommend consulting a qualified healthcare professional.`,
```

### Dynamic Fragment (Mandate-Aware)

Use a builder function when the prompt should adapt to the mandate's scope or capabilities:

```typescript
// prompts/healthcare-context.ts
import type { Mandate } from "@openmandate/core/mandate/schema.js";

export function buildHealthcarePromptFragment(mandate: Mandate): string {
    const scopes = mandate.scope.allowed;

    return `## Healthcare Domain Context

You cover: ${scopes.join(", ")}.

### Important Distinctions
- You provide **health information**, NOT **medical advice**.
- Always recommend consulting a qualified healthcare professional.

### Data Sources
- NHS Choices (Open Government Licence v3.0)
- NICE Guidelines (Open Government Licence)

${scopes.includes("GB-EAW") ? `
### England & Wales Specifics
- NHS Constitution rights and pledges
- Care Quality Commission (CQC) standards
- NHS complaint procedures (PALS → formal → Ombudsman)
` : ""}`;
}
```

```typescript
// In the SkillPack:
systemPromptFragment: buildHealthcarePromptFragment,
```

The framework calls the builder with the parsed mandate at agent creation time. The resulting string is concatenated into the agent's system prompt alongside the mandate rules.

---

## Mandate Templates

Skill packs ship pre-built mandate YAML files that users can reference directly or copy and customise.

### Bundling Templates

```typescript
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const healthcareSkillPack: SkillPack = {
    // ...
    mandateTemplates: [
        resolve(__dirname, "mandates/patient-rights.mandate.yaml"),
        resolve(__dirname, "mandates/nhs-complaint.mandate.yaml"),
    ],
};
```

### Writing a Mandate Template

A mandate YAML defines the agent's complete governance policy. See the [Mandate YAML Reference](./architecture.md#mandate-yaml-reference) for every field. Here's a minimal example:

```yaml
version: "1.0"

metadata:
  name: "patient-rights-assistant"
  description: "Helps patients understand NHS rights and complaint procedures."
  author: "openmandate"
  created: "2026-02-19"
  tags: ["healthcare", "nhs", "patient-rights"]
  skill_packs:
    - "healthcare"

capabilities:
  tools:
    - "patient-lookup"
    - "complaint-draft"
  data_access:
    - scope: "user_uploads"
      permissions: ["read"]
      file_types: [".pdf", ".jpg", ".png"]
  output_types:
    - "complaint_letter"
    - "rights_summary"

prohibitions:
  tools:
    - "shell-execute"
    - "payment-*"
  actions:
    - "provide_medical_advice"
    - "diagnose_condition"
  data:
    - "medical_records"
    - "prescription_data"

requirements:
  disclaimers:
    - trigger: "always"
      text: "This is health information, not medical advice. Consult a healthcare professional."
      placement: "end"
  citations:
    required: true
    format: "inline"
    min_per_claim: 1
    allowed_sources: ["nhs_choices", "nice_guidelines"]
    blocked_sources: ["wikipedia", "reddit"]
  human_review:
    required_before: ["finalise_document"]
    review_prompt: "Please review this draft before using it."
  audit:
    log_level: "full"
    include_llm_calls: true
    include_tool_calls: true
    retention_days: 365

scope:
  allowed: ["GB-EAW"]
  behavior_on_unsupported: "escalate"
  escalation_message: "I only cover healthcare in England & Wales."

escalation:
  triggers:
    - condition: "topic_match"
      topics: ["mental_health_crisis"]
      action: "provide_resources"
      message: "If you're in crisis, please contact:"
      resources:
        - "NHS 111"
        - "Samaritans: 116 123"

limits:
  max_tokens_per_turn: 8000
  max_tool_calls_per_turn: 10
  max_turns_per_session: 100
  max_concurrent_sessions: 5
  token_budget_daily: 500000
  timeout_seconds: 120
```

---

## Setup Hook

The `setup` function runs once when the skill pack is loaded via `registry.setupAll()`. Use it to register domain-specific expansions that the core processors use.

### What You Can Register

| Function | Purpose | Used By |
|---|---|---|
| `registerEscalationKeywords(packId, map)` | Map escalation topic IDs to keyword lists | Escalation processor |
| `registerProhibitedActionPatterns(packId, patterns)` | Map prohibited action IDs to regex patterns | Output validator |
| `registerScopeKeywords(packId, map)` | Map scope IDs (e.g. `GB-EAW`) to keyword lists | Scope processor |

### Example

```typescript
// setup.ts
import { registerEscalationKeywords } from "@openmandate/core/mandate/processors/escalation.processor.js";
import { registerProhibitedActionPatterns } from "@openmandate/core/mandate/processors/output-validator.processor.js";
import { registerScopeKeywords } from "@openmandate/core/mandate/processors/scope.processor.js";

export function setupHealthcareExtensions(): void {
    registerEscalationKeywords("healthcare", {
        mental_health_crisis: [
            "suicidal", "self-harm", "overdose", "crisis", "ending it",
        ],
        emergency: [
            "heart attack", "stroke", "severe bleeding", "unconscious",
        ],
    });

    registerProhibitedActionPatterns("healthcare", [
        {
            action: "provide_medical_advice",
            pattern: /\b(I advise you to take|you should (take|stop taking)|my medical (advice|recommendation))\b/i,
        },
        {
            action: "diagnose_condition",
            pattern: /\b(you have|you're suffering from|this is (definitely|clearly) )\b/i,
        },
    ]);

    registerScopeKeywords("healthcare", {
        "GB-EAW": ["england", "wales", "nhs england"],
        "GB-SCT": ["scotland", "nhs scotland"],
    });
}
```

```typescript
// In the SkillPack:
setup: async () => {
    setupHealthcareExtensions();
},
```

**Why this matters:** The mandate declares `prohibitions.actions: ["provide_medical_advice"]`, but the core output validator doesn't know what "provide_medical_advice" _looks like_ in text. The setup hook bridges that gap by registering regex patterns that detect the prohibited language.

---

## Registration and Loading

### Manual Registration (Recommended)

In your main entry point (`src/index.ts`):

```typescript
import { SkillPackRegistry } from "./skills/registry.js";
import { healthcareSkillPack } from "../packages/skill-healthcare/index.js";

const registry = new SkillPackRegistry();
registry.register(healthcareSkillPack);
await registry.setupAll();
```

### npm Package Loading

The loader (`src/skills/loader.ts`) resolves skill packs by ID, trying:

1. `@openmandate/skill-{id}` (scoped package)
2. `openmandate-skill-{id}` (unscoped package)
3. `{id}` (direct path)

```typescript
import { loadSkillPack } from "./skills/loader.js";
const pack = await loadSkillPack("healthcare");
registry.register(pack);
```

### Linking Mandates to Skill Packs

A mandate declares its required skill packs in `metadata.skill_packs`:

```yaml
metadata:
  skill_packs:
    - "healthcare"
```

When the agent factory creates an agent, it verifies all required packs are registered and throws if any are missing.

---

## Putting It Together

Here's a complete `index.ts` for a skill pack:

```typescript
// packages/skill-healthcare/index.ts
import type { SkillPack } from "@openmandate/core/skills/types.js";
import { patientLookupTool } from "./tools/patient-lookup.js";
import { complaintDraftTool } from "./tools/complaint-draft.js";
import { createHipaaProcessor } from "./processors/hipaa.processor.js";
import { buildHealthcarePromptFragment } from "./prompts/healthcare-context.js";
import { setupHealthcareExtensions } from "./setup.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const healthcareSkillPack: SkillPack = {
    id: "healthcare",
    name: "Healthcare Compliance",
    description: "Patient rights, NHS complaints, and healthcare information for the UK.",
    version: "0.1.0",

    tools: {
        "patient-lookup": patientLookupTool,
        "complaint-draft": complaintDraftTool,
    },

    outputProcessors: [
        createHipaaProcessor,
    ],

    systemPromptFragment: buildHealthcarePromptFragment,

    mandateTemplates: [
        resolve(__dirname, "mandates/patient-rights.mandate.yaml"),
    ],

    evals: {},

    setup: async () => {
        setupHealthcareExtensions();
    },
};

export default healthcareSkillPack;
```

Then in `src/index.ts`, register it and create an agent:

```typescript
import { healthcareSkillPack } from "../packages/skill-healthcare/index.js";

registry.register(healthcareSkillPack);
await registry.setupAll();

const patientAgent = createMandatedAgent({
    mandatePath: "./packages/skill-healthcare/mandates/patient-rights.mandate.yaml",
    model: "anthropic:claude-sonnet-4-5-20250929",
    skillRegistry: registry,
    description: "Helps patients understand NHS rights and complaint procedures.",
});
```

---

## Testing

### Testing Tools

Test tools by calling their `execute` function directly:

```typescript
import { describe, it, expect } from "vitest";
import { patientLookupTool } from "../tools/patient-lookup.js";

describe("patient-lookup", () => {
    it("returns results for NHS queries", async () => {
        const result = await patientLookupTool.execute({
            context: { query: "PALS complaint", provider_type: "nhs" },
        });
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.source).toContain("NHS");
    });
});
```

### Testing Processors

Create a mock `abort` function and pass test messages:

```typescript
import { describe, it, expect } from "vitest";
import { MandateParser } from "@openmandate/core/mandate/parser.js";
import { createHipaaProcessor } from "../processors/hipaa.processor.js";

const mandate = MandateParser.fromFile("./mandates/patient-rights.mandate.yaml");
const processor = createHipaaProcessor(mandate);

describe("HIPAA processor", () => {
    it("blocks responses containing SSNs", async () => {
        const ctx = { reason: null as string | null };
        const abort = (r: string) => { ctx.reason = r; };

        await processor.processOutputResult!({
            messages: [{ role: "assistant", content: "Patient SSN: 123-45-6789" }],
            abort, retryCount: 0, state: {},
        });

        expect(ctx.reason).not.toBeNull();
        expect(ctx.reason).toContain("protected health information");
    });

    it("allows clean responses", async () => {
        const ctx = { reason: null as string | null };
        const abort = (r: string) => { ctx.reason = r; };

        await processor.processOutputResult!({
            messages: [{ role: "assistant", content: "You can file a complaint through PALS." }],
            abort, retryCount: 0, state: {},
        });

        expect(ctx.reason).toBeNull();
    });
});
```

> **Tip:** When testing `abort`, use a mutable context object (`ctx.reason`) rather than destructured getters — JavaScript getters don't survive destructuring.

### Running Tests

```bash
npx vitest run                    # All tests
npx vitest run -t "HIPAA"        # Filter by test name
npx vitest --watch               # Watch mode
```
