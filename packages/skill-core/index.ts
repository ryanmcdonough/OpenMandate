import type { SkillPack } from "../../src/skills/types.js";
import { getCurrentDateTimeTool } from "./tools/get-current-date-time.js";
import { evaluateMathTool } from "./tools/evaluate-math.js";
import { fetchWebpageTool } from "./tools/fetch-webpage.js";

export const coreSkillPack: SkillPack = {
    id: "core",
    name: "Standard Library",
    description: "Generic utility tools for time, math, and external web fetching.",
    version: "0.1.0",
    tools: {
        "get-current-date-time": getCurrentDateTimeTool,
        "evaluate-math": evaluateMathTool,
        "fetch-webpage": fetchWebpageTool,
    },
    systemPromptFragment: "", // No domain context needed for core math/time
};

export default coreSkillPack;
