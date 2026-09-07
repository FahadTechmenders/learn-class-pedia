import { useState, useCallback } from 'react';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';

const useLmsLeads = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingLeadDetails, setLoadingLeadDetails] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getAllLeads = useCallback(async (pageNumber = 1, pageSize = 100, filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        PageNumber: pageNumber.toString(),
        PageSize: pageSize.toString(),
        ...filters
      });

      const response = await ApiService.get(`${ENDPOINTS.LMS_LEADS_ALL}?${queryParams}`);
      
      if (response && (response.leads || response.data?.leads)) {
        const responseData = response.data || response;
        setLeads(responseData.leads || []);
        setSummary(responseData.summary || null);
        setPagination({
          currentPage: responseData.currentPage || 1,
          pageSize: responseData.pageSize || pageSize,
          totalCount: responseData.totalCount || 0,
          totalPages: responseData.totalPages || 0,
          hasNextPage: responseData.hasNextPage || false,
          hasPreviousPage: responseData.hasPreviousPage || false,
        });
        return responseData;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch leads';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLeadById = useCallback(async (leadId) => {
    setLoadingLeadDetails(true);
    setError(null);
    
    try {
      const response = await ApiService.get(ENDPOINTS.LMS_LEAD_BY_ID(leadId));
      
      if (response && (response.id || response.data?.id)) {
        const responseData = response.data || response;
        setSelectedLead(responseData);
        return responseData;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch lead details';
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingLeadDetails(false);
    }
  }, []);

  const createLead = useCallback(async (leadData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.post(ENDPOINTS.LMS_LEAD_CREATE, leadData);
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create lead';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLead = useCallback(async (leadId, leadData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.put(ENDPOINTS.LMS_LEAD_UPDATE(leadId), leadData);
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update lead';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLead = useCallback(async (leadId) => {
    setLoading(true);
    setError(null);
    
    try {
      await ApiService.delete(ENDPOINTS.LMS_LEAD_DELETE(leadId));
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete lead';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLeadStatus = useCallback(async (leadId, statusId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.put(ENDPOINTS.LMS_LEAD_UPDATE_STATUS(leadId), { statusId });
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update lead status';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addLeadNote = useCallback(async (leadId, note) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.post(ENDPOINTS.LMS_LEAD_ADD_NOTE(leadId), { note });
      return response.data || response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add note';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const filterLeads = useCallback(async (filters, pageNumber = 1, pageSize = 100) => {
    const activeFilters = {};

    if (filters.organizationName && filters.organizationName !== '') {
      activeFilters.OrganizationName = filters.organizationName;
    }
    if (filters.contactPerson && filters.contactPerson !== '') {
      activeFilters.ContactPerson = filters.contactPerson;
    }
    if (filters.email && filters.email !== '') {
      activeFilters.Email = filters.email;
    }
    if (filters.phone && filters.phone !== '') {
      activeFilters.Phone = filters.phone;
    }
    if (filters.statusId && filters.statusId !== '') {
      activeFilters.StatusId = parseInt(filters.statusId);
    }
    if (filters.organizationTypeId && filters.organizationTypeId !== '') {
      activeFilters.OrganizationTypeId = parseInt(filters.organizationTypeId);
    }
    if (filters.country && filters.country !== '') {
      activeFilters.Country = filters.country;
    }
    if (filters.startDate && filters.startDate !== '') {
      activeFilters.StartDate = filters.startDate;
    }
    if (filters.endDate && filters.endDate !== '') {
      activeFilters.EndDate = filters.endDate;
    }

    return getAllLeads(pageNumber, pageSize, activeFilters);
  }, [getAllLeads]);

  const getLeadStatuses = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.LMS_LEAD_STATUSES);
      return response || [];
    } catch (err) {
      console.error('Failed to fetch lead statuses:', err);
      return [];
    }
  }, []);

  const getOrganizationTypes = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.LMS_LEAD_ORG_TYPES);
      return response || [];
    } catch (err) {
      console.error('Failed to fetch organization types:', err);
      return [];
    }
  }, []);

  const getLeadSources = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.LMS_LEAD_SOURCES);
      return response || [];
    } catch (err) {
      console.error('Failed to fetch lead sources:', err);
      return [];
    }
  }, []);

  const getCountries = useCallback(async () => {
    try {
      const response = await ApiService.get(ENDPOINTS.LMS_LEAD_COUNTRIES);
      return response || [];
    } catch (err) {
      console.error('Failed to fetch countries:', err);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    leads,
    selectedLead,
    summary,
    pagination,
    loadingLeadDetails,
    getAllLeads,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStatus,
    addLeadNote,
    filterLeads,
    getLeadStatuses,
    getOrganizationTypes,
    getLeadSources,
    getCountries,
    clearError,
    setSelectedLead,
  };
};

export default useLmsLeads;
