// packages/skill-uk-law/tools/case-law-search.ts
// Searches the Find Case Law API (National Archives)

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const FIND_CASE_LAW_API = "https://caselaw.nationalarchives.gov.uk";

export const caseLawSearchTool = createTool({
    id: "case-law-search",
    description:
        "Searches UK case law via the Find Case Law API (National Archives). " +
        "Covers judgments from the Court of Appeal, High Court, Upper Tribunals, " +
        "and other courts. Returns case summaries, neutral citations, and links. " +
        "Licensed under the Open Justice Licence.",
    inputSchema: z.object({
        query: z.string().describe("Search term, e.g., 'tenancy deposit protection'"),
        court: z.enum([
            "uksc",     // Supreme Court
            "ewca",     // Court of Appeal (England & Wales)
            "ewhc",     // High Court
            "ewfc",     // Family Court
            "ukut",     // Upper Tribunal
            "all",
        ]).default("all").describe("Court to search within"),
        from_date: z.string().optional().describe("Start date filter, ISO format"),
        to_date: z.string().optional().describe("End date filter, ISO format"),
        max_results: z.number().int().min(1).max(20).default(5).describe("Maximum results to return"),
    }),
    outputSchema: z.object({
        results: z.array(z.object({
            case_name: z.string(),
            neutral_citation: z.string(),
            court: z.string(),
            date: z.string(),
            summary: z.string().optional(),
            url: z.string(),
        })),
        api_source: z.string(),
        total_results: z.number(),
    }),
    execute: async ({ context: input }: any) => {
        const params = new URLSearchParams();
        params.set("query", input.query);
        if (input.court !== "all") {
            params.set("court", input.court);
        }
        if (input.from_date) {
            params.set("from_date", input.from_date);
        }
        if (input.to_date) {
            params.set("to_date", input.to_date);
        }
        params.set("per_page", String(input.max_results));

        const searchUrl = `${FIND_CASE_LAW_API}/judgments/search?${params.toString()}`;

        try {
            const response = await fetch(searchUrl, {
                headers: {
                    "Accept": "application/json",
                },
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type") || "";

                if (contentType.includes("json")) {
                    const data = await response.json() as any;
                    const results = (data.results || []).map((r: any) => ({
                        case_name: r.name || r.title || "Unknown",
                        neutral_citation: r.neutral_citation || r.citation || "N/A",
                        court: r.court || input.court,
                        date: r.date || "Unknown",
                        summary: r.summary || undefined,
                        url: r.uri || r.url || `${FIND_CASE_LAW_API}`,
                    }));

                    return {
                        results,
                        api_source: "Find Case Law — The National Archives (Open Justice Licence)",
                        total_results: data.total || results.length,
                    };
                }

                const text = await response.text();
                const results: Array<{
                    case_name: string;
                    neutral_citation: string;
                    court: string;
                    date: string;
                    summary?: string;
                    url: string;
                }> = [];

                const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
                let match;
                while ((match = entryRegex.exec(text)) !== null && results.length < input.max_results) {
                    const entry = match[1];
                    const title = entry.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || "Unknown";
                    const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1] || "";
                    const summary = entry.match(/<summary[^>]*>([^<]+)<\/summary>/)?.[1];
                    const updated = entry.match(/<updated>([^<]+)<\/updated>/)?.[1] || "";

                    results.push({
                        case_name: title,
                        neutral_citation: title,
                        court: input.court === "all" ? "Various" : input.court,
                        date: updated.split("T")[0] || "Unknown",
                        summary: summary || undefined,
                        url: link || FIND_CASE_LAW_API,
                    });
                }

                return {
                    results,
                    api_source: "Find Case Law — The National Archives (Open Justice Licence)",
                    total_results: results.length,
                };
            }

            return {
                results: [{
                    case_name: `Manual search recommended for: "${input.query}"`,
                    neutral_citation: "N/A",
                    court: input.court,
                    date: "N/A",
                    url: `${FIND_CASE_LAW_API}/judgments/search?query=${encodeURIComponent(input.query)}`,
                }],
                api_source: "Find Case Law — The National Archives (response error)",
                total_results: 0,
            };
        } catch {
            return {
                results: [{
                    case_name: `Search manually for: "${input.query}"`,
                    neutral_citation: "N/A",
                    court: input.court,
                    date: "N/A",
                    url: `${FIND_CASE_LAW_API}/judgments/search?query=${encodeURIComponent(input.query)}`,
                }],
                api_source: "Find Case Law — The National Archives (request failed)",
                total_results: 0,
            };
        }
    },
});
