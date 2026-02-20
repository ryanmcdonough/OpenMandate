import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const getCurrentDateTimeTool = createTool({
    id: "get-current-date-time",
    description: "Returns the current system date and time. Use this when you need to know 'today' to calculate deadlines or answer temporal queries.",
    inputSchema: z.object({
        timezone: z.string().optional().describe("Optional timezone override, e.g. 'Europe/London'. Defaults to UTC."),
    }),
    outputSchema: z.object({
        iso: z.string(),
        utc: z.string(),
        local_string: z.string(),
        unix_ms: z.number(),
    }),
    execute: async ({ timezone }) => {
        const now = new Date();
        const tz = timezone || "UTC";

        return {
            iso: now.toISOString(),
            utc: now.toUTCString(),
            local_string: now.toLocaleString("en-US", { timeZone: tz }),
            unix_ms: now.getTime(),
        };
    },
});
