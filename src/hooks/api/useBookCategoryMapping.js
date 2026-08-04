import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';

export const useBookCategoryMapping = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [books, setBooks] = useState([]);
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

  const getAllBooks = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        pageSize: '1000',
      });

      const response = await ApiService.get(`/Book?${queryParams}`);
      
      if (response) {
        // ApiService.get returns the data directly
        const booksList = response.items || [];
        setBooks(booksList);
        return booksList;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch books';
      setError(errorMessage);
      console.error('getAllBooks error:', err);
      throw err;
    }
  }, []);

  const getBookCategoryMapping = useCallback(async (categoryId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.get(`/BookCategoryMapping/${categoryId}`);
      
      if (response) {
        // ApiService.get returns the data directly
        const bookIds = Array.isArray(response) ? response : (response.bookIds || []);
        return bookIds;
      }
      return [];
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch book mappings';
      setError(errorMessage);
      console.error('getBookCategoryMapping error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const assignBookCategoryMapping = useCallback(async (categoryId, bookIds) => {
    setLoading(true);
    setError(null);

    try {
      const mappingData = {
        categoryId: parseInt(categoryId),
        bookIds: bookIds.map(id => parseInt(id))
      };

      const response = await ApiService.post('/BookCategoryMapping/assign', mappingData);
      
      // ApiService.post returns the data directly
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to assign books to category';
      setError(errorMessage);
      console.error('assignBookCategoryMapping error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setCategories([]);
    setBooks([]);
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
    books,
    pagination,
    getAllCategories,
    getAllBooks,
    getBookCategoryMapping,
    assignBookCategoryMapping,
    clearError,
    resetState,
  };
};

export default useBookCategoryMapping;
