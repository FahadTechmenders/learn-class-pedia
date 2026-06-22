import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdmin } from '../../../../hooks/api/useAdmin';
import { useToast } from '../../../../hooks/utils/useToast';
import { useTheme } from '../../../../context/ThemeContext';
import Modal from '../../../../components/Modal';
import CategoryDropdown from '../../../../components/CategoryDropdown';
import AdminPageLayout from '../../../../components/AdminPageLayout';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  Search,
  Filter,
  Eye,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  FolderOpen as FolderIcon
} from 'lucide-react';

const CategoryManagement = () => {
  const { toast, showToast } = useToast();
  const { theme } = useTheme();
  
  const showSuccess = (message) => showToast(message, 'success');
  const showError = (message) => showToast(message, 'error');
  
  const {
    loading: hookLoading,
    error: hookError,
    clearError,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createCategoryWithFile,
    updateCategoryWithFile,
    getCategoryById
  } = useAdmin();

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    totalCount: 0
  });

  const [allCategories, setAllCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nestedCategories, setNestedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [filters, setFilters] = useState({
    name: '',
    slug: '',
    description: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentCategoryId: 0,
    iconUrl: '',
    altTextImage: '',
    iconFile: null,
    IsIconRemoved: false
  });
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllCategories({
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...filters
      });
      const categories = data.items || data || [];
      const nestedCats = data.nestedItems || [];
      setCategories(categories);
      setNestedCategories(nestedCats);
      
      // Also fetch all categories without filters for dropdown
      const allData = await getAllCategories({
        page: 1,
        pageSize: 1000 // Get all categories
      });
      setAllCategories(allData.items || allData || []);
      
      setPagination(prev => ({
        ...prev,
        totalCount: data.totalCount || categories.length,
        totalPages: data.totalPages || Math.ceil(categories.length / pagination.pageSize)
      }));
    } catch (err) {
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [getAllCategories, pagination.page, pagination.pageSize]);

  const fetchCategoriesWithFilters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllCategories({
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...filters
      });
      const categories = data.items || data || [];
      const nestedCats = data.nestedItems || [];
      setCategories(categories);
      setNestedCategories(nestedCats);
      
      // Also fetch all categories without filters for dropdown
      const allData = await getAllCategories({
        page: 1,
        pageSize: 1000 // Get all categories
      });
      setAllCategories(allData.items || allData || []);
      
      setPagination(prev => ({
        ...prev,
        totalCount: data.totalCount || categories.length,
        totalPages: data.totalPages || Math.ceil(categories.length / pagination.pageSize)
      }));
    } catch (err) {
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [getAllCategories, filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [pagination.page, fetchCategories]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    const clearedFilters = { name: '', slug: '', description: '' };
    setFilters(clearedFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    // Fetch data with cleared filters
    fetchCategories();
  }, [fetchCategories]);

  const applyFilters = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);
    // Trigger a new fetch with current filters
    fetchCategoriesWithFilters();
  }, [fetchCategoriesWithFilters]);

  const getActiveFilters = useCallback(() => {
    return Object.entries(filters).filter(([key, value]) => value && value.trim() !== '');
  }, [filters]);

    const handleParentCategoryChange = useCallback((value) => {
    setFormData(prev => ({ ...prev, parentCategoryId: value || 0 }));
  }, []);
  const displayCategories = useMemo(() => {
    return categories;
  }, [categories]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      parentCategoryId: 0,
      iconUrl: '',
      altTextImage: '',
      iconFile: null,
      IsIconRemoved: false
    });
    setEditingCategory(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setModalError('');
    
    try {
      let isFormData = false;
      let submitData = formData;
      if (editingCategory || formData.iconFile) {
        isFormData = true;
        submitData = new FormData();
        submitData.append('name', formData.name);
        submitData.append('description', formData.description || '');
        submitData.append('parentCategoryId', formData.parentCategoryId || 0);
        submitData.append('altTextImage', formData.altTextImage || '');
        
        if (formData.iconFile) {
          submitData.append('File', formData.iconFile);
        }
        submitData.append('IsIconRemoved', formData.IsIconRemoved || false);
      }
      
      if (editingCategory) {
        await updateCategoryWithFile(editingCategory.id, submitData);
        setShowUpdateModal(false);
        showSuccess('Category updated successfully!');
      } else {
        if (isFormData) {
          await createCategoryWithFile(submitData);
        } else {
          await createCategory(formData);
        }
        setShowCreateModal(false);
        showSuccess('Category created successfully!');
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      let errorMessage = 'An unexpected error occurred';
      
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.title) {
        errorMessage = err.response.data.title;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.statusText) {
        errorMessage = err.response.statusText;
      } else if (editingCategory) {
        errorMessage = 'Failed to update category';
      } else {
        errorMessage = 'Failed to create category';
      }
      
      setModalError(errorMessage);
      showError(errorMessage);
    }
  }, [editingCategory, formData, updateCategory, createCategory, createCategoryWithFile, updateCategoryWithFile, resetForm, fetchCategories, showSuccess, showError]);

  const handleEdit = useCallback(async (category) => {
    try {
      setLoading(true);
      const categoryDetails = await getCategoryById(category.id);
      setEditingCategory(categoryDetails);
      setFormData({
        name: categoryDetails.name || '',
        description: categoryDetails.description || '',
        parentCategoryId: categoryDetails.parentCategoryId || 0,
        iconUrl: categoryDetails.iconUrl || '',
        altTextImage: categoryDetails.altTextImage || '',
        iconFile: null,
        IsIconRemoved: false
      });
      setShowUpdateModal(true);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch category details';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getCategoryById, showError]);

  const handleViewDetails = useCallback(async (category) => {
    try {
      setLoading(true);
      const categoryDetails = await getCategoryById(category.id);
      setSelectedCategory(categoryDetails);
      setShowDetailsModal(true);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch category details';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getCategoryById, showError]);

  const handleDelete = useCallback(async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(categoryId);
      showSuccess('Category deleted successfully!');
      fetchCategories();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete category';
      showError(errorMessage);
    }
  }, [deleteCategory, fetchCategories, showSuccess, showError]);

  const toggleCategoryExpansion = useCallback((categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setModalError('');
    setShowCreateModal(true);
  }, [resetForm]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setModalError('');
  }, []);

  const closeUpdateModal = useCallback(() => {
    setShowUpdateModal(false);
    setModalError('');
  }, []);

  const closeDetailsModal = useCallback(() => {
    setShowDetailsModal(false);
  }, []);

  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const allCategoriesForDropdown = allCategories;

  const renderCategoryRow = (category, level = 0) => {
    const children = category.children || [];
    const isExpanded = expandedCategories[category.id];
    const hasChildren = children.length > 0;
    
    const isMatching = (filters.name && category.name?.toLowerCase().includes(filters.name.toLowerCase())) ||
                     (filters.slug && category.slug?.toLowerCase().includes(filters.slug.toLowerCase())) ||
                     (filters.description && category.description?.toLowerCase().includes(filters.description.toLowerCase()));

    return (
      <React.Fragment key={category.id}>
        <tr className={`border-b transition-colors duration-150 ${theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-200'} ${isMatching ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
          <td className={`px-6 py-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{category.id}</td>
          <td className="px-6 py-4">
            <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
              {hasChildren && (
                <button
                  onClick={() => toggleCategoryExpansion(category.id)}
                  className={`mr-2 p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {!hasChildren && level > 0 && <span className="mr-6" />}
              <div>
                <div className={`font-semibold text-sm ${isMatching ? 'text-yellow-800 dark:text-yellow-200' : theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {category.name}
                </div>
                {category.parentCategoryName && (
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Parent: {category.parentCategoryName}</div>
                )}
              </div>
            </div>
          </td>
          <td className={`px-6 py-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{category.slug}</td>
          <td className={`px-6 py-4 text-sm max-w-xs truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{category.description || 'No description'}</td>
          <td className={`px-6 py-4 text-center text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>{category.sortOrder || 0}</td>
          <td className="px-6 py-4">
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
              category.isActive 
                ? (theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                : (theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
            }`}>
              {category.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td className="px-6 py-4">
            {category.iconUrl ? <img src={category.iconUrl} alt={category.name} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600" /> : <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No Image</span>}
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center space-x-1">
              <button onClick={() => handleViewDetails(category)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-green-400 hover:bg-green-900/20' : 'text-green-600 hover:bg-green-50'}`}><Eye size={16} /></button>
              <button onClick={() => handleEdit(category)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-blue-400 hover:bg-blue-900/20' : 'text-blue-600 hover:bg-blue-50'}`}><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(category.id)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}><Trash2 size={16} /></button>
            </div>
          </td>
        </tr>
        {isExpanded && children.map(child => renderCategoryRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <AdminPageLayout
      title="Category Management"
      subtitle="Manage your course categories and subcategories"
      icon={FolderIcon}
      loading={loading}
      skeletonType="table"
      actions={
        <>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
              getActiveFilters().length > 0 || showFilters
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {(getActiveFilters().length > 0 || showFilters) && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-full">
                Active
              </span>
            )}
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-sm"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Category</span>
            <span className="sm:hidden">Add</span>
          </button>
        </>
      }
    >
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start">
        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>}

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
          <div className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Options</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={filters.name || ''}
                  onChange={handleFilterChange}
                  placeholder="Search by name..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={filters.slug || ''}
                  onChange={handleFilterChange}
                  placeholder="Search by slug..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <input
                  type="text"
                  name="description"
                  value={filters.description || ''}
                  onChange={handleFilterChange}
                  placeholder="Search by description..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  clearFilters();
                  setShowFilters(false);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium text-sm"
              >
                Clear Filters
              </button>
              <button
                onClick={applyFilters}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {getActiveFilters().length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">Active filters:</span>
                {getActiveFilters().map(([key, value]) => (
                  <span key={key} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                    {key}: {value}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, [key]: '' }))}
                      className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-semibold">{categories.length}</span> categories
                </span>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}

        {nestedCategories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No categories found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Create your first category to get started
            </p>
            <button 
              onClick={openCreateModal}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Create Your First Category
            </button>
          </div>
        ) : (
          <div className={`border rounded-xl overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Id</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Category</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Slug</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Description</th>
                    <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Sort Order</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Image</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {nestedCategories.map(cat => renderCategoryRow(cat))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {pagination.totalCount > pagination.pageSize && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
              {pagination.totalCount} categories
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, Math.ceil(pagination.totalCount / pagination.pageSize)) }, (_, i) => {
                  let pageNum;
                  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-2 text-sm border rounded-md ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.totalCount / pagination.pageSize)}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={closeCreateModal} 
        title="Create New Category"
      >
        <form onSubmit={handleSubmit}>
          {/* Modal Error Display */}
          {modalError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{modalError}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Category Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter category name"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter category description"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Parent Category</label>
              <CategoryDropdown
                categories={allCategoriesForDropdown}
                value={formData.parentCategoryId}
                onChange={handleParentCategoryChange}
                placeholder="Select parent category..."
                className="w-full"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Image</label>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="file"
                        id="icon-upload"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setFormData(prev => ({ 
                              ...prev, 
                              iconUrl: previewUrl,
                              iconFile: file,
                              IsIconRemoved: false
                            }));
                          }
                        }}
                        className="hidden"
                        disabled={modalError ? true : false}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('icon-upload').click()}
                        className={`w-full px-4 py-4 border-2 border-dashed rounded-xl hover:border-blue-400 transition-all duration-200 flex items-center justify-center space-x-2 ${
                          theme === 'dark' 
                            ? 'border-gray-600 text-gray-400 hover:text-blue-400 hover:bg-gray-700' 
                            : 'border-gray-300 text-gray-600 hover:text-blue-600'
                        }`}
                        disabled={modalError ? true : false}
                      >
                        <Upload size={20} />
                        <span>Upload  Image</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {(formData.iconUrl || formData.iconFile) && (
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img 
                        src={formData.iconUrl} 
                        alt="Icon preview" 
                        className={`w-16 h-16 rounded-xl border object-cover ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, iconUrl: '', iconFile: null, IsIconRemoved: true }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        disabled={modalError ? true : false}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formData.iconFile ? 'New Image uploaded' : 'Current Image'}
                      </p>
                      {formData.iconFile && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{formData.iconFile.name}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Alt Text for Image</label>
              <input
                type="text"
                name="altTextImage"
                value={formData.altTextImage}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter alternative text for the image"
              />
              <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Provide descriptive text for accessibility or when image is not available
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Create Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Category Modal */}
      <Modal 
        isOpen={showUpdateModal} 
        onClose={closeUpdateModal} 
        title="Update Category"
      >
        <form onSubmit={handleSubmit}>
          {/* Modal Error Display */}
          {modalError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{modalError}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter category name"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter category description"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Parent Category</label>
              <CategoryDropdown
                categories={allCategoriesForDropdown}
                value={formData.parentCategoryId}
                onChange={handleParentCategoryChange}
                placeholder="Select parent category..."
                excludeId={editingCategory?.id}
                className="w-full"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Image</label>
              <div className="space-y-3">
                {/* File Upload */}
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="file"
                        id="icon-upload-update"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setFormData(prev => ({ 
                              ...prev, 
                              iconUrl: previewUrl,
                              iconFile: file,
                              IsIconRemoved: false
                            }));
                          }
                        }}
                        className="hidden"
                        disabled={modalError ? true : false}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('icon-upload-update').click()}
                        className={`w-full px-4 py-3 border-2 border-dashed rounded-lg hover:border-blue-400 transition-colors flex items-center justify-center space-x-2 ${
                          theme === 'dark' 
                            ? 'border-gray-600 text-gray-400 hover:text-blue-400 hover:bg-gray-700' 
                            : 'border-gray-300 text-gray-600 hover:text-blue-600'
                        }`}
                        disabled={modalError ? true : false}
                      >
                        <Upload size={20} />
                        <span>Upload New Image</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Icon Preview */}
                {(formData.iconUrl || formData.iconFile) && (
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img 
                        src={formData.iconUrl} 
                        alt="Icon preview" 
                        className={`w-16 h-16 rounded-lg border object-cover ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, iconUrl: '', iconFile: null, IsIconRemoved: true }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        disabled={modalError ? true : false}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formData.iconFile ? 'New Image uploaded' : 'Current Image'}
                      </p>
                      {formData.iconFile && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{formData.iconFile.name}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Alt Text for Image</label>
              <input
                type="text"
                name="altTextImage"
                value={formData.altTextImage}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Enter alternative text for the image"
              />
              <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Provide descriptive text for accessibility or when image is not available
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={closeUpdateModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Update Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Details Modal */}
      <Modal 
        isOpen={showDetailsModal} 
        onClose={closeDetailsModal} 
        title="Category Details"
      >
        {selectedCategory && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Name</h3>
              <p className="mt-1 text-sm text-gray-900">{selectedCategory.name}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Slug</h3>
              <p className="mt-1 text-sm text-gray-900 font-mono">{selectedCategory.slug}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-sm text-gray-900">{selectedCategory.description || 'No description'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Parent Category</h3>
              <p className="mt-1 text-sm text-gray-900">
                {selectedCategory.parentCategoryName || 'No Parent (Root Category)'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Sort Order</h3>
              <p className="mt-1 text-sm text-gray-900">{selectedCategory.sortOrder || 0}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className={`mt-1 inline-flex px-2 py-1 text-xs rounded-full ${
                selectedCategory.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {selectedCategory.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            {selectedCategory.iconUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Image</h3>
                <div className="mt-1">
                  <img 
                    src={selectedCategory.iconUrl} 
                    alt={selectedCategory.name} 
                    className="w-12 h-12 rounded border border-gray-200"
                  />
                </div>
              </div>
            )}
            
            {selectedCategory.altTextImage && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Alt Text for Image</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedCategory.altTextImage}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminPageLayout>
  );
};

export default CategoryManagement;
