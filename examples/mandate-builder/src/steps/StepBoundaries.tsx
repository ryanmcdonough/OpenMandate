import type { MandateState } from '../App';
import { MOCK_TOOLS, CATEGORIES, PROHIBITED_ACTIONS, DATA_CATEGORIES } from '../lib/mock-data';

interface Props {
    state: MandateState;
    update: (patch: Partial<MandateState>) => void;
}

export default function StepBoundaries({ state, update }: Props) {
    const toggleProhibitedTool = (id: string) => {
        update({
            prohibitedTools: state.prohibitedTools.includes(id)
                ? state.prohibitedTools.filter(t => t !== id)
                : [...state.prohibitedTools, id],
        });
    };

    const toggleProhibitedAction = (id: string) => {
        update({
            prohibitedActions: state.prohibitedActions.includes(id)
                ? state.prohibitedActions.filter(a => a !== id)
                : [...state.prohibitedActions, id],
        });
    };

    const toggleProhibitedData = (id: string) => {
        update({
            prohibitedData: state.prohibitedData.includes(id)
                ? state.prohibitedData.filter(d => d !== id)
                : [...state.prohibitedData, id],
        });
    };

    const riskStyles = {
        low: { bg: 'bg-success-soft', text: 'text-success', label: 'Safe' },
        medium: { bg: 'bg-warning-soft', text: 'text-warning', label: 'Moderate' },
        high: { bg: 'bg-danger-soft', text: 'text-danger', label: 'Sensitive' },
    };

    const blockAll = (category: string) => {
        const categoryTools = MOCK_TOOLS.filter(t => t.category === category).map(t => t.id);
        const newBlocked = new Set([...state.prohibitedTools, ...categoryTools]);
        update({ prohibitedTools: [...newBlocked] });
    };

    const unblockAll = (category: string) => {
        const categoryTools = new Set(MOCK_TOOLS.filter(t => t.category === category).map(t => t.id));
        update({ prohibitedTools: state.prohibitedTools.filter(t => !categoryTools.has(t)) });
    };

    return (
        <div className="space-y-5">
            {/* Blocked Tools — same UX as Step 3 */}
            <div className="glass-card p-4 flex items-center justify-between">
                <p className="text-sm text-text-muted">
                    <span className="font-semibold text-danger">{state.prohibitedTools.length}</span> of {MOCK_TOOLS.length} tools blocked
                </p>
                <p className="text-xs text-text-faint">
                    Blocked tools can never be used, even if someone tries to trick the agent
                </p>
            </div>

            {CATEGORIES.map(cat => {
                const tools = MOCK_TOOLS.filter(t => t.category === cat.id);
                if (tools.length === 0) return null;
                const allBlocked = tools.every(t => state.prohibitedTools.includes(t.id));

                return (
                    <div key={cat.id} className="glass-card p-6 sm:p-7">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-text flex items-center gap-2.5">
                                <span className="text-lg">{cat.icon}</span>
                                {cat.label}
                                <span className="text-xs font-normal text-text-faint">
                                    {tools.filter(t => state.prohibitedTools.includes(t.id)).length}/{tools.length} blocked
                                </span>
                            </h3>
                            <button
                                onClick={() => allBlocked ? unblockAll(cat.id) : blockAll(cat.id)}
                                className="text-xs font-medium text-danger hover:text-danger/80 transition-colors"
                            >
                                {allBlocked ? 'Unblock all' : 'Block all'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {tools.map(tool => {
                                const isBlocked = state.prohibitedTools.includes(tool.id);
                                const risk = riskStyles[tool.riskLevel];
                                return (
                                    <button
                                        key={tool.id}
                                        onClick={() => toggleProhibitedTool(tool.id)}
                                        className={`w-full flex items-center gap-4 p-3.5 rounded-xl text-left transition-all duration-200 ${isBlocked
                                                ? 'bg-danger-soft border-[1.5px] border-danger/15'
                                                : 'bg-surface border-[1.5px] border-transparent hover:bg-surface-overlay'
                                            }`}
                                    >
                                        <span className="text-xl flex-shrink-0 w-8 text-center">{tool.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-medium text-[0.9375rem] ${isBlocked ? 'text-danger/80 line-through' : 'text-text'}`}>
                                                    {tool.name}
                                                </span>
                                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md ${risk.bg} ${risk.text}`}>
                                                    {risk.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-text-muted mt-0.5 truncate">{tool.description}</p>
                                        </div>
                                        <div
                                            className="toggle-track"
                                            data-on={String(isBlocked)}
                                            style={isBlocked ? { backgroundColor: 'var(--color-danger)' } : {}}
                                        >
                                            <div className="toggle-thumb" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Prohibited Actions */}
            <div className="glass-card p-6 sm:p-7">
                <h3 className="text-base font-semibold text-text mb-1">Things the agent must never do</h3>
                <p className="text-sm text-text-muted mb-5">
                    Select behaviours the agent should refuse, no matter what the user asks.
                </p>
                <div className="space-y-2">
                    {PROHIBITED_ACTIONS.map(action => {
                        const isActive = state.prohibitedActions.includes(action.id);
                        return (
                            <label
                                key={action.id}
                                className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-200 ${isActive
                                        ? 'bg-danger-soft border-[1.5px] border-danger/15'
                                        : 'bg-surface border-[1.5px] border-transparent hover:bg-surface-overlay'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => toggleProhibitedAction(action.id)}
                                    className="sr-only"
                                />
                                <div
                                    className={`w-5 h-5 mt-0.5 rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${isActive ? 'bg-danger border-danger' : 'border-border'
                                        }`}
                                >
                                    {isActive && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-text text-[0.9375rem]">{action.label}</span>
                                    <p className="text-sm text-text-muted mt-0.5">{action.description}</p>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Prohibited Data */}
            <div className="glass-card p-6 sm:p-7">
                <h3 className="text-base font-semibold text-text mb-1">Off-limits data</h3>
                <p className="text-sm text-text-muted mb-5">
                    Types of sensitive information the agent should never handle, store, or ask for.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {DATA_CATEGORIES.map(cat => {
                        const isActive = state.prohibitedData.includes(cat.id);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => toggleProhibitedData(cat.id)}
                                className={`p-3.5 rounded-xl text-center transition-all duration-200 border-[1.5px] ${isActive
                                        ? 'bg-danger-soft border-danger/15'
                                        : 'bg-surface border-transparent hover:bg-surface-overlay hover:border-border'
                                    }`}
                            >
                                <span className="text-2xl block mb-1.5">{cat.icon}</span>
                                <span className={`text-xs font-medium leading-tight ${isActive ? 'text-danger' : 'text-text-muted'}`}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
