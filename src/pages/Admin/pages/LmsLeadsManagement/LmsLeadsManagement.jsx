import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useLmsLeadsManagement from '../../../../hooks/api/useLmsLeadsManagement';
import { mapLead } from './leadDetailsHelpers';
import {
  LeadsPageHeader,
  LeadsSummaryCards,
  LeadsEmptyState,
  LeadsErrorState
} from './components/LeadsListParts';
import LeadsSearchToolbar from './components/LeadsSearchToolbar';
import DesktopLeadsTable from './components/DesktopLeadsTable';
import { MobileLeadsGrid } from './components/LeadMobileCard';
import LeadsPagination from './components/LeadsPagination';
import LeadsSkeleton from './components/LeadsSkeleton';

const DEFAULTS = { page: 1, pageSize: 20, sortBy: 'signupDate', sortDirection: 'desc' };

const LmsLeadsManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    loading,
    error,
    leads,
    pagination,
    customerTypes,
    loadingCustomerTypes,
    getAllLeads,
    getCustomerTypes
  } = useLmsLeadsManagement();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [customerTypeId, setCustomerTypeId] = useState(searchParams.get('customerTypeId') || '');
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('pageSize'), 10) || DEFAULTS.pageSize);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page'), 10) || DEFAULTS.page);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || DEFAULTS.sortBy);
  const [sortDirection, setSortDirection] = useState(searchParams.get('sortDirection') || DEFAULTS.sortDirection);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const params = {};
    if (currentPage > 1) params.page = currentPage;
    if (pageSize !== DEFAULTS.pageSize) params.pageSize = pageSize;
    if (debouncedSearch) params.search = debouncedSearch;
    if (customerTypeId) params.customerTypeId = customerTypeId;
    if (sortBy !== DEFAULTS.sortBy) params.sortBy = sortBy;
    if (sortDirection !== DEFAULTS.sortDirection) params.sortDirection = sortDirection;
    setSearchParams(params, { replace: true });
  }, [currentPage, pageSize, debouncedSearch, customerTypeId, sortBy, sortDirection, setSearchParams]);

  const loadLeads = useCallback(async (page) => {
    try {
      await getAllLeads({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        customerTypeId: customerTypeId || undefined,
        sortBy,
        sortDirection
      });
    } catch (err) {
      console.error('Failed to load LMS leads:', err);
    } finally {
      setHasLoadedOnce(true);
    }
  }, [pageSize, debouncedSearch, customerTypeId, sortBy, sortDirection, getAllLeads]);

  useEffect(() => {
    getCustomerTypes().catch((err) => console.error('Failed to load customer types:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch whenever filters/sort/page size change; reset to page 1 except on very first load
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      loadLeads(currentPage);
      return;
    }
    setCurrentPage(1);
    loadLeads(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, customerTypeId, sortBy, sortDirection, pageSize]);

  const handlePageChange = useCallback((page) => {
    if (page < 1 || (pagination.totalPages && page > pagination.totalPages)) return;
    setCurrentPage(page);
    loadLeads(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadLeads, pagination.totalPages]);

  const handleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection(field === 'signupDate' ? 'desc' : 'asc');
    }
  }, [sortBy]);

  const sortValue = `${sortBy}:${sortDirection}`;
  const handleSortValue = useCallback((value) => {
    const [field, dir] = value.split(':');
    setSortBy(field || DEFAULTS.sortBy);
    setSortDirection(dir || DEFAULTS.sortDirection);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCustomerTypeId('');
    setSortBy(DEFAULTS.sortBy);
    setSortDirection(DEFAULTS.sortDirection);
  }, []);

  const removeChip = useCallback((key) => {
    if (key === 'search') { setSearchTerm(''); setDebouncedSearch(''); }
    if (key === 'customerTypeId') setCustomerTypeId('');
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await loadLeads(currentPage); } finally { setIsRefreshing(false); }
  }, [loadLeads, currentPage]);

  const handleViewDetails = useCallback((customerId) => {
    const query = searchParams.toString();
    navigate(`/admin/lms-leads/${customerId}`, {
      state: { from: `/admin/lms-leads${query ? `?${query}` : ''}` }
    });
  }, [navigate, searchParams]);

  const chips = useMemo(() => {
    const list = [];
    if (debouncedSearch) list.push({ key: 'search', label: 'Search', value: debouncedSearch });
    if (customerTypeId) {
      const type = customerTypes.find((t) => String(t.id) === String(customerTypeId));
      list.push({ key: 'customerTypeId', label: 'Type', value: type ? type.name : customerTypeId });
    }
    return list;
  }, [debouncedSearch, customerTypeId, customerTypes]);

  const uiLeads = useMemo(() => leads.map(mapLead), [leads]);
  const showSkeleton = loading && (!hasLoadedOnce || !isRefreshing);
  const showError = !loading && error && uiLeads.length === 0;
  const showEmpty = !loading && !error && hasLoadedOnce && uiLeads.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-5 lg:space-y-6">
        <LeadsPageHeader totalRecords={pagination.totalRecords} onRefresh={handleRefresh} refreshing={isRefreshing} />

        <LeadsSummaryCards
          totalRecords={pagination.totalRecords}
          page={pagination.page || currentPage}
          totalPages={pagination.totalPages}
          leads={uiLeads}
        />

        <LeadsSearchToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          customerTypeId={customerTypeId}
          onCustomerTypeChange={setCustomerTypeId}
          sortValue={sortValue}
          onSortChange={handleSortValue}
          customerTypes={customerTypes}
          loadingTypes={loadingCustomerTypes}
          chips={chips}
          onRemoveChip={removeChip}
          onClearAll={clearFilters}
          activeFilterCount={chips.length}
        />

        {showSkeleton ? (
          <LeadsSkeleton />
        ) : showError ? (
          <LeadsErrorState onRetry={handleRefresh} retrying={isRefreshing} />
        ) : showEmpty ? (
          <LeadsEmptyState hasFilters={chips.length > 0} onClear={clearFilters} />
        ) : (
          <div className={isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="hidden lg:block">
              <DesktopLeadsTable
                leads={uiLeads}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                onView={handleViewDetails}
              />
            </div>
            <div className="lg:hidden">
              <MobileLeadsGrid leads={uiLeads} onView={handleViewDetails} />
            </div>
          </div>
        )}

        {!showSkeleton && !showError && uiLeads.length > 0 && (
          <LeadsPagination
            page={pagination.page || currentPage}
            pageSize={pageSize}
            totalRecords={pagination.totalRecords}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={(size) => { setPageSize(size); }}
          />
        )}
      </div>
    </div>
  );
};

export default LmsLeadsManagement;
