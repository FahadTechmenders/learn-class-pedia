import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Filter,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  RefreshCw,
  Eye,
  ShoppingCart,
  AlertCircle,
  BookOpen,
  SlidersHorizontal,
  RotateCcw,
  User,
  Package,
  CreditCard,
  Check,
  ChevronUp
} from 'lucide-react';
import usePublisherBookSale from '../../../../hooks/api/usePublisherBookSale';
import { useToast } from '../../../../components/ToastProvider';

const PublisherBookSale = () => {
  const {
    loading,
    error,
    sales,
    selectedSale,
    summary,
    pagination,
    loadingSaleDetails,
    getAllSales,
    getSaleById,
    filterSales,
    makePayment,
    getPaymentMethods,
    clearError
  } = usePublisherBookSale();

  const { showSuccess, showError } = useToast();

  const [filters, setFilters] = useState({
    orderNo: '',
    bookTitle: '',
    customerName: '',
    statusId: '',
    publisherId: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showSaleDetails, setShowSaleDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSales, setSelectedSales] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [expandedPublishers, setExpandedPublishers] = useState({});

  const { activeFilterCount, activeFilterChips } = useMemo(() => {
    const labels = {
      orderNo: 'Order No',
      bookTitle: 'Book Title',
      customerName: 'Customer Name',
      statusId: 'Status',
      publisherId: 'Publisher'
    };

    const isActive = (k, v) => {
      if (typeof v === 'boolean') return v === true;
      if (Array.isArray(v)) return v.length > 0;
      return v !== '' && v !== null && v !== undefined;
    };

    const displayValue = (k, v) => {
      switch (k) {
        case 'statusId':
          const statusMap = { '1': 'Pending', '2': 'Completed', '3': 'Cancelled' };
          return statusMap[v] || v;
        default:
          return String(v);
      }
    };

    const chips = Object.entries(filters)
      .filter(([k, v]) => isActive(k, v))
      .map(([k, v]) => ({ key: k, label: labels[k] || k, value: displayValue(k, v) }));

    return { activeFilterCount: chips.length, activeFilterChips: chips };
  }, [filters]);

  const hasActiveFilters = useCallback(() => {
    return filters.orderNo || filters.bookTitle || filters.customerName || filters.statusId || filters.publisherId;
  }, [filters]);

  const loadSales = useCallback(async (page = 1) => {
    try {
      if (hasActiveFilters()) {
        await filterSales(filters, page, pagination.pageSize);
      } else {
        await getAllSales(page, pagination.pageSize);
      }
    } catch (err) {
      console.error('Failed to load sales:', err);
    }
  }, [getAllSales, filterSales, filters, hasActiveFilters, pagination.pageSize]);

  useEffect(() => {
    loadSales();
  }, []);

  const handleFilter = useCallback(async () => {
    try {
      await filterSales(filters, 1, pagination.pageSize);
    } catch (err) {
      console.error('Failed to filter sales:', err);
    }
  }, [filters, filterSales, pagination.pageSize]);

  const clearFilters = useCallback(async () => {
    setFilters({
      orderNo: '',
      bookTitle: '',
      customerName: '',
      statusId: '',
      publisherId: ''
    });
    await getAllSales(1, pagination.pageSize);
  }, [getAllSales, pagination.pageSize]);

  const removeFilter = useCallback(async (key) => {
    const resetValue = typeof filters[key] === 'boolean'
      ? false
      : Array.isArray(filters[key])
        ? []
        : '';
    const next = { ...filters, [key]: resetValue };
    setFilters(next);
    try {
      const remainingActive = Object.entries(next).some(([k, v]) => {
        if (k === key) return false;
        return v && v !== '' && v !== false && v.length !== 0;
      });
      if (remainingActive) {
        await filterSales(next, 1, pagination.pageSize);
      } else {
        await getAllSales(1, pagination.pageSize);
      }
    } catch (err) {
      console.error('Failed to remove filter:', err);
    }
  }, [filters, filterSales, getAllSales, pagination.pageSize]);

  const handlePageChange = useCallback((newPage) => {
    loadSales(newPage);
  }, [loadSales]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (hasActiveFilters()) {
        await filterSales(filters, pagination.currentPage, pagination.pageSize);
      } else {
        await getAllSales(pagination.currentPage, pagination.pageSize);
      }
    } catch (err) {
      console.error('Failed to refresh sales:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [getAllSales, filterSales, filters, hasActiveFilters, pagination.currentPage, pagination.pageSize]);

  const handleViewSale = useCallback(async (saleId) => {
    try {
      await getSaleById(saleId);
      setShowSaleDetails(true);
    } catch (err) {
      console.error('Failed to fetch sale details:', err);
    }
  }, [getSaleById]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const formatCurrency = useCallback((amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  }, []);

  const getStatusColor = useCallback((statusId) => {
    switch (statusId) {
      case 1:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 2:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 3:
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    }
  }, []);

  const getStatusIcon = useCallback((statusId) => {
    switch (statusId) {
      case 1:
        return <Clock className="w-4 h-4" />;
      case 2:
        return <CheckCircle className="w-4 h-4" />;
      case 3:
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  }, []);

  const getStatusName = useCallback((statusId) => {
    switch (statusId) {
      case 1:
        return 'Pending';
      case 2:
        return 'Completed';
      case 3:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }, []);

  const togglePublisher = useCallback((publisherId) => {
    setExpandedPublishers(prev => ({
      ...prev,
      [publisherId]: !prev[publisherId]
    }));
  }, []);

  const handleCheckboxChange = useCallback((publisherId, publisherName, sale) => {
    setSelectedSales(prev => {
      const isSelected = prev.some(s => s.saleId === sale.saleId);
      if (isSelected) {
        return prev.filter(s => s.saleId !== sale.saleId);
      } else {
        if (prev.length > 0 && prev[0].publisherId !== publisherId) {
          showError('You can only select sales from the same publisher. Please clear your current selection first.');
          return prev;
        }
        return [...prev, { ...sale, publisherId, publisherName }];
      }
    });
  }, [showError]);

  const handleSelectAllForPublisher = useCallback((publisherId, publisherName, orderItems, checked) => {
    if (checked) {
      const itemsWithPublisherId = orderItems.map(item => ({ ...item, publisherId, publisherName }));
      setSelectedSales(prev => {
        // Remove any existing items from other publishers
        const filtered = prev.filter(s => s.publisherId === publisherId);
        // Add all items from this publisher
        return itemsWithPublisherId;
      });
    } else {
      setSelectedSales(prev => prev.filter(s => s.publisherId !== publisherId));
    }
  }, []);

  const selectedPublisherData = useMemo(() => {
    if (selectedSales.length === 0) return null;

    const publisherGroups = selectedSales.reduce((acc, sale) => {
      const publisherId = sale.publisherId;
      if (!acc[publisherId]) {
        acc[publisherId] = {
          publisherId: publisherId,
          publisherName: sale.publisherName || `Publisher ${publisherId}`,
          customerId: sale.customerId,
          totalAmount: 0,
          salesCount: 0
        };
      }
      acc[publisherId].totalAmount += sale.salePrice || 0;
      acc[publisherId].salesCount += 1;
      return acc;
    }, {});

    const publishers = Object.values(publisherGroups);
    
    if (publishers.length > 1) {
      return { error: 'Please select sales from only one publisher at a time' };
    }

    return publishers[0];
  }, [selectedSales]);

  const handleMakePayment = useCallback(async () => {
    if (!selectedPublisherData || selectedPublisherData.error) {
      showError(selectedPublisherData?.error || 'Please select sales to process payment');
      return;
    }
    
    setShowPaymentModal(true);
    setLoadingPaymentMethods(true);
    try {
      const methods = await getPaymentMethods(selectedPublisherData.customerId);
      
      setPaymentMethods(methods);
      
      if (methods.length === 0) {
        showError('No payment methods found for this customer');
      }
    } catch (err) {
      console.error('Failed to load payment methods:', err);
      showError('Failed to load payment methods');
    } finally {
      setLoadingPaymentMethods(false);
    }
  }, [selectedPublisherData, showError, getPaymentMethods]);

  const handleConfirmPayment = useCallback(async () => {
    if (!paymentMethodId) {
      showError('Please select a payment method');
      return;
    }

    if (!selectedPublisherData || selectedPublisherData.error) {
      showError('Invalid selection');
      return;
    }

    setProcessingPayment(true);
    try {
      const selectedSaleIds = selectedSales.map(sale => sale.saleId);
      
      await makePayment(
        selectedPublisherData.publisherId,
        selectedPublisherData.totalAmount,
        parseInt(paymentMethodId),
        selectedSaleIds
      );
      
      showSuccess(`Payment of ${formatCurrency(selectedPublisherData.totalAmount)} processed successfully for ${selectedPublisherData.publisherName}`);
      setShowPaymentModal(false);
      setPaymentMethodId('');
      setSelectedSales([]);
      
      await loadSales(pagination.currentPage);
    } catch (err) {
      showError(err.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  }, [paymentMethodId, selectedPublisherData, makePayment, showSuccess, showError, formatCurrency, loadSales, pagination.currentPage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 lg:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-visible">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 rounded-t-xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-md">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                    Publisher Book Sales
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                    {pagination.totalCount} sales
                  </p>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">Total</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white leading-none">{pagination.totalCount}</div>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  showFilters
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-expanded={showFilters}
                aria-controls="filter-panel"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={handleFilter}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Apply</span>
              </button>
            </div>
          </div>
        </div>

        <div
          id="filter-panel"
          className={`transition-all duration-300 ease-in-out ${
            showFilters ? 'max-h-[500px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="p-4 space-y-4 bg-gray-50/60 dark:bg-gray-900/20 rounded-b-2xl">
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Order Number</label>
                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by order no..."
                      value={filters.orderNo}
                      onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Book Title</label>
                  <div className="relative">
                    <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by book title..."
                      value={filters.bookTitle}
                      onChange={(e) => setFilters({ ...filters, bookTitle: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Customer Name</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by customer..."
                      value={filters.customerName}
                      onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={filters.statusId}
                      onChange={(e) => setFilters({ ...filters, statusId: e.target.value })}
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="">All Status</option>
                      <option value="1">Pending</option>
                      <option value="2">Completed</option>
                      <option value="3">Cancelled</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sales Summary</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${showSummary ? 'rotate-180' : ''}`} />
          </button>

          <div
            className={`transition-all duration-300 ease-in-out ${
              showSummary ? 'max-h-[300px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
            }`}
          >
            <div className="p-4 bg-gray-50/60 dark:bg-gray-900/20">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Sales</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{pagination.totalCount || 0}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Sale Amount</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalSaleAmount)}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Royalty</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalRoyaltyAmount)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-1">
            Active Filters:
          </span>
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              <span className="text-blue-600/70 dark:text-blue-400/70">{chip.label}:</span>
              <span className="font-semibold">{chip.value}</span>
              <button
                onClick={() => removeFilter(chip.key)}
                className="ml-1 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl flex items-center justify-between shadow-lg my-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}


      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 mt-5 overflow-hidden">
        <div className="hidden md:block w-full overflow-x-auto">
          {loading ? (
            <div className="px-6 py-14 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  Loading sales...
                </span>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="flex flex-col items-center gap-3">
                <BookOpen className="h-12 w-12 text-gray-400" />
                <span className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  No sales found
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  Try adjusting your search or filters
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {sales.map((publisher) => {
                const isExpanded = expandedPublishers[publisher.publisherId];
                const publisherSelectedCount = selectedSales.filter(s => s.publisherId === publisher.publisherId).length;
                const allPublisherItemsSelected = publisher.orderItems && publisherSelectedCount === publisher.orderItems.length;
                
                return (
                  <div key={publisher.publisherId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                    {/* Publisher Header Row */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-4">
                      <div 
                        className="flex items-center gap-4 cursor-pointer"
                        onClick={() => togglePublisher(publisher.publisherId)}
                      >
                        <button className="p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                        
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                              {publisher.publisherName}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                               {publisher.orderItems?.length || 0} book sale{(publisher.orderItems?.length || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Sale Amount</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(publisher.totalSaleAmount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Royalty</p>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(publisher.totalRoyaltyAmount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Status Section */}
                      {publisher.isPaid ? (
                        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/50">
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 w-fit">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                               Paid
                            </span>
                          </div>
                        </div>
                      ) : publisherSelectedCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800">
                              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                {publisherSelectedCount} item{publisherSelectedCount !== 1 ? 's' : ''} selected
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Total:</span>
                              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(
                                  selectedSales
                                    .filter(s => s.publisherId === publisher.publisherId)
                                    .reduce((sum, s) => sum + (s.salePrice || 0), 0)
                                )}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Filter selected sales for this publisher
                              const publisherSales = selectedSales.filter(s => s.publisherId === publisher.publisherId);
                              if (publisherSales.length > 0) {
                                setSelectedSales(publisherSales);
                                handleMakePayment();
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg shadow-sm hover:shadow-md transition-all"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Make Payment</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Nested Book Sales */}
                    {isExpanded && publisher.orderItems && publisher.orderItems.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                              {!publisher.isPaid && (
                                <th className="w-[50px] pl-4 pr-2 py-2 text-left">
                                  <input
                                    type="checkbox"
                                    checked={allPublisherItemsSelected && publisher.orderItems.length > 0}
                                    onChange={(e) => handleSelectAllForPublisher(publisher.publisherId, publisher.publisherName, publisher.orderItems, e.target.checked)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                  />
                                </th>
                              )}
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Order No
                              </th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Book Title
                              </th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Customer
                              </th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Quantity
                              </th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Sale Price
                              </th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Royalty
                              </th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Status
                              </th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                Sale Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {publisher.orderItems.map((item) => {
                              const isSelected = selectedSales.some(s => s.saleId === item.saleId);
                              return (
                                <tr
                                  key={item.saleId}
                                  className={`transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/40 ${isSelected && !publisher.isPaid ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                >
                                  {!publisher.isPaid && (
                                    <td className="pl-4 pr-2 py-3">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleCheckboxChange(publisher.publisherId, publisher.publisherName, item)}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                      />
                                    </td>
                                  )}
                                  <td className="px-3 py-3">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {item.orderNo}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {item.bookTitle || item.orderItemTitleSnapshot || 'N/A'}
                                      </div>
                                      {item.bookISBN && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          ISBN: {item.bookISBN}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {item.customerName || 'N/A'}
                                      </div>
                                      {item.customerEmail && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {item.customerEmail}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {item.quantity}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(item.salePrice, item.orderCurrencyCode)}
                                      </div>
                                      {item.orderItemDiscount > 0 && (
                                        <div className="text-xs text-green-600 dark:text-green-400">
                                          -{formatCurrency(item.orderItemDiscount, item.orderCurrencyCode)}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(item.royaltyAmount, item.orderCurrencyCode)}
                                      </div>
                                      {item.royaltyPercentage > 0 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {item.royaltyPercentage}%
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.statusId)}`}>
                                      {getStatusIcon(item.statusId)}
                                      {getStatusName(item.statusId)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      {formatDate(item.saleDate)}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Showing <span className="font-semibold text-gray-900 dark:text-white">{((pagination.currentPage - 1) * pagination.pageSize) + 1}</span> to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)}</span> of{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{pagination.totalCount}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                          pagination.currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-green-600" />
                Confirm Payment
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentMethodId('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedPublisherData && !selectedPublisherData.error && (
              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Publisher Name</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedPublisherData.publisherName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(selectedPublisherData.totalAmount)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sales Count</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedPublisherData.salesCount} sale{selectedPublisherData.salesCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Bank Account Details
                  </label>
                  {loadingPaymentMethods ? (
                    <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Loading payment details...</span>
                      </div>
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="w-full px-4 py-3 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        No payment method found
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods.map((method) => {
                        // Auto-select the payment method
                        if (!paymentMethodId) {
                          setPaymentMethodId(method.id);
                        }
                        return (
                          <div
                            key={method.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {method.bankName || 'Bank Account Details'}
                                  </h4>
                                  {method.isDefault && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                                      Default
                                    </span>
                                  )}
                                </div>

                                {(method.customerFullName || method.customerEmail) && (
                                  <div className="space-y-1">
                                    {method.customerFullName && (
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Account Holder</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {method.customerFullName}
                                        </p>
                                      </div>
                                    )}
                                    {method.customerEmail && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {method.customerEmail}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Account Number</p>
                                    <p className="font-mono font-medium text-gray-900 dark:text-white">
                                      {method.bankAccountNumber ? `****${method.bankAccountLast4 || method.bankAccountNumber.slice(-4)}` : 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Routing Number</p>
                                    <p className="font-mono font-medium text-gray-900 dark:text-white">
                                      {method.bankRoutingNumber || 'N/A'}
                                    </p>
                                  </div>
                                </div>

                                {(method.cardBrand || method.externalToken) && (
                                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                                    {method.cardBrand && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Card Brand: <span className="font-medium text-gray-700 dark:text-gray-300">{method.cardBrand}</span>
                                      </p>
                                    )}
                                    {method.externalToken && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Token: <span className="font-mono text-gray-700 dark:text-gray-300">{method.externalToken}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentMethodId('');
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processingPayment || !paymentMethodId}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublisherBookSale;
