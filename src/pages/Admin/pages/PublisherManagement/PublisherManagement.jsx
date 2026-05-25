import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  RefreshCw,
  User,
  CheckCircle,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Phone,
  MapPin,
  Globe,
  FileText,
  Tag,
  Clock,
  SquarePen,
  XCircle,
} from 'lucide-react';
import usePublisherManagement from '../../../../hooks/api/usePublisherManagement';
import usePublisherCategoryManagement from '../../../../hooks/api/usePublisherCategoryManagement';
import { useToast } from '../../../../components/ToastProvider';

const PublisherManagement = () => {
  const { showSuccess, showError } = useToast();
  const {
    loading,
    loadingDetail,
    publishers,
    pagination,
    getAllPublishers,
    filterPublishers,
    getPublisherById,
  } = usePublisherManagement();

  const {
    categories,
    getAllCategories,
  } = usePublisherCategoryManagement();

  const [filters, setFilters] = useState({
   
    name: '',
    email: '',
    phone: '',
    isEmailVerified: '',
    categoryId: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showPublisherModal, setShowPublisherModal] = useState(false);
  const [selectedPublisher, setSelectedPublisher] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const emptyFiltersRef = useMemo(() => ({
    name: '',
    email: '',
    phone: '',
    isEmailVerified: '',
    categoryId: '',
  }), []);

  useEffect(() => {
    getAllPublishers(1, 20);
    getAllCategories(1, 100);
  }, [getAllPublishers, getAllCategories]);

  const loadPublishers = useCallback(async (page = 1, pageSize = 20) => {
    try {
      await filterPublishers(filters, page, pageSize);
    } catch (err) {
      console.error('Failed to load publishers:', err);
    }
  }, [filterPublishers, filters]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadPublishers(pagination.page, pagination.pageSize);
    } catch (err) {
      console.error('Failed to refresh publishers:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPublishers, pagination.page, pagination.pageSize]);

  const handleFilter = useCallback(async () => {
    try {
      await filterPublishers(filters, 1, pagination.pageSize);
    } catch (err) {
      console.error('Failed to filter publishers:', err);
    }
  }, [filterPublishers, filters, pagination.pageSize]);

  const handlePageChange = useCallback(async (newPage) => {
    try {
      await filterPublishers(filters, newPage, pagination.pageSize);
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  }, [filterPublishers, filters, pagination.pageSize]);

  const handleViewPublisher = useCallback(async (publisherId) => {
    try {
      const publisherData = await getPublisherById(publisherId);
      setSelectedPublisher(publisherData);
      setShowPublisherModal(true);
    } catch (err) {
      console.error('Failed to fetch publisher:', err);
      showError('Failed to fetch publisher details');
    }
  }, [getPublisherById, showError]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = useCallback(async () => {
    try {
      setFilters(emptyFiltersRef);
      await getAllPublishers(1, pagination.pageSize);
    } catch (err) {
      console.error('Failed to clear filters:', err);
    }
  }, [getAllPublishers, pagination.pageSize, emptyFiltersRef]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getInitials = (fullName) => {
    if (fullName) {
      const names = fullName.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    return 'NA';
  };

  const { activeFilterCount } = useMemo(() => {
    const labels = {
 
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      isEmailVerified: 'Email Verified',
      categoryId: 'Category',
    };

    const isActive = (k, v) => {
      return v !== '' && v !== null && v !== undefined;
    };

    const chips = Object.entries(filters)
      .filter(([k, v]) => isActive(k, v))
      .map(([k, v]) => ({ key: k, label: labels[k] || k, value: String(v) }));

    return { activeFilterCount: chips.length };
  }, [filters]);

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  const hasNextPage = pagination.page < totalPages;
  const hasPreviousPage = pagination.page > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 lg:p-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-visible">
        {/* Filter Header Bar */}
        <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 rounded-t-xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">
                    Publisher Management
                  </h1>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">Total</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white leading-none">{pagination.totalCount}</div>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${showFilters
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={handleFilter}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Apply</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Filter Panel */}
        <div
          className={`transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[500px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
            }`}
        >
          <div className="p-4 space-y-4 bg-gray-50/60 dark:bg-gray-900/20 rounded-b-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Publisher Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={filters.email}
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Phone number..."
                    value={filters.phone}
                    onChange={(e) => handleFilterChange('phone', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email Verified</label>
                <div className="relative">
                  <CheckCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={filters.isEmailVerified}
                    onChange={(e) => handleFilterChange('isEmailVerified', e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="">All</option>
                    <option value="true">Verified</option>
                    <option value="false">Not Verified</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
                <div className="relative">
                  <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={filters.categoryId}
                    onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publishers Table */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden ring-1 ring-gray-200/50 dark:ring-gray-700/50">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Publisher</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Email</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Phone</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Location</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Categories</th>
                <th className="px-3 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</th>
                <th className="px-3 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                        <div className="absolute inset-0 w-8 h-8 border-2 border-blue-200 rounded-full animate-ping"></div>
                      </div>
                      <span className="font-medium">Loading publishers...</span>
                    </div>
                  </td>
                </tr>
              ) : publishers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner">
                        <Users className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-600 dark:text-gray-400 text-lg">No publishers found</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or refresh the data</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                publishers.map((publisher) => (
                  <tr key={publisher.id} className="hover:bg-gradient-to-r hover:from-blue-50/80 hover:via-indigo-50/60 hover:to-purple-50/80 dark:hover:from-blue-900/30 dark:hover:via-indigo-900/25 dark:hover:to-purple-900/30 transition-all duration-300 ease-out group">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white rounded-lg shadow-md flex items-center justify-center font-normal text-sm ring-2 ring-blue-200 dark:ring-blue-800/50 transition-all duration-300">
                         {publisher.profileImageUrl ? <img src={publisher.profileImageUrl} alt={getInitials(publisher.publisherFullName)} className="w-full h-full object-cover rounded-lg" /> : getInitials(publisher.publisherFullName)}
                        </div>
                        <div>
                          <div className="font-normal text-gray-900 dark:text-white text-sm">{publisher.publisherFullName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-lg shadow-sm">
                          <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-normal">{publisher.publisherEmail}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-lg shadow-sm">
                          <Phone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-normal">{publisher.publisherPhone || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/40 dark:to-emerald-800/40 rounded-lg shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-normal">
                          {publisher.country || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-1">
                        {publisher.categories && publisher.categories.length > 0 ? (
                          publisher.categories.slice(0, 2).map((category, index) => (
                            <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium border border-orange-200 dark:border-orange-800">
                              <Tag className="w-2.5 h-2.5" />
                              {category}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                        {publisher.categories && publisher.categories.length > 2 && (
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
                            +{publisher.categories.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-md ${
                          publisher.isEmailVerified
                            ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-500 text-white border border-green-300 shadow-lg shadow-green-500/30'
                            : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-white border border-amber-300 shadow-lg shadow-amber-500/30'
                        }`}>
                          {publisher.isEmailVerified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {publisher.isEmailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => handleViewPublisher(publisher.id)}
                        title="View publisher details"
                        className="group relative inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-lg shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
                      >
                        <SquarePen className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
     

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!hasPreviousPage}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!hasNextPage}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Publisher Detail Modal */}
      {showPublisherModal && selectedPublisher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col border border-gray-200 dark:border-gray-700">
            
            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Publisher Details</h2>
                    <p className="text-xs text-blue-100 mt-0.5">View publisher information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPublisherModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              <div className="space-y-5">
                {/* Publisher Info */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-5 border border-blue-200 dark:border-blue-800 shadow-md">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-xl ring-4 ring-white dark:ring-gray-800">
                      {getInitials(selectedPublisher.publisherFullName)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedPublisher.publisherFullName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${
                          selectedPublisher.isEmailVerified
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30'
                        }`}>
                          {selectedPublisher.isEmailVerified && <CheckCircle className="w-3 h-3 inline mr-1" />}
                          {!selectedPublisher.isEmailVerified && <XCircle className="w-3 h-3 inline mr-1" />}
                          {selectedPublisher.isEmailVerified ? 'Email Verified' : 'Email Not Verified'}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${
                          selectedPublisher.isActive
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                            : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30'
                        }`}>
                          {selectedPublisher.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedPublisher.publisherEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                        <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedPublisher.publisherPhone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio & Website */}
                {(selectedPublisher.authorBio || selectedPublisher.website) && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center gap-2">
                      <div className="p-1.5 bg-purple-500 dark:bg-purple-600 rounded-lg">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">About</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {selectedPublisher.authorBio && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bio</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{selectedPublisher.authorBio}</p>
                        </div>
                      )}
                      {selectedPublisher.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <a href={selectedPublisher.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            {selectedPublisher.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location */}
                {selectedPublisher.location && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center gap-2">
                      <div className="p-1.5 bg-green-500 dark:bg-green-600 rounded-lg">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">Location</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedPublisher.location.legalFirstName} {selectedPublisher.location.legalLastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedPublisher.location.addressLine1}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">City</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedPublisher.location.city}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">State</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedPublisher.location.state}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ZIP</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedPublisher.location.zip}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Country</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedPublisher.location.country}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Media */}
                {selectedPublisher.socialMedia && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 flex items-center gap-2">
                      <div className="p-1.5 bg-pink-500 dark:bg-pink-600 rounded-lg">
                        <Globe className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">Social Media</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {selectedPublisher.socialMedia.twitterHandle && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Twitter</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedPublisher.socialMedia.twitterHandle}</p>
                        </div>
                      )}
                      {selectedPublisher.socialMedia.instagramHandle && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Instagram</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedPublisher.socialMedia.instagramHandle}</p>
                        </div>
                      )}
                      {selectedPublisher.socialMedia.facebookUrl && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Facebook</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedPublisher.socialMedia.facebookUrl}</p>
                        </div>
                      )}
                      {selectedPublisher.socialMedia.linkedinUrl && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">LinkedIn</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedPublisher.socialMedia.linkedinUrl}</p>
                        </div>
                      )}
                      {selectedPublisher.socialMedia.youtubeUrl && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">YouTube</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedPublisher.socialMedia.youtubeUrl}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {selectedPublisher.categories && selectedPublisher.categories.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center gap-2">
                      <div className="p-1.5 bg-orange-500 dark:bg-orange-600 rounded-lg">
                        <Tag className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">Categories</span>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedPublisher.categories.map((category, index) => (
                          <span key={index} className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium border border-orange-200 dark:border-orange-800">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-500 dark:bg-gray-600 rounded-lg">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">Timestamps</span>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Created At</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(selectedPublisher.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Updated At</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(selectedPublisher.updatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(selectedPublisher.lastLoginAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublisherManagement;
