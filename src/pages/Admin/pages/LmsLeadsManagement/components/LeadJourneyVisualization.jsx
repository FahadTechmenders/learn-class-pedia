import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Route, Globe, Monitor, Mail, ShieldCheck, UserCheck, Check, Clock, Minus, ExternalLink, X
} from 'lucide-react';
import { buildLeadJourney, JOURNEY_STATUS } from '../leadDetailsHelpers';

const STEP_ICONS = {
  referral: Globe,
  landing: Monitor,
  signup: Mail,
  verification: ShieldCheck,
  account: UserCheck,
};

const TONES = {
  [JOURNEY_STATUS.COMPLETED]: {
    node: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30',
    ring: 'ring-emerald-200 dark:ring-emerald-900',
    title: 'text-gray-900 dark:text-white',
    dot: 'bg-emerald-500',
    badge: Check,
  },
  [JOURNEY_STATUS.PENDING]: {
    node: 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-amber-500/30',
    ring: 'ring-amber-200 dark:ring-amber-900',
    title: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-400',
    badge: Clock,
  },
  [JOURNEY_STATUS.MUTED]: {
    node: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-transparent',
    ring: 'ring-gray-100 dark:ring-gray-800',
    title: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-300 dark:bg-gray-600',
    badge: Minus,
  },
};

const CURRENT_TONE = {
  node: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/40',
  ring: 'ring-blue-200 dark:ring-blue-900',
  title: 'text-blue-700 dark:text-blue-300',
  dot: 'bg-blue-500',
};

const toneFor = (step) => {
  const base = TONES[step.status] || TONES[JOURNEY_STATUS.MUTED];
  if (!step.isCurrent) return base;
  // Current step keeps its semantic badge but uses accent colouring, unless it is pending (keep amber).
  if (step.status === JOURNEY_STATUS.PENDING) return base;
  return { ...base, ...CURRENT_TONE };
};

const isSegmentFilled = (from, to) =>
  from.status === JOURNEY_STATUS.COMPLETED && to.status !== JOURNEY_STATUS.MUTED;

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const DetailsPopover = ({ step, onClose, placement = 'top' }) => (
  <div
    role="dialog"
    aria-label={`${step.stage} details`}
    className={`z-20 w-56 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-3 text-left ${
      placement === 'top'
        ? 'absolute left-1/2 -translate-x-1/2 bottom-full mb-3'
        : 'mt-2 w-full'
    }`}
    style={{ animation: 'journey-pop 180ms cubic-bezier(.2,.8,.2,1)' }}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{step.stage}</div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white break-words">{step.title}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 -mr-1 -mt-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
    <dl className="mt-2 space-y-1">
      {step.details.map((d) => (
        <div key={d.label} className="flex items-baseline justify-between gap-3 text-xs">
          <dt className="text-gray-500 dark:text-gray-400 flex-shrink-0">{d.label}</dt>
          <dd className="text-gray-900 dark:text-gray-100 text-right min-w-0 break-all">
            {d.href ? (
              <a href={d.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                <span className="truncate max-w-[130px]">{d.value.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            ) : d.value}
          </dd>
        </div>
      ))}
    </dl>
    {placement === 'top' && (
      <span className="absolute left-1/2 -translate-x-1/2 top-full w-3 h-3 -mt-1.5 rotate-45 bg-white dark:bg-gray-800 border-r border-b border-gray-100 dark:border-gray-700" />
    )}
  </div>
);

const JourneyNode = ({ step, active, onActivate, onDeactivate, onToggle, size = 'lg' }) => {
  const tone = toneFor(step);
  const Icon = STEP_ICONS[step.key] || Route;
  const Badge = tone.badge;
  const dim = size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
  const iconDim = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${step.number} ${step.stage}: ${step.title}`}
      onMouseEnter={() => canHover() && onActivate()}
      onMouseLeave={() => canHover() && onDeactivate()}
      onFocus={onActivate}
      onBlur={onDeactivate}
      onClick={onToggle}
      className="relative group outline-none"
      style={{ perspective: '600px' }}
    >
      <span
        className={`relative flex items-center justify-center ${dim} rounded-2xl shadow-lg ring-4 ${tone.ring} ${tone.node} transition-transform duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] ${
          active ? 'scale-110 -translate-y-1' : 'group-hover:scale-105 group-hover:-translate-y-0.5'
        }`}
        style={{ transform: active ? 'translateZ(12px) rotateX(6deg)' : undefined, transformStyle: 'preserve-3d' }}
      >
        <Icon className={iconDim} />
        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow ${tone.title}`}>
          <Badge className="w-3 h-3" />
        </span>
        {step.isCurrent && (
          <span className={`absolute inset-0 rounded-2xl ring-2 ${step.status === JOURNEY_STATUS.PENDING ? 'ring-amber-400' : 'ring-blue-400'} animate-ping opacity-60 pointer-events-none`} style={{ animationDuration: '2.2s' }} />
        )}
      </span>
    </button>
  );
};

