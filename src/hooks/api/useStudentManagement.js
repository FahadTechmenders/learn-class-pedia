import { useState, useCallback, useEffect } from 'react';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';
import appSettings from '../../config/appSettings';

export const DEFAULT_STUDENT_PAGE_SIZE = appSettings?.pagination?.defaultPageSize || 100;

const firstNumber = (...values) => {
  for (const v of values) {
    const n = Number(v);
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(n)) return n;
  }
  return undefined;
};

const normalizePagination = (data, requestedPage, requestedPageSize, itemCount) => {
  const p = data?.pagination || {};
  const pageSize = firstNumber(data.pageSize, p.pageSize, requestedPageSize) || DEFAULT_STUDENT_PAGE_SIZE;
  const currentPage = firstNumber(data.currentPage, data.pageNumber, data.page, p.currentPage, p.pageNumber, p.page, requestedPage) || 1;
  const totalCount = firstNumber(data.totalCount, data.totalRecords, data.totalItems, data.total, p.totalCount, p.totalRecords, p.totalItems, p.total);
  const resolvedTotal = totalCount !== undefined ? totalCount : (currentPage - 1) * pageSize + itemCount;
  const totalPages = firstNumber(data.totalPages, p.totalPages) ?? (pageSize > 0 ? Math.max(1, Math.ceil(resolvedTotal / pageSize)) : 1);
  const hasNextPage = typeof data.hasNextPage === 'boolean' ? data.hasNextPage
    : typeof p.hasNextPage === 'boolean' ? p.hasNextPage
      : currentPage < totalPages;
  const hasPreviousPage = typeof data.hasPreviousPage === 'boolean' ? data.hasPreviousPage
    : typeof p.hasPreviousPage === 'boolean' ? p.hasPreviousPage
      : currentPage > 1;
  return { currentPage, pageSize, totalCount: resolvedTotal, totalPages, hasNextPage, hasPreviousPage };
};

