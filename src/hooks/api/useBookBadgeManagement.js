import { useState, useEffect, useCallback } from 'react';
import ApiService from '../../services/ApiService';

export const useBookBadgeManagement = () => {
  const [bookBadges, setBookBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0
  });
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBookBadge, setSelectedBookBadge] = useState(null);
  
  const [formData, setFormData] = useState({
    id: 0,
    badgeKey: '',
    badgeName: '',
    badgeColor: '#0062F7',
    badgeIcon: '',
    description: '',
    slug: '',
    isUsedInFilter: false,
    sortOrder: 0,
    isActive: true,
    createdBy: null,
    updatedBy: null,
  });

  const fetchBookBadges = useCallback(async (page = 1, pageSize = 100, badgeName = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getAllBookBadges(page, pageSize, badgeName);
      
      if (response && response.items) {
        setBookBadges(response.items);
        setPagination(prev => ({
          ...prev,
          page: response.page || page,
          totalCount: response.totalCount || response.items.length,
          pageSize: response.pageSize || pageSize,
          totalPages: Math.ceil((response.totalCount || response.items.length) / (response.pageSize || pageSize))
        }));
      } else if (Array.isArray(response)) {
        setBookBadges(response);
        setPagination(prev => ({
          ...prev,
          page: page,
          totalCount: response.length,
          pageSize: pageSize,
          totalPages: Math.ceil(response.length / pageSize)
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch book badges');
      setBookBadges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBookBadge = useCallback(async (badgeData) => {
    try {
      const response = await ApiService.createBookBadge(badgeData);
      await fetchBookBadges(pagination.page, pagination.pageSize);
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchBookBadges, pagination.page, pagination.pageSize]);

  const updateBookBadge = useCallback(async (badgeId, badgeData) => {
    try {
      const response = await ApiService.updateBookBadge(badgeId, badgeData);
      await fetchBookBadges(pagination.page, pagination.pageSize);
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchBookBadges, pagination.page, pagination.pageSize]);

  const deleteBookBadge = useCallback(async (badgeId) => {
    try {
      const response = await ApiService.deleteBookBadge(badgeId);
      await fetchBookBadges(pagination.page, pagination.pageSize);
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchBookBadges, pagination.page, pagination.pageSize]);

  const getBookBadgeById = useCallback(async (badgeId) => {
    try {
      const response = await ApiService.getBookBadgeById(badgeId);
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      id: 0,
      badgeKey: '',
      badgeName: '',
      badgeColor: '#0062F7',
      badgeIcon: '',
      description: '',
      slug: '',
      isUsedInFilter: false,
      sortOrder: 0,
      isActive: true,
      createdBy: null,
      updatedBy: null,
    });
    setSelectedBookBadge(null);
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setShowCreateModal(true);
  }, [resetForm]);

  const openEditModal = useCallback(async (badge) => {
    try {
      const badgeDetails = await getBookBadgeById(badge.id);
      setSelectedBookBadge(badgeDetails);
      setFormData({
        id: badgeDetails.id || 0,
        badgeKey: badgeDetails.badgeKey || '',
        badgeName: badgeDetails.badgeName || '',
        badgeColor: badgeDetails.badgeColor || '#0062F7',
        badgeIcon: badgeDetails.badgeIcon || '',
        description: badgeDetails.description || '',
        slug: badgeDetails.slug || '',
        isUsedInFilter: badgeDetails.isUsedInFilter || false,
        sortOrder: badgeDetails.sortOrder || 0,
        isActive: badgeDetails.isActive !== undefined ? badgeDetails.isActive : true,
        createdBy: badgeDetails.createdBy || null,
        updatedBy: badgeDetails.updatedBy || null,
      });
      setShowEditModal(true);
    } catch (err) {
      console.error('Failed to fetch book badge details:', err);
    }
  }, [getBookBadgeById]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    resetForm();
  }, [resetForm]);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    resetForm();
  }, [resetForm]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBookBadges(newPage, pagination.pageSize);
    }
  }, [fetchBookBadges, pagination.pageSize, pagination.totalPages]);

  const handlePageSizeChange = useCallback((newPageSize) => {
    fetchBookBadges(1, newPageSize);
  }, [fetchBookBadges]);

  useEffect(() => {
    fetchBookBadges();
  }, [fetchBookBadges]);

  return {
    bookBadges,
    loading,
    error,
    pagination,
    formData,
    selectedBookBadge,
    showCreateModal,
    showEditModal,
    fetchBookBadges,
    createBookBadge,
    updateBookBadge,
    deleteBookBadge,
    getBookBadgeById,
    resetForm,
    handleInputChange,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    closeEditModal,
    handlePageChange,
    handlePageSizeChange,
  };
};
