// src/cli/index.ts
// OpenMandate CLI — validate, inspect, and audit commands

import { Command } from "commander";
import { MandateParser } from "../mandate/parser.js";
import { validateMandateConsistency } from "../mandate/validator.js";
import { AuditLogger } from "../audit/logger.js";
import chalk from "chalk";

const program = new Command();

program
    .name("openmandate")
    .description("Mandate-governed AI agents — CLI tools")
    .version("0.1.0");

// === Validate Command ===
program
    .command("validate <mandate-file>")
    .description("Validate a mandate YAML file against the schema")
    .action((file) => {
        console.log(chalk.dim(`\nValidating: ${file}\n`));

        // Step 1: Schema validation
        const result = MandateParser.validate(file);
        if (!result.success) {
            console.log(chalk.red("❌ Schema validation failed:"));
            result.errors!.forEach((e) => console.log(chalk.red(`  • ${e}`)));
            process.exit(1);
        }

        console.log(chalk.green("✅ Schema validation passed"));
        console.log(chalk.dim(`  Name: ${result.data!.metadata.name}`));
        console.log(chalk.dim(`  Tools: ${result.data!.capabilities.tools.join(", ")}`));
        console.log(chalk.dim(`  Skill packs: ${result.data!.metadata.skill_packs?.join(", ") || "none"}`));
        console.log(chalk.dim(`  Scope: ${result.data!.scope.allowed.join(", ")}`));

        // Step 2: Logical consistency
        const consistency = validateMandateConsistency(result.data!);
        if (consistency.errors.length > 0) {
            console.log(chalk.red("\n❌ Consistency errors:"));
            consistency.errors.forEach((e) => console.log(chalk.red(`  • ${e}`)));
        }
        if (consistency.warnings.length > 0) {
            console.log(chalk.yellow("\n⚠️  Warnings:"));
            consistency.warnings.forEach((w) => console.log(chalk.yellow(`  • ${w}`)));
        }
        if (consistency.valid && consistency.warnings.length === 0) {
            console.log(chalk.green("✅ Logical consistency check passed"));
        }

        if (!consistency.valid) {
            process.exit(1);
        }
    });

// === Inspect Command ===
program
    .command("inspect <mandate-file>")
    .description("Show what an agent can and cannot do")
    .action((file) => {
        const mandate = MandateParser.fromFile(file);
        console.log(chalk.bold(`\n📋 ${mandate.metadata.name}\n`));
        console.log(chalk.dim(mandate.metadata.description));

        if (mandate.metadata.skill_packs?.length) {
            console.log(chalk.cyan(`\n📦 SKILL PACKS: ${mandate.metadata.skill_packs.join(", ")}`));
        }

        console.log(chalk.green("\n✅ CAN:"));
        console.log(`  Tools: ${mandate.capabilities.tools.join(", ")}`);
        console.log(`  Output: ${mandate.capabilities.output_types.join(", ")}`);

        console.log(chalk.red("\n❌ CANNOT:"));
        mandate.prohibitions.actions.forEach((a) => console.log(`  • ${a.replace(/_/g, " ")}`));
        mandate.prohibitions.tools.forEach((t) => console.log(`  • Use tool: ${t}`));

        console.log(chalk.yellow("\n⚠️  ESCALATES ON:"));
        mandate.escalation.triggers.forEach((t) => {
            if (t.topics) console.log(`  • ${t.topics.join(", ")} → ${t.action}`);
            if (t.threshold) console.log(`  • Confidence < ${t.threshold} → ${t.action}`);
        });

        console.log(chalk.blue("\n🌍 SCOPE:"));
        console.log(`  ${mandate.scope.allowed.join(", ")}`);
        console.log(`  On unsupported: ${mandate.scope.behavior_on_unsupported}`);

        console.log(chalk.magenta("\n📊 LIMITS:"));
        console.log(`  Tokens/turn: ${mandate.limits.max_tokens_per_turn}`);
        console.log(`  Tool calls/turn: ${mandate.limits.max_tool_calls_per_turn}`);
        console.log(`  Daily budget: ${mandate.limits.token_budget_daily} tokens`);
        console.log(`  Timeout: ${mandate.limits.timeout_seconds}s`);

        console.log(chalk.dim("\n📝 DISCLAIMERS:"));
        mandate.requirements.disclaimers.forEach((d) => {
            console.log(`  [${d.trigger}] ${d.text.substring(0, 70)}...`);
        });

        console.log();
    });

// === Audit Command ===
program
    .command("audit")
    .description("View audit logs")
    .option("-s, --status <status>", "Filter by status (success, blocked, escalated, error)")
    .option("-a, --agent <name>", "Filter by agent/mandate name")
    .option("--since <date>", "Show logs since date (ISO format)")
    .option("-n, --limit <n>", "Max entries", "20")
    .option("--stats", "Show summary statistics only")
    .option("-d, --db <path>", "Audit database path", "./data/audit/audit.db")
    .action((opts) => {
        const logger = new AuditLogger(opts.db);

        if (opts.stats) {
            const stats = logger.stats(opts.agent);
            console.log(chalk.bold("\n📊 Audit Statistics\n"));
            console.log(`  Total interactions: ${stats.total}`);
            console.log(chalk.green(`  Successful: ${stats.total - stats.blocked - stats.escalated - stats.errors}`));
            console.log(chalk.red(`  Blocked: ${stats.blocked}`));
            console.log(chalk.yellow(`  Escalated: ${stats.escalated}`));
            console.log(chalk.red(`  Errors: ${stats.errors}`));
            console.log();
            logger.close();
            return;
        }

        const entries = logger.query({
            status: opts.status,
            mandateName: opts.agent,
            since: opts.since,
            limit: parseInt(opts.limit),
        });

        if (entries.length === 0) {
            console.log(chalk.dim("\nNo audit entries found.\n"));
            logger.close();
            return;
        }

        console.table(entries.map((e: any) => ({
            time: e.timestamp,
            mandate: e.mandate_name,
            status: e.status,
            check: e.check_name || "-",
            detail: (e.check_detail || "").substring(0, 60),
        })));

        logger.close();
    });

program.parse();
