import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
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
  Star,
  Phone,
  Video,
  Quote,
  FileText,
  Tag,
  MessageCircle,
  Clock,
  Hash,
  Zap,
  LucideEye,
  SquarePen,
} from 'lucide-react';
import useTestimonialManagement from '../../../../hooks/api/useTestimonialManagement';
import useStudentManagement from '../../../../hooks/api/useStudentManagement';
import { useToast } from '../../../../components/ToastProvider';

const TestimonialManagement = () => {
  const { showSuccess, showError } = useToast();
  const {
    loading,
    loadingDetail,
    testimonials,
    pagination,
    getAllTestimonials,
    filterTestimonials,
    getTestimonialById,
  } = useTestimonialManagement();

  const {
    approveTestimonial,
    getTestimonialStatusesDropdown,
  } = useStudentManagement();

  // Component state
  const [filters, setFilters] = useState({
    studentName: '',
    studentEmail: '',
    testimonialStatusId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showTestimonialsModal, setShowTestimonialsModal] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
  const [loadingTestimonials, setLoadingTestimonials] = useState(false);
  const [testimonialActionLoading, setTestimonialActionLoading] = useState({});
  const [testimonialStatuses, setTestimonialStatuses] = useState([]);
  const [selectedTestimonialStatus, setSelectedTestimonialStatus] = useState({});
  const [testimonialComments, setTestimonialComments] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterTestimonialStatuses, setFilterTestimonialStatuses] = useState([]);
  const [testimonialActionSuccess, setTestimonialActionSuccess] = useState({});

  const emptyFiltersRef = useMemo(() => ({
    studentName: '',
    studentEmail: '',
    testimonialStatusId: '',
    dateFrom: '',
    dateTo: '',
  }), []);

  useEffect(() => {
    getAllTestimonials(1, 10);
    loadFilterTestimonialStatuses();
  }, [getAllTestimonials]);

  const loadFilterTestimonialStatuses = async () => {
    try {
      const statuses = await getTestimonialStatusesDropdown();
      setFilterTestimonialStatuses(statuses || []);
    } catch (err) {
      console.error('Failed to load testimonial statuses:', err);
    }
  };

  const loadTestimonials = useCallback(async (page = 1, pageSize = 10) => {
    try {
      await filterTestimonials(filters, page, pageSize);
    } catch (err) {
      console.error('Failed to load testimonials:', err);
    }
  }, [filterTestimonials, filters]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadTestimonials(pagination.currentPage, pagination.pageSize);
    } catch (err) {
      console.error('Failed to refresh testimonials:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTestimonials, pagination.currentPage, pagination.pageSize]);

  const handleFilter = useCallback(async () => {
    try {
      await filterTestimonials(filters, 1, pagination.pageSize);
    } catch (err) {
      console.error('Failed to filter testimonials:', err);
    }
  }, [filterTestimonials, filters, pagination.pageSize]);

  const handlePageChange = useCallback(async (newPage) => {
    try {
      await filterTestimonials(filters, newPage, pagination.pageSize);
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  }, [filterTestimonials, filters, pagination.pageSize]);

  const handleViewTestimonial = useCallback(async (testimonialId) => {
    try {
      const [testimonialData, statusesData] = await Promise.all([
        getTestimonialById(testimonialId),
        getTestimonialStatusesDropdown()
      ]);
      setSelectedTestimonial(testimonialData);
      setTestimonialStatuses(statusesData || []);

      // Pre-populate status dropdown and comments with existing data
      if (testimonialData) {
        setSelectedTestimonialStatus({
          [testimonialData.id]: testimonialData.testimonialStatusId
        });
        setTestimonialComments({
          [testimonialData.id]: testimonialData.comments || ''
        });
      }

      setShowTestimonialsModal(true);
    } catch (err) {
      console.error('Failed to fetch testimonial:', err);
      showError('Failed to fetch testimonial');
    }
  }, [getTestimonialById, getTestimonialStatusesDropdown, showError]);

  const handleSubmitTestimonial = useCallback(async (testimonialId) => {
    const statusId = selectedTestimonialStatus[testimonialId];
    const comment = testimonialComments[testimonialId] || '';

    if (!statusId) {
      showError('Please select a status');
      return;
    }

    setTestimonialActionLoading(prev => ({ ...prev, [testimonialId]: true }));
    try {
      await approveTestimonial(testimonialId, statusId, comment);

      // Refresh testimonial data
      const updatedTestimonial = await getTestimonialById(testimonialId);
      setSelectedTestimonial(updatedTestimonial);

      showSuccess('Testimonial updated successfully!');
    } catch (err) {
      console.error('Failed to update testimonial status:', err);
      showError('Failed to update testimonial. Please try again.');
    } finally {
      setTestimonialActionLoading(prev => ({ ...prev, [testimonialId]: false }));
    }
  }, [approveTestimonial, getTestimonialById, selectedTestimonialStatus, testimonialComments, showSuccess, showError]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = useCallback(async () => {
    try {
      setFilters(emptyFiltersRef);
      await getAllTestimonials(1, pagination.pageSize);
    } catch (err) {
      console.error('Failed to clear filters:', err);
    }
  }, [getAllTestimonials, pagination.pageSize, emptyFiltersRef]);

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

  const { activeFilterCount, activeFilterChips } = useMemo(() => {
    const labels = {
      studentName: 'Name',
      studentEmail: 'Email',
      testimonialStatusId: 'Status',
      dateFrom: 'Date From',
      dateTo: 'Date To',
    };

    const isActive = (k, v) => {
      return v !== '' && v !== null && v !== undefined;
    };

    const chips = Object.entries(filters)
      .filter(([k, v]) => isActive(k, v))
      .map(([k, v]) => ({ key: k, label: labels[k] || k, value: String(v) }));

    return { activeFilterCount: chips.length, activeFilterChips: chips };
  }, [filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 lg:p-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-visible">
        {/* Filter Header Bar */}
        <div className="px-4 py-3  rounded-t-xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">
                    Testimonial Management
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={filters.studentName}
                    onChange={(e) => handleFilterChange('studentName', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Student Email</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={filters.studentEmail}
                    onChange={(e) => handleFilterChange('studentEmail', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Testimonial Status</label>
                <div className="relative">
                  <CheckCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={filters.testimonialStatusId}
                    onChange={(e) => handleFilterChange('testimonialStatusId', e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    {filterTestimonialStatuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.statusName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date From</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date To</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Table */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden ring-1 ring-gray-200/50 dark:ring-gray-700/50">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-2  py-3  text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Student</th>
                <th className="px-2 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Email</th>
                <th className="px-2 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Phone</th>
                <th className="px-2 py-3  text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Date</th>
                <th className="px-2 py-3  text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</th>
                <th className="px-2 py-3  text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                        <div className="absolute inset-0 w-8 h-8 border-2 border-blue-200 rounded-full animate-ping"></div>
                      </div>
                      <span className="font-medium">Loading testimonials...</span>
                    </div>
                  </td>
                </tr>
              ) : testimonials.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner">
                        <MessageSquare className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-600 dark:text-gray-400 text-lg">No testimonials found</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or refresh the data</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                testimonials.map((testimonial) => (
                  <tr key={testimonial.id} className="hover:bg-gradient-to-r hover:from-blue-50/80 hover:via-indigo-50/60 hover:to-purple-50/80 dark:hover:from-blue-900/30 dark:hover:via-indigo-900/25 dark:hover:to-purple-900/30 transition-all duration-300 ease-out group">
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white rounded-xl shadow-lg flex items-center justify-center font-semibold text-sm ring-2 ring-blue-200 dark:ring-blue-800/50 hover:ring-4 hover:ring-blue-300 dark:hover:ring-blue-700/50 transition-all duration-300">
                          {getInitials(testimonial.studentName)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">{testimonial.studentName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-lg shadow-sm">
                          <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{testimonial.studentEmail}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-lg shadow-sm">
                          <Phone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{testimonial.studentPhoneNumber || '-'}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/40 dark:to-emerald-800/40 rounded-lg shadow-sm">
                          <Calendar className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{formatDate(testimonial.testimonialDate)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-md ${
                        testimonial.isApproved
                          ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-500 text-white border border-green-300 shadow-lg shadow-green-500/30'
                          : testimonial.testimonialStatusName === 'Rejected'
                          ? 'bg-gradient-to-r from-red-400 via-rose-500 to-red-500 text-white border border-red-300 shadow-lg shadow-red-500/30'
                          : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-white border border-amber-300 shadow-lg shadow-amber-500/30'
                      }`}>
                        {testimonial.isApproved && <CheckCircle className="w-3 h-3" />}
                        {testimonial.testimonialStatusName === 'Rejected' && <X className="w-3 h-3" />}
                        {!testimonial.isApproved && testimonial.testimonialStatusName !== 'Rejected' && <Clock className="w-3 h-3" />}
                        {testimonial.testimonialStatusName}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button
                        onClick={() => handleViewTestimonial(testimonial.id)}
                        title="Update testimonial status"
                        className="group relative inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-lg shadow-md hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-md ring-2 ring-blue-300 dark:ring-blue-700/50 hover:ring-4 hover:ring-blue-400 dark:hover:ring-blue-600/50"
                      >
                        <SquarePen className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
     

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Testimonial Modal */}
      {showTestimonialsModal && selectedTestimonial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col border border-gray-200 dark:border-gray-700">

            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Testimonial Details</h2>
                    <p className="text-xs text-blue-100 mt-0.5">View and manage testimonial</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTestimonialsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {/* Left Column - Details */}
                  <div className="flex flex-col space-y-4 flex-1">
                    {/* Student Info */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-2 border border-blue-200 dark:border-blue-800 shadow-md">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-xl ring-4 ring-white dark:ring-gray-800">
                          {getInitials(selectedTestimonial.studentName)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTestimonial.studentName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${
                              selectedTestimonial.isApproved
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                                : selectedTestimonial.testimonialStatusName === 'Rejected'
                                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30'
                                : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30'
                            }`}>
                              {selectedTestimonial.isApproved && <CheckCircle className="w-3 h-3 inline mr-1" />}
                              {selectedTestimonial.testimonialStatusName === 'Rejected' && <X className="w-3 h-3 inline mr-1" />}
                              {!selectedTestimonial.isApproved && selectedTestimonial.testimonialStatusName !== 'Rejected' && <Clock className="w-3 h-3 inline mr-1" />}
                              {selectedTestimonial.testimonialStatusName}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                        <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedTestimonial.studentEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                            <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedTestimonial.studentPhoneNumber || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Video Testimonial */}
                    {selectedTestimonial.testimonialVideoUrl && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md flex-1">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 flex items-center gap-2">
                          <div className="p-1.5 bg-red-500 dark:bg-red-600 rounded-lg">
                            <Video className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white text-sm">Video Testimonial</span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-gray-900 to-black">
                          <video
                            controls
                            className="w-full rounded-xl shadow-lg max-h-32 object-contain"
                            src={selectedTestimonial.testimonialVideoUrl}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </div>
                    )}

                    {/* Text Testimonial */}
                    {selectedTestimonial.testimonial && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md flex-1">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center gap-2">
                          <div className="p-1.5 bg-blue-500 dark:bg-blue-600 rounded-lg">
                            <Quote className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white text-sm">Text Testimonial</span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20">
                          <p className="text-gray-700 dark:text-gray-300 italic text-base leading-relaxed">"{selectedTestimonial.testimonial}"</p>
                        </div>
                      </div>
                    )}
                    {/* Date */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm flex-shrink-0">
                      <div className="p-1.5 bg-orange-500 dark:bg-orange-600 rounded-lg">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Submitted on {formatDateTime(selectedTestimonial.testimonialDate)}</span>
                    </div>
                  </div>

                  {/* Right Column - Actions */}
                  <div className="flex flex-col space-y-4 flex-1">
                    {/* Edit Section */}
                    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-800/50 dark:via-gray-800/50 dark:to-slate-900/50 rounded-2xl p-5 border border-gray-300 dark:border-gray-600 shadow-lg sticky top-0 flex-1">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 uppercase tracking-wide flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                          <Tag className="w-4 h-4 text-white" />
                        </div>
                        Update Status & Comments
                      </h4>

                      {/* Status Selection */}
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                        <div className="relative">
                          <select
                            value={selectedTestimonialStatus[selectedTestimonial.id] || selectedTestimonial.testimonialStatusId || ''}
                            onChange={(e) => setSelectedTestimonialStatus(prev => ({ ...prev, [selectedTestimonial.id]: e.target.value }))}
                            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white appearance-none cursor-pointer shadow-sm hover:border-blue-400 transition-all"
                          >
                            <option value="">-- Select Status --</option>
                            {testimonialStatuses.map((status) => (
                              <option key={status.id} value={status.id}>
                                {status.statusName}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Admin Comments</label>
                        <div className="relative">
                          <textarea
                            value={testimonialComments[selectedTestimonial.id] || selectedTestimonial.comments || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value.length <= 500) {
                                setTestimonialComments(prev => ({ ...prev, [selectedTestimonial.id]: value }));
                              }
                            }}
                            placeholder="Add your feedback or internal notes here..."
                            rows="6"
                            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white shadow-sm hover:border-blue-400 transition-all resize-none"
                          />
                          <div className="absolute bottom-3 right-3 text-xs font-semibold text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                            {(testimonialComments[selectedTestimonial.id] || selectedTestimonial.comments || '').length}/500
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSubmitTestimonial(selectedTestimonial.id)}
                          disabled={testimonialActionLoading[selectedTestimonial.id]}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-lg"
                        >
                          {testimonialActionLoading[selectedTestimonial.id] ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>Update Status</span>
                            </>
                          )}
                        </button>
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

export default TestimonialManagement;
