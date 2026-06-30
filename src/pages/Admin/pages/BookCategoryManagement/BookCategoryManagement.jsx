import { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  Edit,
  Trash2,
  BookOpen,
  Search,
  Filter,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import useBookCategoryManagement from '../../../../hooks/api/useBookCategoryManagement';
import { useToast } from '../../../../components/ToastProvider';

const BookCategoryManagement = () => {
  const { showSuccess, showError } = useToast();
  const {
    loading,
    error,
    categories,
    pagination,
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useBookCategoryManagement();

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    description: '',
    altTextImage: '',
    file: null,
    iconUrl: '',
    coverFile: null,
    categoryCover: '',
  });
  const [filePreview, setFilePreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isIconRemoved, setIsIconRemoved] = useState(false);
  const [isCoverRemoved, setIsCoverRemoved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = useCallback(async (page = 1, pageSize = 20, title = '') => {
    try {
      await getAllCategories(page, pageSize, title);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [getAllCategories]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadCategories(pagination.page, pagination.pageSize, filterTerm);
      showSuccess('Categories refreshed successfully');
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadCategories, pagination.page, pagination.pageSize, filterTerm, showSuccess]);

  const handlePageChange = useCallback(async (newPage) => {
    try {
      await getAllCategories(newPage, pagination.pageSize, filterTerm);
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  }, [getAllCategories, pagination.pageSize, filterTerm]);

  const handleFilter = useCallback(() => {
    setFilterTerm(searchTerm);
    loadCategories(1, pagination.pageSize, searchTerm);
  }, [searchTerm, loadCategories, pagination.pageSize]);

  const handleClearFilter = useCallback(() => {
    setSearchTerm('');
    setFilterTerm('');
    loadCategories(1, pagination.pageSize, '');
  }, [loadCategories, pagination.pageSize]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleFilter();
    }
  }, [handleFilter]);

  const handleOpenModal = async (mode, category = null) => {
    setModalMode(mode);
    if (mode === 'edit' && category) {
      try {
        const categoryDetails = await getCategoryById(category.id);
        setFormData({
          id: categoryDetails.id,
          title: categoryDetails.title || '',
          description: categoryDetails.description || '',
          altTextImage: categoryDetails.altTextImage || '',
          file: null,
          iconUrl: categoryDetails.iconUrl || '',
          coverFile: null,
          categoryCover: categoryDetails.categoryCover || '',
        });
        setFilePreview(categoryDetails.iconUrl || null);
        setCoverPreview(categoryDetails.categoryCover || null);
        setIsIconRemoved(false);
        setIsCoverRemoved(false);
      } catch (err) {
        console.error('Failed to fetch category details:', err);
        showError('Failed to load category details');
        setFormData({
          id: category.id,
          title: category.title || '',
          description: category.description || '',
          altTextImage: category.altTextImage || '',
          file: null,
          iconUrl: category.iconUrl || '',
          coverFile: null,
          categoryCover: category.categoryCover || '',
        });
        setFilePreview(category.iconUrl || null);
        setCoverPreview(category.categoryCover || null);
        setIsIconRemoved(false);
        setIsCoverRemoved(false);
      }
    } else {
      setFormData({
        id: null,
        title: '',
        description: '',
        altTextImage: '',
        file: null,
        iconUrl: '',
        coverFile: null,
        categoryCover: '',
      });
      setFilePreview(null);
      setCoverPreview(null);
      setIsIconRemoved(false);
      setIsCoverRemoved(false);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      id: null,
      title: '',
      description: '',
      altTextImage: '',
      file: null,
      iconUrl: '',
      coverFile: null,
      categoryCover: '',
    });
    setFilePreview(null);
    setCoverPreview(null);
    setIsIconRemoved(false);
    setIsCoverRemoved(false);
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

  const handleCoverFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, coverFile: file });
      setIsCoverRemoved(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCover = () => {
    setFormData({ ...formData, coverFile: null, categoryCover: '' });
    setCoverPreview(null);
    setIsCoverRemoved(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showError('Title is required');
      return;
    }

    try {
      const categoryData = {
        Name: formData.title.trim(),
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

      if (formData.coverFile) {
        categoryData.CoverFile = formData.coverFile;
      }

      if (modalMode === 'edit' && isIconRemoved) {
        categoryData.IsIconRemoved = true;
      }

      if (modalMode === 'edit' && isCoverRemoved) {
        categoryData.IsCoverRemoved = true;
      }

      if (modalMode === 'create') {
        await createCategory(categoryData);
        showSuccess('Category created successfully');
      } else {
        await updateCategory(formData.id, categoryData);
        showSuccess('Category updated successfully');
      }

      handleCloseModal();
      await loadCategories(pagination.page, pagination.pageSize, filterTerm);
    } catch (err) {
      console.error('Failed to save category:', err);

     showError(err.response?.data || err.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      showSuccess('Category deleted successfully');
      setDeleteConfirm(null);
      await loadCategories(pagination.page, pagination.pageSize, filterTerm);
    } catch (err) {
      console.error('Failed to delete category:', err);
      showError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  const hasNextPage = pagination.page < totalPages;
  const hasPreviousPage = pagination.page > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              Book Category Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage book categories and classifications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => handleOpenModal('create')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl  transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search categories by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 transition-all"
            />
          </div>
          <button
            onClick={handleFilter}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Filter className="w-5 h-5" />
            Filter
          </button>
          {filterTerm && (
            <button
              onClick={handleClearFilter}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 shadow-md"
            >
              <X className="w-5 h-5" />
              Clear
            </button>
          )}
        </div>
        {filterTerm && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Filtering by: <span className="font-semibold text-purple-600 dark:text-purple-400">{filterTerm}</span>
          </div>
        )}
      </div>

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Icon</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Created At</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
                      <div className="absolute inset-0 w-8 h-8 border-2 border-purple-200 rounded-full animate-ping"></div>
                    </div>
                    <span className="font-medium">Loading categories...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="6" className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 rounded-full flex items-center justify-center shadow-inner">
                      <XCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-600 dark:text-red-400 text-lg">Error Loading Categories</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
                      <button
                        onClick={handleRefresh}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner">
                      <BookOpen className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600 dark:text-gray-400 text-lg">No categories found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first book category to get started</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-gradient-to-r hover:from-purple-50/80 hover:via-pink-50/60 hover:to-purple-50/80 dark:hover:from-purple-900/30 dark:hover:via-pink-900/25 dark:hover:to-purple-900/30 transition-all duration-300 ease-out group">
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">#{category.id}</span>
                  </td>
                  <td className="px-4 py-4">
                    {category.iconUrl ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <img
                          src={category.iconUrl}
                          alt={category.altTextImage || category.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{category.title}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {category.description || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(category.createdAt)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal('edit', category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete category"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full border-2 border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {modalMode === 'create' ? 'Add New Category' : 'Edit Category'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter category title"
                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter category description"
                  rows="3"
                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Icon
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 transition-all">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Cover Image
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 transition-all">
                        <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formData.coverFile ? formData.coverFile.name : 'Choose cover image'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {coverPreview && (
                    <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                      <img
                        src={coverPreview}
                        alt="Cover Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alt Text for Image
                </label>
                <input
                  type="text"
                  value={formData.altTextImage}
                  onChange={(e) => setFormData({ ...formData, altTextImage: e.target.value })}
                  placeholder="Enter alt text for accessibility"
                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl  transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full border-2 border-red-200 dark:border-red-800">
            <div className="px-6 py-5 border-b-2 border-red-200 dark:border-red-800 bg-gradient-to-r from-red-600 to-red-700">
              <h2 className="text-2xl font-bold text-white">Confirm Delete</h2>
            </div>

            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete this category? This action cannot be undone.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookCategoryManagement;
