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
  BookOpen
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
    createCategory,
    updateCategory,
    deleteCategory,
  } = useBookCategoryManagement();

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    title: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = useCallback(async (page = 1, pageSize = 20) => {
    try {
      await getAllCategories(page, pageSize);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [getAllCategories]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadCategories(pagination.page, pagination.pageSize);
      showSuccess('Categories refreshed successfully');
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadCategories, pagination.page, pagination.pageSize, showSuccess]);

  const handlePageChange = useCallback(async (newPage) => {
    try {
      await getAllCategories(newPage, pagination.pageSize);
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  }, [getAllCategories, pagination.pageSize]);

  const handleOpenModal = (mode, category = null) => {
    setModalMode(mode);
    if (mode === 'edit' && category) {
      setFormData({
        id: category.id,
        title: category.title,
      });
    } else {
      setFormData({
        id: null,
        title: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      id: null,
      title: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showError('Title is required');
      return;
    }

    try {
      const categoryData = {
        title: formData.title.trim(),
      };

      if (modalMode === 'create') {
        await createCategory(categoryData);
        showSuccess('Category created successfully');
      } else {
        await updateCategory(formData.id, categoryData);
        showSuccess('Category updated successfully');
      }

      handleCloseModal();
      await loadCategories(pagination.page, pagination.pageSize);
    } catch (err) {
      console.error('Failed to save category:', err);
      showError(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      showSuccess('Category deleted successfully');
      setDeleteConfirm(null);
      await loadCategories(pagination.page, pagination.pageSize);
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

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Created At</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
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
                <td colSpan="4" className="px-4 py-16 text-center">
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
                <td colSpan="4" className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
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
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-lg">
                        <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{category.title}</span>
                    </div>
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
