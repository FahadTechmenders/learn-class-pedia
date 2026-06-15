import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';

export const useBookBadgeMapping = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [books, setBooks] = useState([]);
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

  const getAllBooks = useCallback(async (pageNumber = 1, pageSize = 20, filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: pageNumber.toString(),
        pageSize: pageSize.toString(),
        ...(filters.publisherName && { publisherName: filters.publisherName }),
        ...(filters.bookStatusId && { bookStatusId: filters.bookStatusId }),
      });

      const response = await ApiService.get(`/Book?${queryParams}`);

      if (response && (response.items || response.data?.items)) {
        const responseData = response.data || response;
        setBooks(responseData.items || []);
        setPagination({
          page: responseData.page || pageNumber,
          pageSize: responseData.pageSize || pageSize,
          totalCount: responseData.totalCount || 0,
        });
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch books';
      setError(errorMessage);
      console.error('getAllBooks error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllBadges = useCallback(async () => {
    try {
      const response = await ApiService.get('/BookBadges');
      
      if (response && (response.items || response.data?.items || Array.isArray(response))) {
        const responseData = response.data || response;
        const badgesList = responseData.items || responseData || [];
        setBadges(badgesList);
        return badgesList;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch badges';
      setError(errorMessage);
      console.error('getAllBadges error:', err);
      throw err;
    }
  }, []);

  const getBookBadgeMapping = useCallback(async (badgeId) => {
    setLoading(true);
    setError(null);

    try {
      // Call API with badgeId to get all books that have this badge
      const response = await ApiService.getBookBadgeMapping(badgeId);
      
      if (response) {
        const responseData = response.data || response;
        // Response should be array of book IDs: [1, 5, 12, 45]
        const bookIds = Array.isArray(responseData) ? responseData : (responseData.bookIds || responseData || []);
        return bookIds;
      }
      return [];
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch books by badge';
      setError(errorMessage);
      console.error('getBookBadgeMapping error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getBookBadgeMappingByBook = useCallback(async (bookId) => {
    try {
      const response = await ApiService.getBookBadgeMappingByBook(bookId);
      
      if (response) {
        const responseData = response.data || response;
        const badgeIds = responseData.badgeIds || responseData || [];
        return Array.isArray(badgeIds) ? badgeIds : [];
      }
      return [];
    } catch (err) {
      console.error('getBookBadgeMappingByBook error:', err);
      return [];
    }
  }, []);

  const assignBookBadgeMapping = useCallback(async (bookId, badgeIds) => {
    setLoading(true);
    setError(null);

    try {
      const mappingData = {
        bookId: parseInt(bookId),
        badgeIds: badgeIds.map(id => parseInt(id))
      };

      const response = await ApiService.assignBookBadgeMapping(mappingData);
      
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to assign badges to book';
      setError(errorMessage);
      console.error('assignBookBadgeMapping error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setBooks([]);
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
    books,
    badges,
    mappedBadges,
    pagination,
    getAllBooks,
    getAllBadges,
    getBookBadgeMapping,
    getBookBadgeMappingByBook,
    assignBookBadgeMapping,
    clearError,
    resetState,
    setMappedBadges
  };
};

export default useBookBadgeMapping;
