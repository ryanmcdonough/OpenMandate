import type { MandateState } from '../App';
import { JURISDICTIONS, SKILL_PACKS } from '../lib/mock-data';

interface Props {
    state: MandateState;
    update: (patch: Partial<MandateState>) => void;
}

export default function StepExpertise({ state, update }: Props) {
    const toggleJurisdiction = (code: string) => {
        update({
            jurisdictions: state.jurisdictions.includes(code)
                ? state.jurisdictions.filter(j => j !== code)
                : [...state.jurisdictions, code],
        });
    };

    const toggleSkillPack = (id: string) => {
        update({
            skillPacks: state.skillPacks.includes(id)
                ? state.skillPacks.filter(s => s !== id)
                : [...state.skillPacks, id],
        });
    };

    return (
        <div className="space-y-5">
            {/* Jurisdictions */}
            <div className="glass-card p-6 sm:p-7">
                <h3 className="text-base font-semibold text-text mb-1">Where does this agent operate?</h3>
                <p className="text-sm text-text-muted mb-5">
                    Pick the regions your agent covers. If someone asks about an area not listed here, it will let them know and suggest alternatives.
                </p>
                <div className="flex flex-wrap gap-2">
                    {JURISDICTIONS.map(j => (
                        <button
                            key={j.code}
                            onClick={() => toggleJurisdiction(j.code)}
                            className={`chip ${state.jurisdictions.includes(j.code) ? 'chip-active' : 'chip-inactive'}`}
                        >
                            {j.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Out-of-scope behaviour */}
            <div className="glass-card p-6 sm:p-7">
                <h3 className="text-base font-semibold text-text mb-1">What happens with unsupported requests?</h3>
                <p className="text-sm text-text-muted mb-5">
                    When someone asks about a topic outside your agent's expertise, how should it respond?
                </p>
                <div className="space-y-2.5">
                    {[
                        { value: 'escalate', label: 'Hand off to a person', desc: 'The agent will connect the user with a human or provide contact details', icon: '🤝' },
                        { value: 'refuse', label: 'Politely decline', desc: 'The agent will explain what it can help with and suggest alternatives', icon: '🚫' },
                        { value: 'warn_and_attempt', label: 'Warn and try anyway', desc: 'The agent will flag that this is outside its expertise but still try to help', icon: '⚠️' },
                    ].map(opt => (
                        <label
                            key={opt.value}
                            className={`flex items-start gap-3.5 p-4 rounded-xl cursor-pointer transition-all duration-200 ${state.scopeBehavior === opt.value
                                    ? 'bg-brand-soft border-[1.5px] border-brand/25 shadow-sm'
                                    : 'bg-surface border-[1.5px] border-transparent hover:bg-surface-overlay'
                                }`}
                        >
                            <input
                                type="radio"
                                name="scopeBehavior"
                                value={opt.value}
                                checked={state.scopeBehavior === opt.value}
                                onChange={e => update({ scopeBehavior: e.target.value })}
                                className="sr-only"
                            />
                            <span className="text-xl mt-0.5 flex-shrink-0">{opt.icon}</span>
                            <div>
                                <span className="font-medium text-text text-[0.9375rem]">{opt.label}</span>
                                <p className="text-sm text-text-muted mt-0.5">{opt.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>

                {(state.scopeBehavior === 'escalate' || state.scopeBehavior === 'refuse') && (
                    <div className="mt-5">
                        <label className="label">Custom message for the user</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. I can only help with England & Wales law. For Scottish law, try…"
                            value={state.scopeMessage}
                            onChange={e => update({ scopeMessage: e.target.value })}
                        />
                    </div>
                )}
            </div>

            {/* Skill Packs */}
            <div className="glass-card p-6 sm:p-7">
                <h3 className="text-base font-semibold text-text mb-1">Expertise packs</h3>
                <p className="text-sm text-text-muted mb-5">
                    These provide your agent with specialist knowledge and tools for specific domains.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SKILL_PACKS.map(sp => {
                        const isActive = state.skillPacks.includes(sp.id);
                        return (
                            <button
                                key={sp.id}
                                onClick={() => toggleSkillPack(sp.id)}
                                className={`glass-card-hover p-4 text-left ${isActive ? '!border-brand/30 !bg-brand-soft/50' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-medium text-text text-[0.9375rem]">{sp.label}</span>
                                    <div
                                        className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-brand border-brand' : 'border-border'
                                            }`}
                                    >
                                        {isActive && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-text-muted">{sp.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
