import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Building2,
  AlertCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Filter
} from 'lucide-react';
import { usePublisherCategoryMapping } from '../../../../hooks/api/usePublisherCategoryMapping';

const PublisherCategoryMapping = () => {
  const {
    loading,
    error,
    categories,
    publishers,
    pagination,
    getAllCategories,
    getAllPublishers,
    getPublisherCategoryMapping,
    assignPublisherCategoryMapping,
    clearError
  } = usePublisherCategoryMapping();

  const [localLoading, setLocalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPublishers, setSelectedPublishers] = useState([]);
  const [searchPublisherTerm, setSearchPublisherTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mappingError, setMappingError] = useState('');
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [assignedPublishers, setAssignedPublishers] = useState([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await getAllCategories(currentPage, pageSize, filterTerm);
        await getAllPublishers();
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    
    loadInitialData();
  }, [getAllCategories, getAllPublishers, currentPage, pageSize, filterTerm]);

  const handleFilter = useCallback(() => {
    setFilterTerm(searchTerm);
    setCurrentPage(1);
  }, [searchTerm]);

  const handleClearFilter = useCallback(() => {
    setSearchTerm('');
    setFilterTerm('');
    setCurrentPage(1);
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleFilter();
    }
  }, [handleFilter]);

  const openMappingModal = useCallback(async (category) => {
    setSelectedCategory(category);
    setShowMappingModal(true);
    setSelectedPublishers([]);
    setSearchPublisherTerm('');
    setLoadingMapping(true);
    setAssignedPublishers([]);
    
    try {
      const publisherIds = await getPublisherCategoryMapping(category.id);
      const publisherIdsArray = Array.isArray(publisherIds) ? publisherIds : [];
      setSelectedPublishers(publisherIdsArray);
      setAssignedPublishers(publisherIdsArray);
    } catch (err) {
      console.error('Failed to fetch publisher mappings:', err);
      setMappingError('Failed to load publisher mappings. Please try again.');
      setTimeout(() => setMappingError(''), 3000);
      setSelectedPublishers([]);
      setAssignedPublishers([]);
    } finally {
      setLoadingMapping(false);
    }
  }, [getPublisherCategoryMapping]);

  const closeMappingModal = useCallback(() => {
    setShowMappingModal(false);
    setSelectedCategory(null);
    setSelectedPublishers([]);
    setSearchPublisherTerm('');
    setAssignedPublishers([]);
  }, []);

  const togglePublisherAssignment = useCallback((publisherId) => {
    setSelectedPublishers(prev => {
      if (prev.includes(publisherId)) {
        return prev.filter(id => id !== publisherId);
      } else {
        return [...prev, publisherId];
      }
    });
  }, []);

  const saveMappings = useCallback(async () => {
    if (!selectedCategory) return;

    setLoadingMapping(true);
    try {
      await assignPublisherCategoryMapping(selectedCategory.id, selectedPublishers);
      
      const categoryName = selectedCategory.name || selectedCategory.title || 'Category';
      setSuccessMessage(`Successfully updated publisher assignments for "${categoryName}"`);
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
  }, [selectedCategory, selectedPublishers, assignPublisherCategoryMapping, closeMappingModal]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  // Assigned publishers should show all assigned items regardless of search
  const assignedPublishersList = publishers.filter(publisher => selectedPublishers.includes(publisher.id));
  
  // Available publishers should be filtered by search term
  const availablePublishers = publishers.filter(publisher => {
    if (selectedPublishers.includes(publisher.id)) return false;
    
    if (searchPublisherTerm.trim()) {
      const searchValue = searchPublisherTerm.toLowerCase().trim();
      const publisherName = (publisher.name || publisher.publisherName || '')?.toLowerCase();
      return publisherName.includes(searchValue);
    }
    
    return true;
  });

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

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Publisher Category Mapping
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {categories.length} Categories • Manage publisher assignments for categories
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
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search categories by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <button
              onClick={handleFilter}
              className="flex items-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
            {filterTerm && (
              <button
                onClick={handleClearFilter}
                className="flex items-center px-4 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                <X className="w-4 h-4 mr-2" />
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300">No categories found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {category.title || 'Unnamed Category'}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                      ID: {category.id}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3 min-h-[2.5rem]">
                  {category.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => openMappingModal(category)}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 mt-auto"
                >
                  <Building2 className="w-4 h-4" />
                  Assign Publishers
                </button>
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

      {showMappingModal && selectedCategory && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Assign Publishers to Category
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span className="font-medium">{selectedCategory.title || 'Unnamed Category'}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeMappingModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search publishers by name..."
                    value={searchPublisherTerm}
                    onChange={(e) => setSearchPublisherTerm(e.target.value)}
                    className="pl-10 pr-10 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  {searchPublisherTerm && (
                    <button
                      onClick={() => setSearchPublisherTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Assigned Publishers
                    <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded">
                      {assignedPublishersList.length}
                    </span>
                  </h3>
                </div>
                {loadingMapping ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <span className="text-gray-600 dark:text-gray-300">Loading assigned publishers...</span>
                  </div>
                ) : assignedPublishersList.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">No publishers assigned yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Search and add publishers from the available list below</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                    {assignedPublishersList.map((publisher) => (
                      <div
                        key={publisher.id}
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              { publisher.fullName || 'Unnamed Publisher'}
                            </h4>
                          </div>
                        </div>
                        <button
                          onClick={() => togglePublisherAssignment(publisher.id)}
                          className="ml-3 p-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
                          title="Remove publisher"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {availablePublishers.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Available Publishers
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                        {availablePublishers.length}
                      </span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                    {availablePublishers.map((publisher) => (
                      <div
                        key={publisher.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            { publisher.fullName || 'Unnamed Publisher'}
                          </h4>
                        </div>
                        <button
                          onClick={() => togglePublisherAssignment(publisher.id)}
                          className="ml-3 p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                          title="Assign publisher"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{assignedPublishersList.length}</span> publisher(s) will be assigned to this category
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeMappingModal}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveMappings}
                    disabled={loadingMapping}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingMapping ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
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

export default PublisherCategoryMapping;
