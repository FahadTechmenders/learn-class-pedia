import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPageRange } from '../leadDetailsHelpers';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const buildPageItems = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const items = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push('…');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push('…');
  items.push(totalPages);
  return items;
};

const NavButton = ({ onClick, disabled, children, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1 min-h-[40px] px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const LeadsPagination = ({ page, pageSize, totalRecords, totalPages, onPageChange, onPageSizeChange }) => {
  const { start, end } = getPageRange(page, pageSize, totalRecords);
  const items = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (!totalRecords) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center justify-between lg:justify-start gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing <span className="font-medium text-gray-900 dark:text-white">{start}–{end}</span> of{' '}
            <span className="font-medium text-gray-900 dark:text-white">{totalRecords.toLocaleString()}</span>
          </span>
          <label className="inline-flex items-center gap-2">
            <span className="hidden sm:inline text-xs">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              className="min-h-[36px] px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          <NavButton onClick={() => onPageChange(page - 1)} disabled={!canPrev}>
            <ChevronLeft className="w-4 h-4" /> Previous
          </NavButton>
          {items.map((item, idx) => (
            item === '…' ? (
              <span key={`gap-${idx}`} className="px-2 text-gray-400">…</span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={`min-w-[40px] min-h-[40px] rounded-lg text-sm font-medium transition-colors ${
                  item === page
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {item}
              </button>
            )
          ))}
          <NavButton onClick={() => onPageChange(page + 1)} disabled={!canNext}>
            Next <ChevronRight className="w-4 h-4" />
          </NavButton>
        </div>

        <div className="flex lg:hidden items-center justify-between gap-3">
          <NavButton onClick={() => onPageChange(page - 1)} disabled={!canPrev} className="flex-1 justify-center">
            <ChevronLeft className="w-4 h-4" /> Previous
          </NavButton>
          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of {totalPages}
          </span>
          <NavButton onClick={() => onPageChange(page + 1)} disabled={!canNext} className="flex-1 justify-center">
            Next <ChevronRight className="w-4 h-4" />
          </NavButton>
        </div>
      </div>
    </div>
  );
};

export default LeadsPagination;
