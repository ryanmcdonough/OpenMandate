import type { MandateState } from '../App';
import { ESCALATION_TOPICS } from '../lib/mock-data';

interface Props {
    state: MandateState;
    update: (patch: Partial<MandateState>) => void;
}

export default function StepEscalation({ state, update }: Props) {
    const toggleTopic = (id: string) => {
        update({
            escalationTopics: state.escalationTopics.includes(id)
                ? state.escalationTopics.filter(t => t !== id)
                : [...state.escalationTopics, id],
        });
    };

    return (
        <div className="space-y-5">
            <div className="glass-card p-6 sm:p-7">
                <h3 className="text-base font-semibold text-text mb-1">Sensitive topics</h3>
                <p className="text-sm text-text-muted mb-5">
                    Some topics are too important for AI to handle alone. When one of these comes up, your agent will stop and make sure the person gets proper support.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ESCALATION_TOPICS.map(topic => {
                        const isActive = state.escalationTopics.includes(topic.id);
                        return (
                            <button
                                key={topic.id}
                                onClick={() => toggleTopic(topic.id)}
                                className={`flex items-center justify-between p-4 rounded-xl text-left transition-all duration-200 border-[1.5px] ${isActive
                                        ? 'bg-warning-soft border-warning/20'
                                        : 'bg-surface border-transparent hover:bg-surface-overlay hover:border-border'
                                    }`}
                            >
                                <span className={`font-medium text-[0.9375rem] ${isActive ? 'text-warning' : 'text-text'}`}>
                                    {topic.label}
                                </span>
                                <div
                                    className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isActive ? 'bg-warning border-warning' : 'border-border'
                                        }`}
                                >
                                    {isActive && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Distress detection */}
            <div className="glass-card p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-base font-semibold text-text mb-1">Wellbeing check</h3>
                        <p className="text-sm text-text-muted">
                            If someone seems in distress, should the agent pause and offer crisis support resources — like helpline numbers?
                        </p>
                    </div>
                    <div
                        className="toggle-track mt-1"
                        data-on={String(state.detectDistress)}
                        onClick={() => update({ detectDistress: !state.detectDistress })}
                    >
                        <div className="toggle-thumb" />
                    </div>
                </div>

                {state.detectDistress && (
                    <div className="mt-5 p-4 bg-brand-soft rounded-xl">
                        <p className="text-sm text-text-secondary mb-2 font-medium">When enabled, the agent will share resources like:</p>
                        <ul className="text-sm text-text-muted space-y-1">
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand" /> Samaritans: 116 123</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand" /> Crisis Text Line: Text HOME to 741741</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Summary */}
            {state.escalationTopics.length > 0 && (
                <div className="glass-card p-4 border-l-4 border-l-warning">
                    <p className="text-sm text-text-muted">
                        <span className="font-semibold text-warning">{state.escalationTopics.length}</span> sensitive topic{state.escalationTopics.length !== 1 ? 's' : ''} will trigger a human handoff
                    </p>
                </div>
            )}
        </div>
    );
}
