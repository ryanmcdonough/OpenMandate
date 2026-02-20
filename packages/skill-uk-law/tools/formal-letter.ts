// packages/skill-uk-law/tools/formal-letter.ts
// Drafts formal letters and pre-action correspondence for UK legal scenarios

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const formalLetterTool = createTool({
    id: "formal-letter",
    description:
        "Drafts formal letters and pre-action correspondence for UK legal scenarios. " +
        "Supports tenancy deposit demands, disrepair complaints, Section 21/Section 8 challenges, " +
        "employment grievances, and consumer complaints. " +
        "Always includes references to relevant UK legislation.",
    inputSchema: z.object({
        letter_type: z.enum([
            "deposit_demand",
            "disrepair_complaint",
            "section_21_challenge",
            "employment_grievance",
            "consumer_complaint",
            "pre_action_letter",
            "cease_and_desist",
        ]).describe("Type of formal letter to draft"),
        jurisdiction: z.enum(["GB-EAW", "GB-SCT", "GB-NIR"]).describe("UK jurisdiction"),
        sender_name: z.string().describe("Name of the person sending the letter"),
        recipient_name: z.string().describe("Name of the recipient"),
        facts: z.object({
            description: z.string().describe("Description of the situation"),
            amount: z.number().optional().describe("Amount in GBP being claimed, if applicable"),
            date_of_incident: z.string().optional().describe("Date the issue occurred"),
            prior_communication: z.string().optional().describe("Any prior attempts to resolve"),
            tenancy_start_date: z.string().optional().describe("Tenancy start date if housing-related"),
            deposit_amount: z.number().optional().describe("Deposit amount in GBP if relevant"),
        }),
    }),
    outputSchema: z.object({
        letter: z.string().describe("The full formal letter text"),
        legislation_cited: z.array(z.string()).describe("List of UK legislation referenced"),
        notes: z.string().describe("Notes for the user about next steps"),
        pre_action_protocol: z.string().optional().describe("Relevant pre-action protocol if applicable"),
    }),
    execute: async ({ context: input }: any) => {
        const templates: Record<string, { title: string; protocol?: string; legislation: string[] }> = {
            deposit_demand: {
                title: "LETTER BEFORE ACTION — TENANCY DEPOSIT",
                protocol: "Pre-Action Protocol for Debt Claims",
                legislation: [
                    "Housing Act 2004, ss.213–215",
                    "Tenancy Deposit Schemes Regulations 2007",
                    "Deregulation Act 2015, s.32",
                ],
            },
            disrepair_complaint: {
                title: "NOTICE OF DISREPAIR — LANDLORD AND TENANT ACT 1985",
                protocol: "Pre-Action Protocol for Housing Conditions Claims (England)",
                legislation: [
                    "Landlord and Tenant Act 1985, s.11",
                    "Defective Premises Act 1972, s.4",
                    "Housing Health and Safety Rating System (HHSRS)",
                ],
            },
            section_21_challenge: {
                title: "CHALLENGE TO SECTION 21 NOTICE",
                legislation: [
                    "Housing Act 1988, s.21",
                    "Deregulation Act 2015",
                    "Protection from Eviction Act 1977",
                ],
            },
            employment_grievance: {
                title: "FORMAL GRIEVANCE UNDER EMPLOYMENT CONTRACT",
                legislation: [
                    "Employment Rights Act 1996",
                    "ACAS Code of Practice on Disciplinary and Grievance Procedures",
                    "Equality Act 2010 (if discrimination alleged)",
                ],
            },
            consumer_complaint: {
                title: "FORMAL COMPLAINT — CONSUMER RIGHTS ACT 2015",
                legislation: [
                    "Consumer Rights Act 2015, ss.9–11 (goods), ss.49–52 (services)",
                    "Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013",
                ],
            },
            pre_action_letter: {
                title: "LETTER BEFORE ACTION",
                legislation: [
                    "Civil Procedure Rules, Practice Direction — Pre-Action Conduct",
                ],
            },
            cease_and_desist: {
                title: "CEASE AND DESIST NOTICE",
                legislation: [
                    "Protection from Harassment Act 1997",
                ],
            },
        };

        const template = templates[input.letter_type];
        const today = new Date().toISOString().split("T")[0];

        const letter = `[DRAFT — ${template.title}]

Date: ${today}
From: ${input.sender_name}
To: ${input.recipient_name}
Jurisdiction: ${input.jurisdiction}

Dear ${input.recipient_name},

RE: ${template.title}

${input.facts.description}

${input.facts.amount ? `Amount claimed: £${input.facts.amount.toFixed(2)}` : ""}
${input.facts.date_of_incident ? `Date of incident: ${input.facts.date_of_incident}` : ""}
${input.facts.prior_communication ? `Previous correspondence: ${input.facts.prior_communication}` : ""}

I write to put you on notice of the above matter under the following legislation:
${template.legislation.map((l: string) => `• ${l}`).join("\n")}

${template.protocol ? `This letter is sent in accordance with the ${template.protocol}.` : ""}

I would be grateful if you could respond within 14 days of the date of this letter.

Yours faithfully,
${input.sender_name}

[IMPORTANT: This is an AI-generated draft. Please review carefully and consider having a solicitor review before sending.]`;

        return {
            letter,
            legislation_cited: template.legislation,
            notes: "This is a draft. Please review carefully and consider having a solicitor review before sending. " +
                "Ensure all factual details are accurate before dispatching.",
            pre_action_protocol: template.protocol,
        };
    },
});
