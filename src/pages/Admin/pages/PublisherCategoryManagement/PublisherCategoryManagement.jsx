import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tag,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  Save,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import usePublisherCategoryManagement from '../../../../hooks/api/usePublisherCategoryManagement';
import { useToast } from '../../../../components/ToastProvider';

const PublisherCategoryManagement = () => {
  const { showSuccess, showError } = useToast();
  const {
    loading,
    categories,
    pagination,
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  } = usePublisherCategoryManagement();

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [formData, setFormData] = useState({
    categoryName: '',
    description: '',
    altTextImage: '',
    file: null,
    iconUrl: '',
  });
  const [filePreview, setFilePreview] = useState(null);
  const [isIconRemoved, setIsIconRemoved] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    getAllCategories(1, 20);
  }, [getAllCategories]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await getAllCategories(pagination.page, pagination.pageSize, filterTerm);
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [getAllCategories, pagination.page, pagination.pageSize, filterTerm]);

  const handlePageChange = useCallback(async (newPage) => {
    try {
      await getAllCategories(newPage, pagination.pageSize, filterTerm);
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  }, [getAllCategories, pagination.pageSize, filterTerm]);

  const handleFilter = useCallback(() => {
    setFilterTerm(searchTerm);
    getAllCategories(1, pagination.pageSize, searchTerm);
  }, [searchTerm, getAllCategories, pagination.pageSize]);

  const handleClearFilter = useCallback(() => {
    setSearchTerm('');
    setFilterTerm('');
    getAllCategories(1, pagination.pageSize, '');
  }, [getAllCategories, pagination.pageSize]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleFilter();
    }
  }, [handleFilter]);

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      categoryName: '',
      description: '',
      altTextImage: '',
      file: null,
      iconUrl: '',
    });
    setFilePreview(null);
    setIsIconRemoved(false);
    setFormErrors({});
    setSelectedCategory(null);
    setShowModal(true);
  };

  const openEditModal = async (category) => {
    setModalMode('edit');
    try {
      const categoryDetails = await getCategoryById(category.id);
      setFormData({
        categoryName: categoryDetails.categoryName || '',
        description: categoryDetails.description || '',
        altTextImage: categoryDetails.altTextImage || '',
        file: null,
        iconUrl: categoryDetails.iconUrl || '',
      });
      setFilePreview(categoryDetails.iconUrl || null);
      setIsIconRemoved(false);
      setFormErrors({});
      setSelectedCategory(category);
    } catch (err) {
      console.error('Failed to fetch category details:', err);
      showError('Failed to load category details');
      setFormData({
        categoryName: category.categoryName || '',
        description: category.description || '',
        altTextImage: category.altTextImage || '',
        file: null,
        iconUrl: category.iconUrl || '',
      });
      setFilePreview(category.iconUrl || null);
      setIsIconRemoved(false);
      setFormErrors({});
      setSelectedCategory(category);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      categoryName: '',
      description: '',
      altTextImage: '',
      file: null,
      iconUrl: '',
    });
    setFilePreview(null);
    setIsIconRemoved(false);
    setFormErrors({});
    setSelectedCategory(null);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.categoryName.trim()) {
      errors.categoryName = 'Category name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
      setIsIconRemoved(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveIcon = () => {
    setFormData({ ...formData, file: null, iconUrl: '' });
    setFilePreview(null);
    setIsIconRemoved(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const categoryData = {
        CategoryName: formData.categoryName.trim(),
        Description: formData.description.trim(),
        AltTextImage: formData.altTextImage.trim(),
      };

      if (modalMode === 'create') {
        categoryData.CreatedBy = 1;
      } else {
        categoryData.UpdatedBy = 1;
      }

      if (formData.file) {
        categoryData.File = formData.file;
      }

      if (modalMode === 'edit' && isIconRemoved) {
        categoryData.IsIconRemoved = true;
      }

      if (modalMode === 'create') {
        await createCategory(categoryData);
        showSuccess('Category created successfully!');
      } else {
        await updateCategory(selectedCategory.id, categoryData);
        showSuccess('Category updated successfully!');
      }
      
      await getAllCategories(pagination.page, pagination.pageSize, filterTerm);
      closeModal();
    } catch (err) {
      console.error('Failed to save category:', err);
      showError(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete "${category.categoryName}"?`)) {
      return;
    }

    try {
      await deleteCategory(category.id);
      showSuccess('Category deleted successfully!');
      await getAllCategories(pagination.page, pagination.pageSize, filterTerm);
    } catch (err) {
      console.error('Failed to delete category:', err);
      showError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  const hasNextPage = pagination.page < totalPages;
  const hasPreviousPage = pagination.page > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 lg:p-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-visible">
        <div className="px-4 py-3 border-b border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 rounded-t-xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md">
                  <Tag className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">
                    Publisher Category Management
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">Total</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white leading-none">{pagination.totalCount}</div>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Category</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search categories by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-12 pr-4 py-2.5 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 transition-all"
            />
          </div>
          <button
            onClick={handleFilter}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          {filterTerm && (
            <button
              onClick={handleClearFilter}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-xl shadow-md transition-all duration-200"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
        {filterTerm && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Filtering by: <span className="font-semibold text-blue-600 dark:text-blue-400">{filterTerm}</span>
          </div>
        )}
      </div>

      {/* Categories Table */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden ring-1 ring-gray-200/50 dark:ring-gray-700/50">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">ID</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Icon</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Category Name</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Description</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Created At</th>
                <th className="px-3 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                        <div className="absolute inset-0 w-8 h-8 border-2 border-blue-200 rounded-full animate-ping"></div>
                      </div>
                      <span className="font-medium">Loading categories...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner">
                        <Tag className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-600 dark:text-gray-400 text-lg">No categories found</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Add Category" to create a new category</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gradient-to-r hover:from-blue-50/80 hover:via-indigo-50/60 hover:to-purple-50/80 dark:hover:from-blue-900/30 dark:hover:via-indigo-900/25 dark:hover:to-purple-900/30 transition-all duration-300 ease-out group">
                    <td className="px-3 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">#{category.id}</span>
                    </td>
                    <td className="px-3 py-4">
                      {category.iconUrl ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                          <img
                            src={category.iconUrl}
                            alt={category.altTextImage || category.categoryName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-800/40 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{category.categoryName}</span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {category.description || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(category.createdAt)}</span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          title="Edit category"
                          className="group relative inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-lg shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          title="Delete category"
                          className="group relative inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-lg shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!hasPreviousPage}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!hasNextPage}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-in slide-in-from-bottom-4 duration-300 border border-gray-200 dark:border-gray-700">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {modalMode === 'create' ? 'Create New Category' : 'Edit Category'}
                    </h2>
                    <p className="text-xs text-blue-100 mt-0.5">
                      {modalMode === 'create' ? 'Add a new publisher category' : 'Update category information'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border ${
                    formErrors.categoryName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm`}
                  placeholder="Enter category name..."
                />
                {formErrors.categoryName && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.categoryName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter category description..."
                  rows="3"
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category Icon
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                        <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formData.file ? formData.file.name : 'Choose file'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {filePreview && (
                    <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveIcon}
                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Alt Text for Image
                </label>
                <input
                  type="text"
                  value={formData.altTextImage}
                  onChange={(e) => setFormData({ ...formData, altTextImage: e.target.value })}
                  placeholder="Enter alt text for accessibility"
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 rounded-lg shadow-md hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{modalMode === 'create' ? 'Create' : 'Update'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublisherCategoryManagement;
