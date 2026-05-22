import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';

export const useTestimonialManagement = () => {
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get all testimonials with pagination
  const getAllTestimonials = useCallback(async (pageNumber = 1, pageSize = 10) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        PageNumber: pageNumber.toString(),
        PageSize: pageSize.toString()
      });

      const response = await ApiService.get(`${ENDPOINTS.TESTIMONIAL_ALL}?${queryParams}`);

      if (response && (response.testimonials || response.data?.testimonials)) {
        const responseData = response.data || response;
        setTestimonials(responseData.testimonials || []);
        setPagination({
          currentPage: responseData.currentPage || 1,
          pageSize: responseData.pageSize || pageSize,
          totalCount: responseData.totalCount || 0,
          totalPages: responseData.totalPages || 0,
          hasNextPage: responseData.hasNextPage || false,
          hasPreviousPage: responseData.hasPreviousPage || false
        });
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch testimonials';
      setError(errorMessage);
      console.error('getAllTestimonials error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get testimonial by ID
  const getTestimonialById = useCallback(async (id) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.TESTIMONIAL_BY_ID(id));

      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        setSelectedTestimonial(responseData);
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch testimonial';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Filter testimonials
  const filterTestimonials = useCallback(async (filters, pageNumber = 1, pageSize = 10) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        PageNumber: pageNumber.toString(),
        PageSize: pageSize.toString(),
        ...(filters.studentName && { StudentName: filters.studentName }),
        ...(filters.studentEmail && { StudentEmail: filters.studentEmail }),
        ...(filters.testimonialStatusId && { TestimonialStatusId: filters.testimonialStatusId }),
        ...(filters.dateFrom && { DateFrom: filters.dateFrom }),
        ...(filters.dateTo && { DateTo: filters.dateTo })
      });

      const response = await ApiService.get(`${ENDPOINTS.TESTIMONIAL_ALL}?${queryParams}`);

      if (response && (response.testimonials || response.data?.testimonials)) {
        const responseData = response.data || response;
        setTestimonials(responseData.testimonials || []);
        setPagination({
          currentPage: responseData.currentPage || 1,
          pageSize: responseData.pageSize || pageSize,
          totalCount: responseData.totalCount || 0,
          totalPages: responseData.totalPages || 0,
          hasNextPage: responseData.hasNextPage || false,
          hasPreviousPage: responseData.hasPreviousPage || false
        });
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to filter testimonials';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset state
  const resetState = useCallback(() => {
    setTestimonials([]);
    setSelectedTestimonial(null);
    setPagination({
      currentPage: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    });
    setError(null);
  }, []);

  return {
    // State
    loading,
    loadingDetail,
    error,
    testimonials,
    selectedTestimonial,
    pagination,

    // Actions
    getAllTestimonials,
    getTestimonialById,
    filterTestimonials,
    clearError,
    setSelectedTestimonial,
    resetState
  };
};

export default useTestimonialManagement;
