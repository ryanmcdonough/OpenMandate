# Standard Library (`skill-core`)

While OpenMandate ships with domain-specific packs like `uk-law`, all agents require a set of generic utilities to function properly.

The `@openmandate/skill-core` package acts as the "Standard Library" for OpenMandate. It provides safe, generic tools that any mandate can require and whitelist.

## Available Tools

### 1. Date & Time (`get-current-date-time`)
LLMs do not inherently know what the current date or time is. If an agent needs to calculate a statutory deadline or answer temporal queries, it must fetch the current system time.

**ID:** `get-current-date-time`
**Input:** Optional timezone string (e.g. `Europe/London`).
**Output:** ISO, UTC, local string, and unix millisecond timestamps.

### 2. Sandbox Math (`evaluate-math`)
LLMs are statistically prone to hallucinating arithmetic. For financial or legal calculations, this tool provides a safe JS execution sandbox locked strictly to mathematical expressions.

**ID:** `evaluate-math`
**Input:** A strict mathematical expression (e.g., `1000 * 5.5`).
**Output:** The evaluated number.

### 3. Web Fetcher (`fetch-webpage`)
A lightweight utility to grab the text content of any public URL, automatically stripping HTML tags, scripts, and styles. Useful for reading external references or news articles.

**ID:** `fetch-webpage`
**Input:** A full HTTPS URL.
**Output:** Truncated plain text content of the page.

## How to use

Require the `core` skill pack in your mandate and whitelist the tools you want to expose to the agent:

```yaml
metadata:
  skill_packs:
    - "uk-law"
    - "core"

capabilities:
  tools:
    - "get-current-date-time"
    - "evaluate-math"
```

In your application code, be sure to register it alongside your other skill packs:

```typescript
import { SkillPackRegistry } from "@openmandate/core/skills/registry.js";
import { coreSkillPack } from "@openmandate/skill-core";

const registry = new SkillPackRegistry();
registry.register(coreSkillPack);
await registry.setupAll();
```
