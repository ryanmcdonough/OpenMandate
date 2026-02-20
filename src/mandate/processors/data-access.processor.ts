// src/mandate/processors/data-access.processor.ts
// Output step processor: enforces data_access rules on tool call arguments

import type { Processor } from "../../skills/types.js";
import type { Mandate } from "../schema.js";

/**
 * Enforces data_access rules from the mandate on tool call arguments.
 * Checks:
 *   1. File type restrictions — only allowed extensions are permitted
 *   2. Write permission — blocks write operations on read-only scopes
 *
 * Runs as an output step processor (after each LLM response, before tool execution).
 */

/** Recursively extract all string values from an object */
function extractStrings(obj: unknown): string[] {
    if (typeof obj === "string") return [obj];
    if (Array.isArray(obj)) return obj.flatMap(extractStrings);
    if (obj && typeof obj === "object") return Object.values(obj).flatMap(extractStrings);
    return [];
}

export function createDataAccessProcessor(mandate: Mandate): Processor {
    const dataAccessRules = mandate.capabilities.data_access || [];

    // Build allowed file extensions set from all rules
    const allowedExtensions = new Set<string>();
    for (const rule of dataAccessRules) {
        if (rule.file_types) {
            for (const ext of rule.file_types) {
                allowedExtensions.add(ext.toLowerCase());
            }
        }
    }

    // Build set of scopes with write permission
    const writeableScopes = new Set<string>();
    for (const rule of dataAccessRules) {
        if (rule.permissions.includes("write")) {
            writeableScopes.add(rule.scope);
        }
    }

    // Identify if any scope allows writing — if none do, ALL writes are blocked
    const anyWriteAllowed = writeableScopes.size > 0;

    // Patterns that indicate write operations
    const writePatterns = [
        /\bwrite\b/i, /\bsave\b/i, /\bcreate\b/i, /\bdelete\b/i,
        /\bupdate\b/i, /\bmodify\b/i, /\bappend\b/i, /\boverwrite\b/i,
    ];

    return {
        id: "mandate-data-access",

        async processOutputStep({ messages, toolCalls, abort }) {
            if (!toolCalls || toolCalls.length === 0) return messages;

            for (const toolCall of toolCalls) {
                // Check 1: File extension restrictions
                if (allowedExtensions.size > 0) {
                    const allStrings = extractStrings(toolCall.args);
                    for (const value of allStrings) {
                        // Check if this string looks like a filename with an extension
                        const dotIndex = value.lastIndexOf(".");
                        if (dotIndex > 0 && dotIndex < value.length - 1) {
                            const ext = value.substring(dotIndex).toLowerCase();
                            // Only check extensions that look valid (2-5 chars)
                            if (ext.length >= 2 && ext.length <= 6 && /^\.[a-z]+$/i.test(ext)) {
                                if (!allowedExtensions.has(ext)) {
                                    abort(
                                        `File type "${ext}" is not permitted. Allowed types: ${[...allowedExtensions].join(", ")}`,
                                        { retry: true }
                                    );
                                }
                            }
                        }
                    }
                }

                // Check 2: Write operations on read-only scopes
                if (!anyWriteAllowed) {
                    const argsLower = JSON.stringify(toolCall.args || {}).toLowerCase();
                    const isWriteOperation = writePatterns.some(p => p.test(argsLower));
                    const toolName = toolCall.toolName || (toolCall as any).name || "";
                    const isWriteTool = /write|save|create|delete|upload|send/i.test(toolName);

                    if (isWriteOperation || isWriteTool) {
                        abort(
                            "Write operations are not permitted under the current mandate. " +
                            "All data access is read-only.",
                            { retry: true }
                        );
                    }
                }
            }

            return messages;
        },
    };
}

