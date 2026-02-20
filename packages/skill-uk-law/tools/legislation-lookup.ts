// packages/skill-uk-law/tools/legislation-lookup.ts
// Searches UK legislation via the legislation.gov.uk API

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const LEGISLATION_GOV_UK = "https://www.legislation.gov.uk";

export const legislationLookupTool = createTool({
    id: "legislation-lookup",
    description:
        "Searches UK legislation via the legislation.gov.uk API. " +
        "Covers Acts of Parliament (ukpga), Statutory Instruments (uksi), " +
        "Welsh legislation (asc/anaw), Scottish Acts (asp), and NI legislation (nia). " +
        "Returns legislation text, citations, and links.",
    inputSchema: z.object({
        query: z.string().describe("Search term, e.g., 'tenancy deposit protection'"),
        legislation_type: z.enum(["ukpga", "uksi", "asp", "asc", "nia", "all"]).default("all"),
        specific_act: z.string().optional().describe("Specific Act reference, e.g., 'ukpga/1988/50'"),
        section: z.string().optional().describe("Specific section number, e.g., '21'"),
    }),
    outputSchema: z.object({
        results: z.array(z.object({
            title: z.string(),
            citation: z.string(),
            year: z.number(),
            section_text: z.string().optional(),
            url: z.string(),
            legislation_type: z.string(),
        })),
        api_source: z.string(),
    }),
    execute: async ({ context: input }: any) => {
        // Direct section lookup
        if (input.specific_act && input.section) {
            const url = `${LEGISLATION_GOV_UK}/${input.specific_act}/section/${input.section}`;
            try {
                const response = await fetch(`${url}/data.xml`);
                if (response.ok) {
                    const xml = await response.text();
                    const titleMatch = xml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
                    const title = titleMatch ? titleMatch[1] : `Section ${input.section}`;

                    return {
                        results: [{
                            title,
                            citation: input.specific_act,
                            year: parseInt(input.specific_act.split("/")[1]) || 0,
                            section_text: xml.substring(0, 3000),
                            url,
                            legislation_type: input.specific_act.split("/")[0],
                        }],
                        api_source: "legislation.gov.uk (Open Government Licence v3.0)",
                    };
                }
            } catch {
                // Fall through to search
            }
        }

        // Direct act lookup
        if (input.specific_act && !input.section) {
            const url = `${LEGISLATION_GOV_UK}/${input.specific_act}`;
            try {
                const response = await fetch(`${url}/data.xml`);
                if (response.ok) {
                    const xml = await response.text();
                    const titleMatch = xml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
                    const title = titleMatch ? titleMatch[1] : input.specific_act;

                    return {
                        results: [{
                            title,
                            citation: input.specific_act,
                            year: parseInt(input.specific_act.split("/")[1]) || 0,
                            url,
                            legislation_type: input.specific_act.split("/")[0],
                        }],
                        api_source: "legislation.gov.uk (Open Government Licence v3.0)",
                    };
                }
            } catch {
                // Fall through to search
            }
        }

        // Search by query
        const typeParam = input.legislation_type === "all" ? "" : `&type=${input.legislation_type}`;
        const searchUrl = `${LEGISLATION_GOV_UK}/all/data.feed?title=${encodeURIComponent(input.query)}${typeParam}`;

        try {
            const response = await fetch(searchUrl);
            if (response.ok) {
                const xml = await response.text();

                const entries: Array<{
                    title: string;
                    citation: string;
                    year: number;
                    url: string;
                    legislation_type: string;
                }> = [];

                const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
                let match;
                while ((match = entryRegex.exec(xml)) !== null && entries.length < 10) {
                    const entry = match[1];
                    const entryTitle = entry.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || "Unknown";
                    const entryLink = entry.match(/<link[^>]*href="([^"]+)"/)?.[1] || "";
                    const entryId = entry.match(/<id>([^<]+)<\/id>/)?.[1] || "";

                    const yearMatch = entryId.match(/\/(\d{4})\//);
                    const year = yearMatch ? parseInt(yearMatch[1]) : 0;

                    const typeMatch = entryId.match(/legislation\.gov\.uk\/(\w+)\//);
                    const legType = typeMatch ? typeMatch[1] : input.legislation_type;

                    entries.push({
                        title: entryTitle,
                        citation: entryId.replace("http://www.legislation.gov.uk/id/", ""),
                        year,
                        url: entryLink || `${LEGISLATION_GOV_UK}/${entryId}`,
                        legislation_type: legType,
                    });
                }

                if (entries.length > 0) {
                    return {
                        results: entries,
                        api_source: "legislation.gov.uk (Open Government Licence v3.0)",
                    };
                }
            }

            return {
                results: [{
                    title: `Search results for: "${input.query}"`,
                    citation: "See legislation.gov.uk",
                    year: 0,
                    url: `${LEGISLATION_GOV_UK}/all?title=${encodeURIComponent(input.query)}${typeParam}`,
                    legislation_type: input.legislation_type,
                }],
                api_source: "legislation.gov.uk (Open Government Licence v3.0)",
            };
        } catch {
            return { results: [], api_source: "legislation.gov.uk (request failed)" };
        }
    },
});
