import React from 'react';

const EmailLoadingSkeleton = ({ count = 5 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"
        >
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmailLoadingSkeleton;
