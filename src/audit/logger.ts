// src/audit/logger.ts
// SQLite-backed audit logger

import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import type { AuditEntry, AuditQuery, AuditRow } from "./types.js";

export class AuditLogger {
    private db: Database.Database;

    constructor(dbPath: string) {
        mkdirSync(dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.initialize();
    }

    private initialize() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        mandate_name TEXT NOT NULL,
        mandate_version TEXT DEFAULT '1.0',
        status TEXT NOT NULL,
        input_text TEXT,
        output_text TEXT,
        check_name TEXT,
        check_result TEXT,
        check_detail TEXT,
        tool_calls TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_log(status);
      CREATE INDEX IF NOT EXISTS idx_audit_mandate ON audit_log(mandate_name);
    `);
    }

    async log(entry: Partial<AuditEntry>): Promise<void> {
        const stmt = this.db.prepare(`
      INSERT INTO audit_log
        (timestamp, mandate_name, mandate_version, status, input_text, output_text,
         check_name, check_result, check_detail, tool_calls, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(
            entry.timestamp || new Date().toISOString(),
            entry.mandateName || "unknown",
            entry.mandateVersion || "1.0",
            entry.status || "success",
            entry.input || null,
            entry.output || null,
            entry.check || null,
            entry.result || null,
            entry.detail || null,
            entry.toolCalls || null,
            entry.error || null,
        );
    }

    async logInteraction(entry: AuditEntry): Promise<void> {
        await this.log(entry);
    }

    query(filters: AuditQuery): AuditRow[] {
        let sql = "SELECT * FROM audit_log WHERE 1=1";
        const params: any[] = [];

        if (filters.status) { sql += " AND status = ?"; params.push(filters.status); }
        if (filters.mandateName) { sql += " AND mandate_name = ?"; params.push(filters.mandateName); }
        if (filters.since) { sql += " AND timestamp >= ?"; params.push(filters.since); }

        sql += " ORDER BY timestamp DESC LIMIT ?";
        params.push(filters.limit || 50);

        return this.db.prepare(sql).all(...params) as AuditRow[];
    }

    /**
     * Get summary statistics for audit logs
     */
    stats(mandateName?: string): { total: number; blocked: number; escalated: number; errors: number } {
        let sql = "SELECT status, COUNT(*) as count FROM audit_log";
        const params: any[] = [];

        if (mandateName) {
            sql += " WHERE mandate_name = ?";
            params.push(mandateName);
        }

        sql += " GROUP BY status";

        const rows = this.db.prepare(sql).all(...params) as { status: string; count: number }[];
        const result = { total: 0, blocked: 0, escalated: 0, errors: 0 };

        for (const row of rows) {
            result.total += row.count;
            if (row.status === "blocked") result.blocked = row.count;
            if (row.status === "escalated") result.escalated = row.count;
            if (row.status === "error") result.errors = row.count;
        }

        return result;
    }

    close(): void {
        this.db.close();
    }
}
