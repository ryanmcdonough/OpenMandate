import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const evaluateMathTool = createTool({
    id: "evaluate-math",
    description: "Evaluates standard mathematical expressions (e.g., '1000 * 1.2', '500 / 3'). Extremely useful for exact financial or timeframe calculations.",
    inputSchema: z.object({
        expression: z.string().describe("The math expression to evaluate using standard JS operators (+, -, *, /, **, %). Only numbers and operators allowed."),
    }),
    outputSchema: z.object({
        result: z.number().nullable(),
        error: z.string().optional(),
    }),
    execute: async ({ expression }) => {
        const expr = expression;

        // Safety check: deeply restrict evaluation to basic math chars
        if (!/^[0-9+\-*/().%\s**]+$/.test(expr)) {
            return { result: null, error: "Only pure mathematical expressions are allowed." };
        }

        try {
            // Using Function constructor strictly for math parsing (safe given the regex constraint)
            const result = new Function(`return ${expr}`)();
            if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                return { result: null, error: "Invalid calculation result." };
            }
            return { result };
        } catch (e: any) {
            return { result: null, error: e.message || "Failed to evaluate expression." };
        }
    },
});
