#!/usr/bin/env npx tsx
// examples/whatsapp.ts
// WhatsApp bot — receive messages via webhook, respond via triage agent
//
// Setup:
//   1. Create a Meta Business app → https://developers.facebook.com
//   2. Add the WhatsApp product to your app
//   3. Get your Phone Number ID and Access Token from the API Setup page
//   4. Set environment variables in .env:
//
//      WHATSAPP_ACCESS_TOKEN=your-access-token
//      WHATSAPP_PHONE_ID=your-phone-number-id
//      WHATSAPP_VERIFY_TOKEN=any-secret-string-you-choose
//      WHATSAPP_PORT=3000
//      ANTHROPIC_API_KEY=sk-ant-...
//
//   5. Start this script:    npm run whatsapp
//   6. Expose your local port via ngrok:   ngrok http 3000
//   7. Set the webhook URL in Meta's dashboard to:  https://your-ngrok-url.ngrok.io/webhook
//      with your WHATSAPP_VERIFY_TOKEN
//
// Usage:
//   npx tsx examples/whatsapp.ts
//   npm run whatsapp

import "dotenv/config";
import { createAnthropic } from "@ai-sdk/anthropic";
import { SkillPackRegistry } from "../src/skills/registry.js";
import { AgentRegistry } from "../src/mastra/agents/agent-registry.js";
import { createMandatedAgent } from "../src/mastra/agents/factory.js";
import { createTriageAgent } from "../src/mastra/agents/triage.js";
import { ConsoleEscalationHandler } from "../src/mastra/agents/escalation-handler.js";
import { WhatsAppBridge } from "../src/bridges/whatsapp.js";
import { ukLawSkillPack } from "../packages/skill-uk-law/index.js";

// ─── Validate Config ─────────────────────────────────────────

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "openmandate-verify";
const WHATSAPP_PORT = parseInt(process.env.WHATSAPP_PORT || "3000", 10);

if (!WHATSAPP_ACCESS_TOKEN) {
    console.error("❌ Missing WHATSAPP_ACCESS_TOKEN in .env");
    process.exit(1);
}
if (!WHATSAPP_PHONE_ID) {
    console.error("❌ Missing WHATSAPP_PHONE_ID in .env");
    process.exit(1);
}

// ─── Bootstrap ───────────────────────────────────────────────

// Create model instance
const anthropic = createAnthropic();
const model = anthropic("claude-sonnet-4-5-20250929");

// 1. Skill packs
const skillRegistry = new SkillPackRegistry();
skillRegistry.register(ukLawSkillPack);
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
        "eviction notices (Section 21/Section 8), disrepair, and tenancy issues.",
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

// ─── WhatsApp Bridge ─────────────────────────────────────────

const bridge = new WhatsAppBridge({
    accessToken: WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: WHATSAPP_PHONE_ID,
    verifyToken: WHATSAPP_VERIFY_TOKEN,
    port: WHATSAPP_PORT,
    generateFn: async (text: string, _threadId: string, _userId: string) => {
        const result = await triageAgent.generate(text);
        return typeof result.text === "string" ? result.text : JSON.stringify(result.text);
    },
});

await bridge.start();

console.log("\n📱 WhatsApp bot is running!");
console.log("━".repeat(50));
console.log("Next steps:");
console.log(`  1. Run:  ngrok http ${WHATSAPP_PORT}`);
console.log("  2. Copy the HTTPS URL from ngrok");
console.log("  3. In Meta Dashboard → WhatsApp → Configuration → Webhook:");
console.log("     URL: https://your-ngrok-url.ngrok.io/webhook");
console.log(`     Verify Token: ${WHATSAPP_VERIFY_TOKEN}`);
console.log("  4. Subscribe to 'messages' events");
console.log("  5. Send a WhatsApp message to your business number!\n");

// Graceful shutdown
process.on("SIGINT", async () => {
    await bridge.stop();
    process.exit(0);
});
