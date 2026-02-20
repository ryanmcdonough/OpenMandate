// Converts wizard state into mandate YAML string

import type { MandateState } from '../App';

export function generateYaml(state: MandateState): string {
    const lines: string[] = [];

    lines.push('version: "1.0"');
    lines.push('');

    // Metadata
    lines.push('metadata:');
    lines.push(`  name: "${state.slug || 'my-agent'}"`);
    lines.push(`  display_name: "${escape(state.name)}"`);
    lines.push(`  description: "${escape(state.description)}"`);
    lines.push(`  author: "${escape(state.author)}"`);
    lines.push(`  created: "${new Date().toISOString().split('T')[0]}"`);
    if (state.tags.length > 0) {
        lines.push(`  tags: [${state.tags.map(t => `"${t}"`).join(', ')}]`);
    }
    if (state.skillPacks.length > 0) {
        lines.push('  skill_packs:');
        state.skillPacks.forEach(sp => lines.push(`    - "${sp}"`));
    }
    lines.push('');

    // Capabilities
    lines.push('capabilities:');
    if (state.allowedTools.length > 0) {
        lines.push('  tools:');
        state.allowedTools.forEach(t => lines.push(`    - "${t}"`));
    }
    if (state.dataAccess.length > 0) {
        lines.push('  data_access:');
        state.dataAccess.forEach(da => {
            lines.push(`    - scope: "${da.scope}"`);
            lines.push(`      permissions: [${da.permissions.map(p => `"${p}"`).join(', ')}]`);
            if (da.fileTypes.length > 0) {
                lines.push(`      file_types: [${da.fileTypes.map(f => `"${f}"`).join(', ')}]`);
            }
        });
    }
    if (state.outputTypes.length > 0) {
        lines.push('  output_types:');
        state.outputTypes.forEach(t => lines.push(`    - "${t}"`));
    }
    lines.push('');

    // Prohibitions
    if (state.prohibitedTools.length > 0 || state.prohibitedActions.length > 0 || state.prohibitedData.length > 0) {
        lines.push('prohibitions:');
        if (state.prohibitedTools.length > 0) {
            lines.push('  tools:');
            state.prohibitedTools.forEach(t => lines.push(`    - "${t}"`));
        }
        if (state.prohibitedActions.length > 0) {
            lines.push('  actions:');
            state.prohibitedActions.forEach(a => lines.push(`    - "${a}"`));
        }
        if (state.prohibitedData.length > 0) {
            lines.push('  data:');
            state.prohibitedData.forEach(d => lines.push(`    - "${d}"`));
        }
        lines.push('');
    }

    // Requirements
    lines.push('requirements:');

    // Disclaimers
    if (state.disclaimers.length > 0) {
        lines.push('  disclaimers:');
        state.disclaimers.forEach(d => {
            lines.push(`    - trigger: "${d.trigger}"`);
            lines.push(`      text: "${escape(d.text)}"`);
            lines.push(`      placement: "${d.placement}"`);
        });
    }

    // Citations
    lines.push('  citations:');
    lines.push(`    required: ${state.citationsRequired}`);
    lines.push(`    format: "${state.citationFormat}"`);
    lines.push(`    min_per_claim: ${state.minCitationsPerClaim}`);
    if (state.allowedSources.length > 0) {
        lines.push('    allowed_sources:');
        state.allowedSources.forEach(s => lines.push(`      - "${s}"`));
    }
    if (state.blockedSources.length > 0) {
        lines.push('    blocked_sources:');
        state.blockedSources.forEach(s => lines.push(`      - "${s}"`));
    }

    // Human review
    if (state.humanReviewActions.length > 0) {
        lines.push('  human_review:');
        lines.push('    required_before:');
        state.humanReviewActions.forEach(a => lines.push(`      - "${a}"`));
        lines.push(`    review_prompt: "${escape(state.reviewPrompt)}"`);
    }

    // Audit
    lines.push('  audit:');
    lines.push(`    log_level: "${state.auditLogLevel}"`);
    lines.push(`    include_llm_calls: ${state.auditIncludeLlm}`);
    lines.push(`    include_tool_calls: ${state.auditIncludeTools}`);
    lines.push(`    retention_days: ${state.auditRetentionDays}`);
    lines.push('');

    // Scope
    if (state.jurisdictions.length > 0) {
        lines.push('scope:');
        lines.push(`  allowed: [${state.jurisdictions.map(j => `"${j}"`).join(', ')}]`);
        lines.push(`  behavior_on_unsupported: "${state.scopeBehavior}"`);
        if (state.scopeMessage) {
            lines.push(`  escalation_message: "${escape(state.scopeMessage)}"`);
        }
        lines.push('');
    }

    // Escalation
    if (state.escalationTopics.length > 0 || state.detectDistress) {
        lines.push('escalation:');
        lines.push('  triggers:');
        if (state.escalationTopics.length > 0) {
            lines.push('    - condition: "topic_match"');
            lines.push(`      topics: [${state.escalationTopics.map(t => `"${t}"`).join(', ')}]`);
            lines.push('      action: "refuse_and_redirect"');
            lines.push('      message: "This topic requires specialist advice. Please consult a qualified professional."');
        }
        if (state.detectDistress) {
            lines.push('    - condition: "user_distress_detected"');
            lines.push('      action: "provide_resources"');
            lines.push('      message: "It sounds like you may be going through a difficult time."');
            lines.push('      resources:');
            lines.push('        - "Samaritans: 116 123"');
            lines.push('        - "Crisis Text Line: Text HOME to 741741"');
        }
        lines.push('');
    }

    // Limits
    lines.push('limits:');
    lines.push(`  max_tokens_per_turn: ${state.maxTokensPerTurn}`);
    lines.push(`  max_tool_calls_per_turn: ${state.maxToolCallsPerTurn}`);
    lines.push(`  max_turns_per_session: ${state.maxTurnsPerSession}`);
    lines.push(`  max_concurrent_sessions: ${state.maxConcurrentSessions}`);
    lines.push(`  token_budget_daily: ${state.tokenBudgetDaily}`);
    lines.push(`  timeout_seconds: ${state.timeoutSeconds}`);

    return lines.join('\n');
}

function escape(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
