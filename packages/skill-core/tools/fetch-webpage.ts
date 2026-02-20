import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const fetchWebpageTool = createTool({
    id: "fetch-webpage",
    description: "Fetches and returns the plaintext content of a specific public URL. Use this to read external documentation or news.",
    inputSchema: z.object({
        url: z.string().url().describe("The full HTTPS URL to fetch."),
    }),
    outputSchema: z.object({
        content: z.string(),
        status: z.number(),
    }),
    execute: async ({ url }) => {
        try {
            const resp = await fetch(url, {
                headers: {
                    "User-Agent": "OpenMandate-Bot/1.0"
                }
            });

            if (!resp.ok) {
                return { content: `Failed to fetch: ${resp.statusText}`, status: resp.status };
            }

            const text = await resp.text();

            // Very naive HTML to text (Mastra core tools usually rely on actual parser libs like cheerio)
            const cleanText = text
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<[^>]+>/ig, '')
                .replace(/\s+/g, ' ')
                .trim();

            return {
                content: cleanText.substring(0, 8000), // Enforce massive limit truncation
                status: resp.status,
            };
        } catch (e: any) {
            return {
                content: `Error fetching URL: ${e.message}`,
                status: 500
            };
        }
    },
});
