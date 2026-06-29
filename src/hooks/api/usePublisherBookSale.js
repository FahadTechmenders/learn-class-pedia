import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';

const usePublisherBookSale = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [summary, setSummary] = useState({
    totalRoyaltyAmount: 0,
    totalSaleAmount: 0,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getAllSales = useCallback(async (pageNumber = 1, pageSize = 100, filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: pageNumber.toString(),
        pageSize: pageSize.toString(),
        ...filters
      });

      const response = await ApiService.get(`${ENDPOINTS.PUBLISHER_BOOK_SALE}?${queryParams}`);
      
      if (response && response.success) {
        setSales(response.data || []);
        setSummary({
          totalRoyaltyAmount: response.totalRoyaltyAmount || 0,
          totalSaleAmount: response.totalSaleAmount || 0,
        });
        setPagination({
          currentPage: response.page || 1,
          pageSize: response.pageSize || pageSize,
          totalCount: response.totalCount || 0,
          totalPages: response.totalPages || 0,
          hasNextPage: (response.page || 1) < (response.totalPages || 0),
          hasPreviousPage: (response.page || 1) > 1,
        });
        return response;
      } else {
        throw new Error(response.message || 'Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch publisher book sales';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSaleById = useCallback(async (saleId) => {
    setLoadingSaleDetails(true);
    setError(null);
    
    try {
      const response = await ApiService.get(ENDPOINTS.PUBLISHER_BOOK_SALE_BY_ID(saleId));
      
      if (response && (response.saleId || response.data?.saleId)) {
        const responseData = response.data || response;
        setSelectedSale(responseData);
        return responseData;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch sale details';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingSaleDetails(false);
    }
  }, []);

  const filterSales = useCallback(async (filters, pageNumber = 1, pageSize = 100) => {
    const activeFilters = {};

    if (filters.orderNo && filters.orderNo !== '') {
      activeFilters.orderNo = filters.orderNo;
    }
    if (filters.bookTitle && filters.bookTitle !== '') {
      activeFilters.bookTitle = filters.bookTitle;
    }
    if (filters.customerName && filters.customerName !== '') {
      activeFilters.customerName = filters.customerName;
    }
    if (filters.statusId && filters.statusId !== '') {
      activeFilters.statusId = filters.statusId;
    }
    if (filters.publisherId && filters.publisherId !== '') {
      activeFilters.publisherId = filters.publisherId;
    }

    return getAllSales(pageNumber, pageSize, activeFilters);
  }, [getAllSales]);

  const makePayment = useCallback(async (publisherId, amount, customerPaymentMethodId) => {
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        publisherId: publisherId,
        amount: amount,
        customerPaymentMethodId: customerPaymentMethodId
      };

      const response = await ApiService.post(ENDPOINTS.PUBLISHER_PAYOUT, payload);
      
      if (response && response.success) {
        return response;
      } else {
        throw new Error(response.message || 'Payment failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to process payment';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPaymentMethods = useCallback(async (pageNumber = 1, pageSize = 100) => {
    try {
      const queryParams = new URLSearchParams({
        PageNumber: pageNumber.toString(),
        PageSize: pageSize.toString()
      });

      const response = await ApiService.get(`${ENDPOINTS.PAYMENT_METHOD}?${queryParams}`);
      
      if (response && response.items) {
        return response.items;
      } else if (response && Array.isArray(response)) {
        return response;
      }
      return [];
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch payment methods';
      setError(errorMessage);
      return [];
    }
  }, []);

  return {
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
    clearError,
    setSelectedSale,
  };
};

export default usePublisherBookSale;
