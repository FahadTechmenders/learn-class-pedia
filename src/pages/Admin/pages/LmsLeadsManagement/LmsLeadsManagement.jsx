import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  Building,
  Globe,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Search,
  SlidersHorizontal,
  UserPlus
} from 'lucide-react';
import useLmsLeadsManagement from '../../../../hooks/api/useLmsLeadsManagement';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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
    getCustomerTypes,
    clearError
  } = useLmsLeadsManagement();

  // Read initial state from URL query params
  const initialPage = parseInt(searchParams.get('page')) || 1;
  const initialPageSize = parseInt(searchParams.get('pageSize')) || 20;
  const initialSearch = searchParams.get('search') || '';
  const initialCustomerTypeId = searchParams.get('customerTypeId') || '';
  const initialSortBy = searchParams.get('sortBy') || 'signupDate';
  const initialSortDirection = searchParams.get('sortDirection') || 'desc';

  // Component state
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [customerTypeId, setCustomerTypeId] = useState(initialCustomerTypeId);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update URL query params whenever filters change
  useEffect(() => {
    const params = {};
    if (currentPage > 1) params.page = currentPage;
    if (pageSize !== 20) params.pageSize = pageSize;
    if (debouncedSearch) params.search = debouncedSearch;
    if (customerTypeId) params.customerTypeId = customerTypeId;
    if (sortBy !== 'signupDate') params.sortBy = sortBy;
    if (sortDirection !== 'desc') params.sortDirection = sortDirection;
    
    setSearchParams(params, { replace: true });
  }, [currentPage, pageSize, debouncedSearch, customerTypeId, sortBy, sortDirection, setSearchParams]);

  // Build active filter metadata
  const { activeFilterCount, activeFilterChips } = useMemo(() => {
    const chips = [];
    
    if (debouncedSearch) {
      chips.push({ key: 'search', label: 'Search', value: debouncedSearch });
    }
    if (customerTypeId) {
      const type = customerTypes.find(t => t.id.toString() === customerTypeId);
      chips.push({ key: 'customerTypeId', label: 'Customer Type', value: type ? type.name : customerTypeId });
    }
    
    return { activeFilterCount: chips.length, activeFilterChips: chips };
  }, [debouncedSearch, customerTypeId, customerTypes]);

  // Load leads function
  const loadLeads = useCallback(async (page = currentPage) => {
    try {
      await getAllLeads({
        page,
        pageSize,
        search: debouncedSearch,
        customerTypeId: customerTypeId || undefined,
        sortBy,
        sortDirection
      });
    } catch (err) {
      console.error('Failed to load LMS leads:', err);
    }
  }, [currentPage, pageSize, debouncedSearch, customerTypeId, sortBy, sortDirection, getAllLeads]);

  // Load customer types on mount
  useEffect(() => {
    getCustomerTypes().catch(err => {
      console.error('Failed to load customer types:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load leads on component mount and when filters change
  useEffect(() => {
    loadLeads(1); // Reset to page 1 when filters change
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, customerTypeId, sortBy, sortDirection, pageSize]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    loadLeads(newPage);
  }, [loadLeads]);

  // Handle page size change
  const handlePageSizeChange = useCallback((e) => {
    const newPageSize = parseInt(e.target.value);
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  // Handle sort
  const handleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  }, [sortBy, sortDirection]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCustomerTypeId('');
    setSortBy('signupDate');
    setSortDirection('desc');
    setCurrentPage(1);
  }, []);

  // Remove single filter
  const removeFilter = useCallback((key) => {
    if (key === 'search') {
      setSearchTerm('');
      setDebouncedSearch('');
    } else if (key === 'customerTypeId') {
      setCustomerTypeId('');
    }
  }, []);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadLeads(currentPage);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLeads, currentPage]);

  // View lead details
  const handleViewDetails = useCallback((customerId) => {
    navigate(`/admin/lms-leads/${customerId}`);
  }, [navigate]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-8 h-8 text-blue-600" />
                LMS Leads
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage LMS customer signups and inquiries
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, phone, or institute..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customer Type
                  </label>
                  <select
                    value={customerTypeId}
                    onChange={(e) => setCustomerTypeId(e.target.value)}
                    disabled={loadingCustomerTypes}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    <option value="">All Types</option>
                    {customerTypes.map(type => (
                      <option 
                        key={type.id} 
                        value={type.id}
                        title={type.description || ''}
                      >
                        {type.name} ({type.leadCount})
                      </option>
                    ))}
                  </select>
                  {loadingCustomerTypes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Loading types...</p>
                  )}
                </div>
              </div>

              {/* Clear Filters Button */}
              {activeFilterCount > 0 && (
                <div className="mt-4">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilterChips.map(chip => (
                <div
                  key={chip.key}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                >
                  <span className="font-medium">{chip.label}:</span>
                  <span>{chip.value}</span>
                  <button
                    onClick={() => removeFilter(chip.key)}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button onClick={clearError} className="text-red-600 hover:text-red-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Loading LMS leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                {debouncedSearch || customerTypeId ? 'No leads found matching your criteria' : 'No LMS leads found'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th 
                        onClick={() => handleSort('customerName')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Name{getSortIndicator('customerName')}
                      </th>
                      <th 
                        onClick={() => handleSort('email')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Email{getSortIndicator('email')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Phone
                      </th>
                      <th 
                        onClick={() => handleSort('institute')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Institute{getSortIndicator('institute')}
                      </th>
                      <th 
                        onClick={() => handleSort('customerType')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Type{getSortIndicator('customerType')}
                      </th>
                      <th 
                        onClick={() => handleSort('country')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Country{getSortIndicator('country')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Signup Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Verified
                      </th>
                      <th 
                        onClick={() => handleSort('signupDate')}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Signup Date{getSortIndicator('signupDate')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {leads.map((lead) => (
                      <tr 
                        key={lead.customerId}
                        onClick={() => handleViewDetails(lead.customerId)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {lead.customerName || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {lead.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {lead.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {lead.phone}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {lead.institute ? (
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              {lead.institute}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span 
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium"
                            title={lead.customerTypeDescription || ''}
                          >
                            {lead.customerType || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {lead.country ? (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              {lead.country}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {lead.signupType || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            {lead.isEmailVerified ? (
                              <CheckCircle className="w-4 h-4 text-green-600" title="Email Verified" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" title="Email Not Verified" />
                            )}
                            {lead.isPhoneVerified ? (
                              <CheckCircle className="w-4 h-4 text-green-600" title="Phone Verified" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" title="Phone Not Verified" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(lead.signupDate)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(lead.customerId);
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                      {Math.min(currentPage * pageSize, pagination.totalRecords)} of{' '}
                      {pagination.totalRecords} leads
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Page {currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === pagination.totalPages}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LmsLeadsManagement;
