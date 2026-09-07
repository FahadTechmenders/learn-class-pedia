import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';

const useLmsLeadsManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loadingLeadDetails, setLoadingLeadDetails] = useState(false);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loadingCustomerTypes, setLoadingCustomerTypes] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalRecords: 0,
    totalPages: 0,
  });

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get all LMS leads with pagination, search, and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (1-based, default 1)
   * @param {number} params.pageSize - Items per page (1-100, default 20)
   * @param {string} params.search - Search term
   * @param {number} params.customerTypeId - Filter by customer type
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortDirection - Sort direction (asc|desc)
   */
  const getAllLeads = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.getLmsLeads(params);

      if (response && response.success) {
        const data = response.data || {};
        setLeads(data.items || []);
        setPagination({
          page: data.page || 1,
          pageSize: data.pageSize || 20,
          totalRecords: data.totalRecords || 0,
          totalPages: data.totalPages || 0,
        });
        return response;
      } else if (response && !response.success) {
        // Handle "No LMS leads found" case - not an error
        setLeads([]);
        setPagination({
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          totalRecords: 0,
          totalPages: 0,
        });
        return response;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch LMS leads';
      setError(errorMessage);
      setLeads([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get LMS lead details by customer ID
   * @param {number} customerId - Customer ID
   */
  const getLeadDetails = useCallback(async (customerId) => {
    setLoadingLeadDetails(true);
    setError(null);

    try {
      const response = await ApiService.getLmsLeadDetails(customerId);

      if (response && response.success) {
        const data = response.data || {};
        setSelectedLead(data);
        return response;
      } else {
        throw new Error(response?.message || 'Failed to fetch lead details');
      }
    } catch (err) {
      // Handle specific error cases
      if (err.response?.status === 404) {
        const errorMessage = err.response?.data?.message || 'Lead not found';
        setError(errorMessage);
      } else if (err.response?.status === 400) {
        const errorMessage = err.response?.data?.message || 'Invalid customer ID';
        setError(errorMessage);
      } else {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch lead details';
        setError(errorMessage);
      }
      setSelectedLead(null);
      throw err;
    } finally {
      setLoadingLeadDetails(false);
    }
  }, []);

  /**
   * Search leads with debounced search term
   * @param {string} searchTerm - Search term
   * @param {Object} otherParams - Other query parameters
   */
  const searchLeads = useCallback(async (searchTerm, otherParams = {}) => {
    return getAllLeads({
      ...otherParams,
      search: searchTerm,
      page: 1, // Reset to first page on new search
    });
  }, [getAllLeads]);

  /**
   * Filter leads by customer type
   * @param {number} customerTypeId - Customer type ID
   * @param {Object} otherParams - Other query parameters
   */
  const filterByCustomerType = useCallback(async (customerTypeId, otherParams = {}) => {
    return getAllLeads({
      ...otherParams,
      customerTypeId,
      page: 1, // Reset to first page on new filter
    });
  }, [getAllLeads]);

  /**
   * Sort leads
   * @param {string} sortBy - Sort field
   * @param {string} sortDirection - Sort direction (asc|desc)
   * @param {Object} otherParams - Other query parameters
   */
  const sortLeads = useCallback(async (sortBy, sortDirection, otherParams = {}) => {
    return getAllLeads({
      ...otherParams,
      sortBy,
      sortDirection,
      page: 1, // Reset to first page on new sort
    });
  }, [getAllLeads]);

  /**
   * Get customer types for filter dropdown
   */
  const getCustomerTypes = useCallback(async () => {
    setLoadingCustomerTypes(true);
    try {
      const response = await ApiService.getLmsCustomerTypes();
      if (response && response.success) {
        const data = response.data || [];
        setCustomerTypes(data);
        return response;
      } else {
        throw new Error(response?.message || 'Failed to fetch customer types');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch customer types';
      console.error('Error fetching customer types:', errorMessage);
      setCustomerTypes([]);
      throw err;
    } finally {
      setLoadingCustomerTypes(false);
    }
  }, []);

  return {
    loading,
    error,
    leads,
    selectedLead,
    pagination,
    loadingLeadDetails,
    customerTypes,
    loadingCustomerTypes,
    getAllLeads,
    getLeadDetails,
    searchLeads,
    filterByCustomerType,
    sortLeads,
    getCustomerTypes,
    clearError,
    setSelectedLead,
  };
};

export default useLmsLeadsManagement;
