import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Book,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  XCircle,
  FileText,
  DollarSign,
  SquarePen ,
  User,
  Search
} from 'lucide-react';
import useBookManagement from '../../../../hooks/api/useBookManagement';
import { useToast } from '../../../../components/ToastProvider';

const BookManagement = () => {
  const { showSuccess, showError } = useToast();
  const {
    loading,
    error,
    books,
    selectedBook,
    bookStatuses,
    pagination,
    getAllBooks,
    getBookById,
    getBookStatuses,
    updateBookStatus,
    setSelectedBook,
  } = useBookManagement();

  const [filters, setFilters] = useState({
    publisherName: '',
    bookStatusId: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState(null);

  const emptyFiltersRef = useMemo(() => ({
    publisherName: '',
    bookStatusId: '',
  }), []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await getAllBooks(1, 20);
      } catch (err) {
        console.error('Failed to load books:', err);
      }
      
      try {
        await getBookStatuses();
      } catch (err) {
        console.error('Failed to load book statuses:', err);
      }
    };
    
    initializeData();
  }, [getAllBooks, getBookStatuses]);

  const loadBooks = useCallback(async (page = 1, pageSize = 20) => {
    try {
      await getAllBooks(page, pageSize, filters);
    } catch (err) {
      console.error('Failed to load books:', err);
    }
  }, [getAllBooks, filters]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadBooks(pagination.page, pagination.pageSize);
      showSuccess('Books refreshed successfully');
    } catch (err) {
      console.error('Failed to refresh books:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBooks, pagination.page, pagination.pageSize, showSuccess]);

  const handleFilter = useCallback(async () => {
    try {
      await getAllBooks(1, pagination.pageSize, filters);
    } catch (err) {
      console.error('Failed to filter books:', err);
    }
  }, [getAllBooks, filters, pagination.pageSize]);

  const handlePageChange = useCallback(async (newPage) => {
    try {
      await getAllBooks(newPage, pagination.pageSize, filters);
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  }, [getAllBooks, filters, pagination.pageSize]);

  const handleViewBook = useCallback(async (bookId) => {
    try {
      const bookData = await getBookById(bookId);
      setSelectedBook(bookData);
      setSelectedStatusId(bookData.bookStatusId);
      setShowBookModal(true);
    } catch (err) {
      console.error('Failed to fetch book:', err);
      showError('Failed to fetch book details');
    }
  }, [getBookById, setSelectedBook, showError]);

  const handleStatusUpdate = useCallback(async () => {
    if (!selectedBook || selectedStatusId === selectedBook.bookStatusId) {
      showError('Please select a different status');
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateBookStatus(selectedBook.id, selectedStatusId);
      showSuccess('Book status updated successfully');
      
      // Update the selected book if modal is open
      const updatedBook = await getBookById(selectedBook.id);
      setSelectedBook(updatedBook);
      setSelectedStatusId(updatedBook.bookStatusId);
    } catch (err) {
      console.error('Failed to update book status:', err);
      showError('Failed to update book status');
    } finally {
      setUpdatingStatus(false);
    }
  }, [selectedBook, selectedStatusId, updateBookStatus, getBookById, setSelectedBook, showSuccess, showError]);

  const handleResetFilters = useCallback(async () => {
    setFilters(emptyFiltersRef);
    try {
      await getAllBooks(1, pagination.pageSize, emptyFiltersRef);
    } catch (err) {
      console.error('Failed to reset filters:', err);
    }
  }, [emptyFiltersRef, getAllBooks, pagination.pageSize]);

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

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const getStatusColor = (statusCode) => {
    switch (statusCode) {
      case 'draft':
        return 'bg-gray-500';
      case 'in_review':
        return 'bg-yellow-500';
      case 'published':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
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
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <Book className="w-8 h-8 text-white" />
              </div>
              Book Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and review all published books
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
     <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-all">
  {/* Filter Header */}
  <button
    onClick={() => setShowFilters(!showFilters)}
    className={`w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-all duration-200 ${showFilters ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
    aria-expanded={showFilters}
  >
    <div className="flex items-center gap-2.5">
      <SlidersHorizontal className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
      <span className="font-semibold text-gray-900 dark:text-white">Filters</span>
      {/* Active filter indicator */}
      {(filters.publisherName || filters.bookStatusId) && (
        <span className="ml-1.5 px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full">
          {[filters.publisherName, filters.bookStatusId].filter(Boolean).length}
        </span>
      )}
    </div>
    <ChevronDown
      className={`w-4.5 h-4.5 text-gray-500 transition-transform duration-300 ${
        showFilters ? 'rotate-180' : ''
      }`}
    />
  </button>

  {/* Filter Panel */}
  <div
    className={`transition-all duration-300 ease-out ${
      showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
    }`}
  >
    <div className="p-5 bg-gray-50/80 dark:bg-gray-800/50 space-y-4">
      {/* Main filter inputs */}
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        {/* Publisher Name with search icon */}
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Publisher Name
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={filters.publisherName}
              onChange={(e) => setFilters({ ...filters, publisherName: e.target.value })}
              placeholder="e.g., Penguin Random House"
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {filters.publisherName && (
              <button
                onClick={() => setFilters({ ...filters, publisherName: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Status Select */}
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Status
          </label>
          <div className="relative">
            <select
              value={filters.bookStatusId}
              onChange={(e) => setFilters({ ...filters, bookStatusId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer transition-all"
            >
              <option value="">All Statuses</option>
              {bookStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row gap-2.5 flex-shrink-0">
          <button
            onClick={handleFilter}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl hover:from-indigo-700 hover:to-indigo-600 focus:ring-2 focus:ring-indigo-500/30 shadow-sm transition-all duration-200 active:scale-95"
          >
            <Filter className="w-3.5 h-3.5" />
            Apply
          </button>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 focus:ring-2 focus:ring-gray-400/30 transition-all duration-200 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Active filter chips (only show if filters are active) */}
      {(filters.publisherName || filters.bookStatusId) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Active filters:</span>
          {filters.publisherName && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
              <span>Publisher: {filters.publisherName}</span>
              <button
                onClick={() => setFilters({ ...filters, publisherName: '' })}
                className="hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {filters.bookStatusId && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
              <span>Status: {bookStatuses.find(s => s.id === filters.bookStatusId)?.name}</span>
              <button
                onClick={() => setFilters({ ...filters, bookStatusId: '' })}
                className="hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <button
            onClick={handleResetFilters}
            className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors ml-1 underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  </div>
</div>

      {/* Books Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Book</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Author</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Publisher</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/80 dark:divide-gray-700/80">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                      <div className="absolute inset-0 w-8 h-8 border-2 border-indigo-200 rounded-full animate-ping"></div>
                    </div>
                    <span className="font-medium">Loading books...</span>
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
                      <p className="font-semibold text-red-600 dark:text-red-400 text-lg">Network Error</p>
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
            ) : books.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner">
                      <Book className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600 dark:text-gray-400 text-lg">No books found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or refresh the data</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              books.map((book) => (
                <tr key={book.id} className="hover:bg-gradient-to-r hover:from-indigo-50/80 hover:via-purple-50/60 hover:to-pink-50/80 dark:hover:from-indigo-900/30 dark:hover:via-purple-900/25 dark:hover:to-pink-900/30 transition-all duration-300 ease-out group">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-lg flex items-center justify-center overflow-hidden shadow-md">
                        {book.frontCover ? (
                          <img src={book.frontCover} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <Book className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{book.title}</div>
                        {book.subTitle && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{book.subTitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {book.authorFirstName} {book.authorLastName}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {book.publisherName || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPrice(book.price)}
                    </div>
                    {book.discountedPrice && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Sale: {formatPrice(book.discountedPrice)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-md ${getStatusColor(book.bookStatusCode)} text-white`}>
                      {book.bookStatusName}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleViewBook(book.id)}
                      title="View book details"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 rounded-lg shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
                    >
                       <SquarePen className="w-4 h-4" />
                    </button>
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

      {/* Book Detail Modal */}
      {showBookModal && selectedBook && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col border-2 border-gray-200 dark:border-gray-700">
            
            {/* Header */}
            <div className="flex-shrink-0 px-8 py-5 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                    <Book className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Book Details</h2>
                    <p className="text-sm text-blue-100 mt-1">Complete book information and management</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBookModal(false)}
                  className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 hover:rotate-90"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
              <div className="space-y-6">
                
                {/* Book Info Card */}
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-3xl p-6 border-2 border-indigo-200 dark:border-indigo-800/50 shadow-xl">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="relative group">
                      {selectedBook.frontCover ? (
                        <img 
                          src={selectedBook.frontCover} 
                          alt={selectedBook.title}
                          className="w-32 h-44 rounded-2xl object-cover shadow-2xl ring-4 ring-white dark:ring-gray-800 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-32 h-44 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 text-white rounded-2xl flex items-center justify-center shadow-2xl ring-4 ring-white dark:ring-gray-800 group-hover:scale-105 transition-transform duration-300">
                          <Book className="w-16 h-16" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedBook.title}</h3>
                      {selectedBook.subTitle && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{selectedBook.subTitle}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-md ${getStatusColor(selectedBook.bookStatusCode)} text-white`}>
                          {selectedBook.bookStatusName}
                        </span>
                        {selectedBook.isActive && (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Active
                          </span>
                        )}
                        {selectedBook.isRelease && (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md">
                            Released
                          </span>
                        )}
                      </div>
                      
                      {/* Status Update - Only show if not Draft */}
                      {selectedBook.bookStatusCode !== 'draft' && (
                        <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 shadow-md">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Update Status
                          </label>
                          <div className="flex items-center gap-3">
                            <select
                              value={selectedStatusId || selectedBook.bookStatusId}
                              onChange={(e) => setSelectedStatusId(parseInt(e.target.value))}
                              disabled={updatingStatus}
                              className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                            >
                              {bookStatuses
                                .filter((status) => status.code !== 'draft')
                                .map((status) => (
                                  <option key={status.id} value={status.id}>
                                    {status.name}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={handleStatusUpdate}
                              disabled={updatingStatus || selectedStatusId === selectedBook.bookStatusId}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updatingStatus ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Update
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 shadow-md">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Author</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">
                          {selectedBook.authorFirstName} {selectedBook.authorLastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/70 dark:bg-gray-800/70 rounded-2xl p-4 shadow-md">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">
                          {formatPrice(selectedBook.price)}
                          {selectedBook.discountedPrice && (
                            <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                              ({formatPrice(selectedBook.discountedPrice)})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedBook.bookDescription && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-purple-500 to-pink-500 flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-white text-base">Description</span>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedBook.bookDescription}</p>
                    </div>
                  </div>
                )}

                {/* Book Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedBook.edition && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Edition</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.edition}</p>
                    </div>
                  )}
                  {selectedBook.seriesName && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Series</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.seriesName}</p>
                    </div>
                  )}
                  {selectedBook.isbn && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ISBN</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.isbn}</p>
                    </div>
                  )}
                  {selectedBook.totalPages && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Pages</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.totalPages}</p>
                    </div>
                  )}
                  {selectedBook.publisherName && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Publisher</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.publisherName}</p>
                    </div>
                  )}
                  {selectedBook.royalityPercentage > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Royalty</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.royalityPercentage}%</p>
                    </div>
                  )}
                </div>

              

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookManagement;
