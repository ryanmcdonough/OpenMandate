// src/mandate/processors/audit.processor.ts
// Output result processor: logs the complete interaction to the audit trail

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";
import type { AuditLogger } from "../../audit/logger.js";

/**
 * Logs the complete interaction to the audit trail.
 * Always runs last in the processor chain.
 */
export function createAuditProcessor(
    mandate: Mandate,
    auditLogger: AuditLogger
): Processor {
    return {
        id: "mandate-audit",

        async processOutputResult({ messages }) {
            const userMsg = messages.findLast((m: any) => m.role === "user");
            const assistantMsg = messages.findLast((m: any) => m.role === "assistant");

            await auditLogger.logInteraction({
                timestamp: new Date().toISOString(),
                mandateName: mandate.metadata.name,
                mandateVersion: mandate.version,
                input: typeof userMsg?.content === "string" ? userMsg.content : JSON.stringify(userMsg?.content),
                output: typeof assistantMsg?.content === "string" ? assistantMsg.content : JSON.stringify(assistantMsg?.content),
                status: "success",
            });

            return messages;
        },
    };
}
