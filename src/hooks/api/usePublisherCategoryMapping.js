import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';

export const usePublisherCategoryMapping = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    totalCount: 0,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getAllCategories = useCallback(async (page = 1, pageSize = 100, title = '') => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.getAllBookCategories(page, pageSize, title);
      
      if (response) {
        // ApiService.request returns the data directly, not wrapped in response.data
        const items = response.items || [];
        setCategories(items);
        setPagination({
          page: response.page || page,
          pageSize: response.pageSize || pageSize,
          totalCount: response.totalCount || 0,
        });
        return response;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch categories';
      setError(errorMessage);
      console.error('getAllCategories error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllPublishers = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '1000',
      });

      const response = await ApiService.get(`/Publisher?${queryParams}`);
      
      if (response && response.items) {
        // ApiService.get returns the data directly with items array
        const publishersList = response.items || [];
        setPublishers(publishersList);
        return publishersList;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch publishers';
      setError(errorMessage);
      console.error('getAllPublishers error:', err);
      throw err;
    }
  }, []);

  const getPublisherCategoryMapping = useCallback(async (categoryId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.get(`/PublisherCategoryMapping/${categoryId}`);
      
      if (response) {
        // ApiService.get returns the data directly
        const publisherIds = Array.isArray(response) ? response : (response.publisherIds || []);
        return publisherIds;
      }
      return [];
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch publisher mappings';
      setError(errorMessage);
      console.error('getPublisherCategoryMapping error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const assignPublisherCategoryMapping = useCallback(async (categoryId, publisherIds) => {
    setLoading(true);
    setError(null);

    try {
      const mappingData = {
        categoryId: parseInt(categoryId),
        publisherIds: publisherIds.map(id => parseInt(id))
      };

      const response = await ApiService.post('/PublisherCategoryMapping/assign', mappingData);
      
      // ApiService.post returns the data directly
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to assign publishers to category';
      setError(errorMessage);
      console.error('assignPublisherCategoryMapping error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setCategories([]);
    setPublishers([]);
    setPagination({
      page: 1,
      pageSize: 100,
      totalCount: 0,
    });
    setError(null);
  }, []);

  return {
    loading,
    error,
    categories,
    publishers,
    pagination,
    getAllCategories,
    getAllPublishers,
    getPublisherCategoryMapping,
    assignPublisherCategoryMapping,
    clearError,
    resetState,
  };
};

export default usePublisherCategoryMapping;
