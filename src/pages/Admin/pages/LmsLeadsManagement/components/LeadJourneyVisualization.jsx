import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Route, ArrowRight, ArrowDown } from 'lucide-react';
import { buildLeadJourney } from '../leadDetailsHelpers';

const LeadJourneyScene = lazy(() => import('./LeadJourneyScene'));

class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    if (this.props.onFail) this.props.onFail();
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

const JourneyFallback = ({ steps }) => (
  <div className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-2 py-2">
    {steps.map((step, index) => (
      <React.Fragment key={step.key}>
        <div
          className={`flex-1 min-w-0 rounded-xl border px-4 py-4 text-center transition-colors ${
            step.highlight
              ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700'
              : step.muted
                ? 'border-dashed border-gray-300 bg-gray-50 dark:bg-gray-900/40 dark:border-gray-700'
                : 'border-gray-200 bg-white dark:bg-gray-900/60 dark:border-gray-700'
          }`}
        >
          <div className={`text-sm font-semibold break-words ${step.highlight ? 'text-blue-700 dark:text-blue-300' : step.muted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {step.label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">{step.caption}</div>
        </div>
        {index < steps.length - 1 && (
          <div className="flex items-center justify-center text-gray-400 dark:text-gray-500">
            <ArrowDown className="w-4 h-4 md:hidden" />
            <ArrowRight className="w-4 h-4 hidden md:block" />
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

const LeadJourneyVisualization = ({ lead }) => {
  const steps = useMemo(() => buildLeadJourney(lead), [lead]);
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setUse3D(isDesktop && !prefersReducedMotion && supportsWebGL());
  }, []);

  const fallback = <JourneyFallback steps={steps} />;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Route className="w-4 h-4 text-blue-600" />
          Lead Journey
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{steps.length} steps</span>
      </div>

      {use3D ? (
        <div className="relative h-72 lg:h-80 rounded-xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
          <SceneErrorBoundary fallback={<div className="p-4">{fallback}</div>} onFail={() => setUse3D(false)}>
            <Suspense fallback={<div className="p-4">{fallback}</div>}>
              <LeadJourneyScene steps={steps} />
            </Suspense>
          </SceneErrorBoundary>
        </div>
      ) : (
        fallback
      )}

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Derived from referral, landing page, signup method, verification and account status.
      </p>
    </section>
  );
};

export default LeadJourneyVisualization;
