import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus,
  Filter,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  Building,
  Globe,
  Users,
  TrendingUp,
  AlertCircle,
  Eye,
  Search,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Award,
  RefreshCw
} from 'lucide-react';
import useLmsLeads from '../../../../hooks/api/useLmsLeads';

const LmsLeads = () => {
  const {
    loading,
    error,
    leads,
    selectedLead,
    summary,
    pagination,
    loadingLeadDetails,
    getAllLeads,
    getLeadById,
    updateLeadStatus,
    addLeadNote,
    filterLeads,
    getLeadStatuses,
    getOrganizationTypes,
    getCountries,
    clearError,
    setSelectedLead
  } = useLmsLeads();

  const [filters, setFilters] = useState({
    organizationName: '',
    contactPerson: '',
    email: '',
    phone: '',
    statusId: '',
    organizationTypeId: '',
    country: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [organizationTypes, setOrganizationTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { activeFilterCount, activeFilterChips } = useMemo(() => {
    const labels = {
      organizationName: 'Organization',
      contactPerson: 'Contact Person',
      email: 'Email',
      phone: 'Phone',
      statusId: 'Status',
      organizationTypeId: 'Organization Type',
      country: 'Country',
      startDate: 'Start Date',
      endDate: 'End Date'
    };

    const isActive = (k, v) => {
      if (typeof v === 'boolean') return v === true;
      if (Array.isArray(v)) return v.length > 0;
      return v !== '' && v !== null && v !== undefined;
    };

    const displayValue = (k, v) => {
      switch (k) {
        case 'statusId':
          const status = leadStatuses.find(s => s.id.toString() === v);
          return status ? status.name : v;
        case 'organizationTypeId':
          const orgType = organizationTypes.find(t => t.id.toString() === v);
          return orgType ? orgType.name : v;
        default:
          return String(v);
      }
    };

    const chips = Object.entries(filters)
      .filter(([k, v]) => isActive(k, v))
      .map(([k, v]) => ({ key: k, label: labels[k] || k, value: displayValue(k, v) }));

    return { activeFilterCount: chips.length, activeFilterChips: chips };
  }, [filters, leadStatuses, organizationTypes]);

  const hasActiveFilters = useCallback(() => {
    return Object.values(filters).some(v => v !== '' && v !== null && v !== undefined);
  }, [filters]);

  const loadDropdownData = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const [statusesData, orgTypesData, countriesData] = await Promise.all([
        getLeadStatuses(),
        getOrganizationTypes(),
        getCountries()
      ]);
      setLeadStatuses(statusesData || []);
      setOrganizationTypes(orgTypesData || []);
      setCountries(countriesData || []);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    } finally {
      setLoadingDropdowns(false);
    }
  }, [getLeadStatuses, getOrganizationTypes, getCountries]);

  const loadLeads = useCallback(async (page = 1) => {
    try {
      if (hasActiveFilters()) {
        await filterLeads(filters, page, pagination.pageSize);
      } else {
        await getAllLeads(page, pagination.pageSize);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
  }, [getAllLeads, filterLeads, filters, hasActiveFilters, pagination.pageSize]);

  useEffect(() => {
    loadLeads();
    loadDropdownData();
  }, []);

  const handleFilter = useCallback(async () => {
    try {
      await filterLeads(filters, 1, pagination.pageSize);
    } catch (err) {
      console.error('Failed to filter leads:', err);
    }
  }, [filters, filterLeads, pagination.pageSize]);

  const clearFilters = useCallback(async () => {
    setFilters({
      organizationName: '',
      contactPerson: '',
      email: '',
      phone: '',
      statusId: '',
      organizationTypeId: '',
      country: '',
      startDate: '',
      endDate: ''
    });
    await getAllLeads(1, pagination.pageSize);
  }, [getAllLeads, pagination.pageSize]);

  const removeFilter = useCallback(async (key) => {
    const resetValue = typeof filters[key] === 'boolean' ? false : '';
    const newFilters = { ...filters, [key]: resetValue };
    setFilters(newFilters);
    
    const hasFilters = Object.values(newFilters).some(v => 
      (typeof v === 'boolean' && v === true) || 
      (typeof v !== 'boolean' && v !== '' && v !== null && v !== undefined)
    );
    
    if (hasFilters) {
      await filterLeads(newFilters, 1, pagination.pageSize);
    } else {
      await getAllLeads(1, pagination.pageSize);
    }
  }, [filters, filterLeads, getAllLeads, pagination.pageSize]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadLeads(pagination.currentPage);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLeads, pagination.currentPage]);

  const handlePageChange = useCallback(async (newPage) => {
    await loadLeads(newPage);
  }, [loadLeads]);

  const handleViewDetails = useCallback(async (lead) => {
    try {
      await getLeadById(lead.id);
      setShowLeadDetails(true);
    } catch (err) {
      console.error('Failed to load lead details:', err);
    }
  }, [getLeadById]);

  const handleCloseDetails = useCallback(() => {
    setShowLeadDetails(false);
    setSelectedLead(null);
    setAdminNote('');
  }, [setSelectedLead]);

  const handleStatusChange = useCallback(async (statusId) => {
    if (!selectedLead) return;
    
    setUpdatingStatus(true);
    try {
      await updateLeadStatus(selectedLead.id, statusId);
      await getLeadById(selectedLead.id);
      await loadLeads(pagination.currentPage);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  }, [selectedLead, updateLeadStatus, getLeadById, loadLeads, pagination.currentPage]);

  const handleAddNote = useCallback(async () => {
    if (!selectedLead || !adminNote.trim()) return;
    
    setSavingNote(true);
    try {
      await addLeadNote(selectedLead.id, adminNote.trim());
      await getLeadById(selectedLead.id);
      setAdminNote('');
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSavingNote(false);
    }
  }, [selectedLead, adminNote, addLeadNote, getLeadById]);

  const getStatusBadge = (status) => {
    const statusColors = {
      'New': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Contacted': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Qualified': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Demo Scheduled': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'Converted': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const SummaryCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value || 0}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading && !leads.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-8 h-8 text-blue-600" />
                Lead Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage all ClassPedia signup leads and track conversions
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {summary && showSummary && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h2>
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${showSummary ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <SummaryCard icon={Users} label="Total Leads" value={summary.totalLeads} color="bg-blue-600" />
              <SummaryCard icon={AlertCircle} label="New Leads" value={summary.newLeads} color="bg-blue-500" />
              <SummaryCard icon={Phone} label="Contacted" value={summary.contacted} color="bg-yellow-500" />
              <SummaryCard icon={CheckCircle} label="Qualified" value={summary.qualified} color="bg-purple-500" />
              <SummaryCard icon={Award} label="Converted" value={summary.converted} color="bg-green-500" />
              <SummaryCard icon={XCircle} label="Rejected" value={summary.rejected} color="bg-red-500" />
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by organization, contact, email, or phone..."
                    value={filters.organizationName}
                    onChange={(e) => setFilters({ ...filters, organizationName: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleFilter}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={filters.contactPerson}
                      onChange={(e) => setFilters({ ...filters, contactPerson: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={filters.email}
                      onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={filters.phone}
                      onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.statusId}
                      onChange={(e) => setFilters({ ...filters, statusId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Statuses</option>
                      {leadStatuses.map(status => (
                        <option key={status.id} value={status.id}>{status.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Organization Type
                    </label>
                    <select
                      value={filters.organizationTypeId}
                      onChange={(e) => setFilters({ ...filters, organizationTypeId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Types</option>
                      {organizationTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country
                    </label>
                    <select
                      value={filters.country}
                      onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Countries</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {activeFilterChips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilterChips.map(chip => (
                  <div
                    key={chip.key}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    <span className="font-medium">{chip.label}:</span>
                    <span>{chip.value}</span>
                    <button
                      onClick={() => removeFilter(chip.key)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:hidden">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No leads found
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="w-4 h-4 text-gray-400" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {lead.organizationName || 'N/A'}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Lead #{lead.id}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{lead.contactPerson || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{lead.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{lead.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{lead.country || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{formatDate(lead.signupDate)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewDetails(lead)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Lead ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Expected Users
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Signup Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        #{lead.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          {lead.organizationName || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {lead.contactPerson || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {lead.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {lead.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          {lead.country || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {lead.expectedUsers || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(lead.signupDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleViewDetails(lead)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of{' '}
                  {pagination.totalCount} leads
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLeadDetails && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Details</h2>
              <button
                onClick={handleCloseDetails}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {loadingLeadDetails ? (
              <div className="p-6 text-center">
                <div className="text-gray-500 dark:text-gray-400">Loading details...</div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Contact Person
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.contactPerson || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Job Title
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.jobTitle || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Phone
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Organization Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Organization Name
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.organizationName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Organization Type
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.organizationType || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Country
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.country || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        City
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.city || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Website
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.website || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Expected Users
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.expectedUsers || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">LMS Interest</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Lead Source
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.leadSource || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Signup Date
                      </label>
                      <p className="text-gray-900 dark:text-white">{formatDate(selectedLead.signupDate)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Message / Requirements
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedLead.message || 'No message provided'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Management</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Status
                      </label>
                      <select
                        value={selectedLead.statusId || ''}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      >
                        {leadStatuses.map(status => (
                          <option key={status.id} value={status.id}>{status.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Admin Notes
                      </label>
                      {selectedLead.notes && selectedLead.notes.length > 0 && (
                        <div className="mb-3 space-y-2 max-h-40 overflow-y-auto">
                          {selectedLead.notes.map((note, index) => (
                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-900 dark:text-white">{note.text}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatDate(note.createdAt)} by {note.createdBy}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <textarea
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="Add a note about this lead..."
                          rows="3"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          onClick={handleAddNote}
                          disabled={!adminNote.trim() || savingNote}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingNote ? 'Saving...' : 'Add Note'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={clearError} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LmsLeads;
