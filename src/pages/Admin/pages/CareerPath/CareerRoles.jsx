import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../../hooks/utils/useToast';
import { useCareerRoles } from '../../../../hooks/api/useCareerRoles';
import { useTheme } from '../../../../context/ThemeContext';
import Modal from '../../../../components/Modal';
import AdminPageLayout from '../../../../components/AdminPageLayout';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Eye,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Briefcase as RolesIcon,
  Upload,
  X
} from 'lucide-react';

const CareerRoles = () => {
  const { toast, showToast } = useToast();
  const { theme } = useTheme();
  
  const showSuccess = (message) => showToast(message, 'success');
  const showError = (message) => showToast(message, 'error');

  const {
    loading,
    error,
   
    getAllCareerRoles,
    getCareerRoleById,
    createCareerRole,
    updateCareerRole,
    createCareerRoleWithFile,
    updateCareerRoleWithFile,
    deleteCareerRole
  } = useCareerRoles();
  const [careerRoles, setCareerRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCareerRole, setSelectedCareerRole] = useState(null);
  const [editingCareerRole, setEditingCareerRole] = useState(null);
  const [modalError, setModalError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconUrl: '',
    altTextImage: '',
    iconFile: null,
    IsIconRemoved: false
  });

  const fetchCareerRoles = useCallback(async (page = currentPage, search = searchTerm) => {
    try {
      const response = await getAllCareerRoles({
        page,
        pageSize: itemsPerPage,
        search: search.trim() || undefined
      });
      
      // Handle the response structure from the backend
      if (response && typeof response === 'object') {
        if (response.items && Array.isArray(response.items)) {
          // Backend returns paginated data with items array
          setCareerRoles(response.items);
          setTotalItems(response.totalCount || response.total || 0);
          setTotalPages(response.totalPages || Math.ceil((response.totalCount || response.total || 0) / itemsPerPage));
        } else if (Array.isArray(response)) {
          // Backend returns direct array (fallback)
          setCareerRoles(response);
          setTotalItems(response.length);
          setTotalPages(Math.ceil(response.length / itemsPerPage));
        }
      } else if (Array.isArray(response)) {
        // Backend returns direct array (fallback)
        setCareerRoles(response);
        setTotalItems(response.length);
        setTotalPages(Math.ceil(response.length / itemsPerPage));
      }
    } catch (err) {
      showError('Failed to fetch career roles');
      // Reset to empty state on error
      setCareerRoles([]);
      setTotalItems(0);
      setTotalPages(0);
    }
  }, [getAllCareerRoles, currentPage, itemsPerPage, searchTerm, showError]);

  // Initial fetch and when page changes
  useEffect(() => {
    fetchCareerRoles();
  }, [currentPage, itemsPerPage]); // Don't include searchTerm here to avoid double calls

  // Debounced search - only triggers when user stops typing
  useEffect(() => {
    // Only set up timeout if there's a search term
    if (searchTerm.trim() === '') {
      // If search is empty, reset to first page and fetch all
      setIsTyping(false);
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchCareerRoles(1, '');
      }
      return;
    }

    // User is typing
    setIsTyping(true);

    const timeoutId = setTimeout(() => {
      // User stopped typing, set isTyping to false and fetch
      setIsTyping(false);
      // Only fetch if the search term hasn't changed in the last 800ms
      if (currentPage !== 1) {
        setCurrentPage(1); // Reset to first page when searching
      } else {
        fetchCareerRoles(1, searchTerm);
      }
    }, 800); // 800ms delay - only triggers when user stops typing

    return () => {
      clearTimeout(timeoutId);
      // Clear typing indicator when component unmounts or search changes
      setIsTyping(false);
    };
  }, [searchTerm]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      iconUrl: '',
      altTextImage: '',
      iconFile: null,
      IsIconRemoved: false
    });
    setEditingCareerRole(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setModalError('');
    
    try {
      let submitData;
      let isFormData = false;
      
      // Always use FormData for career roles to match update logic and avoid content-type issues
      isFormData = true;
      submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description || '');
      submitData.append('iconUrl', formData.iconUrl || '');
      submitData.append('altTextImage', formData.altTextImage || '');
      
      // Add the file only if it exists
      if (formData.iconFile) {
        submitData.append('file', formData.iconFile);
      }
      
      // Add IsIconRemoved flag (matches CategoryManagement pattern)
      submitData.append('IsIconRemoved', formData.IsIconRemoved || false);
      
      if (editingCareerRole) {
        if (isFormData) {
          await updateCareerRoleWithFile(editingCareerRole.id, submitData);
        } else {
          await updateCareerRole(editingCareerRole.id, submitData);
        }
        setShowUpdateModal(false);
        showSuccess('Career role updated successfully!');
      } else {
        if (isFormData) {
          await createCareerRoleWithFile(submitData);
        } else {
          await createCareerRole(submitData);
        }
        setShowCreateModal(false);
        showSuccess('Career role created successfully!');
      }
      resetForm();
      fetchCareerRoles();
    } catch (err) {
      // Handle specific error cases with user-friendly messages
      let errorMessage = 'An unexpected error occurred';
      
      if (err.message) {
        const errorString = err.message.toLowerCase();
        
        // Check for 409 Conflict (duplicate name) or specific duplicate message
        if (errorString.includes('409') || 
            errorString.includes('conflict') || 
            errorString.includes('already exists') ||
            errorString.includes('duplicate')) {
          if (editingCareerRole) {
            errorMessage = 'A career role with this name already exists. Please choose a different name.';
          } else {
            errorMessage = 'A career role with this name already exists. Please choose a different name.';
          }
        }
        // Check for validation errors
        else if (errorString.includes('400') || errorString.includes('bad request')) {
          errorMessage = 'Please check your input and try again. Make sure all required fields are filled.';
        }
        // Check for unauthorized errors
        else if (errorString.includes('401') || errorString.includes('unauthorized')) {
          errorMessage = 'You are not authorized to perform this action. Please log in again.';
        }
        // Check for forbidden errors
        else if (errorString.includes('403') || errorString.includes('forbidden')) {
          errorMessage = 'You do not have permission to perform this action.';
        }
        // Check for not found errors (for updates)
        else if (errorString.includes('404') || errorString.includes('not found')) {
          errorMessage = 'The career role you are trying to update was not found. It may have been deleted.';
        }
        // Check for server errors
        else if (errorString.includes('500') || errorString.includes('internal server error')) {
          errorMessage = 'Server error occurred. Please try again later.';
        }
        // Use original error message if it's user-friendly
        else if (!errorString.includes('http error') && !errorString.includes('status:')) {
          errorMessage = err.message;
        }
      }
      
      setModalError(errorMessage);
      showError(errorMessage);
    }
  }, [editingCareerRole, formData, resetForm, fetchCareerRoles, showSuccess, showError, createCareerRoleWithFile, updateCareerRoleWithFile]);

  const handleEdit = useCallback(async (careerRole) => {
    try {
      setFormLoading(true);
      const careerRoleDetails = await getCareerRoleById(careerRole.id);
      setEditingCareerRole(careerRoleDetails);
      setFormData({
        name: careerRoleDetails.name || '',
        description: careerRoleDetails.description || '',
        iconUrl: careerRoleDetails.iconUrl || '',
        altTextImage: careerRoleDetails.altTextImage || '',
        iconFile: null,
        IsIconRemoved: false
      });
      setShowUpdateModal(true);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch career role details';
      showError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  }, [getCareerRoleById, showError]);

  const handleViewDetails = useCallback(async (careerRole) => {
    try {
      setFormLoading(true);
      const careerRoleDetails = await getCareerRoleById(careerRole.id);
      setSelectedCareerRole(careerRoleDetails);
      setShowDetailsModal(true);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch career role details';
      showError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  }, [getCareerRoleById, showError]);

  const handleDelete = useCallback(async (careerRoleId) => {
    if (!window.confirm('Are you sure you want to delete this career role?')) return;
    try {
      await deleteCareerRole(careerRoleId);
      showSuccess('Career role deleted successfully!');
      fetchCareerRoles();
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete career role';
      showError(errorMessage);
    }
  }, [fetchCareerRoles, showSuccess, showError]);

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

  useEffect(() => {
    fetchCareerRoles();
  }, []);

  return (
    <AdminPageLayout
      title="Career Roles"
      subtitle="Manage your career roles and responsibilities"
      icon={RolesIcon}
      loading={loading}
      skeletonType="table"
      actions={
        <button
          onClick={openCreateModal}
          className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Career Role
        </button>
      }
    >
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

      {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded-xl">{error}</div>}

      <div className="relative max-w-2xl mx-auto mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isTyping ? "Type to search..." : "Search career roles by name or description..."}
          className={`w-full pl-12 pr-12 py-4 border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200 ${
            isTyping 
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400' 
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
          }`}
        />
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          {isTyping && (
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          )}
          {loading && !isTyping && searchTerm && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          {!isTyping && !loading && searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <AlertCircle className="h-5 w-5" />
            </button>
          )}
        </div>
        {isTyping && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
            Searching when you stop typing...
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {careerRoles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <RolesIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No matching career roles found' : 'No career roles found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {searchTerm 
                ? 'Try adjusting your search to find what you\'re looking for'
                : 'Create your first career role to get started'
              }
            </p>
            {!searchTerm && (
              <button 
                onClick={openCreateModal}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2 inline" />
                Create Your First Career Role
              </button>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className={`border rounded-xl overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>ID</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Name</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Slug</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Description</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Image</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {careerRoles.map((role) => (
                    <tr key={role.id} className={`border-b transition-colors duration-150 ${theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-200'}`}>
                      <td className={`px-6 py-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{role.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">{role.name}</div>
                      </td>
                      <td className={`px-6 py-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{role.slug}</td>
                      <td className={`px-6 py-4 text-sm max-w-xs truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{role.description || 'No description'}</td>
                      <td className="px-6 py-4">
                        {role.iconUrl ? <img src={role.iconUrl} alt={role.name} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600" /> : <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No Image</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => handleViewDetails(role)} 
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-green-400 hover:bg-green-900/20' : 'text-green-600 hover:bg-green-50'}`}
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleEdit(role)} 
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-blue-400 hover:bg-blue-900/20' : 'text-blue-600 hover:bg-blue-50'}`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(role.id)} 
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Career Role Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={closeCreateModal} 
        title="Create New Career Role"
      >
        <form onSubmit={handleSubmit}>
          {modalError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded-xl flex items-start">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Error</p>
                <p className="text-sm mt-1">{modalError}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
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
                placeholder="Enter career role name"
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
                placeholder="Enter career role description"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Image</label>
              <div className="space-y-3">
                {/* File Upload */}
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="file"
                        id="icon-upload-create"
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
                        onClick={() => document.getElementById('icon-upload-create').click()}
                        className={`w-full px-4 py-3 border-2 border-dashed rounded-xl hover:border-blue-400 transition-all duration-200 flex items-center justify-center space-x-2 ${
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
                
                {/* Icon Preview */}
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
                        {formData.iconFile ? 'New  Image' : 'Current Image'}
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
              Create Career Role
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Career Role Modal */}
      <Modal 
        isOpen={showUpdateModal} 
        onClose={closeUpdateModal} 
        title="Update Career Role"
      >
        <form onSubmit={handleSubmit}>
          {modalError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded-xl flex items-start">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Error</p>
                <p className="text-sm mt-1">{modalError}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
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
                placeholder="Enter career role name"
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
                placeholder="Enter career role description"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Image</label>
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
              onClick={closeUpdateModal}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Update Career Role
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showDetailsModal} 
        onClose={closeDetailsModal} 
        title="Career Role Details"
      >
        {selectedCareerRole && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Name</h3>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCareerRole.name}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Slug</h3>
              <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{selectedCareerRole.slug}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Description</h3>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCareerRole.description || 'No description'}</p>
            </div>
            
            {selectedCareerRole.iconUrl && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Image</h3>
                <div className="mt-1">
                  <img 
                    src={selectedCareerRole.iconUrl} 
                    alt={selectedCareerRole.name} 
                    className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>
            )}
            
            {selectedCareerRole.altTextImage && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Alt Text for Image</h3>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCareerRole.altTextImage}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeDetailsModal}
                className="px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-xl hover:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
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

export default CareerRoles;