const Connector = ({ filled, vertical = false }) => (
  <div className={`relative overflow-hidden rounded-full ${vertical ? 'w-0.5 flex-1 min-h-[28px] mx-auto' : 'h-0.5 flex-1'} ${filled ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-gray-200 dark:bg-gray-700'}`}>
    {!filled && (
      <span className={`absolute inset-0 ${vertical ? 'bg-[repeating-linear-gradient(to_bottom,transparent_0_4px,rgba(255,255,255,.7)_4px_8px)]' : 'bg-[repeating-linear-gradient(to_right,transparent_0_4px,rgba(255,255,255,.7)_4px_8px)]'} dark:opacity-30`} />
    )}
    {filled && (
      <span className={`absolute ${vertical ? 'left-0 right-0 h-1/4 top-0 journey-pulse-y bg-gradient-to-b' : 'top-0 bottom-0 w-1/4 left-0 journey-pulse-x bg-gradient-to-r'} from-transparent via-white to-transparent`} />
    )}
  </div>
);

const HorizontalJourney = ({ steps, activeKey, setActiveKey }) => (
  <div className="relative pt-16 pb-2">
    <div className="flex items-center">
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          {i > 0 && <Connector filled={isSegmentFilled(steps[i - 1], step)} />}
          <div className="relative flex flex-col items-center flex-shrink-0 w-[19%] max-w-[160px]">
            <span className="absolute -top-6 text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500">{step.number}</span>
            {activeKey === step.key && <DetailsPopover step={step} onClose={() => setActiveKey(null)} />}
            <JourneyNode
              step={step}
              active={activeKey === step.key}
              onActivate={() => setActiveKey(step.key)}
              onDeactivate={() => setActiveKey((k) => (k === step.key ? null : k))}
              onToggle={() => setActiveKey((k) => (k === step.key ? null : step.key))}
            />
            <div className="mt-3 text-center px-1 w-full">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{step.stage}</div>
              <div className={`text-sm font-semibold leading-tight break-words ${toneFor(step).title}`}>{step.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5 break-words">{step.value}</div>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  </div>
);

const VerticalJourney = ({ steps, activeKey, setActiveKey }) => (
  <ol className="relative space-y-1">
    {steps.map((step, i) => {
      const tone = toneFor(step);
      const open = activeKey === step.key;
      return (
        <li key={step.key} className="flex gap-4">
          <div className="flex flex-col items-center">
            <JourneyNode
              size="sm"
              step={step}
              active={open}
              onActivate={() => {}}
              onDeactivate={() => {}}
              onToggle={() => setActiveKey((k) => (k === step.key ? null : step.key))}
            />
            {i < steps.length - 1 && <Connector vertical filled={isSegmentFilled(step, steps[i + 1])} />}
          </div>
          <button
            type="button"
            onClick={() => setActiveKey((k) => (k === step.key ? null : step.key))}
            className="flex-1 min-w-0 text-left pb-5 pt-1"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500">{step.number}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{step.stage}</span>
            </div>
            <div className={`text-sm font-semibold leading-tight ${tone.title}`}>{step.title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.value}</div>
            {open && <DetailsPopover step={step} placement="inline" onClose={() => setActiveKey(null)} />}
          </button>
        </li>
      );
    })}
  </ol>
);

const LeadJourneyVisualization = ({ lead }) => {
  const steps = useMemo(() => buildLeadJourney(lead), [lead]);
  const [activeKey, setActiveKey] = useState(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Close popover when tapping/clicking outside
  const handleOutside = useCallback((e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) setActiveKey(null);
  }, []);
  useEffect(() => {
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [handleOutside]);

  const completed = steps.filter((s) => s.status === JOURNEY_STATUS.COMPLETED).length;

  return (
    <section ref={containerRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-5">
      <style>{`@keyframes journey-pop{from{opacity:0;transform:translate(-50%,6px) scale(.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}`}</style>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Route className="w-4 h-4 text-blue-600" />
          Lead Journey
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{completed} of {steps.length} stages complete</span>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-gray-50 via-white to-blue-50/40 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border border-gray-100/80 dark:border-gray-700/60 px-3 sm:px-5 py-4">
        {isDesktop
          ? <HorizontalJourney steps={steps} activeKey={activeKey} setActiveKey={setActiveKey} />
          : <VerticalJourney steps={steps} activeKey={activeKey} setActiveKey={setActiveKey} />}
      </div>

      <p className="mt-2.5 text-[11px] text-gray-400 dark:text-gray-500">
        Built from referral, landing page, signup method, verification and account status. Hover or tap a stage for details.
      </p>
    </section>
  );
};

export default LeadJourneyVisualization;
