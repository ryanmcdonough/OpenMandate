import { useState, useCallback } from 'react';
import StepIdentity from './steps/StepIdentity';
import StepExpertise from './steps/StepExpertise';
import StepTools from './steps/StepTools';
import StepBoundaries from './steps/StepBoundaries';
import StepSafety from './steps/StepSafety';
import StepEscalation from './steps/StepEscalation';
import StepLimits from './steps/StepLimits';
import StepReview from './steps/StepReview';

export interface DataAccessEntry {
  scope: string;
  permissions: string[];
  fileTypes: string[];
}

export interface DisclaimerEntry {
  trigger: string;
  text: string;
  placement: string;
}

export interface MandateState {
  // Step 1: Identity
  name: string;
  slug: string;
  description: string;
  author: string;
  tags: string[];

  // Step 2: Expertise
  jurisdictions: string[];
  scopeBehavior: string;
  scopeMessage: string;
  skillPacks: string[];

  // Step 3: Tools
  allowedTools: string[];
  dataAccess: DataAccessEntry[];
  outputTypes: string[];

  // Step 4: Boundaries
  prohibitedTools: string[];
  prohibitedActions: string[];
  prohibitedData: string[];

  // Step 5: Safety
  disclaimers: DisclaimerEntry[];
  citationsRequired: boolean;
  citationFormat: string;
  minCitationsPerClaim: number;
  allowedSources: string[];
  blockedSources: string[];
  humanReviewActions: string[];
  reviewPrompt: string;
  auditLogLevel: string;
  auditIncludeLlm: boolean;
  auditIncludeTools: boolean;
  auditRetentionDays: number;

  // Step 6: Escalation
  escalationTopics: string[];
  detectDistress: boolean;

  // Step 7: Limits
  maxTokensPerTurn: number;
  maxToolCallsPerTurn: number;
  maxTurnsPerSession: number;
  maxConcurrentSessions: number;
  tokenBudgetDaily: number;
  timeoutSeconds: number;
}

const INITIAL_STATE: MandateState = {
  name: '',
  slug: '',
  description: '',
  author: '',
  tags: [],
  jurisdictions: [],
  scopeBehavior: 'escalate',
  scopeMessage: '',
  skillPacks: [],
  allowedTools: [],
  dataAccess: [
    { scope: 'user_uploads', permissions: ['read'], fileTypes: ['.pdf', '.docx'] },
  ],
  outputTypes: [],
  prohibitedTools: [],
  prohibitedActions: [],
  prohibitedData: [],
  disclaimers: [
    { trigger: 'always', text: 'This is AI-generated information, not professional advice. Always consult a qualified professional before acting.', placement: 'end' },
  ],
  citationsRequired: true,
  citationFormat: 'inline',
  minCitationsPerClaim: 1,
  allowedSources: ['uk_primary_legislation', 'case_law'],
  blockedSources: ['wikipedia', 'reddit'],
  humanReviewActions: ['finalize_document'],
  reviewPrompt: 'Please review this draft carefully before using it.',
  auditLogLevel: 'full',
  auditIncludeLlm: true,
  auditIncludeTools: true,
  auditRetentionDays: 90,
  escalationTopics: [],
  detectDistress: true,
  maxTokensPerTurn: 8000,
  maxToolCallsPerTurn: 10,
  maxTurnsPerSession: 100,
  maxConcurrentSessions: 5,
  tokenBudgetDaily: 500000,
  timeoutSeconds: 120,
};

const STEPS = [
  { title: 'Name Your Agent', subtitle: 'Give your agent a name and describe its purpose', icon: '✏️' },
  { title: 'Define Expertise', subtitle: 'Choose where and what your agent specialises in', icon: '🎯' },
  { title: 'Choose Tools', subtitle: 'Select what your agent can use to help people', icon: '🧰' },
  { title: 'Set Boundaries', subtitle: 'Define what your agent should never do', icon: '🚧' },
  { title: 'Safety & Compliance', subtitle: 'Add guardrails to keep responses safe and honest', icon: '🛡️' },
  { title: 'Escalation Rules', subtitle: 'Decide when to hand off to a real person', icon: '🤝' },
  { title: 'Set Limits', subtitle: 'Control costs and usage', icon: '⚙️' },
  { title: 'Review & Export', subtitle: 'Check everything and download your mandate', icon: '✅' },
];

export default function App() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<MandateState>(INITIAL_STATE);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const update = useCallback((patch: Partial<MandateState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const next = () => {
    if (step < STEPS.length - 1) {
      setDirection('forward');
      setStep(s => s + 1);
    }
  };

  const back = () => {
    if (step > 0) {
      setDirection('backward');
      setStep(s => s - 1);
    }
  };

  const goTo = (target: number) => {
    setDirection(target > step ? 'forward' : 'backward');
    setStep(target);
  };

  const stepComponents = [
    <StepIdentity key={0} state={state} update={update} />,
    <StepExpertise key={1} state={state} update={update} />,
    <StepTools key={2} state={state} update={update} />,
    <StepBoundaries key={3} state={state} update={update} />,
    <StepSafety key={4} state={state} update={update} />,
    <StepEscalation key={5} state={state} update={update} />,
    <StepLimits key={6} state={state} update={update} />,
    <StepReview key={7} state={state} />,
  ];

  const progressPercent = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* ─── Header ─── */}
      <header className="border-b border-border bg-surface-raised/90 backdrop-blur-lg sticky top-0 z-50">
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600/90 text-sm py-2 px-5 sm:px-8 text-center">
          <span className="font-semibold">Demo Sandbox:</span> Tools, capabilities, and configurations shown here are illustrative examples. To use them in production, you must build and register the corresponding handlers in your OpenMandate implementation.
        </div>
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-[0.9375rem] font-semibold tracking-tight text-text">Mandate Builder</span>
            </div>
            <span className="text-xs font-medium text-text-faint uppercase tracking-wider">
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Progress bar — thin, elegant */}
          <div className="h-[3px] bg-border-light rounded-full -mb-[1.5px] overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* ─── Step Content ─── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-8 py-10">
        {/* Step header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{STEPS[step].icon}</span>
            <h2 className="text-[1.625rem] font-bold tracking-tight text-text leading-tight">
              {STEPS[step].title}
            </h2>
          </div>
          <p className="text-[0.9375rem] text-text-muted leading-relaxed pl-[2.75rem]">
            {STEPS[step].subtitle}
          </p>
        </div>

        {/* Animated step */}
        <div
          key={step}
          className={direction === 'forward' ? 'animate-slide-left' : 'animate-slide-right'}
        >
          {stepComponents[step]}
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-surface-raised/90 backdrop-blur-lg sticky bottom-0 z-50">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-[4.5rem] flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="btn-secondary"
          >
            ← Back
          </button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${i === step
                  ? 'w-6 h-2 bg-brand'
                  : i < step
                    ? 'w-2 h-2 bg-brand/40 hover:bg-brand/60'
                    : 'w-2 h-2 bg-border hover:bg-text-faint'
                  }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn-primary">
              Continue →
            </button>
          ) : (
            <div className="w-[107px]" />
          )}
        </div>
      </footer>
    </div>
  );
}
