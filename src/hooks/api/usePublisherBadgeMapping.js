import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';

export const usePublisherBadgeMapping = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [publishers, setPublishers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [mappedBadges, setMappedBadges] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getAllPublishers = useCallback(async (pageNumber = 1, pageSize = 20, filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: pageNumber.toString(),
        pageSize: pageSize.toString(),
        ...(filters.publisherName && { publisherName: filters.publisherName }),
      });

      const response = await ApiService.get(`/Publisher?${queryParams}`);

      if (response && (response.items || response.data?.items)) {
        const responseData = response.data || response;
        setPublishers(responseData.items || []);
        setPagination({
          page: responseData.page || pageNumber,
          pageSize: responseData.pageSize || pageSize,
          totalCount: responseData.totalCount || 0,
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

  const getAllBadges = useCallback(async (page = 1, pageSize = 100, badgeName = '') => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.getAllPublisherBadges(page, pageSize, badgeName);
      
      if (response && (response.items || response.data?.items || Array.isArray(response))) {
        const responseData = response.data || response;
        const badgesList = responseData.items || responseData || [];
        setBadges(badgesList);
        
        // Update pagination state if pagination info is available
        if (responseData.page !== undefined) {
          setPagination({
            page: responseData.page || page,
            pageSize: responseData.pageSize || pageSize,
            totalCount: responseData.totalCount || badgesList.length,
          });
        }
        
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch badges';
      setError(errorMessage);
      console.error('getAllBadges error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPublisherBadgeMapping = useCallback(async (badgeId) => {
    setLoading(true);
    setError(null);

    try {
      // Call API with badgeId to get all publishers that have this badge
      const response = await ApiService.getPublisherBadgeMapping(badgeId);
      
      if (response) {
        const responseData = response.data || response;
        // Response should be array of publisher IDs: [123, 456, 789]
        const publisherIds = Array.isArray(responseData) ? responseData : (responseData.publisherIds || responseData || []);
        return publisherIds;
      }
      return [];
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch publishers by badge';
      setError(errorMessage);
      console.error('getPublisherBadgeMapping error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const assignPublisherBadgeMapping = useCallback(async (publisherIds, badgeId) => {
    setLoading(true);
    setError(null);

    try {
      const mappingData = {
        PublisherIds: Array.isArray(publisherIds) 
          ? publisherIds.map(id => parseInt(id))
          : [parseInt(publisherIds)],
        BadgeId: badgeId ? parseInt(badgeId) : null
      };

      const response = await ApiService.assignPublisherBadgeMapping(mappingData);
      
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to assign badge to publishers';
      setError(errorMessage);
      console.error('assignPublisherBadgeMapping error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setPublishers([]);
    setBadges([]);
    setMappedBadges([]);
    setPagination({
      page: 1,
      pageSize: 20,
      totalCount: 0,
    });
    setError(null);
  }, []);

  return {
    loading,
    error,
    publishers,
    badges,
    mappedBadges,
    pagination,
    getAllPublishers,
    getAllBadges,
    getPublisherBadgeMapping,
    assignPublisherBadgeMapping,
    clearError,
    resetState,
    setMappedBadges
  };
};

export default usePublisherBadgeMapping;
