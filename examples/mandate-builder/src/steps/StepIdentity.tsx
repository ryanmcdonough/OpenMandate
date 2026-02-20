import type { MandateState } from '../App';

interface Props {
    state: MandateState;
    update: (patch: Partial<MandateState>) => void;
}

function toSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export default function StepIdentity({ state, update }: Props) {
    const handleNameChange = (raw: string) => {
        update({ name: raw, slug: toSlug(raw) });
    };

    const addTag = (tag: string) => {
        const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-');
        if (trimmed && !state.tags.includes(trimmed)) {
            update({ tags: [...state.tags, trimmed] });
        }
    };

    const removeTag = (tag: string) => {
        update({ tags: state.tags.filter(t => t !== tag) });
    };

    return (
        <div className="space-y-5">
            <div className="glass-card p-6 sm:p-7 space-y-6">
                {/* Name — friendly input, auto-slug shown below */}
                <div>
                    <label className="label">Agent name</label>
                    <input
                        type="text"
                        className="input-field text-lg font-medium"
                        placeholder="e.g. Tenant Rights Assistant"
                        value={state.name}
                        onChange={e => handleNameChange(e.target.value)}
                        autoFocus
                    />
                    {state.slug && (
                        <p className="text-xs text-text-faint mt-2 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                            Will be saved as <span className="font-mono font-medium text-text-muted">{state.slug}</span>
                        </p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className="label">What does this agent do?</label>
                    <textarea
                        className="input-field min-h-[90px]"
                        placeholder="Describe it in plain English — e.g. 'Helps tenants understand their housing rights, calculate deadlines, and draft formal letters to landlords'"
                        value={state.description}
                        onChange={e => update({ description: e.target.value })}
                    />
                </div>

                {/* Author */}
                <div>
                    <label className="label">Created by</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Your name or organisation"
                        value={state.author}
                        onChange={e => update({ author: e.target.value })}
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="label">Tags</label>
                    <p className="text-xs text-text-faint mb-2.5">Keywords to help categorise this agent</p>
                    {state.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {state.tags.map(tag => (
                                <span key={tag} className="chip chip-active">
                                    {tag}
                                    <button
                                        onClick={() => removeTag(tag)}
                                        className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity text-xs"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Type a tag and press Enter…"
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addTag(e.currentTarget.value);
                                e.currentTarget.value = '';
                            }
                        }}
                    />
                </div>
            </div>

            {/* Live preview card */}
            {state.name && (
                <div className="glass-card p-5 border-l-4 border-l-brand">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center text-brand text-lg flex-shrink-0">
                            {state.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-text truncate">{state.name}</p>
                            {state.description && (
                                <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{state.description}</p>
                            )}
                            {state.author && (
                                <p className="text-xs text-text-faint mt-1.5">by {state.author}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
