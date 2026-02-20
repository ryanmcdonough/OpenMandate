// packages/skill-uk-law/tools/deadline-calculator.ts
// Calculates legal deadlines including limitation periods and notice periods

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { ukDeadlines } from "../data/deadlines-uk.js";

export const deadlineCalculatorTool = createTool({
    id: "deadline-calculator",
    description:
        "Calculates legal deadlines including limitation periods, " +
        "filing deadlines, notice periods, and response windows under UK law.",
    inputSchema: z.object({
        deadline_type: z.enum(["limitation_period", "filing_deadline", "response_window", "notice_period"]),
        case_type: z.string().describe("Type of case, e.g., 'tenancy_deposit_claim', 'unfair_dismissal'"),
        jurisdiction: z.enum(["GB-EAW", "GB-SCT", "GB-NIR"]).describe("UK jurisdiction"),
        trigger_date: z.string().describe("The date that starts the clock, ISO format"),
    }),
    outputSchema: z.object({
        deadline_date: z.string(),
        days_remaining: z.number(),
        legislation_citation: z.string(),
        notes: z.string(),
        is_expired: z.boolean(),
    }),
    execute: async ({ context: input }: any) => {
        const jurisdictionDeadlines = ukDeadlines[input.jurisdiction] || {};
        const entry = jurisdictionDeadlines[input.case_type];

        if (!entry) {
            const available = Object.keys(jurisdictionDeadlines);
            return {
                deadline_date: "Unknown",
                days_remaining: -1,
                legislation_citation: "Not found in database",
                notes: `Deadline data not available for "${input.case_type}" in ${input.jurisdiction}. ` +
                    `Please verify with a solicitor. ` +
                    `Available case types for ${input.jurisdiction}: ${available.join(", ")}`,
                is_expired: false,
            };
        }

        const trigger = new Date(input.trigger_date);
        if (isNaN(trigger.getTime())) {
            return {
                deadline_date: "Invalid date",
                days_remaining: -1,
                legislation_citation: entry.citation,
                notes: `Invalid trigger date provided: "${input.trigger_date}". Please use ISO format (YYYY-MM-DD).`,
                is_expired: false,
            };
        }

        const deadline = new Date(trigger);
        deadline.setDate(deadline.getDate() + entry.days);
        const now = new Date();
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let notes = entry.notes || "";
        if (daysRemaining <= 0) {
            notes = `⚠️ EXPIRED: This deadline has passed. ${notes}`;
        } else if (daysRemaining <= 14) {
            notes = `🔴 URGENT: Only ${daysRemaining} days remaining! ${notes}`;
        } else if (daysRemaining <= 30) {
            notes = `🟡 APPROACHING: ${daysRemaining} days remaining. ${notes}`;
        } else {
            notes = `🟢 ${daysRemaining} days remaining. ${notes}`;
        }

        return {
            deadline_date: deadline.toISOString().split("T")[0],
            days_remaining: Math.max(0, daysRemaining),
            legislation_citation: entry.citation,
            notes,
            is_expired: daysRemaining <= 0,
        };
    },
});
