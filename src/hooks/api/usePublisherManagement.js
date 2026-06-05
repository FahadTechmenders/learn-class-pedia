import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';

export const usePublisherManagement = () => {
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [publishers, setPublishers] = useState([]);
  const [selectedPublisher, setSelectedPublisher] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalBasicCount: 0,
    totalIntermediateCount: 0,
    totalAdvanceCount: 0
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get all publishers with pagination and filters
  const getAllPublishers = useCallback(async (pageNumber = 1, pageSize = 20, filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: pageNumber.toString(),
        pageSize: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.name && { name: filters.name }),
        ...(filters.email && { email: filters.email }),
        ...(filters.phone && { phone: filters.phone }),
        ...(filters.isEmailVerified !== undefined && filters.isEmailVerified !== '' && { isEmailVerified: filters.isEmailVerified.toString() }),
        ...(filters.categoryId && { categoryId: filters.categoryId })
      });

      const response = await ApiService.get(`${ENDPOINTS.PUBLISHER_ALL}?${queryParams}`);

      if (response && (response.items || response.data?.items)) {
        const responseData = response.data || response;
        setPublishers(responseData.items || []);
        setPagination({
          page: responseData.page || pageNumber,
          pageSize: responseData.pageSize || pageSize,
          totalCount: responseData.totalCount || 0,
          totalBasicCount: responseData.totalBasicCount || 0,
          totalIntermediateCount: responseData.totalIntermediateCount || 0,
          totalAdvanceCount: responseData.totalAdvanceCount || 0
        });
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch publishers';
      setError(errorMessage);
      console.error('getAllPublishers error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get publisher by ID
  const getPublisherById = useCallback(async (id) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.PUBLISHER_BY_ID(id));

      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        setSelectedPublisher(responseData);
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch publisher';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Filter publishers
  const filterPublishers = useCallback(async (filters, pageNumber = 1, pageSize = 20) => {
    return getAllPublishers(pageNumber, pageSize, filters);
  }, [getAllPublishers]);

  // Reset state
  const resetState = useCallback(() => {
    setPublishers([]);
    setSelectedPublisher(null);
    setPagination({
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalBasicCount: 0,
      totalIntermediateCount: 0,
      totalAdvanceCount: 0
    });
    setError(null);
  }, []);

  return {
    // State
    loading,
    loadingDetail,
    error,
    publishers,
    selectedPublisher,
    pagination,

    // Actions
    getAllPublishers,
    getPublisherById,
    filterPublishers,
    clearError,
    setSelectedPublisher,
    resetState
  };
};

export default usePublisherManagement;
