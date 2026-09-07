import React from 'react';

const Bone = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`} />;

const CardShell = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 ${className}`}>{children}</div>
);

const InfoCardSkeleton = ({ rows = 4 }) => (
  <CardShell>
    <Bone className="h-4 w-40 mb-5" />
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Bone className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  </CardShell>
);

const LeadDetailsSkeleton = () => (
  <div className="space-y-6">
    <CardShell className="p-0 overflow-hidden">
      <div className="h-28 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="px-6 pb-6 -mt-10 flex flex-col sm:flex-row gap-5">
        <Bone className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-gray-800" />
        <div className="flex-1 pt-12 space-y-3">
          <Bone className="h-7 w-56" />
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-72" />
          <div className="flex gap-2 pt-1">
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-6 w-28 rounded-full" />
            <Bone className="h-6 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </CardShell>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <InfoCardSkeleton />
      <InfoCardSkeleton rows={3} />
      <InfoCardSkeleton />
      <InfoCardSkeleton rows={3} />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <CardShell className="xl:col-span-3">
        <Bone className="h-4 w-44 mb-5" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex gap-4">
              <Bone className="w-9 h-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-2/3" />
                <Bone className="h-8 w-40 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </CardShell>
      <CardShell className="xl:col-span-2">
        <Bone className="h-4 w-32 mb-5" />
        <Bone className="h-64 w-full rounded-xl" />
      </CardShell>
    </div>
  </div>
);

export default LeadDetailsSkeleton;
