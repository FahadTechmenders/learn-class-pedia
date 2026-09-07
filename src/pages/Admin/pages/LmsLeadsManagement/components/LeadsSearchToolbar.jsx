import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export const SORT_OPTIONS = [
  { value: 'signupDate:desc', label: 'Newest signups' },
  { value: 'signupDate:asc', label: 'Oldest signups' },
  { value: 'customerName:asc', label: 'Name A–Z' },
  { value: 'customerName:desc', label: 'Name Z–A' },
  { value: 'customerType:asc', label: 'Customer type' },
  { value: 'country:asc', label: 'Country' },
];

const selectClass = 'w-full min-h-[42px] px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50';

const CustomerTypeSelect = ({ value, onChange, customerTypes, loading }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} disabled={loading} className={selectClass} aria-label="Customer type">
    <option value="">{loading ? 'Loading types…' : 'All customer types'}</option>
    {customerTypes.map((type) => (
      <option key={type.id} value={type.id} title={type.description || ''}>
        {type.name}{typeof type.leadCount === 'number' ? ` (${type.leadCount})` : ''}
      </option>
    ))}
  </select>
);

const SortSelect = ({ value, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass} aria-label="Sort by">
    {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
  </select>
);

const FilterChips = ({ chips, onRemove, onClear }) => {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 text-xs font-medium border border-blue-100 dark:border-blue-800">
          <span className="truncate"><span className="text-blue-500/80 dark:text-blue-300/70">{chip.label}:</span> {chip.value}</span>
          <button onClick={() => onRemove(chip.key)} className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800" aria-label={`Remove ${chip.label} filter`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button onClick={onClear} className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-1">
        Clear all
      </button>
    </div>
  );
};

const MobileFilterDrawer = ({ open, onClose, customerTypes, loadingTypes, customerTypeId, sortValue, onApply, onReset }) => {
  const [draftType, setDraftType] = useState(customerTypeId);
  const [draftSort, setDraftSort] = useState(sortValue);

  useEffect(() => {
    if (open) {
      setDraftType(customerTypeId);
      setDraftSort(sortValue);
    }
  }, [open, customerTypeId, sortValue]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto">
        <div className="mx-auto w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Filters</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close filters">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Customer Type</label>
            <CustomerTypeSelect value={draftType} onChange={setDraftType} customerTypes={customerTypes} loading={loadingTypes} />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Sort by</label>
            <SortSelect value={draftSort} onChange={setDraftSort} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => { onReset(); onClose(); }}
            className="min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            onClick={() => { onApply({ customerTypeId: draftType, sortValue: draftSort }); onClose(); }}
            className="min-h-[44px] rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

const LeadsSearchToolbar = ({
  searchTerm, onSearchChange,
  customerTypeId, onCustomerTypeChange,
  sortValue, onSortChange,
  customerTypes, loadingTypes,
  chips, onRemoveChip, onClearAll,
  activeFilterCount,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 sm:p-4 space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, institute or phone..."
            className="w-full min-h-[42px] pl-9 pr-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <div className="w-56">
            <CustomerTypeSelect value={customerTypeId} onChange={onCustomerTypeChange} customerTypes={customerTypes} loading={loadingTypes} />
          </div>
          <div className="w-48">
            <SortSelect value={sortValue} onChange={onSortChange} />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={onClearAll} className="min-h-[42px] px-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap">
              Clear
            </button>
          )}
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden min-h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-xs">{activeFilterCount}</span>
          )}
        </button>
      </div>

      <FilterChips chips={chips} onRemove={onRemoveChip} onClear={onClearAll} />

      <MobileFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        customerTypes={customerTypes}
        loadingTypes={loadingTypes}
        customerTypeId={customerTypeId}
        sortValue={sortValue}
        onApply={({ customerTypeId: nextType, sortValue: nextSort }) => {
          onCustomerTypeChange(nextType);
          onSortChange(nextSort);
        }}
        onReset={onClearAll}
      />
    </div>
  );
};

export default LeadsSearchToolbar;
