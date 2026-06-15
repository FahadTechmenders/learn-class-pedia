import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  BookOpen,
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus
} from 'lucide-react';
import { useBookBadgeMapping } from '../../../../hooks/api/useBookBadgeMapping';

const BookBadgeMapping = () => {
  const {
    loading,
    error,
    books,
    badges,
    mappedBadges,
    pagination,
    getAllBooks,
    getAllBadges,
    getBookBadgeMapping,
    getBookBadgeMappingByBook,
    assignBookBadgeMapping,
    clearError,
    setMappedBadges
  } = useBookBadgeMapping();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [searchBookTerm, setSearchBookTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mappingError, setMappingError] = useState('');
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [assignedBooks, setAssignedBooks] = useState([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await getAllBadges();
        await getAllBooks(1, 100);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    
    loadInitialData();
  }, [getAllBooks, getAllBadges]);

  const openMappingModal = useCallback(async (badge) => {
    setSelectedBadge(badge);
    setShowMappingModal(true);
    setSelectedBooks([]);
    setSearchBookTerm('');
    setLoadingMapping(true);
    setAssignedBooks([]);
    
    try {
      // Load assigned books for this badge with single API call
      const bookIds = await getBookBadgeMapping(badge.id);
      // Ensure bookIds is always an array
      const bookIdsArray = Array.isArray(bookIds) ? bookIds : [];
      setSelectedBooks(bookIdsArray);
      setAssignedBooks(bookIdsArray);
    } catch (err) {
      console.error('Failed to fetch book mappings:', err);
      setMappingError('Failed to load book mappings. Please try again.');
      setTimeout(() => setMappingError(''), 3000);
      setSelectedBooks([]);
      setAssignedBooks([]);
    } finally {
      setLoadingMapping(false);
    }
  }, [getBookBadgeMapping]);

  const closeMappingModal = useCallback(() => {
    setShowMappingModal(false);
    setSelectedBadge(null);
    setSelectedBooks([]);
    setSearchBookTerm('');
    setAssignedBooks([]);
  }, []);

  const toggleBookAssignment = useCallback((bookId) => {
    setSelectedBooks(prev => {
      if (prev.includes(bookId)) {
        return prev.filter(id => id !== bookId);
      } else {
        return [...prev, bookId];
      }
    });
  }, []);

  const saveMappings = useCallback(async () => {
    if (!selectedBadge) return;

    setLoadingMapping(true);
    try {
      // Add badge to newly selected books
      for (const bookId of selectedBooks) {
        const existingBadges = await getBookBadgeMappingByBook(bookId);
        const badgeIds = existingBadges || [];
        
        if (!badgeIds.includes(selectedBadge.id)) {
          await assignBookBadgeMapping(bookId, [...badgeIds, selectedBadge.id]);
        }
      }
      
      // Remove badge from unselected books
      const removedBooks = assignedBooks.filter(id => !selectedBooks.includes(id));
      for (const bookId of removedBooks) {
        const existingBadges = await getBookBadgeMappingByBook(bookId);
        const badgeIds = (existingBadges || []).filter(id => id !== selectedBadge.id);
        await assignBookBadgeMapping(bookId, badgeIds);
      }
      
      const badgeName = selectedBadge.name || selectedBadge.title || selectedBadge.badgeName || 'Badge';
      setSuccessMessage(`Successfully updated book assignments for "${badgeName}"`);
      closeMappingModal();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Failed to save mappings:', err);
      setMappingError('Failed to save mappings. Please try again.');
      setTimeout(() => setMappingError(''), 3000);
    } finally {
      setLoadingMapping(false);
    }
  }, [selectedBadge, selectedBooks, assignedBooks, assignBookBadgeMapping, getBookBadgeMappingByBook, closeMappingModal]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const filteredBadges = badges.filter(badge => {
    const searchValue = searchTerm.toLowerCase().trim();
    const badgeName = (badge.name || badge.title || badge.badgeName || '')?.toLowerCase();
    return badgeName.includes(searchValue);
  });

  const filteredBooks = books.filter(book => {
    const searchValue = searchBookTerm.toLowerCase().trim();
    const bookTitle = (book.title || '')?.toLowerCase();
    return bookTitle.includes(searchValue);
  });

  const assignedBooksList = filteredBooks.filter(book => selectedBooks.includes(book.id));
  const availableBooks = filteredBooks.filter(book => !selectedBooks.includes(book.id));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transform transition-all duration-300">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Award className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent pb-1" style={{ lineHeight: '1.3' }}>
                  Book Badge Mapping
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {filteredBadges.length} Badges
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>Manage badge assignments for books</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Error</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={clearError}
              className="text-sm mt-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <div className="relative flex items-center">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-hover:text-blue-500" />
              <input
                type="text"
                placeholder="Search badges by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading badges...</span>
          </div>
        ) : filteredBadges.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300">No badges found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBadges.map((badge, index) => (
              <div
                key={badge.id}
                className="group relative bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-2xl p-6 hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {badge.name || badge.title || badge.badgeName || 'Unnamed Badge'}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                        ID: {badge.id}
                      </span>
                    </div>
                  </div>
                  
                  {badge.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {badge.description}
                    </p>
                  )}
                  
                  <button
                    onClick={() => openMappingModal(badge)}
                    className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg group-hover:scale-105"
                  >
                    <BookOpen className="w-4 h-4" />
                    Assign Books
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.totalCount > pageSize && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {Math.ceil(pagination.totalCount / pageSize)}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(pagination.totalCount / pageSize)}
              className="flex items-center px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )}
      </div>

      {showMappingModal && selectedBadge && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden transform transition-all animate-slideUp">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
              <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
              <div className="relative flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-md opacity-50"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <BookOpen className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent pb-1" style={{ lineHeight: '1.3' }}>
                      Assign Books to Badge
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span className="font-medium">{selectedBadge.name || selectedBadge.title || selectedBadge.badgeName || 'Unnamed Badge'}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeMappingModal}
                  className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-hover:text-blue-500" />
                    <input
                      type="text"
                      placeholder="Search books by title..."
                      value={searchBookTerm}
                      onChange={(e) => setSearchBookTerm(e.target.value)}
                      className="pl-12 pr-4 py-3.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                    />
                    {searchBookTerm && (
                      <button
                        onClick={() => setSearchBookTerm('')}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {mappingError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Error</p>
                    <p className="text-sm mt-1">{mappingError}</p>
                    <button
                      onClick={() => setMappingError('')}
                      className="text-sm mt-2 underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {availableBooks.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Available Books
                      <span className="ml-2 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full">
                        {availableBooks.length}
                      </span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {availableBooks.map((book, index) => (
                      <div
                        key={book.id}
                        className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {book.title || 'Unnamed Book'}
                          </h4>
                          {book.publisherName && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <span className="font-medium">Publisher:</span> {book.publisherName}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleBookAssignment(book.id)}
                          className="ml-3 p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
                          title="Assign book"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Assigned Books
                    <span className="ml-2 px-2.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded-full">
                      {assignedBooksList.length}
                    </span>
                  </h3>
                </div>
                {loadingMapping ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <span className="text-gray-600 dark:text-gray-300 font-medium">Loading assigned books...</span>
                  </div>
                ) : assignedBooksList.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">No books assigned yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Search and add books from the available list above</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {assignedBooksList.map((book, index) => (
                      <div
                        key={book.id}
                        className="group flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl hover:shadow-lg transition-all duration-200"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {book.title || 'Unnamed Book'}
                            </h4>
                            {book.publisherName && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span className="font-medium">Publisher:</span> {book.publisherName}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleBookAssignment(book.id)}
                          className="ml-3 p-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110"
                          title="Remove book"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{assignedBooksList.length}</span> book(s) will be assigned to this badge
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeMappingModal}
                    className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveMappings}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Save Assignments
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookBadgeMapping;
