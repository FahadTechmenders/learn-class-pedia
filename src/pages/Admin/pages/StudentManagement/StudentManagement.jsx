import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  BookOpen,
  RefreshCw,
  Eye,
  User,
  CreditCard,
  AlertCircle,
  ShoppingBag,
  Clock,
  Globe,
  GlobeIcon,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  MessageSquare,
  Percent
} from 'lucide-react';
import useStudentManagement from '../../../../hooks/api/useStudentManagement';
import { useAdmin } from '../../../../hooks/api/useAdmin';
import GenericDropdown from '../../../../components/GenericDropdown';
import { useToast } from '../../../../components/ToastProvider';
import './StudentManagement.css';

const StudentManagement = () => {
  const { showSuccess, showError } = useToast();
  const {
    loading,
    error,
    students,
    selectedStudent,
    summary,
    pagination,
    getAllStudents,
    getStudentById,
    filterStudents,
    clearError,
    setSelectedStudent,
    getSignupTypesDropdown,
    getCountriesDropdown,
    getStudentOrders,
    getStudentCart,
    getStudentTestimonials,
    approveTestimonial,
    getTestimonialStatusesDropdown,
    generateDashboardUrl,
    loadingStudentTestimonials,
  } = useStudentManagement();

  const {
    getAllCoursesAdmin,
  } = useAdmin();

  // Component state
  const [filters, setFilters] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    isEmailVerified: '',
    geoLocationCountry: [],
    signupTypeId: '',
    signupDateFrom: '',
    signupDateTo: '',
    courseId: '',
    isDownloaded: false,
    isShared: false,
    isCart: false,
    completionPercentage: '',
    isEnrolled: false,
    isTestimonial: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showSummary, setShowSummary] = useState(true); // Collapsible summary section
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showEnrollmentsModal, setShowEnrollmentsModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showTestimonialsModal, setShowTestimonialsModal] = useState(false);
  const [studentOrders, setStudentOrders] = useState(null);
  const [studentEnrollments, setStudentEnrollments] = useState(null);
  const [studentCart, setStudentCart] = useState(null);
  const [studentTestimonials, setStudentTestimonials] = useState(null);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);
  const [loadingTestimonials, setLoadingTestimonials] = useState(false);
  const [testimonialActionLoading, setTestimonialActionLoading] = useState({});
  const [testimonialStatuses, setTestimonialStatuses] = useState([]);
  const [selectedTestimonialStatus, setSelectedTestimonialStatus] = useState({});
  const [testimonialComments, setTestimonialComments] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingDashboardUrl, setLoadingDashboardUrl] = useState(null); // Store enrollment ID being processed

  // Dropdown data state
  const [signupTypes, setSignupTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Load dropdown data
  const loadDropdownData = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const [signupTypesData, coursesData, countriesData] = await Promise.all([
        getSignupTypesDropdown(),
        fetchCourses(),
        getCountriesDropdown()
      ]);

      setSignupTypes(signupTypesData || []);
      setCourses(coursesData || []);
      setCountries(countriesData || []);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    } finally {
      setLoadingDropdowns(false);
    }
  }, [getSignupTypesDropdown, getCountriesDropdown]);

  // Fetch courses for dropdown using getAllCoursesAdmin
  const fetchCourses = useCallback(async () => {
    try {
      const response = await getAllCoursesAdmin({ page: 1, pageSize: 1000 });
      const coursesData = response?.items || response?.data || response || [];
      return coursesData.map(course => ({
        id: course.id.toString(),
        title: course.title || course.name || 'Untitled Course'
      }));
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      return [];
    }
  }, [getAllCoursesAdmin]);

  // Load dropdown data on component mount
  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);


  // Load students function
  const loadStudents = useCallback(async (page = 1, pageSize = 100) => {
    try {
      await getAllStudents(page, pageSize, filters);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, [getAllStudents, filters]);


  // Handle refresh
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

  // Load initial data on mount
  useEffect(() => {
    getAllStudents(1, 100, {});
  }, [getAllStudents]);

  const handleFilter = useCallback(async () => {
    try {
      await filterStudents(filters, 1, pagination.pageSize);
    } catch (err) {
      console.error('Failed to filter students:', err);
    }
  }, [filterStudents, filters, pagination.pageSize]);

  const handlePageChange = useCallback(async (newPage) => {
    try {
      await getAllStudents(newPage, pagination.pageSize, filters);
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  }, [getAllStudents, pagination.pageSize, filters]);

  const handleViewStudent = useCallback(async (studentId) => {
    try {
      await getStudentById(studentId);
      setShowStudentDetails(true);
    } catch (err) {
      console.error('Failed to fetch student details:', err);
    }
  }, [getStudentById]);

  const handleViewOrders = useCallback(async (studentId) => {
    try {
      const ordersData = await getStudentOrders(studentId);
      setStudentOrders(ordersData);
      setShowOrdersModal(true);
    } catch (err) {
      console.error('Failed to fetch student orders:', err);
    }
  }, [getStudentOrders]);

  const handleViewEnrollments = useCallback(async (studentId) => {
    setLoadingEnrollments(true);
    try {
      const studentData = await getStudentById(studentId);
      setStudentEnrollments(studentData);
      setShowEnrollmentsModal(true);
    } catch (err) {
      console.error('Failed to fetch student enrollments:', err);
    } finally {
      setLoadingEnrollments(false);
    }
  }, [getStudentById]);

  const handleViewCart = useCallback(async (studentId) => {
    setLoadingCart(true);
    try {
      const cartData = await getStudentCart(studentId);
      setStudentCart(cartData);
      setShowCartModal(true);
    } catch (err) {
      console.error('Failed to fetch student cart:', err);
    } finally {
      setLoadingCart(false);
    }
  }, [getStudentCart]);

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
    } finally {
      setLoadingTestimonials(false);
    }
  }, [getStudentTestimonials, getTestimonialStatusesDropdown]);

  const handleSubmitTestimonial = useCallback(async (testimonialId, customerId) => {
    const statusId = selectedTestimonialStatus[testimonialId];
    const comment = testimonialComments[testimonialId] || '';

    if (!statusId) {
      showError('Please select a status');
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
      
      // Show success message
      showSuccess('Testimonial updated successfully!');
    } catch (err) {
      console.error('Failed to update testimonial status:', err);
      showError('Failed to update testimonial. Please try again.');
    } finally {
      setTestimonialActionLoading(prev => ({ ...prev, [testimonialId]: false }));
    }
  }, [approveTestimonial, getStudentTestimonials, selectedTestimonialStatus, testimonialComments]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const emptyFiltersRef = useMemo(() => ({
    fullName: '',
    email: '',
    phoneNumber: '',
    isEmailVerified: '',
    geoLocationCountry: [],
    signupTypeId: '',
    signupDateFrom: '',
    signupDateTo: '',
    courseId: '',
    isDownloaded: false,
    isShared: false,
    isCart: false,
    completionPercentage: '',
    isEnrolled: false,
    isTestimonial: false,
  }), []);

  const clearFilters = useCallback(async () => {
    try {
      setFilters(emptyFiltersRef);
      await getAllStudents(1, pagination.pageSize, emptyFiltersRef);
    } catch (err) {
      console.error('Failed to clear filters:', err);
    }
  }, [getAllStudents, pagination.pageSize, emptyFiltersRef]);

  // Reset a single filter and re-fetch
  const removeFilter = useCallback(async (key) => {
    const resetValue = typeof filters[key] === 'boolean'
      ? false
      : Array.isArray(filters[key])
        ? []
        : '';
    const next = { ...filters, [key]: resetValue };
    setFilters(next);
    try {
      await getAllStudents(1, pagination.pageSize, next);
    } catch (err) {
      console.error('Failed to remove filter:', err);
    }
  }, [filters, getAllStudents, pagination.pageSize]);

  // Build active-filter metadata (count + chips)
  const { activeFilterCount, activeFilterChips } = useMemo(() => {
    const labels = {
      fullName: 'Name',
      email: 'Email',
      phoneNumber: 'Phone',
      isEmailVerified: 'Email Verified',
      geoLocationCountry: 'Country',
      signupTypeId: 'Signup Type',
      signupDateFrom: 'Signup From',
      signupDateTo: 'Signup To',
      courseId: 'Course',
      isDownloaded: 'Certificate',
      isShared: 'Certificate',
      isCart: 'Cart',
      completionPercentage: 'Completion %',
      isEnrolled: 'Enrolled',
      isTestimonial: 'Testimonial',
    };

    const isActive = (k, v) => {
      if (typeof v === 'boolean') return v === true;
      if (Array.isArray(v)) return v.length > 0;
      return v !== '' && v !== null && v !== undefined;
    };

    const displayValue = (k, v) => {
      switch (k) {
        case 'isEmailVerified':
          return v === 'true' ? 'Verified' : 'Not Verified';
        case 'signupTypeId': {
          const t = signupTypes.find((s) => String(s.id) === String(v));
          return t?.typeName || v;
        }
        case 'courseId': {
          const c = courses.find((x) => String(x.id) === String(v));
          return c?.title || v;
        }
        case 'isDownloaded':
          return 'Downloaded';
        case 'isShared':
          return 'Shared';
        case 'isCart':
          return 'Has Items';
        case 'completionPercentage':
          return `${v}%`;
        case 'isEnrolled':
          return 'Enrolled';
        case 'isTestimonial':
          return 'Has Testimonial';
        case 'geoLocationCountry': {
          if (!Array.isArray(v) || v.length === 0) return String(v);
          if (countries.length > 0 && v.length >= countries.length) return 'All Countries';
          if (v.length === 1) return v[0];
          if (v.length === 2) return `${v[0]}, ${v[1]}`;
          return `${v[0]}, ${v[1]} and ${v.length - 2} more`;
        }
        default:
          return String(v);
      }
    };

    const chips = Object.entries(filters)
      .filter(([k, v]) => isActive(k, v))
      .map(([k, v]) => ({ key: k, label: labels[k] || k, value: displayValue(k, v) }));

    return { activeFilterCount: chips.length, activeFilterChips: chips };
  }, [filters, signupTypes, courses]);

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
      second: '2-digit',
      hour12: false
    });
  };

  // Helper function to get initials from name
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

  // Helper function to check if we should use initials instead of image
  const shouldUseInitials = (imageUrl) => {
    if (!imageUrl) return true;
    // Check if it's a Google profile image or similar service
    return imageUrl.includes('googleusercontent.com') ||
      imageUrl.includes('graph.facebook.com') ||
      imageUrl.includes('platform-lookaside.fbsbx.com');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 lg:p-4">
      {/* Search and Filters - Modern Compact Design */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-visible">
        {/* Filter Header Bar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 rounded-t-xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Left: Title & Stats */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                    Student Management
                  </h1>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {/* Right: Filter Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-md border border-blue-200 dark:border-blue-800">
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
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  showFilters
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-expanded={showFilters}
                aria-controls="filter-panel"
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
          id="filter-panel"
          className={`transition-all duration-300 ease-in-out ${
            showFilters ? 'max-h-[500px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="p-4 space-y-4 bg-gray-50/60 dark:bg-gray-900/20 rounded-b-2xl">
            {/* Text Inputs Group */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
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
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="1234567890"
                      value={filters.phoneNumber}
                      onChange={(e) => handleFilterChange('phoneNumber', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Signup From</label>
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
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Signup To</label>
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

            {/* Dropdowns Group */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Verification</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={filters.isEmailVerified}
                      onChange={(e) => handleFilterChange('isEmailVerified', e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="">All Status</option>
                      <option value="true">✓ Verified</option>
                      <option value="false">✗ Not Verified</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Signup Type</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={filters.signupTypeId}
                      onChange={(e) => handleFilterChange('signupTypeId', e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="">All Types</option>
                      {signupTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.typeName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="sm:col-span-2 xl:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Country</label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                    <GenericDropdown
                      value={filters.geoLocationCountry}
                      onChange={(value) => handleFilterChange('geoLocationCountry', value)}
                      items={countries}
                      placeholder="All Countries"
                      disabled={loadingDropdowns}
                      loading={loadingDropdowns}
                      allowClear={true}
                      displayField="name"
                      valueField="name"
                      multiple={true}
                      showSelectAll={true}
                    />
                  </div>
                </div>
                <div className="xl:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Course</label>
                  <div className="relative">
                    <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                    <GenericDropdown
                      value={filters.courseId}
                      onChange={(value) => handleFilterChange('courseId', value)}
                      items={courses}
                      placeholder="All Courses"
                      disabled={loadingDropdowns}
                      loading={loadingDropdowns}
                      allowClear={true}
                      displayField="title"
                      valueField="id"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Completion %</label>
                  <div className="relative">
                    <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={filters.completionPercentage}
                      onChange={(e) => handleFilterChange('completionPercentage', e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="">All Percentages</option>
                      <option value="10">10%</option>
                      <option value="20">20%</option>
                      <option value="30">30%</option>
                      <option value="40">40%</option>
                      <option value="50">50%</option>
                      <option value="60">60%</option>
                      <option value="70">70%</option>
                      <option value="80">80%</option>
                      <option value="90">90%</option>
                      <option value="100">100%</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Checkboxes Group */}
            <div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 px-3 py-3 shadow-sm">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filters.isDownloaded}
                    onChange={(e) => handleFilterChange('isDownloaded', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                  />
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Downloaded</span>
                </label>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filters.isShared}
                    onChange={(e) => handleFilterChange('isShared', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                  />
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Shared</span>
                </label>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 cursor-pointer hover:border-orange-300 dark:hover:border-orange-700 transition-colors whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filters.isCart}
                    onChange={(e) => handleFilterChange('isCart', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                  />
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">CartItems</span>
                </label>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filters.isEnrolled}
                    onChange={(e) => handleFilterChange('isEnrolled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                  />
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Enrolled</span>
                </label>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filters.isTestimonial}
                    onChange={(e) => handleFilterChange('isTestimonial', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 transition-colors"
                  />
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Testimonial</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Panel - Collapsible */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {/* Summary Header Toggle */}
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Summary Statistics</span>
              {summary && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({summary.totalCustomers || 0} total)
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${showSummary ? 'rotate-180' : ''}`} />
          </button>

          {/* Summary Cards */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              showSummary ? 'max-h-[400px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
            }`}
          >
            <div className="p-4 bg-gray-50/60 dark:bg-gray-900/20">
              {summary ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total Customers */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Students</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalCustomers || 0}</div>
                </div>

                {/* Google Signups */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Google</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.googleSignupCount || 0}</div>
                </div>

                {/* LinkedIn Signups */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <svg className="w-4 h-4 text-blue-700 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">LinkedIn</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.linkedInSignupCount || 0}</div>
                </div>

                {/* Email Signups */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.emailSignupCount || 0}</div>
                </div>

                {/* Free Course Enrollments */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Free Courses</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.freeCourseEnrollmentCount || 0}</div>
                </div>

                {/* Paid Course Enrollments */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Paid Courses</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.paidCourseEnrollmentCount || 0}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>Loading summary...</span>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-1">
            Active Filters:
          </span>
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              <span className="text-blue-600/70 dark:text-blue-400/70">{chip.label}:</span>
              <span className="font-semibold">{chip.value}</span>
              <button
                onClick={() => removeFilter(chip.key)}
                className="ml-1 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl flex items-center justify-between shadow-lg my-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 mt-5 overflow-hidden">
        {/* Desktop Table - Scrollable Container */}
<div className="hidden md:block w-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
  <table className="w-full min-w-[1220px] table-fixed border-collapse">
    <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <tr>
        <th className="w-[200px] pl-4 pr-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Student
        </th>

        <th className="w-[90px] px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Enrollments
        </th>

        <th className="w-[90px] px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Signup Through
        </th>

        <th className="w-[90px] px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Advertising Medium
        </th>

        <th className="w-[100px] px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Landing Page
        </th>

        <th className="w-[90px] px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Referral URL
        </th>

        <th className="w-[100px] px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Signup Date
        </th>

        <th className="w-[110px] px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Course Progress
        </th>

        <th className="w-[120px] px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Actions
        </th>
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
      {loading ? (
        <tr>
          <td colSpan="9" className="px-6 py-14 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Loading students...
              </span>
            </div>
          </td>
        </tr>
      ) : students.length === 0 ? (
        <tr>
          <td colSpan="9" className="px-6 py-14 text-center">
            <div className="flex flex-col items-center gap-3">
              <Users className="h-12 w-12 text-gray-400" />
              <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
                No students found
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                Try adjusting your search or filters
              </span>
            </div>
          </td>
        </tr>
      ) : (
        students.map((student) => (
          <tr
            key={student.id}
            className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/60"
          >
            {/* Student */}
            <td className="pl-4 pr-2 py-3 align-top">
              <div className="min-w-0 space-y-1.5">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {student.firstName && student.lastName
                    ? `${student.firstName} ${student.lastName}`
                    : student.fullName || "N/A"}
                </div>

                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {student.email || "N/A"}
                </div>

                <div className="flex items-center gap-1">
                  {student.isEmailVerified ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Verified
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-xs font-medium text-red-500 dark:text-red-400">
                        Unverified
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <GlobeIcon className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  {student.geoLocationCountryName ? (
                    <span className="truncate text-xs text-blue-600 dark:text-blue-300">
                      {student.geoLocationCountryName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      N/A
                    </span>
                  )}
                </div>

                {student.plainPassword && (
                  <div className="flex items-start gap-1">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Pass:{" "}
                      <code className="rounded bg-yellow-100 px-1 py-0.5 font-mono text-[10px] font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {student.plainPassword}
                      </code>
                    </span>
                  </div>
                )}

                {student.testimonialCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewTestimonials(student.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-medium text-purple-600 transition-colors duration-200 hover:border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Testimonials {student.testimonialCount}</span>
                  </button>
                )}
              </div>
            </td>

            {/* Enrollments */}
            <td className="px-2 py-3 align-top">
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewEnrollments(student.id);
                  }}
                  disabled={!student.enrollmentCount}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 ${
                    student.enrollmentCount
                      ? "cursor-pointer border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                  }`}
                >
                  <div
                    className={`rounded-lg p-1 ${
                      student.enrollmentCount
                        ? "bg-white/20"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <span>Enroll {student.enrollmentCount || 0}</span>
                </button>
                <button
                  onClick={(e) => {
                    if ((student.cartCount || 0) === 0) return;
                    e.stopPropagation();
                    handleViewCart(student.id);
                  }}
                  disabled={(student.cartCount || 0) === 0}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 ${
                    (student.cartCount || 0) === 0
                      ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                      : "cursor-pointer border-orange-200 bg-orange-50 text-orange-600 hover:border-orange-300 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30"
                  }`}
                >
                  <div
                    className={`rounded-lg p-1 ${
                      (student.cartCount || 0) > 0
                        ? "bg-white/20"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </div>
                  <span>Cart {student.cartCount || 0}</span>
                </button>
              </div>
            </td>

            {/* Signup Through */}
            <td className="px-2 py-3 align-top">
              <span
                className={`text-sm font-medium ${
                  student.signupTypeName === "Email"
                    ? "text-blue-600"
                    : student.signupTypeName === "Google"
                    ? "text-red-600"
                    : student.signupTypeName === "Facebook"
                    ? "text-indigo-600"
                    : student.signupTypeName === "LinkedIn"
                    ? "text-cyan-600"
                    : student.signupTypeName === "Apple"
                    ? "text-gray-600 dark:text-gray-300"
                    : "text-purple-600"
                }`}
              >
                {student.signupTypeName || "N/A"}
              </span>
            </td>

            {/* Advertising Medium */}
            <td className="px-2 py-3 align-top">
              <div className="flex items-center gap-2">
                {student.advertisingMedium ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                    <span className="truncate">{student.advertisingMedium}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    N/A
                  </span>
                )}
              </div>
            </td>

            {/* Landing Page */}
            <td className="px-2 py-3 align-top">
              <div className="flex items-center gap-2">
                {student.landingPageUrl ? (
                  <a
                    href={student.landingPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={student.landingPageUrl}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 009-9m-9 9h18"
                      />
                    </svg>
                    <span className="truncate">Open Link</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    N/A
                  </span>
                )}
              </div>
            </td>

            {/* Referral URL */}
            <td className="px-2 py-3 align-top">
              <div className="flex items-center gap-2">
                {student.signupTypeUrl ? (
                  <a
                    href={student.signupTypeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={student.signupTypeUrl}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <span className="truncate">Referral</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    N/A
                  </span>
                )}
              </div>
            </td>

            {/* Signup Date */}
            <td className="px-2 py-3 align-top">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5 dark:bg-blue-900/30">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </div>
                  <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {new Date(student.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </div>
                </div>
              </div>
            </td>

            {/* Course Progress */}
            <td className="px-2 py-3 align-top">
              <div className="flex flex-col gap-2">
                {student.completionPercentage !== undefined &&
                student.completionPercentage !== null ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            student.completionPercentage === 100
                              ? "bg-emerald-500"
                              : student.completionPercentage >= 75
                              ? "bg-blue-500"
                              : student.completionPercentage >= 50
                              ? "bg-amber-400"
                              : student.completionPercentage >= 25
                              ? "bg-orange-400"
                              : "bg-rose-400"
                          }`}
                          style={{ width: `${student.completionPercentage}%` }}
                        />
                      </div>

                      <span
                        className={`min-w-[38px] text-xs font-bold ${
                          student.completionPercentage === 100
                            ? "text-emerald-600"
                            : student.completionPercentage >= 50
                            ? "text-blue-600"
                            : "text-amber-600"
                        }`}
                      >
                        {student.completionPercentage}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                          student.isDownload
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {student.isDownload ? (
                          <svg
                            className="h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <span className="font-medium">Downloaded</span>
                      </div>

                      <div
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                          student.isShared
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {student.isShared ? (
                          <svg
                            className="h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <span className="font-medium">Shared</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                    No Course
                  </span>
                )}
              </div>
            </td>

            {/* Actions */}
            <td className="px-2 py-3 align-top">
              <div className="flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStudent(student.id);
                  }}
                  className="inline-flex w-[76px] items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors duration-200 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View</span>
                </button>

                <button
                  onClick={(e) => {
                    if ((student.orderCount || 0) === 0) return;
                    e.stopPropagation();
                    handleViewOrders(student.id);
                  }}
                  disabled={(student.orderCount || 0) === 0}
                  className={`inline-flex w-[76px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
                    (student.orderCount || 0) === 0
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-600"
                      : "cursor-pointer border-green-200 bg-green-50 text-green-600 hover:border-green-300 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Orders</span>
                </button>
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

        {/* Medium Screen Compact Table */}
        <div className="hidden lg:block xl:hidden overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[200px]">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[200px]">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[100px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[100px]">
                  Enrollments
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[120px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Loading students...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400 font-medium">No students found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {student.firstName && student.lastName
                              ? `${student.firstName} ${student.lastName}`
                              : student.fullName || 'N/A'
                            }
                          </div>
                          {student.testimonialCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTestimonials(student.id);
                              }}
                              className="mt-1 inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600 transition-colors duration-200 hover:border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>Testimonials {student.testimonialCount}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white truncate max-w-[150px]">
                        {student.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                        {student.isEmailVerified ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        <span>
                          {student.isEmailVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewEnrollments(student.id);
                        }}
                        disabled={!student.enrollmentCount}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${student.enrollmentCount
                          ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 cursor-pointer'
                          : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                          }`}
                      >
                        <div className={`p-1 rounded-lg ${student.enrollmentCount ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <span>Enroll {student.enrollmentCount || 0}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewStudent(student.id);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 cursor-pointer w-[60px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                          <button
                            onClick={(e) => {
                              if ((student.orderCount || 0) === 0) return;
                              e.stopPropagation();
                              handleViewOrders(student.id);
                            }}
                            disabled={(student.orderCount || 0) === 0}
                            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors w-[60px] ${
                              (student.orderCount || 0) === 0
                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-600'
                                : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hover:border-green-300 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30 cursor-pointer'
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Orders</span>
                          </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Layout */}
        <div className="lg:hidden p-4 space-y-4">
          {loading ? (
            // Mobile loading skeleton
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
              </div>
            ))
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No students found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            students.map((student) => (
              <div key={student.id} className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
                {/* Student Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 flex-shrink-0">
                    {student.profileImageUrl && !shouldUseInitials(student.profileImageUrl) ? (
                      <img
                        className="w-16 h-16 rounded-full object-cover ring-3 ring-blue-100 dark:ring-blue-900/50 shadow-lg"
                        src={student.profileImageUrl}
                        alt={student.fullName}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg"
                      style={{ display: student.profileImageUrl && !shouldUseInitials(student.profileImageUrl) ? 'none' : 'flex' }}
                    >
                      {getInitials(student.fullName, student.firstName, student.lastName)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">
                      {student.firstName && student.lastName
                        ? `${student.firstName} ${student.lastName}`
                        : student.fullName || 'N/A'
                      }
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Student</span>
                    </div>
                    {student.testimonialCount > 0 && (
                      <button
                        onClick={() => handleViewTestimonials(student.id)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-600 transition-colors duration-200 hover:border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>Testimonials {student.testimonialCount}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {student.email}
                    </span>
                  </div>
                  {student.phoneNumber && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {student.phoneNumberWithCountryCode ||
                          (student.phoneCountryCode && student.phoneNumber
                            ? `${student.phoneCountryCode} ${student.phoneNumber}`
                            : student.phoneNumber)}
                      </span>
                    </div>
                  )}
                  {student.plainPassword && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="p-2 bg-yellow-500 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Password</span>
                        <code className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{student.plainPassword}</code>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status and Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    {student.isEmailVerified ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span>
                      {student.isEmailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>

                  <button
                    onClick={() => student.enrollmentCount && handleViewEnrollments(student.id)}
                    disabled={!student.enrollmentCount}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${student.enrollmentCount
                      ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 cursor-pointer'
                      : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                      }`}
                  >
                    <div className={`p-1.5 rounded-lg ${student.enrollmentCount ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span>Enroll {student.enrollmentCount || 0}</span>
                  </button>

                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Signup:</span> {student.signupTypeName || 'N/A'}
                  </div>

                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Ad Medium:</span> {student.advertisingMedium || 'N/A'}
                  </div>

                  {student.landingPageUrl ? (
                    <a
                      href={student.landingPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-medium hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors border border-teal-200 dark:border-teal-800"
                      title={student.landingPageUrl}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 009-9m-9 9h18" />
                      </svg>
                      Landing Page
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      N/A
                    </span>
                  )}

                  {student.signupTypeUrl ? (
                    <a
                      href={student.signupTypeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800"
                      title={student.signupTypeUrl}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Referral
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      N/A
                    </span>
                  )}

                  <div className="col-span-2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500 rounded-lg">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {new Date(student.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {new Date(student.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewStudent(student.id);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-200 bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => student.enrollmentCount && handleViewEnrollments(student.id)}
                    disabled={!student.enrollmentCount}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${student.enrollmentCount
                      ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 cursor-pointer'
                      : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                      }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Enroll {student.enrollmentCount || 0}</span>
                  </button>
                  <button
                    onClick={() => student.testimonialCount && handleViewTestimonials(student.id)}
                    disabled={!student.testimonialCount}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${student.testimonialCount
                      ? 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-300 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/30 cursor-pointer'
                      : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
                      }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Testimonials {student.testimonialCount || 0}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Showing <span className="font-semibold text-gray-900 dark:text-white">{((pagination.currentPage - 1) * pagination.pageSize) + 1}</span> to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)}</span> of{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{pagination.totalCount}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-500 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 disabled:hover:scale-100 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg font-bold transition-colors duration-200 ${pageNum === pagination.currentPage
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-500 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 disabled:hover:scale-100 font-medium"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showStudentDetails && selectedStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl max-w-5xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200/50 dark:border-gray-700/50 animate-slideUp">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 p-6 rounded-t-3xl border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Student Details</h2>
                    <p className="text-blue-100 text-sm">ID: {selectedStudent.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStudentDetails(false);
                    setSelectedStudent(null);
                  }}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-colors duration-200 group"
                >
                  <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 lg:p-8">
              {/* Student Profile Section */}
              <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 mb-8 border border-blue-200/50 dark:border-blue-800/30">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
                  {/* Profile Image */}
                  <div className="relative">
                    {selectedStudent.profileImageUrl && !shouldUseInitials(selectedStudent.profileImageUrl) ? (
                      <img
                        className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white dark:ring-gray-700 shadow-2xl"
                        src={selectedStudent.profileImageUrl}
                        alt={selectedStudent.fullName}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-2xl"
                      style={{ display: selectedStudent.profileImageUrl && !shouldUseInitials(selectedStudent.profileImageUrl) ? 'none' : 'flex' }}
                    >
                      {getInitials(selectedStudent.fullName, selectedStudent.firstName, selectedStudent.lastName)}
                    </div>
                    {/* Status Badge */}
                    <div className="absolute -bottom-2 -right-2">
                      {selectedStudent.isEmailVerified ? (
                        <div className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold shadow-lg">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-semibold shadow-lg">
                          <XCircle className="w-3 h-3" />
                          Not Verified
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedStudent.fullName}
                    </h3>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                        {selectedStudent.signupTypeName}
                      </span>

                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center lg:justify-start gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{selectedStudent.email}</span>
                      </div>
                      {selectedStudent.phoneNumber && (
                        <div className="flex items-center justify-center lg:justify-start gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {selectedStudent.phoneNumberWithCountryCode ||
                              (selectedStudent.phoneCountryCode && selectedStudent.phoneNumber
                                ? `${selectedStudent.phoneCountryCode} ${selectedStudent.phoneNumber}`
                                : selectedStudent.phoneNumber)}
                          </span>
                        </div>
                      )}
                      {selectedStudent.plainPassword && (
                        <div className="flex items-center justify-center lg:justify-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-700 dark:text-gray-300">
                            Password: <code className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded font-mono text-sm font-semibold">{selectedStudent.plainPassword}</code>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 p-3 rounded-xl border border-green-200/50 dark:border-green-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Member Since</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">{formatDateTime(selectedStudent.createdAt)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-3 rounded-xl border border-purple-200/50 dark:border-purple-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-purple-500 rounded-lg">
                      <BookOpen className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Enrollments</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">{selectedStudent.enrollments?.length || 0} Courses</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 p-3 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-indigo-500 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Last Course Completion</h4>
                  </div>
                  {selectedStudent.completionPercentage !== undefined && selectedStudent.completionPercentage !== null ? (
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - selectedStudent.completionPercentage / 100)}`}
                            className={`${
                              selectedStudent.completionPercentage >= 75 ? 'text-green-500' :
                              selectedStudent.completionPercentage >= 50 ? 'text-blue-500' :
                              selectedStudent.completionPercentage >= 25 ? 'text-yellow-500' :
                              'text-orange-500'
                            } transition-all duration-300`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {selectedStudent.completionPercentage}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {selectedStudent.completionPercentage}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedStudent.completionPercentage >= 75 ? 'Excellent Progress' :
                           selectedStudent.completionPercentage >= 50 ? 'Good Progress' :
                           selectedStudent.completionPercentage >= 25 ? 'In Progress' :
                           'Just Started'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">N/A</p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-emerald-500 rounded-lg">
                      {selectedStudent.enrollments?.[0]?.isDownload ? (
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Certificate Download Status</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                    {selectedStudent.enrollments?.[0]?.isDownload ? 'Downloaded' : 'Not Downloaded'}
                  </p>
                  {selectedStudent.enrollments?.[0]?.downloadDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(selectedStudent.enrollments[0].downloadDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30 p-3 rounded-xl border border-sky-200/50 dark:border-sky-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-sky-500 rounded-lg">
                      {selectedStudent.enrollments?.[0]?.isShared ? (
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Certificate Share Status</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                    {selectedStudent.enrollments?.[0]?.isShared ? 'Shared' : 'Not Shared'}
                  </p>
                  {selectedStudent.enrollments?.[0]?.sharedDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(selectedStudent.enrollments[0].sharedDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 p-3 rounded-xl border border-blue-200/50 dark:border-blue-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Signup Country</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm truncate">{selectedStudent.signupCountry || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 p-3 rounded-xl border border-orange-200/50 dark:border-orange-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-orange-500 rounded-lg">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">GeoLocation Country</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm truncate">{selectedStudent.geoLocationCountryName || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 p-3 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-indigo-500 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Advertising Medium</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm truncate">{selectedStudent.advertisingMedium || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 p-3 rounded-xl border border-green-200/50 dark:border-green-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <Phone className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Phone (Full)</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm truncate">{selectedStudent.phoneNumberWithCountryCode || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-3 rounded-xl border border-purple-200/50 dark:border-purple-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-purple-500 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Referral URL</h4>
                  </div>
                  {selectedStudent.signupTypeUrl ? (
                    <a
                      href={selectedStudent.signupTypeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 hover:underline text-xs font-medium block truncate"
                      title={selectedStudent.signupTypeUrl}
                    >
                      {selectedStudent.signupTypeUrl.length > 35 ? selectedStudent.signupTypeUrl.substring(0, 35) + '...' : selectedStudent.signupTypeUrl}
                    </a>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 text-xs">N/A</p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 p-3 rounded-xl border border-teal-200/50 dark:border-teal-800/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-teal-500 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 009-9m-9 9h18" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs">Landing Page URL</h4>
                  </div>
                  {selectedStudent.landingPageUrl ? (
                    <a
                      href={selectedStudent.landingPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 hover:underline text-xs font-medium block truncate"
                      title={selectedStudent.landingPageUrl}
                    >
                      {selectedStudent.landingPageUrl.length > 35 ? selectedStudent.landingPageUrl.substring(0, 35) + '...' : selectedStudent.landingPageUrl}
                    </a>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 text-xs">N/A</p>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              {selectedStudent.bio && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-600 rounded-xl">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Bio</h4>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">{selectedStudent.bio}</p>
                  </div>
                </div>
              )}

              {/* Temporary Password Section - Only show if exists */}
              {/* {selectedStudent.plainPassword && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-500 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Password</h4>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 p-6 rounded-2xl border border-yellow-200/50 dark:border-yellow-800/30">
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-mono font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-4 py-2 rounded-lg">{selectedStudent.plainPassword}</code>
                      <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Password</span>
                    </div>
                  </div>
                </div>
              )} */}

              {/* Enrollments Section */}
              {selectedStudent.enrollments && selectedStudent.enrollments.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500 rounded-xl">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Enrollments ({selectedStudent.enrollments.length})</h4>
                  </div>
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {selectedStudent.enrollments.map((enrollment, index) => (
                      <div key={enrollment.id} className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 p-5 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h5 className="font-bold text-gray-900 dark:text-white text-lg">
                                {enrollment.resourceTitle}
                              </h5>
                              <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-md ${enrollment.resourceType === 'Career Path'
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                }`}>
                                {enrollment.resourceType}
                              </span>
                              {enrollment.levelName && (
                                <span className="px-3 py-1 text-xs font-bold rounded-full shadow-md bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
                                  {enrollment.levelName}
                                </span>
                              )}
                            </div>
                            {enrollment.careerPathName && (
                              <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
                                Career Path: {enrollment.careerPathName}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                              {enrollment.courseTypeId && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                  <BookOpen className="w-4 h-4 text-orange-500" />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {enrollment.courseTypeId === 1 ? 'Professional Certificate' : enrollment.courseTypeId === 2 ? 'Course Certificate' : enrollment.courseTypeId === 3 ? 'Short Course' : 'Course'}
                                  </span>
                                </div>
                              )}
                              {enrollment.levelId && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                  <Users className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Level {enrollment.levelId}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                <Calendar className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Joined: {formatDateTime(enrollment.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Active: {enrollment.lastActivityDate ? formatDateTime(enrollment.lastActivityDate) : 'N/A'}</span>
                              </div>
                              {enrollment.completionPercentage !== undefined && enrollment.completionPercentage !== null && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                  <div className="w-4 h-4 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-indigo-500">%</span>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {enrollment.completionPercentage}% Complete
                                  </span>
                                </div>
                              )}
                              {enrollment.completedCount !== undefined && enrollment.completedCount !== null && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {enrollment.completedCount} Lectures Completed
                                  </span>
                                </div>
                              )}
                              {enrollment.incompleteCount !== undefined && enrollment.incompleteCount !== null && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                  <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                                    <XCircle className="w-3 h-3 text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {enrollment.incompleteCount} Lectures Incomplete
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                {enrollment.isDownload ? (
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {enrollment.isDownload ? 'Downloaded' : 'Not Downloaded'}
                                  {enrollment.downloadDate && ` (${new Date(enrollment.downloadDate).toLocaleDateString()})`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                {enrollment.isShared ? (
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {enrollment.isShared ? 'Shared' : 'Not Shared'}
                                  {enrollment.sharedDate && ` (${new Date(enrollment.sharedDate).toLocaleDateString()})`}
                                </span>
                              </div>

                              {/* Enter Classroom Button */}
                              <button
                                onClick={async () => {
                                  setLoadingDashboardUrl(enrollment.id);
                                  try {
                                    const customerId = selectedStudent?.id;
                                    const resourceId = enrollment.courseId || enrollment.resourceId;
                                    const resourceTypeId = enrollment.resourceType === 'Career Path' ? 2 : 1;

                                    if (!customerId || !resourceId) {
                                      console.error('Missing required parameters for dashboard URL');
                                      return;
                                    }

                                    const result = await generateDashboardUrl(customerId, resourceId, resourceTypeId);
                                    if (result?.dashboardUrl) {
                                      window.open(result.dashboardUrl, '_blank');
                                    }
                                  } catch (err) {
                                    console.error('Failed to generate dashboard URL:', err);
                                  } finally {
                                    setLoadingDashboardUrl(null);
                                  }
                                }}
                                disabled={loadingDashboardUrl === enrollment.id}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingDashboardUrl === enrollment.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    <span>Loading...</span>
                                  </>
                                ) : (
                                  <>
                                    <BookOpen className="w-4 h-4" />
                                    <span>Enter Classroom</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrdersModal && studentOrders && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl max-w-6xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-700/50 animate-slideUp">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 p-6 rounded-t-3xl border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Orders</h2>
                    <p className="text-green-100 text-sm">
                      {studentOrders.customerFullName} (ID: {studentOrders.customerId}) - {studentOrders.orders?.length || 0} orders
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowOrdersModal(false);
                    setStudentOrders(null);
                  }}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-colors duration-200 group"
                >
                  <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 lg:p-8 overflow-y-auto max-h-[calc(85vh-120px)]">
              {studentOrders.orders && studentOrders.orders.length > 0 ? (
                <div className="space-y-6">
                  {studentOrders.orders.map((order) => (
                    <div key={order.id} className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-lg transition-all duration-300">
                      {/* Order Header */}
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                            <ShoppingBag className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              Order #{order.orderNo}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-md ${order.statusName === 'Paid'
                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400'
                                : order.statusName === 'Pending'
                                  ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-400'
                                  : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-400'
                                }`}>
                                {order.statusName}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            ${order.totalAmount.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {order.currencyCode}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Order Items ({order.orderItems?.length || 0})
                        </h4>
                        <div className="space-y-3">
                          {order.orderItems?.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-gray-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div>
                                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    {item.resourceTitle}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="px-3 py-1 text-xs font-bold rounded-full shadow-md bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                                      Type: {item.resourceType}
                                    </span>
                                    <span className="px-3 py-1 text-xs font-bold rounded-full shadow-md bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                                      Package: {item.packageName}
                                    </span>
                                    {item.courseTypeId && (
                                      <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-md ${item.courseTypeId === 1
                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                                        : item.courseTypeId === 2
                                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                                          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                        }`}>
                                        {item.courseTypeId === 1 ? 'Professional Certificate' : item.courseTypeId === 2 ? 'Course Certificate' : item.courseTypeId === 3 ? 'Short Course' : 'Course'}
                                      </span>
                                    )}
                                  </div>
                                  {item.levelName && (
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-md ${item.levelId === 1
                                      ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
                                      : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white'
                                      }`}>
                                      {item.levelName}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                  <div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                      ${item.finalPrice.toFixed(2)}
                                    </div>
                                    {item.discount > 0 && (
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                          ${item.unitPrice.toFixed(2)}
                                        </div>
                                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                                          Save ${item.discount.toFixed(2)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Information */}
                      {order.paymentId && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/30">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Payment Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Status</div>
                              <div className={`px-3 py-1 text-xs font-semibold rounded-full shadow-md inline-block ${order.paymentStatusName === 'Captured'
                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400'
                                : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-400'
                                }`}>
                                {order.paymentStatusName}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transaction ID</div>
                              <div className="text-sm font-mono text-gray-900 dark:text-white">
                                {order.transactionId}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment Method</div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {order.cardHolderName && (
                                  <span>{order.cardHolderName} ({order.paymentMethodType})</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Paid At</div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {order.paidAt ? formatDate(order.paidAt) : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment Response</div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {order.paymentResponse || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Order Summary */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/30">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Order Summary</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                            <span className="text-gray-900 dark:text-white">${order.subtotalAmount.toFixed(2)}</span>
                          </div>
                          {order.discountAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                              <span className="text-green-600 dark:text-green-400">-${order.discountAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {order.taxAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                              <span className="text-gray-900 dark:text-white">${order.taxAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
                            <span className="text-gray-900 dark:text-white">Total:</span>
                            <span className="text-gray-900 dark:text-white">${order.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Orders Found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    This student hasn't placed any orders yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enrollments Modal */}
      {showEnrollmentsModal && studentEnrollments && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-700/50 animate-slideUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Enrolled Courses
                    </h2>
                    <p className="text-blue-100 mt-1">
                      {studentEnrollments.firstName && studentEnrollments.lastName
                        ? `${studentEnrollments.firstName} ${studentEnrollments.lastName}`
                        : studentEnrollments.fullName || 'Student'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEnrollmentsModal(false);
                    setStudentEnrollments(null);
                  }}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-colors duration-200 group"
                >
                  <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 lg:p-8 overflow-y-auto max-h-[calc(85vh-120px)] bg-gray-50 dark:bg-gray-900">
              {loadingEnrollments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : studentEnrollments.enrollments && studentEnrollments.enrollments.length > 0 ? (
                <div className="space-y-4">
                  {/* Header with count */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500 rounded-xl">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Enrollments ({studentEnrollments.enrollments.length})
                    </h3>
                  </div>

                  {/* Enrollment Cards */}
                  {studentEnrollments.enrollments.map((enrollment, index) => (
                    <div key={enrollment.id || index} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-blue-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
                      {/* Course Title with Type Badges */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">
                          {enrollment.resourceTitle || enrollment.courseName || enrollment.title || 'Course'}
                        </h4>
                        {enrollment.resourceType && (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500 text-white">
                            {enrollment.resourceType}
                          </span>
                        )}
                        {enrollment.courseTypeId && (
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${enrollment.courseTypeId === 1
                            ? 'bg-blue-500 text-white'
                            : enrollment.courseTypeId === 2
                              ? 'bg-orange-500 text-white'
                              : 'bg-green-500 text-white'
                            }`}>
                            {enrollment.courseTypeId === 1 ? 'Professional Certificate' : enrollment.courseTypeId === 2 ? 'Course Certificate' : enrollment.courseTypeId === 3 ? 'Short Course' : 'Course'}
                          </span>
                        )}
                      </div>

                      {/* Level and Date Row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {enrollment.levelName && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
                            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {enrollment.levelName}
                            </span>
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Joined: {formatDateTime(enrollment.createdAt)}
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Last Active: {enrollment.lastActivityDate ? formatDateTime(enrollment.lastActivityDate) : 'N/A'}
                          </span>
                        </div>
                        {enrollment.completionPercentage !== undefined && enrollment.completionPercentage !== null && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                              <span className="text-[6px] font-bold text-indigo-500">%</span>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {enrollment.completionPercentage}% Complete
                            </span>
                          </div>
                        )}
                        {enrollment.completedCount !== undefined && enrollment.completedCount !== null && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {enrollment.completedCount} Lectures Completed
                            </span>
                          </div>
                        )}
                        {enrollment.incompleteCount !== undefined && enrollment.incompleteCount !== null && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
                            <XCircle className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {enrollment.incompleteCount} Lectures Incomplete
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Enter Classroom Button */}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={async () => {
                            setLoadingDashboardUrl(enrollment.id);
                            try {
                              const customerId = studentEnrollments?.id;
                              const resourceId = enrollment.courseId || enrollment.resourceId;
                              const resourceTypeId = enrollment.resourceType === 'Career Path' ? 2 : 1;

                              if (!customerId || !resourceId) {
                                console.error('Missing required parameters for dashboard URL');
                                return;
                              }

                              const result = await generateDashboardUrl(customerId, resourceId, resourceTypeId);
                              if (result?.dashboardUrl) {
                                window.open(result.dashboardUrl, '_blank');
                              }
                            } catch (err) {
                              console.error('Failed to generate dashboard URL:', err);
                            } finally {
                              setLoadingDashboardUrl(null);
                            }
                          }}
                          disabled={loadingDashboardUrl === enrollment.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingDashboardUrl === enrollment.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>Loading...</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-4 h-4" />
                              <span>Enter Classroom</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Enrollments Found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    This student hasn't enrolled in any courses yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-700/50 animate-slideUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <ShoppingBag className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                     Customer  Cart
                    </h2>
                    <p className="text-orange-100 mt-1">
                      {studentCart?.length || 0} items in cart
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCartModal(false);
                    setStudentCart(null);
                  }}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-colors duration-200 group"
                >
                  <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 lg:p-8 overflow-y-auto max-h-[calc(85vh-120px)] bg-gray-50 dark:bg-gray-900">
              {loadingCart ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : studentCart && studentCart.length > 0 ? (
                <div className="space-y-4">
                  {/* Header with count */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-500 rounded-xl">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Cart Items ({studentCart.length})
                    </h3>
                  </div>

                  {/* Cart Item Cards */}
                  {studentCart.map((item, index) => (
                    <div key={item.id || index} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-orange-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
                      {/* Resource Name with Type Badge */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">
                          {item.resourceName || 'Unknown Item'}
                        </h4>
                        {item.resourceTypeName && (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                            {item.resourceTypeName}
                          </span>
                        )}
                        {/* Level badge for Career Path (resourceTypeId === 2) */}
                        {item.resourceTypeId === 2 && item.careerPathLevelId > 0 && (
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            item.careerPathLevelId === 1
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : item.careerPathLevelId === 2
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-purple-100 text-purple-700 border border-purple-200'
                          }`}>
                            {item.careerPathLevelId === 1
                              ? 'Beginner'
                              : item.careerPathLevelId === 2
                                ? 'Intermediate'
                                : 'Advanced'}
                          </span>
                        )}
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center gap-3 flex-wrap">
                     
                     
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                          <Calendar className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Added: {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                       
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Cart is Empty</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    This student has no items in their cart.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials Modal */}
      {showTestimonialsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">
                  Testimonials ({studentTestimonials?.length || 0})
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowTestimonialsModal(false);
                  setStudentTestimonials(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-64px)] bg-gray-50 dark:bg-gray-900">
              {loadingTestimonials || loadingStudentTestimonials ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading testimonials...</p>
                </div>
              ) : studentTestimonials && studentTestimonials.length > 0 ? (
                <div className="space-y-4">
                  {/* Testimonial Cards */}
                  {studentTestimonials.map((testimonial, index) => (
                    <div key={testimonial.id || index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      {/* Card Header */}
                      <div className="bg-gray-50 dark:bg-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {testimonial.customerName || 'Unknown Customer'}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              ID: {testimonial.customerId} • {testimonial.createdAt ? formatDateTime(testimonial.createdAt) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        {testimonial.testimonialStatusId === 3 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approved
                          </span>
                        ) : testimonial.testimonialStatusId === 2 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <X className="w-3.5 h-3.5" />
                            Denied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Clock className="w-3.5 h-3.5" />
                            Pending
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Left Column - Content & Video */}
                          <div className="space-y-3">
                            {/* Testimonial Text */}
                            {testimonial.testimonial && (
                              <div>
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Message</p>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {testimonial.testimonial}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Video Player */}
                            {testimonial.testimonialVideoUrl && (
                              <div>
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Video</p>
                                <div className="bg-black rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                                  <video
                                    controls
                                    controlsList="nodownload"
                                    className="w-full aspect-video object-contain"
                                    preload="metadata"
                                  >
                                    <source src={testimonial.testimonialVideoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                  </video>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Column - Status Management */}
                          <div className="space-y-3">
                            <div className="bg-purple-50 dark:bg-gray-700/50 rounded-lg p-4 border border-purple-200 dark:border-gray-600">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Review Status</p>
                              
                              {/* Status Dropdown */}
                              <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                  Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={selectedTestimonialStatus[testimonial.id] || ''}
                                  onChange={(e) => {
                                    const newStatusId = parseInt(e.target.value);
                                   
                                    setSelectedTestimonialStatus(prev => ({
                                      ...prev,
                                      [testimonial.id]: newStatusId
                                    }));
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                >
                                  <option value="">Select Status</option>
                                  {testimonialStatuses.map(status => (
                                    <option key={status.id} value={status.id}>
                                      {status.statusName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Comment Textbox */}
                              <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                  Comment (Optional)
                                </label>
                                <textarea
                                  value={testimonialComments[testimonial.id] || ''}
                                  onChange={(e) => setTestimonialComments(prev => ({
                                    ...prev,
                                    [testimonial.id]: e.target.value
                                  }))}
                                  placeholder="Add notes..."
                                  rows={3}
                                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all"
                                />
                              </div>

                              {/* Submit Button */}
                              <button
                                onClick={() => handleSubmitTestimonial(testimonial.id, testimonial.customerId)}
                                disabled={testimonialActionLoading[testimonial.id] || !selectedTestimonialStatus[testimonial.id]}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {testimonialActionLoading[testimonial.id] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    <span>Submitting...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Submit Review</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                    <MessageSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Testimonials Found</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    This student has not submitted any testimonials yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
