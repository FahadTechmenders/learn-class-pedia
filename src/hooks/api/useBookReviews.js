import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';

export const useBookReviews = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getReviewsByBook = useCallback(async (bookId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.BOOK_REVIEW_BY_BOOK(bookId));

      if (response && (Array.isArray(response) || Array.isArray(response.data))) {
        const responseData = response.data || response;
        setReviews(responseData);
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch book reviews';
      setError(errorMessage);
      console.error('getReviewsByBook error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReviewById = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.BOOK_REVIEW_BY_ID(id));

      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        setSelectedReview(responseData);
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch review';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReviewDetails = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.BOOK_REVIEW_DETAILS(id));

      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch review details';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createReview = useCallback(async (reviewData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.post(ENDPOINTS.BOOK_REVIEW_CREATE, reviewData);

      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create review';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReview = useCallback(async (id, reviewData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.put(ENDPOINTS.BOOK_REVIEW_UPDATE(id), reviewData);

      if (response && (response.success || response.data?.success || response.message)) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update review';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteReview = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.delete(ENDPOINTS.BOOK_REVIEW_DELETE(id));

      if (response && (response.success || response.data?.success || response.message)) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete review';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setReviews([]);
    setSelectedReview(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    reviews,
    selectedReview,
    getReviewsByBook,
    getReviewById,
    getReviewDetails,
    createReview,
    updateReview,
    deleteReview,
    clearError,
    setSelectedReview,
    resetState
  };
};

export default useBookReviews;
