import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';

export const useBookManagement = () => {
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookStatuses, setBookStatuses] = useState([]);
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

      const response = await ApiService.get(`${ENDPOINTS.BOOK_ALL}?${queryParams}`);

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

  const getBookById = useCallback(async (id) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.BOOK_BY_ID(id));

      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        setSelectedBook(responseData);
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch book';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const getBookStatuses = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.BOOK_STATUS);
      
      if (response && (Array.isArray(response) || Array.isArray(response.data))) {
        const responseData = response.data || response;
        setBookStatuses(responseData);
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      console.error('getBookStatuses error:', err);
      throw err;
    }
  }, []);

  const updateBookStatus = useCallback(async (bookId, bookStatusId) => {
    try {
      const response = await ApiService.put(ENDPOINTS.BOOK_UPDATE_STATUS(bookId), {
        bookStatusId
      });

      // Refresh the book list after status update
      await getAllBooks(pagination.page, pagination.pageSize);
      
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update book status';
      setError(errorMessage);
      throw err;
    }
  }, [getAllBooks, pagination.page, pagination.pageSize]);

  const resetState = useCallback(() => {
    setBooks([]);
    setSelectedBook(null);
    setPagination({
      page: 1,
      pageSize: 20,
      totalCount: 0,
    });
    setError(null);
  }, []);

  return {
    loading,
    loadingDetail,
    error,
    books,
    selectedBook,
    bookStatuses,
    pagination,
    getAllBooks,
    getBookById,
    getBookStatuses,
    updateBookStatus,
    clearError,
    setSelectedBook,
    resetState
  };
};

export default useBookManagement;
