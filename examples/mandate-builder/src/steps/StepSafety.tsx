import type { MandateState } from '../App';

interface Props {
    state: MandateState;
    update: (patch: Partial<MandateState>) => void;
}

export default function StepSafety({ state, update }: Props) {
    const addDisclaimer = () => {
        update({
            disclaimers: [
                ...state.disclaimers,
                { trigger: 'always', text: '', placement: 'end' },
            ],
        });
    };

    const updateDisclaimer = (index: number, field: string, value: string) => {
        const updated = state.disclaimers.map((d, i) =>
            i === index ? { ...d, [field]: value } : d
        );
        update({ disclaimers: updated });
    };

    const removeDisclaimer = (index: number) => {
        update({ disclaimers: state.disclaimers.filter((_, i) => i !== index) });
    };

    return (
        <div className="space-y-5">
            {/* Disclaimers */}
            <div className="glass-card p-6 sm:p-7">
                <h3 className="text-base font-semibold text-text mb-1">Automatic notices</h3>
                <p className="text-sm text-text-muted mb-5">
                    Messages that are automatically added to the agent's replies to set expectations. For example, a reminder that this is AI-generated, not professional advice.
                </p>

                <div className="space-y-3">
                    {state.disclaimers.map((disc, i) => (
                        <div key={i} className="bg-surface-overlay/60 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-text-secondary">Notice {i + 1}</span>
                                {state.disclaimers.length > 1 && (
                                    <button
                                        onClick={() => removeDisclaimer(i)}
                                        className="text-xs text-danger/60 hover:text-danger transition-colors font-medium"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label text-xs">When to show</label>
                                    <select
                                        className="input-field text-sm"
                                        value={disc.trigger}
                                        onChange={e => updateDisclaimer(i, 'trigger', e.target.value)}
                                    >
                                        <option value="always">Every response</option>
                                        <option value="on_document_generation">When creating documents</option>
                                        <option value="on_legal_claim">When giving legal information</option>
                                        <option value="on_claim">When stating facts</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label text-xs">Position</label>
                                    <select
                                        className="input-field text-sm"
                                        value={disc.placement}
                                        onChange={e => updateDisclaimer(i, 'placement', e.target.value)}
                                    >
                                        <option value="end">End of response</option>
                                        <option value="start">Start of response</option>
                                        <option value="both">Start and end</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label text-xs">Notice text</label>
                                <textarea
                                    className="input-field text-sm min-h-[56px]"
                                    placeholder="e.g. This is AI-generated information, not professional advice…"
                                    value={disc.text}
                                    onChange={e => updateDisclaimer(i, 'text', e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={addDisclaimer} className="mt-4 text-sm font-medium text-brand hover:text-brand-light transition-colors">
                    + Add another notice
                </button>
            </div>

            {/* Citations */}
            <div className="glass-card p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                        <h3 className="text-base font-semibold text-text mb-1">Source references</h3>
                        <p className="text-sm text-text-muted">
                            Should the agent cite where its information comes from? This helps people verify what it says.
                        </p>
                    </div>
                    <div
                        className="toggle-track mt-1"
                        data-on={String(state.citationsRequired)}
                        onClick={() => update({ citationsRequired: !state.citationsRequired })}
                    >
                        <div className="toggle-thumb" />
                    </div>
                </div>

                {state.citationsRequired && (
                    <div className="space-y-4 pt-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label text-xs">How to show references</label>
                                <select
                                    className="input-field text-sm"
                                    value={state.citationFormat}
                                    onChange={e => update({ citationFormat: e.target.value })}
                                >
                                    <option value="inline">Within the text</option>
                                    <option value="footnote">As footnotes</option>
                                    <option value="end">At the end</option>
                                </select>
                            </div>
                            <div>
                                <label className="label text-xs">References needed per claim</label>
                                <input
                                    type="number"
                                    className="input-field text-sm"
                                    min={0}
                                    max={5}
                                    value={state.minCitationsPerClaim}
                                    onChange={e => update({ minCitationsPerClaim: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label text-xs">Sources the agent should never cite</label>
                            {state.blockedSources.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {state.blockedSources.map(s => (
                                        <span key={s} className="chip chip-danger text-xs">
                                            {s}
                                            <button
                                                onClick={() => update({ blockedSources: state.blockedSources.filter(x => x !== s) })}
                                                className="ml-0.5"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <input
                                type="text"
                                className="input-field text-sm"
                                placeholder="e.g. wikipedia — press Enter to add"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        const v = e.currentTarget.value.trim().toLowerCase();
                                        if (v && !state.blockedSources.includes(v)) {
                                            update({ blockedSources: [...state.blockedSources, v] });
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Audit */}
            <div className="glass-card p-6 sm:p-7">
                <h3 className="text-base font-semibold text-text mb-1">Activity records</h3>
                <p className="text-sm text-text-muted mb-5">
                    How much detail should be logged for compliance and review?
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { value: 'full', label: 'Everything', desc: 'Full audit trail' },
                        { value: 'actions_only', label: 'Actions only', desc: 'Just key actions' },
                        { value: 'errors_only', label: 'Issues only', desc: 'Only problems' },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => update({ auditLogLevel: opt.value })}
                            className={`p-3.5 rounded-xl text-center transition-all duration-200 border-[1.5px] ${state.auditLogLevel === opt.value
                                    ? 'border-brand/25 bg-brand-soft shadow-sm'
                                    : 'border-transparent bg-surface hover:bg-surface-overlay'
                                }`}
                        >
                            <span className="font-medium text-sm text-text block">{opt.label}</span>
                            <span className="text-xs text-text-faint">{opt.desc}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-5">
                    <label className="label text-xs">Keep records for</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            className="input-field text-sm w-24"
                            min={7}
                            max={365}
                            value={state.auditRetentionDays}
                            onChange={e => update({ auditRetentionDays: parseInt(e.target.value) || 90 })}
                        />
                        <span className="text-sm text-text-muted">days</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
