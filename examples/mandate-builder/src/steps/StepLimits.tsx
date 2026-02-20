import type { MandateState } from '../App';

interface Props {
    state: MandateState;
    update: (patch: Partial<MandateState>) => void;
}

interface SliderConfig {
    key: keyof MandateState;
    label: string;
    description: string;
    min: number;
    max: number;
    step: number;
    format?: (v: number) => string;
}

export default function StepLimits({ state, update }: Props) {
    const sliders: SliderConfig[] = [
        {
            key: 'maxTokensPerTurn',
            label: 'Maximum response length',
            description: 'How long each reply can be',
            min: 1000,
            max: 32000,
            step: 1000,
            format: v => v >= 10000 ? `~${(v / 1000).toFixed(0)}k words` : `~${(v / 1000).toFixed(0)}k words`,
        },
        {
            key: 'maxToolCallsPerTurn',
            label: 'Tool uses per reply',
            description: 'How many tools the agent can use in a single response',
            min: 1,
            max: 30,
            step: 1,
            format: v => `${v} tools`,
        },
        {
            key: 'maxTurnsPerSession',
            label: 'Conversation length',
            description: 'Maximum back-and-forth messages in one conversation',
            min: 10,
            max: 500,
            step: 10,
            format: v => `${v} messages`,
        },
        {
            key: 'maxConcurrentSessions',
            label: 'Simultaneous conversations',
            description: 'How many conversations can happen at the same time',
            min: 1,
            max: 50,
            step: 1,
        },
        {
            key: 'tokenBudgetDaily',
            label: 'Daily budget',
            description: 'Total usage across all conversations per day',
            min: 50000,
            max: 5000000,
            step: 50000,
            format: v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M tokens` : `${(v / 1000).toFixed(0)}k tokens`,
        },
        {
            key: 'timeoutSeconds',
            label: 'Response timeout',
            description: 'Maximum time before the agent must respond',
            min: 15,
            max: 300,
            step: 15,
            format: v => v >= 60 ? `${Math.floor(v / 60)}m ${v % 60 ? v % 60 + 's' : ''}`.trim() : `${v}s`,
        },
    ];

    return (
        <div className="space-y-5">
            <div className="glass-card p-6 sm:p-7">
                <div className="space-y-7">
                    {sliders.map(s => {
                        const value = state[s.key] as number;
                        const pct = ((value - s.min) / (s.max - s.min)) * 100;
                        const displayValue = s.format ? s.format(value) : String(value);

                        return (
                            <div key={s.key}>
                                <div className="flex items-baseline justify-between mb-2">
                                    <div>
                                        <span className="font-medium text-text text-[0.9375rem]">{s.label}</span>
                                        <p className="text-xs text-text-faint mt-0.5">{s.description}</p>
                                    </div>
                                    <span className="font-mono text-sm font-semibold text-brand tabular-nums ml-4 flex-shrink-0">
                                        {displayValue}
                                    </span>
                                </div>
                                <div className="relative group">
                                    <div className="h-2 bg-surface-inset rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-200"
                                            style={{
                                                width: `${pct}%`,
                                                background: `linear-gradient(90deg, var(--color-brand), var(--color-brand-light))`,
                                            }}
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min={s.min}
                                        max={s.max}
                                        step={s.step}
                                        value={value}
                                        onChange={e => update({ [s.key]: parseInt(e.target.value) } as any)}
                                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-text-faint mt-1">
                                    <span>{s.format ? s.format(s.min) : s.min}</span>
                                    <span>{s.format ? s.format(s.max) : s.max}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
