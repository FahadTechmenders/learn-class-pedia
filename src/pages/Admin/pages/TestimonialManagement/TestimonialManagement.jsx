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
} from 'lucide-react';
import useStudentManagement from '../../../../hooks/api/useStudentManagement';
import { useToast } from '../../../../components/ToastProvider';

const TestimonialManagement = () => {
  const { showSuccess, showError } = useToast();
  const {
    loading,
    students,
    pagination,
    getAllStudents,
    filterStudents,
    getStudentTestimonials,
    approveTestimonial,
    getTestimonialStatusesDropdown,
  } = useStudentManagement();

  // Component state
  const [filters, setFilters] = useState({
    fullName: '',
    email: '',
    signupDateFrom: '',
    signupDateTo: '',
    testimonialStatusId: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showTestimonialsModal, setShowTestimonialsModal] = useState(false);
  const [studentTestimonials, setStudentTestimonials] = useState(null);
  const [loadingTestimonials, setLoadingTestimonials] = useState(false);
  const [testimonialActionLoading, setTestimonialActionLoading] = useState({});
  const [testimonialStatuses, setTestimonialStatuses] = useState([]);
  const [selectedTestimonialStatus, setSelectedTestimonialStatus] = useState({});
  const [testimonialComments, setTestimonialComments] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterTestimonialStatuses, setFilterTestimonialStatuses] = useState([]);
  const [testimonialActionSuccess, setTestimonialActionSuccess] = useState({});

  const emptyFiltersRef = useMemo(() => ({
    fullName: '',
    email: '',
    signupDateFrom: '',
    signupDateTo: '',
    testimonialStatusId: '',
  }), []);
  useEffect(() => {
    getAllStudents(1, 100, { isTestimonial: true });
    loadFilterTestimonialStatuses();
  }, [getAllStudents]);

  const loadFilterTestimonialStatuses = async () => {
    try {
      const statuses = await getTestimonialStatusesDropdown();
      setFilterTestimonialStatuses(statuses || []);
    } catch (err) {
      console.error('Failed to load testimonial statuses:', err);
    }
  };

  const loadStudents = useCallback(async (page = 1, pageSize = 100) => {
    try {
      await getAllStudents(page, pageSize, { ...filters, isTestimonial: true });
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, [getAllStudents, filters]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadStudents(pagination.currentPage, pagination.pageSize);
    } catch (err) {
      console.error('Failed to refresh students:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadStudents, pagination.currentPage, pagination.pageSize]);

  const handleFilter = useCallback(async () => {
    try {
      await filterStudents({ ...filters, isTestimonial: true }, 1, pagination.pageSize);
    } catch (err) {
      console.error('Failed to filter students:', err);
    }
  }, [filterStudents, filters, pagination.pageSize]);

  const handlePageChange = useCallback(async (newPage) => {
    try {
      await getAllStudents(newPage, pagination.pageSize, { ...filters, isTestimonial: true });
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  }, [getAllStudents, pagination.pageSize, filters]);

  const handleViewTestimonials = useCallback(async (studentId) => {
    setLoadingTestimonials(true);
    try {
      const [testimonialsData, statusesData] = await Promise.all([
        getStudentTestimonials(studentId),
        getTestimonialStatusesDropdown()
      ]);
      setStudentTestimonials(testimonialsData);
      setTestimonialStatuses(statusesData || []);

      // Pre-populate status dropdown and comments with existing data
      if (testimonialsData && Array.isArray(testimonialsData)) {
        const initialStatuses = {};
        const initialComments = {};
        testimonialsData.forEach(testimonial => {
          if (testimonial.testimonialStatusId) {
            initialStatuses[testimonial.id] = testimonial.testimonialStatusId;
          }
          if (testimonial.comments) {
            initialComments[testimonial.id] = testimonial.comments;
          }
        });
        setSelectedTestimonialStatus(initialStatuses);
        setTestimonialComments(initialComments);
      }

      setShowTestimonialsModal(true);
    } catch (err) {
      console.error('Failed to fetch student testimonials:', err);
      showError('Failed to fetch testimonials');
    } finally {
      setLoadingTestimonials(false);
    }
  }, [getStudentTestimonials, getTestimonialStatusesDropdown, showError]);

  const handleSubmitTestimonial = useCallback(async (testimonialId, customerId) => {
    const statusId = selectedTestimonialStatus[testimonialId];
    const comment = testimonialComments[testimonialId] || '';

    // Find the selected status name
    const selectedStatus = testimonialStatuses.find(s => s.id === parseInt(statusId));
    const statusName = selectedStatus?.statusName?.toLowerCase() || '';

    // Only allow "Approved" or "Rejected" statuses
    if (!statusId || !statusName || (statusName !== 'approved' && statusName !== 'rejected')) {
      showError('Please select at least one status');
      return;
    }

    setTestimonialActionLoading(prev => ({ ...prev, [testimonialId]: true }));
    try {
      await approveTestimonial(testimonialId, statusId, comment);

      // Refresh testimonials data
      const testimonialsData = await getStudentTestimonials(customerId);
      setStudentTestimonials(testimonialsData);

      // Re-populate status dropdown and comments with refreshed data
      if (testimonialsData && Array.isArray(testimonialsData)) {
        const updatedStatuses = {};
        const updatedComments = {};
        testimonialsData.forEach(testimonial => {
          if (testimonial.testimonialStatusId) {
            updatedStatuses[testimonial.id] = testimonial.testimonialStatusId;
          }
          if (testimonial.comments) {
            updatedComments[testimonial.id] = testimonial.comments;
          }
        });
        setSelectedTestimonialStatus(updatedStatuses);
        setTestimonialComments(updatedComments);
      }

      showSuccess('Testimonial updated successfully!');
    } catch (err) {
      console.error('Failed to update testimonial status:', err);
      showError('Failed to update testimonial. Please try again.');
    } finally {
      setTestimonialActionLoading(prev => ({ ...prev, [testimonialId]: false }));
    }
  }, [approveTestimonial, getStudentTestimonials, selectedTestimonialStatus, testimonialComments, showSuccess, showError]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = useCallback(async () => {
    try {
      setFilters(emptyFiltersRef);
      await getAllStudents(1, pagination.pageSize, { ...emptyFiltersRef, isTestimonial: true });
    } catch (err) {
      console.error('Failed to clear filters:', err);
    }
  }, [getAllStudents, pagination.pageSize, emptyFiltersRef]);

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

  const getInitials = (fullName, firstName, lastName) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
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
      fullName: 'Name',
      email: 'Email',
      signupDateFrom: 'Date From',
      signupDateTo: 'Date To',
      testimonialStatusId: 'Status',
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
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 rounded-t-xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
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
                    value={filters.fullName}
                    onChange={(e) => handleFilterChange('fullName', e.target.value)}
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
                    value={filters.signupDateFrom}
                    onChange={(e) => handleFilterChange('signupDateFrom', e.target.value)}
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
                    value={filters.signupDateTo}
                    onChange={(e) => handleFilterChange('signupDateTo', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Signup Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Testimonials</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span>Loading students...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-600 dark:text-gray-400">No students with testimonials found</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or refresh the data</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10 transition-all duration-200">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-gradient-to-r from-blue-500  to-blue-600 text-white rounded-lg shadow-md">
                          {getInitials(student.fullName, student.firstName, student.lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{student.fullName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{student.firstName} {student.lastName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{student.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{student.phoneNumber || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(student.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-full border border-yellow-200 dark:border-yellow-800">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">{student.testimonialCount || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewTestimonials(student.id)}
                        disabled={loadingTestimonials}
                        title={`View ${student.testimonialCount || 0} testimonial${(student.testimonialCount || 0) !== 1 ? 's' : ''}`}
                        className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-sm"
                      >
                        {loadingTestimonials ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 group-hover:animate-pulse" />
                            <span>View</span>
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white/20 rounded-full">
                              {student.testimonialCount || 0}
                            </span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      {/* Testimonials Modal */}
      {showTestimonialsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col">

            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Student Testimonials</h2>
                    <p className="text-xs text-blue-100">Manage testimonial statuses and feedback</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTestimonialsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loadingTestimonials ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="relative inline-block">
                      <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                      <div className="absolute inset-0 w-12 h-12 border-2 border-blue-200 rounded-full animate-ping"></div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-4">Loading testimonials...</p>
                  </div>
                </div>
              ) : !studentTestimonials || studentTestimonials.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center animate-in fade-in duration-500">
                    <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                      <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">No testimonials found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">This student hasn't submitted any testimonials yet</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {studentTestimonials.map((testimonial, index) => (
                    <div
                      key={testimonial.id}
                      className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Status indicator ribbon */}
                      {selectedTestimonialStatus[testimonial.id] && (
                        <div className="absolute top-0 right-0 z-10 animate-in slide-in-from-right duration-300">
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-lg flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Status Updated
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">

                        {/* LEFT PANEL - Testimonial Content */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-800 p-6">
                          {/* Content Type Badge */}
                          <div className="flex items-center gap-2 mb-4">
                            {testimonial.testimonialVideoUrl ? (
                              <>
                                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                </div>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                                  <Video className="w-3.5 h-3.5" />
                                  Video Testimonial
                                </span>
                              </>
                            ) : testimonial.testimonial ? (
                              <>
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                  Written Testimonial
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                                </div>
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  No Content
                                </span>
                              </>
                            )}
                          </div>

                          {/* Media Content */}
                          {testimonial.testimonialVideoUrl ? (
                            <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-black shadow-xl group-hover:shadow-2xl transition-all">
                              <video
                                controls
                                className="w-full max-h-64 cursor-pointer"
                                src={testimonial.testimonialVideoUrl}
                                poster="/api/placeholder/640/360"
                              >
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          ) : testimonial.testimonial ? (
                            <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border-l-4 border-blue-500 shadow-md hover:shadow-lg transition-all min-h-[160px] flex items-center">
                              <Quote className="absolute top-3 right-3 w-6 h-6 text-blue-300 dark:text-blue-700 opacity-50" />
                              <p className="text-gray-700 dark:text-gray-300 italic text-sm leading-relaxed">
                                "{testimonial.testimonial}"
                              </p>
                            </div>
                          ) : (
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                              <p className="text-gray-500 dark:text-gray-400 text-sm">No testimonial content available</p>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatDateTime(testimonial.createdAt)}</span>
                                </div>
                                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{new Date(testimonial.createdAt).toLocaleTimeString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                <span>ID: {String(testimonial.id).slice(-8)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT PANEL - Controls */}
                        <div className="bg-white dark:bg-gray-800 p-6">
                          <div className="space-y-5">

                            {/* Status Selection */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" />
                                Status
                              </label>
                              <div className="relative group">
                                <select
                                  value={selectedTestimonialStatus[testimonial.id] || ''}
                                  onChange={(e) => setSelectedTestimonialStatus(prev => ({ ...prev, [testimonial.id]: e.target.value }))}
                                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white appearance-none cursor-pointer shadow-sm hover:border-blue-400 transition-colors duration-200"
                                >
                                  <option value="">-- Select Status --</option>
                                  {testimonialStatuses.map((status) => (
                                    <option key={status.id} value={status.id}>
                                      {status.statusName}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                              </div>

                              {/* Live preview of selected status */}
                              {selectedTestimonialStatus[testimonial.id] && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg animate-in slide-in-from-top-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Selected: {testimonialStatuses.find(s => s.id === selectedTestimonialStatus[testimonial.id])?.statusName}</span>
                                </div>
                              )}
                            </div>

                            {/* Comments Section */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                                <MessageCircle className="w-3.5 h-3.5" />
                                Admin Comments
                              </label>
                              <div className="relative">
                                <textarea
                                  value={testimonialComments[testimonial.id] || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value.length <= 500) {
                                      setTestimonialComments(prev => ({ ...prev, [testimonial.id]: value }));
                                    }
                                  }}
                                  placeholder="Add your feedback or internal notes here..."
                                  rows="4"
                                  className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white shadow-sm resize-none hover:border-blue-300 transition-colors duration-200"
                                />
                                <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white dark:bg-gray-800 px-1 rounded">
                                  {testimonialComments[testimonial.id]?.length || 0}/500
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={() => handleSubmitTestimonial(testimonial.id, testimonial.customerId)}
                                disabled={testimonialActionLoading[testimonial.id]}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {testimonialActionLoading[testimonial.id] ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Update Status
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedTestimonialStatus(prev => {
                                    const newState = { ...prev };
                                    delete newState[testimonial.id];
                                    return newState;
                                  });
                                  setTestimonialComments(prev => {
                                    const newState = { ...prev };
                                    delete newState[testimonial.id];
                                    return newState;
                                  });
                                }}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95"
                                title="Reset selections"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Success Message */}
                            {testimonialActionSuccess[testimonial.id] && (
                              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Status updated successfully!</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - Fixed at bottom */}
            {studentTestimonials && studentTestimonials.length > 0 && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total: <span className="font-semibold text-gray-900 dark:text-white">{studentTestimonials.length}</span> testimonials
                      </span>
                    </div>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Pending: <span className="font-semibold text-orange-600 dark:text-orange-400">
                          {Object.keys(selectedTestimonialStatus).filter(id => selectedTestimonialStatus[id]).length}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Bulk update functionality
                      const updates = Object.entries(selectedTestimonialStatus);
                      if (updates.length === 0) return;
                      // Implement bulk update logic here
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Bulk Update ({Object.keys(selectedTestimonialStatus).length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add required CSS for animations and scrollbar */}
      <style jsx>{`
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  .animate-blink {
    animation: blink 1s ease-in-out infinite;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`}</style>
    </div>
  );
};

export default TestimonialManagement;
