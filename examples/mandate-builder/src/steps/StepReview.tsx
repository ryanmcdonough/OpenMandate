import React, { useState, useMemo } from 'react';
import type { MandateState } from '../App';
import { generateYaml } from '../lib/generate-yaml';

interface Props {
    state: MandateState;
}

export default function StepReview({ state }: Props) {
    const [copied, setCopied] = useState(false);

    const yaml = useMemo(() => generateYaml(state), [state]);
    const lines = yaml.split('\n');

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(yaml);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const download = () => {
        const blob = new Blob([yaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.slug || 'mandate'}.mandate.yaml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const stats = [
        { label: 'Tools enabled', value: state.allowedTools.length, color: 'text-success', bg: 'bg-success-soft' },
        { label: 'Tools blocked', value: state.prohibitedTools.length, color: 'text-danger', bg: 'bg-danger-soft' },
        { label: 'Prohibited actions', value: state.prohibitedActions.length, color: 'text-danger', bg: 'bg-danger-soft' },
        { label: 'Escalation triggers', value: state.escalationTopics.length, color: 'text-warning', bg: 'bg-warning-soft' },
        { label: 'Jurisdictions', value: state.jurisdictions.length, color: 'text-accent', bg: 'bg-accent-soft' },
        { label: 'Notices', value: state.disclaimers.length, color: 'text-brand', bg: 'bg-brand-soft' },
    ];

    return (
        <div className="space-y-5">
            {/* Agent card */}
            {state.name && (
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        {state.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-text text-lg truncate">{state.name}</p>
                        <p className="text-sm text-text-muted truncate">{state.description || 'No description'}</p>
                    </div>
                </div>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2.5">
                {stats.map(s => (
                    <div key={s.label} className="glass-card p-3.5 text-center">
                        <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
                        <p className="text-[11px] text-text-faint mt-0.5 leading-tight">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
                <button onClick={download} className="btn-primary flex-1 py-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download YAML
                </button>
                <button
                    onClick={copyToClipboard}
                    className={`btn-secondary flex-1 py-3 transition-all ${copied ? '!bg-success-soft !border-success/20 !text-success' : ''
                        }`}
                >
                    {copied ? (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
            </div>

            {/* YAML Preview */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-danger/30" />
                            <span className="w-3 h-3 rounded-full bg-warning/30" />
                            <span className="w-3 h-3 rounded-full bg-success/30" />
                        </div>
                        <span className="text-sm font-medium text-text-muted">
                            {state.slug || 'mandate'}.mandate.yaml
                        </span>
                    </div>
                    <span className="text-xs text-text-faint">{lines.length} lines</span>
                </div>
                <div className="code-preview p-4">
                    {lines.map((line, i) => (
                        <div key={i} className="flex hover:bg-brand-glow rounded-sm px-1 -mx-1 transition-colors">
                            <span className="inline-block w-8 text-right text-text-faint/40 select-none mr-5 text-xs leading-[1.7]">
                                {i + 1}
                            </span>
                            <span className="leading-[1.7]">
                                {highlightYaml(line)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function highlightYaml(line: string): React.ReactElement {
    if (line.trim().startsWith('#')) {
        return <span style={{ color: 'var(--color-text-faint)' }}>{line}</span>;
    }

    const kvMatch = line.match(/^(\s*)([\w_-]+)(\s*:\s*)(.*)/);
    if (kvMatch) {
        const [, indent, key, colon, value] = kvMatch;
        return (
            <>
                <span>{indent}</span>
                <span style={{ color: 'var(--color-accent)' }}>{key}</span>
                <span style={{ color: 'var(--color-text-faint)' }}>{colon}</span>
                {highlightValue(value)}
            </>
        );
    }

    const listMatch = line.match(/^(\s*)(- )(.*)/);
    if (listMatch) {
        const [, indent, dash, value] = listMatch;
        return (
            <>
                <span>{indent}</span>
                <span style={{ color: 'var(--color-text-faint)' }}>{dash}</span>
                {highlightValue(value)}
            </>
        );
    }

    return <span>{line}</span>;
}

function highlightValue(value: string): React.ReactElement {
    if (!value) return <></>;

    if (value.startsWith('"') && value.endsWith('"')) {
        return <span style={{ color: 'var(--color-success)' }}>{value}</span>;
    }

    if (value === 'true' || value === 'false') {
        return <span style={{ color: 'var(--color-warning)' }}>{value}</span>;
    }

    if (/^\d+$/.test(value)) {
        return <span style={{ color: 'var(--color-brand)' }}>{value}</span>;
    }

    if (value.startsWith('[')) {
        return <span style={{ color: 'var(--color-success)' }}>{value}</span>;
    }

    return <span>{value}</span>;
}
