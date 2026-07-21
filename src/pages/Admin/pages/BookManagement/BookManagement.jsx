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
  XCircle,
  FileText,
  User,
  Search,
  Eye,
  BookOpen,
  BookMarked,
  Shield,
  Tag,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  AlertOctagon,
  Globe
} from 'lucide-react';
import useBookManagement from '../../../../hooks/api/useBookManagement';
import UnpublishRequestsModal from '../../../../components/UnpublishRequestsModal';
import { useToast } from '../../../../components/ToastProvider';
import BookPreviewer from '../../../../components/EpubReaderComponent';
import { parseManuscript } from '../../../../services/manuscript.parser';

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
    getBookIssues,
    getUnpublishRequests,
    approveUnpublishRequest,
    setSelectedBook,
  } = useBookManagement();

  const [filters, setFilters] = useState({
    publisherName: '',
    bookStatusId: '',
    bookTitle: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [epubReaderBook, setEpubReaderBook] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [showIssuesModal, setShowIssuesModal] = useState(false);
  const [bookIssues, setBookIssues] = useState({ copyright: [], grammar: [] });
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [unpublishRequests, setUnpublishRequests] = useState([]);
  const [loadingUnpublishRequests, setLoadingUnpublishRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const emptyFiltersRef = useMemo(() => ({
    publisherName: '',
    bookStatusId: '',
    bookTitle: '',
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

    const selectedStatus = bookStatuses.find(status => status.id === selectedStatusId);
    const requiresReason = selectedStatus && (selectedStatus.code === 'rejected' || selectedStatus.code === 'unpublished');

    if (requiresReason) {
      setShowReasonModal(true);
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateBookStatus(selectedBook.id, selectedStatusId);
      showSuccess('Book status updated successfully');
      
      const updatedBook = await getBookById(selectedBook.id);
      setSelectedBook(updatedBook);
      setSelectedStatusId(updatedBook.bookStatusId);
    } catch (err) {
      console.error('Failed to update book status:', err);
      showError('Failed to update book status');
    } finally {
      setUpdatingStatus(false);
    }
  }, [selectedBook, selectedStatusId, bookStatuses, updateBookStatus, getBookById, setSelectedBook, showSuccess, showError]);

  const handleStatusUpdateWithReason = useCallback(async () => {
    if (!statusReason.trim()) {
      showError('Please provide a reason for this status change');
      return;
    }

    setUpdatingStatus(true);
    setShowReasonModal(false);
    
    try {
      await updateBookStatus(selectedBook.id, selectedStatusId, statusReason);
      showSuccess('Book status updated successfully');
      
      const updatedBook = await getBookById(selectedBook.id);
      setSelectedBook(updatedBook);
      setSelectedStatusId(updatedBook.bookStatusId);
      setStatusReason('');
    } catch (err) {
      console.error('Failed to update book status:', err);
      showError('Failed to update book status');
    } finally {
      setUpdatingStatus(false);
    }
  }, [selectedBook, selectedStatusId, statusReason, updateBookStatus, getBookById, setSelectedBook, showSuccess, showError]);

  const formatIssueDescription = (issue) => {
    if (!issue) return null;
    
    if (typeof issue === 'string') {
      return <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{issue}</p>;
    }
    
    const description = issue.description || issue;
    if (typeof description !== 'string') {
      return <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">Invalid issue format</p>;
    }
    
    const regex = /(\d+)\.\s+(.+?)(?=\d+\.\s+|$)/gs;
    const matches = [...description.matchAll(regex)];
    
    if (matches.length === 0) {
      return <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{description}</p>;
    }
    
    return (
      <div className="space-y-3">
        {matches.map((match, index) => {
          const [, number, content] = match;
          
          const suggestionMatch = content.match(/Suggested correction\(s\):\s*(.+?)(?:\s+Context:|$)/s);
          const contextMatch = content.match(/Context:\s*(.+?)$/s);
          
          let mainText = content;
          if (suggestionMatch) {
            mainText = content.substring(0, content.indexOf('Suggested correction(s):'));
          } else if (contextMatch) {
            mainText = content.substring(0, content.indexOf('Context:'));
          }
          
          mainText = mainText.trim();
          const suggestions = suggestionMatch ? suggestionMatch[1].trim() : null;
          const context = contextMatch ? contextMatch[1].trim().replace(/^["']|["']$/g, '') : null;
          
          return (
            <div key={index} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {number}
                </span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">{mainText}</p>
                  {suggestions && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 border border-blue-200 dark:border-blue-800">
                      <span className="font-semibold text-blue-700 dark:text-blue-400 text-xs">Suggested corrections: </span>
                      <span className="text-gray-700 dark:text-gray-300 text-xs">{suggestions}</span>
                    </div>
                  )}
                  {context && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2 border border-purple-200 dark:border-purple-800">
                      <span className="font-semibold text-purple-700 dark:text-purple-400 text-xs">Context: </span>
                      <span className="text-gray-700 dark:text-gray-300 text-xs italic">"{context}"</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleViewIssues = useCallback(async (bookId) => {
    setLoadingIssues(true);
    setShowIssuesModal(true);
    setBookIssues({ copyright: [], grammar: [] });
    
    try {
      const issues = await getBookIssues(bookId);
      setBookIssues(issues || { copyright: [], grammar: [] });
    } catch (err) {
      console.error('Failed to fetch book issues:', err);
      showError('Failed to fetch book issues');
    } finally {
      setLoadingIssues(false);
    }
  }, [getBookIssues, showError]);

  const handleResetFilters = useCallback(async () => {
    setFilters(emptyFiltersRef);
    try {
      await getAllBooks(1, pagination.pageSize, emptyFiltersRef);
    } catch (err) {
      console.error('Failed to reset filters:', err);
    }
  }, [emptyFiltersRef, getAllBooks, pagination.pageSize]);

  const handleApproveRequest = useCallback(async (requestId) => {
    setProcessingRequestId(requestId);
    try {
      await approveUnpublishRequest(requestId, true);
      showSuccess('Unpublish request approved successfully');
      setUnpublishRequests(prev => prev.filter(req => req.id !== requestId));
      await getAllBooks(pagination.page, pagination.pageSize, filters);
    } catch (err) {
      console.error('Failed to approve request:', err);
      showError('Failed to approve unpublish request');
    } finally {
      setProcessingRequestId(null);
    }
  }, [approveUnpublishRequest, showSuccess, showError, getAllBooks, pagination.page, pagination.pageSize, filters]);

  const handleRejectRequest = useCallback(async (requestId) => {
    setProcessingRequestId(requestId);
    try {
      await approveUnpublishRequest(requestId, false);
      showSuccess('Unpublish request rejected successfully');
      setUnpublishRequests(prev => prev.filter(req => req.id !== requestId));
      await getAllBooks(pagination.page, pagination.pageSize, filters);
    } catch (err) {
      console.error('Failed to reject request:', err);
      showError('Failed to reject unpublish request');
    } finally {
      setProcessingRequestId(null);
    }
  }, [approveUnpublishRequest, showSuccess, showError, getAllBooks, pagination.page, pagination.pageSize, filters]);

  const handleFetchUnpublishRequests = useCallback(async () => {
    setShowUnpublishModal(true);
    setLoadingUnpublishRequests(true);
    try {
      const data = await getUnpublishRequests(1, 100);
      setUnpublishRequests(data.items || []);
    } catch (err) {
      console.error('Failed to fetch unpublish requests:', err);
      showError('Failed to fetch unpublish requests');
    } finally {
      setLoadingUnpublishRequests(false);
    }
  }, [getUnpublishRequests, showError]);

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const getStatusBadgeStyle = (statusCode) => {
    switch (statusCode) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
      case 'published':
        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  const hasNextPage = pagination.page < totalPages;
  const hasPreviousPage = pagination.page > 1;

  const getFullManuscriptUrl = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    const baseUrl = process.env.REACT_APP_API_URL || '';
    return `${baseUrl}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl">
                <Book className="w-6 h-6 text-white" />
              </div>
              Book Management
              {pagination.unpublishRequestCount > 0 && (
                <button
                  onClick={handleFetchUnpublishRequests}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 transition-colors"
                >
                  {pagination.unpublishRequestCount} Unpublished
                </button>
              )}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and review all published books
            </p>
          </div>
          <div className="flex items-center gap-3">
          
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-full px-4 py-3 flex items-center justify-between ${showFilters ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Filters</span>
            {(filters.publisherName || filters.bookStatusId || filters.bookTitle) && (
              <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                {[filters.publisherName, filters.bookStatusId, filters.bookTitle].filter(Boolean).length}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              showFilters ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div
          className={`transition-all duration-200 ease-out ${
            showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Book Title
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.bookTitle}
                    onChange={(e) => setFilters({ ...filters, bookTitle: e.target.value })}
                    placeholder="Search book title..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {filters.bookTitle && (
                    <button
                      onClick={() => setFilters({ ...filters, bookTitle: '' })}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Publisher Name
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.publisherName}
                    onChange={(e) => setFilters({ ...filters, publisherName: e.target.value })}
                    placeholder="Search publisher..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {filters.publisherName && (
                    <button
                      onClick={() => setFilters({ ...filters, publisherName: '' })}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

          

              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={filters.bookStatusId}
                  onChange={(e) => setFilters({ ...filters, bookStatusId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
                >
                  <option value="">All Statuses</option>
                  {bookStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-row gap-2 flex-shrink-0">
                <button
                  onClick={handleFilter}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Apply
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Reset
                </button>
              </div>
            </div>

            {(filters.publisherName || filters.bookStatusId || filters.bookTitle) && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Active filters:</span>
                {filters.publisherName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                    Publisher: {filters.publisherName}
                    <button onClick={() => setFilters({ ...filters, publisherName: '' })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.bookTitle && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                    Title: {filters.bookTitle}
                    <button onClick={() => setFilters({ ...filters, bookTitle: '' })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.bookStatusId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                    Status: {bookStatuses.find(s => s.id === filters.bookStatusId)?.name}
                    <button onClick={() => setFilters({ ...filters, bookStatusId: '' })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Book
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Publisher
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status 
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="font-medium">Loading books...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <XCircle className="w-10 h-10 text-red-500" />
                      <p className="font-medium text-red-600 dark:text-red-400">{error}</p>
                      <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <Book className="w-10 h-10 text-gray-300" />
                      <p className="font-medium">No books found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr 
                    key={book.id} 
                    id={`book-${book.id}`}

                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                            {book.frontCover ? (
                              <img src={book.frontCover} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                              <Book className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {book.title}
                            {book.criticalIssue && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                                Needs Attention
                              </span>
                            )}
                          </div>
                          {book.subTitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{book.subTitle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {book.authorFirstName} {book.authorLastName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {book.publisherName || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPrice(book.price)}
                      </div>
                      {book.discountedPrice && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Sale: {formatPrice(book.discountedPrice)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(book.bookStatusCode)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            book.bookStatusCode === 'in_review' ? 'bg-yellow-500' : 
                            book.bookStatusCode === 'published' ? 'bg-green-500' : 
                            book.bookStatusCode === 'rejected' ? 'bg-red-500' : 
                            'bg-gray-500'
                          }`}></span>
                          {book.bookStatusName}
                        </span>
                        {book.isRepublished && book.bookStatusCode === 'in_review' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Republish Request
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewBook(book.id)}
                          title="View details"
                          className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(book.bookStatusCode === 'in_review' || book.bookStatusCode === 'published' || book.bookStatusCode === 'rejected') && (
                          <button
                            onClick={() => handleViewIssues(book.id)}
                            title="View issues"
                            className="p-1.5 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 rounded"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          disabled={book.bookStatusId === 1 || !book.manuscriptFilePath}
                          onClick={() => {
                            const fullUrl = getFullManuscriptUrl(book.manuscriptFilePath);
                            const sampleUrl = book.sampleFilePath ? getFullManuscriptUrl(book.sampleFilePath) : null;
                            
                            const manuscriptFilename = book.manuscriptFilename || (book.manuscriptFilePath ? book.manuscriptFilePath.split('/').pop() : 'manuscript.epub');
                            const sampleFilename = book.sampleFilePath ? book.sampleFilePath.split('/').pop() : null;
                            
                            const bookData = { 
                              url: fullUrl, 
                              title: book.title,
                              subtitle: book.subTitle,
                              author_name: `${book.authorFirstName} ${book.authorLastName}`,
                              cover_url: book.frontCover,
                              description: book.bookDescription,
                              filename: manuscriptFilename,
                              structure: null,
                              manuscript_url: fullUrl,
                              manuscript_filename: manuscriptFilename,
                              manuscript_structure: null,
                              sample_url: sampleUrl,
                              sample_filename: sampleFilename,
                              sample_structure: null,
                              samplePageStart: book.samplePageStart,
                              samplePageEnd: book.samplePageEnd,
                              totalPages: book.totalPages,
                              isLoading: true
                            };
                            
                            setEpubReaderBook(bookData);
                            
                            (async () => {
                              try {
                                let structure = book.manuscriptStructure;
                                let sampleStructure = null;
                                
                                if (!structure && fullUrl) {
                                  try {
                                    structure = await parseManuscript(fullUrl, manuscriptFilename);
                                  } catch (parseError) {
                                    console.error('Failed to parse manuscript:', parseError);
                                    showError(`Failed to parse manuscript: ${parseError.message}`);
                                  }
                                }
                                
                                // Sample parsing removed - FaithfulReader will handle display directly
                                // if (sampleUrl && sampleFilename) {
                                //   try {
                                //     sampleStructure = await parseManuscript(sampleUrl, sampleFilename);
                                //   } catch (parseError) {
                                //     console.error('Failed to parse sample:', parseError);
                                //   }
                                // }
                                
                                setEpubReaderBook(prev => prev ? {
                                  ...prev,
                                  structure,
                                  manuscript_structure: structure,
                                  sample_structure: sampleStructure,
                                  isLoading: false
                                } : null);
                              } catch (error) {
                                console.error('Error during parsing:', error);
                                setEpubReaderBook(prev => prev ? { ...prev, isLoading: false } : null);
                              }
                            })();
                          }}
                          title={book.manuscriptFilePath ? "Read book" : "Manuscript not available"}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button
                          disabled={book.bookStatusId === 1 || !book.sampleFilePath}
                          onClick={() => {
                            const sampleUrl = getFullManuscriptUrl(book.sampleFilePath);
                            const sampleFilename = book.sampleFilename || (book.sampleFilePath ? book.sampleFilePath.split('/').pop() : 'sample.epub');
                            
                            const bookData = { 
                              url: sampleUrl, 
                              title: `${book.title} (Sample)`,
                              subtitle: book.subTitle,
                              author_name: `${book.authorFirstName} ${book.authorLastName}`,
                              cover_url: book.frontCover,
                              description: book.bookDescription,
                              filename: sampleFilename,
                              structure: null,
                              manuscript_url: sampleUrl,
                              manuscript_filename: sampleFilename,
                              manuscript_structure: null,
                              sample_url: null,
                              sample_filename: null,
                              sample_structure: null,
                              samplePageStart: book.samplePageStart,
                              samplePageEnd: book.samplePageEnd,
                              totalPages: book.totalPages,
                              isLoading: true
                            };
                            
                            setEpubReaderBook(bookData);
                            
                            (async () => {
                              try {
                                let structure = null;
                                
                                if (sampleUrl) {
                                  try {
                                    structure = await parseManuscript(sampleUrl, sampleFilename);
                                  } catch (parseError) {
                                    console.error('Failed to parse sample:', parseError);
                                    showError(`Failed to parse sample: ${parseError.message}`);
                                  }
                                }
                                
                                setEpubReaderBook(prev => prev ? {
                                  ...prev,
                                  structure,
                                  manuscript_structure: structure,
                                  isLoading: false
                                } : null);
                              } catch (error) {
                                console.error('Error during parsing:', error);
                                setEpubReaderBook(prev => prev ? { ...prev, isLoading: false } : null);
                              }
                            })();
                          }}
                          title={book.sampleFilePath ? "View sample book" : "Sample not available"}
                          className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <BookMarked className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!hasPreviousPage}
                className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!hasNextPage}
                className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex-shrink-0 px-8 py-5 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
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
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900">
              <div className="p-6 space-y-5">
              
                {/* Header Section with Book Cover and Title */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-6">
                <div className="relative flex-shrink-0">
                  {selectedBook.frontCover ? (
                    <img 
                      src={selectedBook.frontCover} 
                      alt={selectedBook.title}
                          className="w-28 h-40 rounded-lg object-cover shadow-sm border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                        <div className="w-28 h-40 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg flex items-center justify-center shadow-sm">
                          <Book className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedBook.title}</h3>
                  {selectedBook.subTitle && (
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-3">{selectedBook.subTitle}</p>
                  )}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                    {selectedBook.categories && selectedBook.categories.length > 0 && selectedBook.categories.map((category, index) => {
                      const colors = [
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                            'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
                            'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                            'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                            'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
                            'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
                          ];
                          const colorClass = colors[index % colors.length];
                      return (
                            <span key={index} className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${colorClass}`}>
                          {category}
                        </span>
                      );
                    })}
                  </div>
                  {selectedBook.bookDescription && (
                        <p className="text-sm font-normal text-gray-600 dark:text-gray-400 leading-relaxed mb-5">{selectedBook.bookDescription}</p>
                  )}
                      
                      {/* Price, Royalty, Language, ISBN, CP ID */}
                      <div className="grid grid-cols-5 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Price</p>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            ${selectedBook.price?.toFixed(2) || '0.00'}
                          </p>
                          {selectedBook.discountedPrice && (
                            <p className="text-xs text-green-600 dark:text-green-400 line-through">
                              ${selectedBook.discountedPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Royalty %</p>
                          <p className="text-base font-semibold text-green-600 dark:text-green-400">
                            {selectedBook.royalityPercentage?.toFixed(0) || '0'}%
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Language</p>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {selectedBook.languageName || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">ISBN</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">
                            {selectedBook.isbn || 'Not assigned'}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">CP ID</p>
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {selectedBook.cpId || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                </div>
              </div>

                {/* Two Column Layout for Details */}
              <div className="grid grid-cols-2 gap-4">
                  
                  {/* Publication Details */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Publication Details
                    </h4>
                    <div className="space-y-0">
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Publisher</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBook.publisherName || 'N/A'}
                        </span>
                    </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Author</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedBook.authorFirstName && selectedBook.authorLastName 
                          ? `${selectedBook.authorFirstName} ${selectedBook.authorLastName}` 
                          : 'N/A'}
                      </span>
                    </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Pages</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBook.totalPages || 'N/A'}
                        </span>
                    </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Created</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBook.createdAt ? new Date(selectedBook.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                        </span>
                    </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Release Date</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBook.releaseDate ? new Date(selectedBook.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </span>
                    </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Published Date</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBook.publishedDate ? new Date(selectedBook.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not published'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Edition</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBook.edition || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Series</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBook.seriesName || 'N/A'}</span>
                      </div>
                  </div>
                </div>

                  {/* Rights & Distribution */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Rights & Distribution
                    </h4>
                    <div className="space-y-0">
                     
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Book Enrollment</span>
                        <span className={`text-sm font-semibold ${selectedBook.isBookEnroll ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                          {selectedBook.isBookEnroll ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Adult Content</span>
                        <span className={`text-sm font-semibold ${selectedBook.isAdultContent ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {selectedBook.isAdultContent ? 'Yes' : 'No'}
                        </span>
                    </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">AI Generated</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBook.isAiGenerated ? 'Yes' : 'No'}
                        </span>
                    </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Released</span>
                        <span className={`text-sm font-semibold ${selectedBook.isRelease ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                          {selectedBook.isRelease ? 'Yes' : 'No'}
                        </span>
                    </div>
                      <div className="flex justify-between items-center py-3">
                        {/* <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Publisher Approved</span>
                        <span className={`text-sm font-semibold ${selectedBook.isPublisherApproved ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {selectedBook.isPublisherApproved ? 'Yes' : 'Pending'}
                        </span> */}
                  </div>
                </div>
              </div>

                  {/* Content Files */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Content Files
                    </h4>
                    <div className="space-y-0">
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Manuscript</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBook.manuscriptFilePath ? 'Uploaded' : 'Not uploaded'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Manuscript Filename</span>
                        <span className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-xs" title={selectedBook.manuscriptFilename || selectedBook.manuscriptFilePath?.split('/').pop() || 'Not found'}>
                          {selectedBook.manuscriptFilename? selectedBook.manuscriptFilename : 'Not found'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Sample</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBook.samplePageStart && selectedBook.samplePageEnd ? `Pages ${selectedBook.samplePageStart}-${selectedBook.samplePageEnd}` : 'Not uploaded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contributors */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Contributors
                    </h4>
                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {selectedBook.contributors && selectedBook.contributors.length > 0 ? (
                        <ul className="space-y-2">
                          {selectedBook.contributors.map((contributor, index) => (
                            <li key={index} className="py-1 flex justify-between items-center">
                              <span>{contributor.name || contributor}</span>
                              {contributor.roleName && (
                                <span className="text-xs text-gray-500 dark:text-gray-500">{contributor.roleName}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No contributors added</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Territory Details - Only show when isAllTerritory is false */}
                {!selectedBook.isAllTerritory && selectedBook.bookTerittory && selectedBook.bookTerittory.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Territory Details
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                        {selectedBook.bookTerittory.length} {selectedBook.bookTerittory.length === 1 ? 'Country' : 'Countries'}
                      </span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBook.bookTerittory.map((territory, index) => (
                        <span 
                          key={territory.countryId || index} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          <Globe className="w-3 h-3" />
                          {territory.territoryName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {selectedBook.keywords && selectedBook.keywords.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBook.keywords.map((keyword, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Reason */}
                {selectedBook.bookStatusReason && (
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-5 shadow-sm border-2 border-orange-200 dark:border-orange-800">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      Status Change Reason
                    </h4>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {selectedBook.bookStatusReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Combined Actions Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Status Update - Only show if not Draft */}
              {selectedBook.bookStatusCode !== 'draft' && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Update Book Status</h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStatusId || selectedBook.bookStatusId}
                      onChange={(e) => setSelectedStatusId(parseInt(e.target.value))}
                      disabled={updatingStatus}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
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
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                            {updatingStatus ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Updating
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
              </div>
            </div>
          </div>
        </div>
      )}

      {epubReaderBook && (
        <BookPreviewer
          book={{
            title: epubReaderBook.title,
            author_name: epubReaderBook.author_name || 'Author',
            manuscript_url: epubReaderBook.url || epubReaderBook.manuscript_url,
            manuscript_filename: epubReaderBook.filename || epubReaderBook.manuscript_filename || 'null',
            manuscript_structure: epubReaderBook.structure || null,
            cover_url: epubReaderBook.cover_url || null,
            description: epubReaderBook.description || '',
            subtitle: epubReaderBook.subtitle || '',
            contributors: epubReaderBook.contributors || [],
            edition: epubReaderBook.edition || '',
            seriesName: epubReaderBook.seriesName || '',
            sample_url: epubReaderBook.sample_url || null,
            sample_filename: epubReaderBook.sample_filename || null,
            sample_structure: epubReaderBook.sample_structure || null,
            samplePageStart: epubReaderBook.samplePageStart,
            samplePageEnd: epubReaderBook.samplePageEnd,
            totalPages: epubReaderBook.totalPages,
          }}
          onClose={() => setEpubReaderBook(null)}
          onApprove={() => {
            showSuccess('Book approved successfully');
          }}
        />
      )}

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border-2 border-gray-200 dark:border-gray-700">
            
            {/* Header */}
            <div className="px-6 py-4 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Status Change Reason</h2>
                    <p className="text-sm text-orange-100 mt-0.5">Please provide a reason for this status change</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowReasonModal(false);
                    setStatusReason('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Enter the reason for rejecting or unpublishing this book..."
                  rows={4}
                  className="w-full px-4 py-3 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:bg-gray-800 dark:text-white resize-none transition-all"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This reason will be recorded and may be shared with the publisher.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowReasonModal(false);
                    setStatusReason('');
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdateWithReason}
                  disabled={!statusReason.trim() || updatingStatus}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {updatingStatus ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Update
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Issues Modal */}
      {showIssuesModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border-2 border-gray-200 dark:border-gray-700 flex flex-col">
            
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Book Issues</h2>
                    <p className="text-sm text-orange-100 mt-0.5">
                      {loadingIssues ? 'Loading issues...' : `${(bookIssues.copyright?.length || 0) + (bookIssues.grammar?.length || 0)} issue${((bookIssues.copyright?.length || 0) + (bookIssues.grammar?.length || 0)) !== 1 ? 's' : ''} found`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowIssuesModal(false);
                    setBookIssues({ copyright: [], grammar: [] });
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              {loadingIssues ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading book issues...</p>
                </div>
              ) : (bookIssues.copyright?.length === 0 && bookIssues.grammar?.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/40 dark:to-emerald-800/40 rounded-full flex items-center justify-center shadow-inner mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">No Issues Found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This book has no reported issues</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Copyright Issues */}
                  {bookIssues.copyright && bookIssues.copyright.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Copyright Issues</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{bookIssues.copyright.length} issue{bookIssues.copyright.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {bookIssues.copyright.map((issue, index) => (
                          <div
                            key={index}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-red-500"
                          >
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {formatIssueDescription(issue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* grammar Issues */}
                  {bookIssues.grammar && bookIssues.grammar.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">grammar Issues</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{bookIssues.grammar.length} issue{bookIssues.grammar.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {bookIssues.grammar.map((issue, index) => (
                          <div
                            key={index}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-yellow-500"
                          >
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {formatIssueDescription(issue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unpublish Requests Modal */}
      <UnpublishRequestsModal
        isOpen={showUnpublishModal}
        onClose={() => {
          setShowUnpublishModal(false);
          setUnpublishRequests([]);
        }}
        requests={unpublishRequests}
        loading={loadingUnpublishRequests}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        processingRequestId={processingRequestId}
      />
    </div>
  );
};

export default BookManagement;