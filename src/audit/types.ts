// src/audit/types.ts
// Audit entry types

export interface AuditEntry {
    timestamp: string;
    mandateName: string;
    mandateVersion: string;
    input?: string;
    output?: string;
    status: "success" | "blocked" | "escalated" | "error";
    check?: string;
    result?: string;
    detail?: string;
    toolCalls?: string;
    error?: string;
}

export interface AuditQuery {
    status?: string;
    mandateName?: string;
    since?: string;
    limit?: number;
}

export interface AuditRow {
    id: number;
    timestamp: string;
    mandate_name: string;
    mandate_version: string;
    status: string;
    input_text: string | null;
    output_text: string | null;
    check_name: string | null;
    check_result: string | null;
    check_detail: string | null;
    tool_calls: string | null;
    error: string | null;
    created_at: string;
}
