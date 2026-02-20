import type { MandateState } from '../App';
import { MOCK_TOOLS, CATEGORIES } from '../lib/mock-data';

interface Props {
    state: MandateState;
    update: (patch: Partial<MandateState>) => void;
}

export default function StepTools({ state, update }: Props) {
    const toggleTool = (id: string) => {
        update({
            allowedTools: state.allowedTools.includes(id)
                ? state.allowedTools.filter(t => t !== id)
                : [...state.allowedTools, id],
        });
    };

    const enableAll = (category: string) => {
        const categoryTools = MOCK_TOOLS.filter(t => t.category === category).map(t => t.id);
        const newAllowed = new Set([...state.allowedTools, ...categoryTools]);
        update({ allowedTools: [...newAllowed] });
    };

    const disableAll = (category: string) => {
        const categoryTools = new Set(MOCK_TOOLS.filter(t => t.category === category).map(t => t.id));
        update({ allowedTools: state.allowedTools.filter(t => !categoryTools.has(t)) });
    };

    const riskStyles = {
        low: { bg: 'bg-success-soft', text: 'text-success', label: 'Safe' },
        medium: { bg: 'bg-warning-soft', text: 'text-warning', label: 'Moderate' },
        high: { bg: 'bg-danger-soft', text: 'text-danger', label: 'Sensitive' },
    };

    return (
        <div className="space-y-5">
            {/* Summary bar */}
            <div className="glass-card p-4 flex items-center justify-between">
                <p className="text-sm text-text-muted">
                    <span className="font-semibold text-brand">{state.allowedTools.length}</span> of {MOCK_TOOLS.length} tools enabled
                </p>
                <div className="flex items-center gap-4 text-xs text-text-faint">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-success" /> Safe
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-warning" /> Moderate
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-danger" /> Sensitive
                    </span>
                </div>
            </div>

            {CATEGORIES.map(cat => {
                const tools = MOCK_TOOLS.filter(t => t.category === cat.id);
                if (tools.length === 0) return null;
                const allEnabled = tools.every(t => state.allowedTools.includes(t.id));

                return (
                    <div key={cat.id} className="glass-card p-6 sm:p-7">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-text flex items-center gap-2.5">
                                <span className="text-lg">{cat.icon}</span>
                                {cat.label}
                                <span className="text-xs font-normal text-text-faint">
                                    {tools.filter(t => state.allowedTools.includes(t.id)).length}/{tools.length}
                                </span>
                            </h3>
                            <button
                                onClick={() => allEnabled ? disableAll(cat.id) : enableAll(cat.id)}
                                className="text-xs font-medium text-brand hover:text-brand-light transition-colors"
                            >
                                {allEnabled ? 'Disable all' : 'Enable all'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {tools.map(tool => {
                                const isEnabled = state.allowedTools.includes(tool.id);
                                const risk = riskStyles[tool.riskLevel];
                                return (
                                    <button
                                        key={tool.id}
                                        onClick={() => toggleTool(tool.id)}
                                        className={`w-full flex items-center gap-4 p-3.5 rounded-xl text-left transition-all duration-200 ${isEnabled
                                                ? 'bg-brand-soft/50 border-[1.5px] border-brand/20'
                                                : 'bg-surface border-[1.5px] border-transparent hover:bg-surface-overlay'
                                            }`}
                                    >
                                        <span className="text-xl flex-shrink-0 w-8 text-center">{tool.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-text text-[0.9375rem]">{tool.name}</span>
                                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md ${risk.bg} ${risk.text}`}>
                                                    {risk.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-text-muted mt-0.5 truncate">{tool.description}</p>
                                        </div>
                                        <div
                                            className="toggle-track"
                                            data-on={String(isEnabled)}
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
        </div>
    );
}
