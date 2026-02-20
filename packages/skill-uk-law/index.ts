// packages/skill-uk-law/index.ts
// UK Law Skill Pack — entry point

import type { SkillPack } from "@openmandate/core/skills/types.js";
import { formalLetterTool } from "./tools/formal-letter.js";
import { legislationLookupTool } from "./tools/legislation-lookup.js";
import { deadlineCalculatorTool } from "./tools/deadline-calculator.js";
import { caseLawSearchTool } from "./tools/case-law-search.js";
import { createJurisdictionProcessor } from "./processors/jurisdiction.processor.js";
import { buildUkLawPromptFragment } from "./prompts/uk-law-context.js";
import { setupUkLawExtensions } from "./setup.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ukLawSkillPack: SkillPack = {
    id: "uk-law",
    name: "UK Law",
    description:
        "Legal information tools for England & Wales, Scotland, and Northern Ireland. " +
        "Powered by legislation.gov.uk (Open Government Licence) and Find Case Law " +
        "(Open Justice Licence). Covers tenancy, employment, consumer, and general civil law.",
    version: "0.1.0",

    tools: {
        "formal-letter": formalLetterTool,
        "legislation-lookup": legislationLookupTool,
        "deadline-calculator": deadlineCalculatorTool,
        "case-law-search": caseLawSearchTool,
    },

    inputProcessors: [
        createJurisdictionProcessor as any,
    ],

    systemPromptFragment: buildUkLawPromptFragment as any,

    mandateTemplates: [
        resolve(__dirname, "mandates/tenant-rights-eaw.mandate.yaml"),
        resolve(__dirname, "mandates/employment-rights.mandate.yaml"),
        resolve(__dirname, "mandates/contract-reviewer.mandate.yaml"),
        resolve(__dirname, "mandates/general-legal-uk.mandate.yaml"),
    ],

    evals: {},

    setup: async () => {
        setupUkLawExtensions();
    },
};

export default ukLawSkillPack;
