import React, { useState, useCallback, useEffect } from 'react';
import { useToast } from '../../../../hooks/utils/useToast';
import { useDiscountRates } from '../../../../hooks/api/useDiscountRates';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Percent,
  DollarSign,
  Save,
  X
} from 'lucide-react';
import AdminPageLayout from '../../../../components/AdminPageLayout';

const DiscountRates = () => {
  const { toast, showToast } = useToast();
  const {
    discountRates,
    loading,
    error,
    page,
    totalCount,
    fetchDiscountRates,
    createDiscountRate,
    updateDiscountRate,
    deleteDiscountRate,
    getDiscountTypes,
    setPage
  } = useDiscountRates(1, 100);
  
  // Component state
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscountRate, setEditingDiscountRate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    discountTypeId: 1,
    discountPercent: 0,
    discountPrice: 0,
    isCoupon: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [discountTypes, setDiscountTypes] = useState([]);
  const [loadingDiscountTypes, setLoadingDiscountTypes] = useState(false);

  // Debounced search - only triggers when user stops typing (CareerSkills pattern)
  useEffect(() => {
    // Only set up timeout if there's a search term
    if (searchTerm.trim() === '') {
      // If search is empty, reset to first page and fetch all
      setIsTyping(false);
      if (page !== 1) {
        setPage(1);
      } else {
        fetchDiscountRates(1, 100, '');
      }
      return;
    }

    // User is typing
    setIsTyping(true);

    const timeoutId = setTimeout(() => {
      // User stopped typing, set isTyping to false and fetch
      setIsTyping(false);
      // Only fetch if search term hasn't changed in the last 800ms
      if (page !== 1) {
        setPage(1); // Reset to first page when searching
      } else {
        fetchDiscountRates(1, 100, searchTerm);
      }
    }, 800); // 800ms delay - only triggers when user stops typing

    return () => {
      clearTimeout(timeoutId);
      // Clear typing indicator when component unmounts or search changes
      setIsTyping(false);
    };
  }, [searchTerm, fetchDiscountRates, page, setPage]);

  // Load discount types for dropdown
  const loadDiscountTypes = useCallback(async () => {
    setLoadingDiscountTypes(true);
    try {
      const types = await getDiscountTypes();
      setDiscountTypes(types || []);
    } catch (err) {
      console.error('Error loading discount types:', err);
      showToast('Failed to load discount types', 'error');
    } finally {
      setLoadingDiscountTypes(false);
    }
  }, [getDiscountTypes, showToast]);

  // Handle create/edit
  const handleCreate = useCallback(async () => {
    setEditingDiscountRate(null);
    setFormData({
      title: '',
      discountTypeId: 1,
      discountPercent: 0,
      discountPrice: 0,
      isCoupon: true
    });
    await loadDiscountTypes();
    setShowModal(true);
  }, [loadDiscountTypes]);

  const handleEdit = useCallback(async (rate) => {
    setEditingDiscountRate(rate);
    setFormData({
      title: rate.title,
      discountTypeId: rate.discountTypeId || 1,
      discountPercent: rate.discountPercent || 0,
      discountPrice: rate.discountPrice || 0,
      isCoupon: rate.isCoupon ?? true
    });
    await loadDiscountTypes();
    setShowModal(true);
  }, [loadDiscountTypes]);

  const handleDelete = useCallback(async (rate) => {
    if (window.confirm(`Are you sure you want to delete "${rate.title}"?`)) {
      try {
        await deleteDiscountRate(rate.id);
        showToast('Discount rate deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting discount rate:', error);
        showToast('Failed to delete discount rate', 'error');
      }
    }
  }, [deleteDiscountRate, showToast]);

  // Handle form submit
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDiscountRate) {
        // Update existing discount rate
        await updateDiscountRate(editingDiscountRate.id, formData);
        showToast('Discount rate updated successfully', 'success');
      } else {
        // Create new discount rate
        await createDiscountRate(formData);
        showToast('Discount rate created successfully', 'success');
      }
      
      // Reset form
      setShowModal(false);
      setEditingDiscountRate(null);
      setFormData({
        title: '',
        discountTypeId: 1,
        discountPercent: 0,
        discountPrice: 0,
        isCoupon: true
      });
    } catch (error) {
      console.error('Error saving discount rate:', error);
      showToast('Failed to save discount rate', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingDiscountRate, updateDiscountRate, createDiscountRate, showToast]);

  // Handle page change
  const handlePageChange = useCallback(async (newPage) => {
    setPage(newPage);
    await fetchDiscountRates(newPage, 10, searchTerm);
  }, [setPage, fetchDiscountRates, searchTerm]);

  // Initial fetch
  useEffect(() => {
    fetchDiscountRates(1, 100, '');
  }, [fetchDiscountRates]);

  return (
    <AdminPageLayout
      title="Discount Rates"
      subtitle="Manage discount rates for courses"
      icon={Percent}
      loading={loading}
      actions={
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Discount Rate
        </button>
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={isTyping ? "Searching..." : "Search discount rates..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isTyping ? 'bg-blue-50 border-blue-300' : ''
            }`}
          />
          {isTyping && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>

      {/* Discount Rates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {discountRates.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Is Coupon
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {discountRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rate.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {rate.discountTypeId === 1 ? (
                            <>
                              <Percent className="w-4 h-4 text-green-600 mr-2" />
                              <span className="font-medium text-green-600">
                                {rate.discountPercent}% OFF
                              </span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4 text-green-600 mr-2" />
                              <span className="font-medium text-green-600">
                                ${rate.discountPrice} OFF
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          rate.isCoupon
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rate.isCoupon ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(rate)}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rate)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 100 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-700">
                  Showing {((page - 1) * 100) + 1} to{' '}
                  {Math.min(page * 100, totalCount)} of{' '}
                  {totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.ceil(totalCount / 10) }, (_, i) => i + 1)
                      .filter(pageNum => 
                        pageNum === 1 || 
                        pageNum === Math.ceil(totalCount / 10) ||
                        (pageNum >= page - 1 && pageNum <= page + 1)
                      )
                      .map((pageNum, index, array) => (
                        <React.Fragment key={pageNum}>
                          {index > 0 && array[index - 1] !== pageNum - 1 && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 text-sm border rounded-md ${
                              pageNum === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === Math.ceil(totalCount / 10)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          // Empty state
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Percent className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No discount rates found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first discount rate'}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDiscountRate ? 'Edit Discount Rate' : 'Create Discount Rate'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter discount rate title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discountTypeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountTypeId: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loadingDiscountTypes}
                  >
                    {loadingDiscountTypes ? (
                      <option>Loading...</option>
                    ) : discountTypes.length > 0 ? (
                      discountTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.typeName}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={1}>Percentage</option>
                        <option value={2}>Fixed Price</option>
                      </>
                    )}
                  </select>
                </div>

                {formData.discountTypeId === 1 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Percentage *
                    </label>
                    <input
                      type="text"
                      value={formData.discountPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*$/.test(val)) {
                          const num = parseInt(val, 10);
                          setFormData(prev => ({ ...prev, discountPercent: val === '' ? 0 : (num > 100 ? 100 : num) }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter discount percentage"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Price *
                    </label>
                    <input
                      type="text"
                      value={formData.discountPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                          setFormData(prev => ({ ...prev, discountPrice: val === '' ? 0 : parseFloat(val) }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter discount price"
                      required
                    />
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isCoupon"
                      checked={formData.isCoupon}
                      onChange={(e) => setFormData(prev => ({ ...prev, isCoupon: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isCoupon" className="ml-2 block text-sm text-gray-700">
                      Is Coupon
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingDiscountRate ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
};

export default DiscountRates;
