import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, SearchX } from 'lucide-react';
import useLmsLeadsManagement from '../../../../hooks/api/useLmsLeadsManagement';
import LeadProfileHeader from './components/LeadProfileHeader';
import {
  ContactInformationCard,
  VerificationCard,
  LeadAcquisitionCard,
  CustomerActivityCard,
  InstituteCard,
  ProfileInformationCard
} from './components/LeadInfoCards';
import SignupQuestionnaire from './components/SignupQuestionnaire';
import LeadJourneyVisualization from './components/LeadJourneyVisualization';
import LeadDetailsSkeleton from './components/LeadDetailsSkeleton';

const PageShell = ({ children }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
    <div className="max-w-7xl mx-auto">{children}</div>
  </div>
);

const Toolbar = ({ onBack, onRefresh, refreshing, disabled }) => (
  <div className="flex items-center justify-between mb-5">
    <button
      onClick={onBack}
      className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Leads
    </button>
    <button
      onClick={onRefresh}
      disabled={refreshing || disabled}
      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  </div>
);

const StateCard = ({ icon: Icon, tone, title, message, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 sm:p-10 text-center max-w-xl mx-auto">
    <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${tone}`}>
      <Icon className="w-7 h-7" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{title}</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
    <div className="flex flex-wrap justify-center gap-3">{children}</div>
  </div>
);

const LmsLeadDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    loadingLeadDetails,
    error,
    selectedLead,
    getLeadDetails
  } = useLmsLeadsManagement();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Load lead details
  const loadDetails = useCallback(async () => {
    try {
      setNotFound(false);
      await getLeadDetails(parseInt(customerId));
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      }
      console.error('Failed to load lead details:', err);
    }
  }, [customerId, getLeadDetails]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Refresh details
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadDetails();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDetails]);

  // Go back to list, preserving query state
  const handleBack = useCallback(() => {
    // Try to preserve the previous list state from location.state or fallback to /admin/lms-leads
    const from = location.state?.from || '/admin/lms-leads';
    navigate(from);
  }, [navigate, location.state]);

  const primaryButton = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';
  const secondaryButton = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';

  if (loadingLeadDetails && !selectedLead) {
    return (
      <PageShell>
        <Toolbar onBack={handleBack} onRefresh={handleRefresh} refreshing disabled />
        <LeadDetailsSkeleton />
      </PageShell>
    );
  }

  if (notFound) {
    return (
      <PageShell>
        <Toolbar onBack={handleBack} onRefresh={handleRefresh} refreshing={isRefreshing} />
        <StateCard
          icon={SearchX}
          tone="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
          title="Lead not found"
          message={`We couldn't find an LMS lead with customer ID ${customerId}. It may have been removed.`}
        >
          <button onClick={handleBack} className={primaryButton}>
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </button>
        </StateCard>
      </PageShell>
    );
  }

  if (error && !selectedLead) {
    return (
      <PageShell>
        <Toolbar onBack={handleBack} onRefresh={handleRefresh} refreshing={isRefreshing} />
        <StateCard
          icon={AlertCircle}
          tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
          title="Unable to load lead details."
          message="We couldn't retrieve this lead's information. Please try again."
        >
          <button onClick={handleRefresh} className={primaryButton} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Retry
          </button>
          <button onClick={handleBack} className={secondaryButton}>Back to Leads</button>
        </StateCard>
      </PageShell>
    );
  }

  if (!selectedLead) return null;

  const lead = selectedLead;

  return (
    <PageShell>
      <Toolbar onBack={handleBack} onRefresh={handleRefresh} refreshing={isRefreshing} />

      <div className="space-y-6">
        <LeadProfileHeader lead={lead} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContactInformationCard lead={lead} />
          <VerificationCard lead={lead} />
          <LeadAcquisitionCard lead={lead} />
          <CustomerActivityCard lead={lead} />
          <InstituteCard lead={lead} />
          <ProfileInformationCard lead={lead} />
        </div>

        <SignupQuestionnaire answers={lead.signupAnswers} />

        <LeadJourneyVisualization lead={lead} />
      </div>
    </PageShell>
  );
};

export default LmsLeadDetails;
