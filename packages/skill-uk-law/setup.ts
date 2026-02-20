// packages/skill-uk-law/setup.ts
// Register UK-specific keyword expansions and prohibited action patterns

import { registerEscalationKeywords } from "@openmandate/core/mandate/processors/escalation.processor.js";
import { registerProhibitedActionPatterns } from "@openmandate/core/mandate/processors/output-validator.processor.js";
import { registerScopeKeywords } from "@openmandate/core/mandate/processors/scope.processor.js";

export function setupUkLawExtensions(): void {
    // Register UK-specific escalation keyword expansions
    registerEscalationKeywords("uk-law", {
        criminal_defence: [
            "criminal", "arrested", "charged with", "magistrate", "crown court",
            "caution", "police station", "solicitor at the station",
        ],
        family_law_custody: [
            "custody", "divorce", "child support", "visitation", "family court",
            "child arrangement", "contact order", "residence order",
        ],
        immigration_asylum: [
            "deportation", "removal", "immigration", "asylum", "visa refusal",
            "home office", "indefinite leave", "right to remain",
        ],
        bankruptcy_insolvency: [
            "bankruptcy", "insolvency", "IVA", "individual voluntary arrangement",
            "debt relief order", "DRO", "winding up", "sequestration",
        ],
    });

    // Register UK legal prohibited action patterns
    registerProhibitedActionPatterns("uk-law", [
        {
            action: "provide_legal_advice",
            pattern: /\b(I advise you to|my legal advice is|as your (solicitor|barrister)|you should (sue|file a claim|bring proceedings))\b/i,
        },
        {
            action: "represent_as_solicitor",
            pattern: /\b(as your (solicitor|barrister|counsel)|I('m| am) (a |your )(solicitor|barrister|lawyer)|representing you)\b/i,
        },
        {
            action: "make_legal_determinations",
            pattern: /\b(you will (definitely )?win|this is (definitely |clearly )?(illegal|legal)|guaranteed (outcome|result))\b/i,
        },
        {
            action: "file_court_documents",
            pattern: /\b(I('ll| will) file |filing on your behalf|submitting to (the )?court)\b/i,
        },
        {
            action: "contact_opposing_party",
            pattern: /\b(I('ll| will) contact (your |the )?(landlord|employer|opposing)|reaching out to the other (party|side))\b/i,
        },
    ]);

    // Register UK jurisdiction scope keywords
    registerScopeKeywords("uk-law", {
        "GB-EAW": [
            "england", "wales", "english law", "welsh law",
            "county court", "high court", "crown court",
        ],
        "GB-SCT": [
            "scotland", "scottish law", "scots law", "sheriff court",
            "court of session", "edinburgh",
        ],
        "GB-NIR": [
            "northern ireland", "northern irish law", "belfast",
            "stormont",
        ],
    });
}
