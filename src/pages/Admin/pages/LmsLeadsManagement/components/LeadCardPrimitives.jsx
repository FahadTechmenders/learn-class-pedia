import React, { useCallback, useRef, useState } from 'react';

const canTilt = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const TiltCard = ({ children, className = '', maxTilt = 4, as: Tag = 'div' }) => {
  const ref = useRef(null);
  const [transform, setTransform] = useState('');

  const handleMove = useCallback((e) => {
    if (!canTilt() || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(900px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg) translateY(-4px) scale(1.01)`);
  }, [maxTilt]);

  const handleLeave = useCallback(() => setTransform(''), []);

  return (
    <Tag
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transform, transition: transform ? 'transform 80ms ease-out, box-shadow 200ms ease' : 'transform 350ms cubic-bezier(.2,.8,.2,1), box-shadow 200ms ease', willChange: 'transform' }}
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg ${className}`}
    >
      {children}
    </Tag>
  );
};

export const SectionCard = ({ title, icon: Icon, children, className = '', action }) => (
  <section className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 lg:p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-blue-600" />}
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

export const InfoRow = ({ label, icon: Icon, children, muted = false }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700/70 last:border-b-0">
    {Icon && (
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-0.5 text-sm break-words ${muted ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-white'}`}>
        {children}
      </div>
    </div>
  </div>
);

const TONES = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  neutral: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
};

export const StatusBadge = ({ tone = 'neutral', icon: Icon, children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${TONES[tone] || TONES.neutral}`}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </span>
);

export const Chip = ({ children }) => (
  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800 text-sm font-medium">
    {children}
  </span>
);
