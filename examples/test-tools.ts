import "dotenv/config";
import { createAnthropic } from "@ai-sdk/anthropic";
import { SkillPackRegistry } from "../src/skills/registry.js";
import { createMandatedAgent } from "../src/mastra/agents/factory.js";
import { ukLawSkillPack } from "../packages/skill-uk-law/index.js";
import { coreSkillPack } from "../packages/skill-core/index.js";

async function main() {
    console.log("Setting up...");
    const anthropic = createAnthropic();
    const model = anthropic("claude-sonnet-4-5-20250929");

    const skillRegistry = new SkillPackRegistry();
    skillRegistry.register(ukLawSkillPack);
    skillRegistry.register(coreSkillPack);
    await skillRegistry.setupAll();

    const tenantRightsAgent = createMandatedAgent({
        mandatePath: "./packages/skill-uk-law/mandates/tenant-rights-eaw.mandate.yaml",
        model,
        skillRegistry,
        description: "Helps tenants.",
    });

    console.log("Asking agent to use math and time tools...");
    const result = await tenantRightsAgent.generate("What is 1000 multiplied by 5.5? Also, what is the exact current date and time right now?");
    console.log("\n\nAgent Response:\n", result.text);
}
main();
