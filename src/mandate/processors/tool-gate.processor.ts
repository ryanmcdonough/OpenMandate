// src/mandate/processors/tool-gate.processor.ts
// Output step processor: validates every tool call against the mandate

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";
import type { AuditLogger } from "../../audit/logger.js";

/**
 * Validates every tool call against the mandate.
 * Uses processOutputStep which runs after EACH LLM response in the
 * agentic loop, before tool execution.
 *
 * If a tool call violates the mandate, we abort with retry: true,
 * which tells Mastra to ask the LLM to try again without that tool.
 */
export function createToolGateProcessor(
    mandate: Mandate,
    auditLogger: AuditLogger
): Processor {
    const allowedTools = new Set(mandate.capabilities.tools);
    const prohibitedExact = new Set(
        mandate.prohibitions.tools.filter(t => !t.includes("*"))
    );
    const prohibitedPrefixes = mandate.prohibitions.tools
        .filter(t => t.includes("*"))
        .map(t => t.replace("-*", "").replace("*", ""));
    const prohibitedData = mandate.prohibitions.data;

    // Generic data category detection keywords
    const dataKeywords: Record<string, string[]> = {
        financial_accounts: ["bank_account", "credit_card", "routing_number", "account_number"],
        medical_records: ["medical", "diagnosis", "prescription", "health_record"],
        national_insurance_numbers: ["national insurance", "ni number", "nino"],
        social_security_numbers: ["social security", "ssn"],
        credentials_and_passwords: ["password", "api_key", "secret", "token", "credential"],
    };

    return {
        id: "mandate-tool-gate",

        async processOutputStep({ messages, toolCalls, abort, retryCount }) {
            if (!toolCalls || toolCalls.length === 0) return messages;

            // Check tool call count limit
            if (toolCalls.length > mandate.limits.max_tool_calls_per_turn) {
                await auditLogger.log({
                    check: "tool_call_limit",
                    result: "blocked",
                    detail: `${toolCalls.length} calls exceeds limit of ${mandate.limits.max_tool_calls_per_turn}`,
                });
                abort(`Too many tool calls. Maximum is ${mandate.limits.max_tool_calls_per_turn}.`, { retry: true });
            }

            for (const toolCall of toolCalls) {
                const toolName = toolCall.toolName || toolCall.name;

                // Check 1: Is tool in the whitelist?
                if (!allowedTools.has(toolName)) {
                    await auditLogger.log({
                        check: "tool_whitelist",
                        result: "blocked",
                        detail: `Tool "${toolName}" not in allowed tools`,
                    });

                    if (retryCount < 2) {
                        abort(
                            `Tool "${toolName}" is not available. Only use: ${[...allowedTools].join(", ")}`,
                            { retry: true }
                        );
                    } else {
                        abort(`Unable to complete this request within my operating guidelines.`);
                    }
                }

                // Check 2: Is tool explicitly prohibited?
                if (prohibitedExact.has(toolName)) {
                    await auditLogger.log({
                        check: "tool_prohibition",
                        result: "blocked",
                        detail: `Tool "${toolName}" is explicitly prohibited`,
                    });
                    abort(`Tool "${toolName}" is prohibited by my operating mandate.`, { retry: true });
                }

                // Check 3: Wildcard prohibition match
                const wildcardMatch = prohibitedPrefixes.find(prefix => toolName.startsWith(prefix));
                if (wildcardMatch) {
                    await auditLogger.log({
                        check: "tool_prohibition_wildcard",
                        result: "blocked",
                        detail: `Tool "${toolName}" matches wildcard prohibition "${wildcardMatch}-*"`,
                    });
                    abort(`Tool "${toolName}" is prohibited by my operating mandate.`, { retry: true });
                }

                // Check 4: Arguments reference prohibited data categories
                const argsString = JSON.stringify(toolCall.args || {}).toLowerCase();
                for (const category of prohibitedData) {
                    const keywords = dataKeywords[category] || [category.replace(/_/g, " ")];
                    const match = keywords.find(kw => argsString.includes(kw.toLowerCase()));
                    if (match) {
                        await auditLogger.log({
                            check: "data_prohibition",
                            result: "blocked",
                            detail: `Tool args reference prohibited data category "${category}" (keyword: "${match}")`,
                        });
                        abort(`I cannot access ${category.replace(/_/g, " ")} data.`, { retry: true });
                    }
                }

                // Log allowed calls
                await auditLogger.log({
                    check: "tool_gate",
                    result: "allowed",
                    detail: `Tool "${toolName}" passed all mandate checks`,
                });
            }

            return messages;
        },
    };
}
