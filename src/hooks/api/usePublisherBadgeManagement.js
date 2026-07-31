import { useState, useEffect, useCallback } from 'react';
import ApiService from '../../services/ApiService';

export const usePublisherBadgeManagement = () => {
  const [publisherBadges, setPublisherBadges] = useState([]);
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
  const [selectedPublisherBadge, setSelectedPublisherBadge] = useState(null);
  
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

  const fetchPublisherBadges = useCallback(async (page = 1, pageSize = 100, badgeName = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getAllPublisherBadgesManagement(page, pageSize, badgeName);
      
      if (response && response.items) {
        setPublisherBadges(response.items);
        setPagination(prev => ({
          ...prev,
          page: response.page || page,
          totalCount: response.totalCount || response.items.length,
          pageSize: response.pageSize || pageSize,
          totalPages: Math.ceil((response.totalCount || response.items.length) / (response.pageSize || pageSize))
        }));
      } else if (Array.isArray(response)) {
        setPublisherBadges(response);
        setPagination(prev => ({
          ...prev,
          page: page,
          totalCount: response.length,
          pageSize: pageSize,
          totalPages: Math.ceil(response.length / pageSize)
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch publisher badges');
      setPublisherBadges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPublisherBadge = useCallback(async (badgeData) => {
    try {
      const response = await ApiService.createPublisherBadge(badgeData);
      await fetchPublisherBadges(pagination.page, pagination.pageSize);
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchPublisherBadges, pagination.page, pagination.pageSize]);

  const updatePublisherBadge = useCallback(async (badgeId, badgeData) => {
    try {
      const response = await ApiService.updatePublisherBadge(badgeId, badgeData);
      await fetchPublisherBadges(pagination.page, pagination.pageSize);
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchPublisherBadges, pagination.page, pagination.pageSize]);

  const deletePublisherBadge = useCallback(async (badgeId) => {
    try {
      const response = await ApiService.deletePublisherBadge(badgeId);
      await fetchPublisherBadges(pagination.page, pagination.pageSize);
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchPublisherBadges, pagination.page, pagination.pageSize]);

  const getPublisherBadgeById = useCallback(async (badgeId) => {
    try {
      const response = await ApiService.getPublisherBadgeById(badgeId);
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
    setSelectedPublisherBadge(null);
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
      const badgeDetails = await getPublisherBadgeById(badge.id);
      setSelectedPublisherBadge(badgeDetails);
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
      console.error('Failed to fetch publisher badge details:', err);
    }
  }, [getPublisherBadgeById]);

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
      fetchPublisherBadges(newPage, pagination.pageSize);
    }
  }, [fetchPublisherBadges, pagination.pageSize, pagination.totalPages]);

  const handlePageSizeChange = useCallback((newPageSize) => {
    fetchPublisherBadges(1, newPageSize);
  }, [fetchPublisherBadges]);

  useEffect(() => {
    fetchPublisherBadges();
  }, [fetchPublisherBadges]);

  return {
    publisherBadges,
    loading,
    error,
    pagination,
    formData,
    selectedPublisherBadge,
    showCreateModal,
    showEditModal,
    fetchPublisherBadges,
    createPublisherBadge,
    updatePublisherBadge,
    deletePublisherBadge,
    getPublisherBadgeById,
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
