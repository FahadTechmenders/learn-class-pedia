import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Calendar, Plus, Edit, X, Search, BookOpen, Trash2, User, Mail } from 'lucide-react';
import { API_CONFIG, ENDPOINTS } from '../../../../config/api';
import { isProduction } from '../../../../config/appSettings';
import GenericDropdown from '../../../../components/GenericDropdown';
import { useBookManagement } from '../../../../hooks/api/useBookManagement';
import { useBookReviews } from '../../../../hooks/api/useBookReviews';
import AdminPageLayout from '../../../../components/AdminPageLayout';
import { useToast } from '../../../../components/ToastProvider';

const StarRating = ({ rating, editable = false, onChange }) => {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          size={editable ? 24 : 16}
          className={`${
            index < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          } ${editable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={() => editable && onChange && onChange(index + 1)}
        />
      ))}
    </div>
  );
};

const ReviewsTable = ({ data, onEdit, onDelete }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500 dark:text-gray-400">
        No reviews found for this book.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Review
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((review) => (
              <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {review.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{review.customerName || 'N/A'}</span>
                    </div>
                    {review.customerEmail && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <Mail className="w-3 h-3" />
                        <span>{review.customerEmail}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <StarRating rating={review.rating} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300 max-w-md">
                  <div className="line-clamp-2" title={review.review}>
                    {review.review}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(review)}
                      className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Edit review"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(review)}
                      className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Delete review"
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
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const BookReviewManagement = () => {
  const { showSuccess, showError } = useToast();
  const { getAllBooks } = useBookManagement();
  const {
    loading,
    error,
    reviews,
    getReviewsByBook,
    createReview,
    updateReview,
    deleteReview,
    clearError
  } = useBookReviews();
  
  const getBaseURL = () => {
    return isProduction() ? API_CONFIG.BASE_URL : API_CONFIG.BASE_URL_Local;
  };

  const [selectedBookId, setSelectedBookId] = useState('');
  const [books, setBooks] = useState([]);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState([]);
  const [bookSearchLoading, setBookSearchLoading] = useState(false);
  
  const [customers, setCustomers] = useState([]);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formData, setFormData] = useState({
    rating: 5,
    review: '',
    customerId: ''
  });

  const fetchBooks = useCallback(async (searchTerm = '', page = 1) => {
    try {
      const params = {
        page,
        pageSize: 10,
        bookStatusId: 3
      };
      
      if (searchTerm) {
        params.bookTitle = searchTerm;
      }
      
      const response = await getAllBooks(params.page, params.pageSize, params);
      const booksArray = response?.items || response?.data || response || [];
      
      const formattedBooks = booksArray
        .filter(book => book.bookStatusId === 3)
        .map(book => ({
          id: book.id,
          title: book.title,
          description: book.description
        }));
      
      if (!searchTerm) {
        setBooks(formattedBooks);
      }
      return formattedBooks;
    } catch (err) {
      console.error('Failed to fetch books:', err);
      if (!searchTerm) {
        setBooks([]);
      }
      return [];
    }
  }, [getAllBooks]);

  const fetchCustomers = useCallback(async (searchTerm = '', page = 1) => {
    try {
      const params = new URLSearchParams({
        pageNumber: page.toString(),
        pageSize: '10'
      });
      
      if (searchTerm) {
        params.append('searchTerm', searchTerm);
      }
      
      const response = await fetch(`${getBaseURL()}${ENDPOINTS.BOOK_REVIEW_CUSTOMERS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const customersArray = data?.customers || [];
      
      const formattedCustomers = customersArray.map(customer => ({
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        description: customer.email
      }));
      
      if (!searchTerm) {
        setCustomers(formattedCustomers);
      }
      return formattedCustomers;
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      if (!searchTerm) {
        setCustomers([]);
      }
      return [];
    }
  }, []);

  useEffect(() => {
    fetchBooks('', 1);
    fetchCustomers('', 1);
  }, [fetchBooks, fetchCustomers]);

  const handleBookSearch = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setBookSearchResults([]);
      return;
    }

    try {
      setBookSearchLoading(true);
      const results = await fetchBooks(searchTerm, 1);
      setBookSearchResults(results);
    } catch (error) {
      console.error('Failed to search books:', error);
      setBookSearchResults([]);
    } finally {
      setBookSearchLoading(false);
    }
  }, [fetchBooks]);

  const handleCustomerSearch = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    try {
      setCustomerSearchLoading(true);
      const results = await fetchCustomers(searchTerm, 1);
      setCustomerSearchResults(results);
    } catch (error) {
      console.error('Failed to search customers:', error);
      setCustomerSearchResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, [fetchCustomers]);

  const handleReset = () => {
    setSelectedBookId('');
    setBookSearchTerm('');
    setBookSearchResults([]);
    setCustomerSearchResults([]);
    clearError();
  };

  useEffect(() => {
    if (selectedBookId) {
      loadReviews();
    }
  }, [selectedBookId]);

  const loadReviews = async () => {
    if (!selectedBookId) return;
    
    try {
      await getReviewsByBook(selectedBookId);
    } catch (err) {
      showError(err.message || 'Failed to load reviews');
    }
  };

  const handleAddReview = async () => {
    if (!formData.review.trim()) {
      showError('Please fill in the review text');
      return;
    }

    if (!selectedBookId) {
      showError('Please select a book');
      return;
    }

    if (!formData.customerId) {
      showError('Please select a customer');
      return;
    }

    try {
      await createReview({
        bookId: parseInt(selectedBookId),
        customerId: parseInt(formData.customerId),
        rating: formData.rating,
        review: formData.review
      });
      
      setShowAddModal(false);
      setFormData({
        rating: 5,
        review: '',
        customerId: ''
      });
      
      showSuccess('Review added successfully');
      await loadReviews();
    } catch (err) {
      showError(err.message || 'Failed to add review');
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setFormData({
      rating: review.rating,
      review: review.review,
      customerId: review.customerId || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateReview = async () => {
    if (!editingReview || !formData.review.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    if (!formData.customerId) {
      showError('Please select a customer');
      return;
    }

    try {
      await updateReview(editingReview.id, {
        bookId: parseInt(selectedBookId),
        customerId: parseInt(formData.customerId),
        rating: formData.rating,
        review: formData.review
      });

      setShowEditModal(false);
      setEditingReview(null);
      setFormData({ rating: 5, review: '', customerId: '' });
      
      showSuccess('Review updated successfully');
      await loadReviews();
    } catch (err) {
      showError(err.message || 'Failed to update review');
    }
  };

  const handleDeleteReview = async (review) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await deleteReview(review.id);
      showSuccess('Review deleted successfully');
      await loadReviews();
    } catch (err) {
      showError(err.message || 'Failed to delete review');
    }
  };

  return (
    <AdminPageLayout
      title="Book Reviews Management"
      subtitle="Manage book reviews and ratings"
      icon={MessageSquare}
      loading={false}
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Book
              </label>
              <GenericDropdown
                items={bookSearchResults.length > 0 ? bookSearchResults : books}
                value={selectedBookId}
                onChange={(id) => {
                  setSelectedBookId(id);
                  if (!id) {
                    setBookSearchTerm('');
                    setBookSearchResults([]);
                    return;
                  }
                  const selectedBook = [...bookSearchResults, ...books].find(b => b.id === id);
                  if (selectedBook) {
                    setBookSearchTerm(selectedBook.title);
                  }
                }}
                placeholder="Search and select a book..."
                displayField="title"
                valueField="id"
                searchable={true}
                onSearch={handleBookSearch}
                loading={bookSearchLoading}
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Reset
              </button>
              
              {selectedBookId && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Review
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reviews...</p>
          </div>
        ) : selectedBookId ? (
          <ReviewsTable data={reviews} onEdit={handleEditReview} onDelete={handleDeleteReview} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500 dark:text-gray-400">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>Please select a book to view its reviews</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({ rating: 5, review: '', customerId: '' });
        }}
        title="Add New Review"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer
            </label>
            <GenericDropdown
              items={customerSearchResults.length > 0 ? customerSearchResults : customers}
              value={formData.customerId}
              onChange={(id) => setFormData({ ...formData, customerId: id })}
              placeholder="Search and select a customer..."
              displayField="fullName"
              valueField="id"
              searchable={true}
              onSearch={handleCustomerSearch}
              loading={customerSearchLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rating
            </label>
            <StarRating
              rating={formData.rating}
              editable={true}
              onChange={(rating) => setFormData({ ...formData, rating })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Review Text
            </label>
            <textarea
              value={formData.review}
              onChange={(e) => setFormData({ ...formData, review: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows="4"
              placeholder="Write your review here..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setShowAddModal(false);
                setFormData({ rating: 5, review: '', customerId: '' });
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddReview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Review'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingReview(null);
          setFormData({ rating: 5, review: '', customerId: '' });
        }}
        title="Edit Review"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer
            </label>
            <GenericDropdown
              items={customerSearchResults.length > 0 ? customerSearchResults : customers}
              value={formData.customerId}
              onChange={(id) => setFormData({ ...formData, customerId: id })}
              placeholder="Search and select a customer..."
              displayField="fullName"
              valueField="id"
              searchable={true}
              onSearch={handleCustomerSearch}
              loading={customerSearchLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rating
            </label>
            <StarRating
              rating={formData.rating}
              editable={true}
              onChange={(rating) => setFormData({ ...formData, rating })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Review Text
            </label>
            <textarea
              value={formData.review}
              onChange={(e) => setFormData({ ...formData, review: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows="4"
              placeholder="Write your review here..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingReview(null);
                setFormData({ rating: 5, review: '', customerId: '' });
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateReview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Review'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminPageLayout>
  );
};

export default BookReviewManagement;
