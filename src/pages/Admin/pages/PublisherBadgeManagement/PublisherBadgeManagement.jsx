import React, { useState, useCallback } from 'react';
import { usePublisherBadgeManagement } from '../../../../hooks/api/usePublisherBadgeManagement';
import { useToast } from '../../../../hooks/utils/useToast';
import { useAuth } from '../../../../context/AuthContext';
import {
  Award,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Palette,
  Tag,
  Filter,
  SortAsc,
  Building2
} from 'lucide-react';

const PublisherBadgeManagement = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const {
    publisherBadges,
    loading,
    error,
    pagination,
    formData,
    showCreateModal,
    showEditModal,
    fetchPublisherBadges,
    createPublisherBadge,
    updatePublisherBadge,
    deletePublisherBadge,
    handleInputChange,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    closeEditModal,
    handlePageChange,
    handlePageSizeChange,
  } = usePublisherBadgeManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const showSuccess = useCallback((message) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message) => showToast(message, 'error'), [showToast]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const userId = user?.id || user?.userId || localStorage.getItem('userId') || null;
      
      if (showEditModal && formData.id) {
        const updatePayload = {
          ...formData,
          updatedBy: userId
        };
        await updatePublisherBadge(formData.id, updatePayload);
        showSuccess('Publisher badge updated successfully!');
        closeEditModal();
      } else {
        const createPayload = {
          ...formData,
          createdBy: userId
        };
        await createPublisherBadge(createPayload);
        showSuccess('Publisher badge created successfully!');
        closeCreateModal();
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to save publisher badge';
      showError(errorMessage);
      setFormErrors({ submit: errorMessage });
    }
  }, [formData, showEditModal, updatePublisherBadge, createPublisherBadge, showSuccess, closeEditModal, closeCreateModal, showError, user]);

  const handleDelete = useCallback(async (badge) => {
    if (!window.confirm(`Are you sure you want to delete "${badge.badgeName}"?`)) {
      return;
    }

    try {
      await deletePublisherBadge(badge.id);
      showSuccess('Publisher badge deleted successfully!');
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete publisher badge';
      showError(errorMessage);
    }
  }, [deletePublisherBadge, showSuccess, showError]);

  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleFilter = useCallback(() => {
    setFilterTerm(searchTerm);
    fetchPublisherBadges(pagination.page, pagination.pageSize, searchTerm);
  }, [searchTerm, fetchPublisherBadges, pagination.page, pagination.pageSize]);

  const handleClearFilter = useCallback(() => {
    setSearchTerm('');
    setFilterTerm('');
    fetchPublisherBadges(pagination.page, pagination.pageSize, '');
  }, [fetchPublisherBadges, pagination.page, pagination.pageSize]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleFilter();
    }
  }, [handleFilter]);

  const goToPage = useCallback((page) => {
    fetchPublisherBadges(page, pagination.pageSize, filterTerm);
  }, [fetchPublisherBadges, pagination.pageSize, filterTerm]);

  if (loading && publisherBadges.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading publisher badges...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Building2 className="w-8 h-8 text-blue-600 mr-3" />
                Publisher Badge Management
              </h1>
              <p className="text-gray-600 mt-2">Manage and organize badges for publishers</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Publisher Badge
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Badges</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{publisherBadges.length}</p>
                <p className="text-xs text-gray-500 mt-1">All publisher badges</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Badges</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {publisherBadges.filter(b => b.isActive).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Currently active</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Tag className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filter Badges</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {publisherBadges.filter(b => b.isUsedInFilter).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Used in filters</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Filter className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Keys</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {new Set(publisherBadges.map(b => b.badgeKey)).size}
                </p>
                <p className="text-xs text-gray-500 mt-1">Distinct types</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <SortAsc className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search publisher badges by name..."
                value={searchTerm}
                onChange={handleSearch}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFilter}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
              >
                <Filter className="w-5 h-5 mr-2" />
                Filter
              </button>
              {filterTerm && (
                <button
                  onClick={handleClearFilter}
                  className="flex items-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  <X className="w-5 h-5 mr-2" />
                  Clear
                </button>
              )}
            </div>
          </div>
          {filterTerm && (
            <div className="mt-3 text-sm text-gray-600">
              Filtering by: <span className="font-semibold text-blue-600">{filterTerm}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {publisherBadges.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No publisher badges found</h3>
            <p className="text-gray-600 mb-6">
              {filterTerm ? 'Try adjusting your filter terms' : 'Get started by creating your first publisher badge'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Publisher Badge
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {publisherBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden group"
              >
                <div 
                  className="h-24 relative flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${badge.badgeColor || '#3B82F6'}20 0%, ${badge.badgeColor || '#3B82F6'}10 100%)`
                  }}
                >
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg"
                      style={{ backgroundColor: badge.badgeColor || '#3B82F6' }}
                    >
                      {badge.badgeIcon ? (
                        <span className="text-white text-2xl">{badge.badgeIcon}</span>
                      ) : (
                        <Building2 className="w-8 h-8 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{badge.badgeName}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 font-mono">{badge.badgeKey}</span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {badge.description || 'No description available'}
                  </p>
                  {badge.badgeColor && (
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="w-4 h-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: badge.badgeColor }}
                        />
                        <span className="text-xs text-gray-500">{badge.badgeColor}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="inline-flex items-center from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700 rounded-lg shadow-sm">
                      <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center mr-2">
                        <span className="text-white text-xs font-bold">{badge.id}</span>
                      </div>
                    </div>
                 
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(badge)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Badge"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(badge)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Badge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
                {pagination.totalCount} badges
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {pagination.page > 3 && (
                    <>
                      <button
                        onClick={() => goToPage(1)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        1
                      </button>
                      {pagination.page > 4 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                    </>
                  )}

                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                          pageNum === pagination.page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {pagination.page < pagination.totalPages - 2 && (
                    <>
                      {pagination.page < pagination.totalPages - 3 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => goToPage(pagination.totalPages)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        {pagination.totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Go to page:</span>
                <input
                  type="number"
                  min="1"
                  max={pagination.totalPages}
                  value={pagination.page}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= pagination.totalPages) {
                      goToPage(page);
                    }
                  }}
                  className="w-16 text-sm border border-gray-300 rounded-md px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">of {pagination.totalPages}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {showEditModal ? 'Edit Publisher Badge' : 'Create New Publisher Badge'}
                </h2>
              </div>
              <button
                onClick={showEditModal ? closeEditModal : closeCreateModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {formErrors.submit && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm mt-1">{formErrors.submit}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Badge Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.badgeName}
                      onChange={(e) => handleInputChange('badgeName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter badge name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Badge Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.badgeKey}
                      onChange={(e) => handleInputChange('badgeKey', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono"
                      placeholder="e.g., VERIFIED_PUBLISHER"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Badge Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.badgeColor}
                        onChange={(e) => handleInputChange('badgeColor', e.target.value)}
                        className="w-16 h-16 border-2 border-gray-300 rounded-lg cursor-pointer"
                      />
                      <div>
                        <p className="text-sm text-gray-600 font-mono">{formData.badgeColor}</p>
                        <p className="text-xs text-gray-500">Click to change</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Describe what this badge represents..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={showEditModal ? closeEditModal : closeCreateModal}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  {showEditModal ? 'Update Badge' : 'Create Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublisherBadgeManagement;