export const useStudentManagement = () => {
  // Global state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Separate loading states for modal operations
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [loadingStudentOrders, setLoadingStudentOrders] = useState(false);
  const [loadingStudentCart, setLoadingStudentCart] = useState(false);
  const [loadingStudentTestimonials, setLoadingStudentTestimonials] = useState(false);
  
  // Students data state
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [summary, setSummary] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: DEFAULT_STUDENT_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get all students with pagination and filters
  const getAllStudents = useCallback(async (pageNumber = 1, pageSize = DEFAULT_STUDENT_PAGE_SIZE, filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        PageNumber: pageNumber.toString(),
        PageSize: pageSize.toString(),
        ...(filters.fullName && { FullName: filters.fullName }),
        ...(filters.email && { Email: filters.email }),
        ...(filters.phoneNumber && { PhoneNumber: filters.phoneNumber }),
        ...(filters.isEmailVerified !== undefined && filters.isEmailVerified !== '' && { IsEmailVerified: filters.isEmailVerified }),
        ...(filters.signupTypeId && { SignupTypeId: filters.signupTypeId }),
        ...(filters.genderId && { GenderId: filters.genderId }),
        ...(filters.qualificationId && { QualificationId: filters.qualificationId }),
        ...(filters.signupDateFrom && { SignupDateFrom: filters.signupDateFrom }),
        ...(filters.signupDateTo && { SignupDateTo: filters.signupDateTo }),
        ...(filters.courseId && { CourseId: filters.courseId }),
        ...(filters.isDownloaded && { IsDownloaded: filters.isDownloaded.toString() }),
        ...(filters.isShared && { IsShared: filters.isShared.toString() }),
        ...(filters.isCart && { IsCart: filters.isCart.toString() }),
        ...(filters.completionPercentage !== '' && filters.completionPercentage !== undefined && { CompletionPercentage: filters.completionPercentage }),
        ...(filters.isEnrolled && { IsEnrolled: filters.isEnrolled.toString() }),
        ...(filters.isTestimonial && { IsTestimonial: filters.isTestimonial.toString() }),
        ...(filters.testimonialStatusId && { TestimonialStatusId: filters.testimonialStatusId })
      });

      if (filters.geoLocationCountry) {
        if (Array.isArray(filters.geoLocationCountry) && filters.geoLocationCountry.length > 0) {
          filters.geoLocationCountry.forEach(country => {
            queryParams.append('GeoLocationCountry', country);
          });
        } else if (typeof filters.geoLocationCountry === 'string' && filters.geoLocationCountry.trim() !== '') {
          queryParams.append('GeoLocationCountry', filters.geoLocationCountry);
        }
      }

      const response = await ApiService.get(`${ENDPOINTS.STUDENT_MANAGEMENT_ALL}?${queryParams}`);
      
      // Handle the response format - data is directly in response, not nested under response.data
      if (response && (response.students || response.data?.students)) {
        const responseData = response.data || response;
        const list = responseData.students || [];
        setStudents(list);
        setSummary(responseData.summary || null);
        setPagination(normalizePagination(responseData, pageNumber, pageSize, list.length));
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch students';
      setError(errorMessage);
      console.error('getAllStudents error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get student by ID
  const getStudentById = useCallback(async (studentId) => {
    setLoadingStudentDetails(true);
    setError(null);
    
    try {
      const response = await ApiService.get(ENDPOINTS.STUDENT_MANAGEMENT_BY_ID(studentId));
      
      // Handle the response format - data is directly in response, not nested under response.data
      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        setSelectedStudent(responseData);
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch student details';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingStudentDetails(false);
    }
  }, []);

  // Search students (wrapper for getAllStudents with search filters)
  const searchStudents = useCallback(async (searchTerm, pageNumber = 1, pageSize = DEFAULT_STUDENT_PAGE_SIZE) => {
    const filters = {};
    
    // Try to determine search type based on input pattern
    if (searchTerm) {
      if (searchTerm.includes('@')) {
        filters.email = searchTerm;
      } else if (/^\d+$/.test(searchTerm.replace(/[-\s]/g, ''))) {
        filters.phoneNumber = searchTerm;
      } else {
        filters.fullName = searchTerm;
      }
    }

    return getAllStudents(pageNumber, pageSize, filters);
  }, [getAllStudents]);

  // Filter students
  const filterStudents = useCallback(async (filters, pageNumber = 1, pageSize = DEFAULT_STUDENT_PAGE_SIZE) => {
    return getAllStudents(pageNumber, pageSize, filters);
  }, [getAllStudents]);

  // Reset state
  const resetState = useCallback(() => {
    setStudents([]);
    setSelectedStudent(null);
    setSummary(null);
    setPagination({
      currentPage: 1,
      pageSize: DEFAULT_STUDENT_PAGE_SIZE,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    });
    setError(null);
  }, []);

  // Get dropdown data
  const getGendersDropdown = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.STUDENT_MANAGEMENT_DROPDOWN_GENDERS);
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch genders';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getSignupTypesDropdown = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.STUDENT_MANAGEMENT_DROPDOWN_SIGNUP_TYPES);
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch signup types';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getQualificationsDropdown = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.STUDENT_MANAGEMENT_DROPDOWN_QUALIFICATIONS);
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch qualifications';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getCountriesDropdown = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.STUDENT_MANAGEMENT_DROPDOWN_COUNTRIES);
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch countries';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get student orders
  const getStudentOrders = useCallback(async (customerId) => {
    setLoadingStudentOrders(true);
    setError(null);

    try {
      const response = await ApiService.getStudentOrders(customerId);

      // Handle response format - data is directly in response
      if (response && (response.customerId || response.data?.customerId)) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch student orders';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingStudentOrders(false);
    }
  }, []);

  // Get student cart items
  const getStudentCart = useCallback(async (customerId) => {
    setLoadingStudentCart(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.STUDENT_MANAGEMENT_CART(customerId));

      // Handle response format - returns array of cart items
      if (response && Array.isArray(response.data || response)) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch student cart';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingStudentCart(false);
    }
  }, []);

  // Get student testimonials
  const getStudentTestimonials = useCallback(async (customerId) => {
    setLoadingStudentTestimonials(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.STUDENT_MANAGEMENT_TESTIMONIALS(customerId));

      if (response && Array.isArray(response.data || response)) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch student testimonials';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingStudentTestimonials(false);
    }
  }, []);

  const getTestimonialStatusesDropdown = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.STUDENT_MANAGEMENT_TESTIMONIAL_STATUSES);
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch testimonial statuses';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const approveTestimonial = useCallback(async (customerTestimonialId, testimonialStatusId, comment) => {
    setError(null);

    try {
      const payload = {
        customerTestimonialId: customerTestimonialId,
        testimonialStatusId: testimonialStatusId,
        comment: comment
      };


      const response = await ApiService.post(ENDPOINTS.STUDENT_MANAGEMENT_TESTIMONIALS_APPROVE, payload);
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update testimonial status';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Generate dashboard URL for classroom access
  const generateDashboardUrl = useCallback(async (customerId, resourceId, resourceTypeId) => {
    setError(null);

    try {
      const payload = {
        customerId: customerId,
        resourceId: resourceId,
        resourceTypeId: resourceTypeId
      };

      const response = await ApiService.post(ENDPOINTS.STUDENT_MANAGEMENT_GENERATE_DASHBOARD_URL, payload);

      // Handle response format - data is directly in response
      if (response && (response.dashboardUrl || response.data?.dashboardUrl)) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate dashboard URL';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    // State
    loading,
    error,
    students,
    selectedStudent,
    summary,
    pagination,
    loadingStudentDetails,
    loadingStudentOrders,
    loadingStudentCart,
    loadingStudentTestimonials,

    // Actions
    getAllStudents,
    getStudentById,
    searchStudents,
    filterStudents,
    clearError,
    setSelectedStudent,

    // Dropdown data
    getGendersDropdown,
    getSignupTypesDropdown,
    getQualificationsDropdown,
    getCountriesDropdown,

    // Orders
    getStudentOrders,

    // Cart
    getStudentCart,

    // Testimonials
    getStudentTestimonials,
    approveTestimonial,
    getTestimonialStatusesDropdown,

    // Dashboard URL
    generateDashboardUrl,
  };
};

export default useStudentManagement;
