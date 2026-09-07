import React from 'react';

const Bone = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`} />;

const TableRowSkeleton = () => (
  <tr>
    <td className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Bone className="w-11 h-11 rounded-full" />
        <div className="space-y-1.5">
          <Bone className="h-3.5 w-32" />
          <Bone className="h-3 w-44" />
          <Bone className="h-3 w-28" />
        </div>
      </div>
    </td>
    <td className="px-4 py-3.5"><Bone className="h-3.5 w-28" /></td>
    <td className="px-4 py-3.5">
      <Bone className="h-6 w-32 rounded-full" />
      <Bone className="h-3 w-40 mt-1.5" />
    </td>
    <td className="px-4 py-3.5"><Bone className="h-3.5 w-20" /></td>
    <td className="px-4 py-3.5">
      <div className="flex gap-1.5">
        <Bone className="h-6 w-16 rounded-full" />
        <Bone className="h-6 w-16 rounded-full" />
      </div>
    </td>
    <td className="px-4 py-3.5"><Bone className="h-6 w-16 rounded-full" /></td>
    <td className="px-4 py-3.5">
      <Bone className="h-3.5 w-24" />
      <Bone className="h-3 w-14 mt-1.5" />
    </td>
    <td className="px-4 py-3.5"><Bone className="h-8 w-28 rounded-lg ml-auto" /></td>
  </tr>
);

const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 space-y-4">
    <div className="flex items-start gap-3">
      <Bone className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between gap-2">
          <Bone className="h-4 w-36" />
          <Bone className="h-6 w-16 rounded-full" />
        </div>
        <Bone className="h-6 w-32 rounded-full" />
      </div>
    </div>
    <Bone className="h-3 w-full" />
    <Bone className="h-3 w-4/5" />
    <div className="space-y-2.5">
      <Bone className="h-3.5 w-1/2" />
      <Bone className="h-3.5 w-3/4" />
      <Bone className="h-3.5 w-2/5" />
      <Bone className="h-3.5 w-1/3" />
    </div>
    <div className="flex gap-1.5">
      <Bone className="h-6 w-28 rounded-full" />
      <Bone className="h-6 w-28 rounded-full" />
    </div>
    <Bone className="h-11 w-full rounded-xl" />
  </div>
);

export const LeadsTableSkeleton = ({ rows = 8 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
        <tr>
          {Array.from({ length: 8 }).map((_, i) => (
            <th key={i} className="px-4 py-3"><Bone className="h-3 w-20" /></th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/70">
        {Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} />)}
      </tbody>
    </table>
  </div>
);

export const LeadsCardsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
  </div>
);

const LeadsSkeleton = () => (
  <>
    <div className="hidden lg:block"><LeadsTableSkeleton /></div>
    <div className="lg:hidden"><LeadsCardsSkeleton /></div>
  </>
);

export default LeadsSkeleton;
