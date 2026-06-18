import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';

export const useBookCategoryManagement = () => {
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get all book categories with pagination
  const getAllCategories = useCallback(async (pageNumber = 1, pageSize = 20, title = '') => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: pageNumber.toString(),
        pageSize: pageSize.toString(),
      });

      if (title && title.trim() !== '') {
        queryParams.append('title', title.trim());
      }

      const response = await ApiService.get(`${ENDPOINTS.BOOK_CATEGORY_ALL}?${queryParams}`);

      if (response) {
        const responseData = response.data || response;
        // Handle both array response and paginated response
        if (Array.isArray(responseData)) {
          setCategories(responseData);
          setPagination({
            page: pageNumber,
            pageSize: pageSize,
            totalCount: responseData.length,
          });
        } else {
          setCategories(responseData.items || []);
          setPagination({
            page: responseData.page || pageNumber,
            pageSize: responseData.pageSize || pageSize,
            totalCount: responseData.totalCount || 0,
          });
        }
        return responseData;
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

  // Get category by ID
  const getCategoryById = useCallback(async (id) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await ApiService.get(ENDPOINTS.BOOK_CATEGORY_BY_ID(id));

      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        setSelectedCategory(responseData);
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Create new category
  const createCategory = useCallback(async (categoryData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.post(ENDPOINTS.BOOK_CATEGORY_CREATE, categoryData);

      if (response) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update category
  const updateCategory = useCallback(async (id, categoryData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.put(ENDPOINTS.BOOK_CATEGORY_UPDATE(id), categoryData);

      if (response) {
        const responseData = response.data || response;
        return responseData;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete category
  const deleteCategory = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      await ApiService.delete(ENDPOINTS.BOOK_CATEGORY_DELETE(id));
      return true;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset state
  const resetState = useCallback(() => {
    setCategories([]);
    setSelectedCategory(null);
    setPagination({
      page: 1,
      pageSize: 20,
      totalCount: 0,
    });
    setError(null);
  }, []);

  return {
    // State
    loading,
    loadingDetail,
    error,
    categories,
    selectedCategory,
    pagination,

    // Actions
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    clearError,
    setSelectedCategory,
    resetState
  };
};

export default useBookCategoryManagement;
