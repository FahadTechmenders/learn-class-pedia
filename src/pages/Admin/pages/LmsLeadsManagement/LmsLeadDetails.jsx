import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Globe,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FileText,
  Tag,
  Link as LinkIcon
} from 'lucide-react';
import useLmsLeadsManagement from '../../../../hooks/api/useLmsLeadsManagement';

const LmsLeadDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    loadingLeadDetails,
    error,
    selectedLead,
    getLeadDetails,
    clearError
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

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Render signup answer based on question type
  const renderAnswer = (answer) => {
    const { questionTypeId, answers, answerText } = answer;

    switch (questionTypeId) {
      case 1: // Single Choice
        return (
          <div>
            {answers && answers.length > 0 && (
              <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                {answers[0]}
              </span>
            )}
            {answerText && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                Other: {answerText}
              </p>
            )}
          </div>
        );
      
      case 2: // Multiple Choice
        return (
          <div>
            {answers && answers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {answers.map((ans, idx) => (
                  <span 
                    key={idx}
                    className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm"
                  >
                    {ans}
                  </span>
                ))}
              </div>
            )}
            {answerText && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                Other: {answerText}
              </p>
            )}
          </div>
        );
      
      case 3: // Text
        return (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {answerText || 'No answer provided'}
          </p>
        );
      
      default:
        return <p className="text-gray-500 dark:text-gray-400">Unknown question type</p>;
    }
  };

  // Loading state
  if (loadingLeadDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Lead Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The LMS lead with ID {customerId} could not be found.
            </p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !selectedLead) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
                  Error Loading Lead Details
                </h3>
                <p className="text-red-800 dark:text-red-300">{error}</p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Back to List
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedLead) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to List
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedLead.customerName || 'Unnamed Lead'}
                </h1>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex flex-col">
                    <span 
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                      title={selectedLead.customerTypeDescription || ''}
                    >
                      {selectedLead.customerType || 'N/A'}
                    </span>
                    {selectedLead.customerTypeDescription && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-3">
                        {selectedLead.customerTypeDescription}
                      </span>
                    )}
                  </div>
                  {selectedLead.institute && (
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
                      <Building className="w-4 h-4" />
                      {selectedLead.institute}
                    </span>
                  )}
                  {selectedLead.isActive ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-xs">
                      <XCircle className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              {selectedLead.profileImageUrl && (
                <img 
                  src={selectedLead.profileImageUrl} 
                  alt={selectedLead.customerName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              Signed up on {formatDate(selectedLead.signupDate)}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Email
              </label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a 
                  href={`mailto:${selectedLead.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {selectedLead.email}
                </a>
                {selectedLead.isEmailVerified && (
                  <CheckCircle className="w-4 h-4 text-green-600" title="Verified" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Phone
              </label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {selectedLead.phone || 'N/A'}
                </span>
                {selectedLead.isPhoneVerified && (
                  <CheckCircle className="w-4 h-4 text-green-600" title="Verified" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Country
              </label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {selectedLead.country || 'N/A'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Signup Type
              </label>
              <span className="text-gray-900 dark:text-white">
                {selectedLead.signupType || 'N/A'}
              </span>
            </div>
            {selectedLead.advertisingMedium && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Advertising Medium
                </label>
                <span className="text-gray-900 dark:text-white">
                  {selectedLead.advertisingMedium}
                </span>
              </div>
            )}
            {selectedLead.landingPageUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Landing Page
                </label>
                <a 
                  href={selectedLead.landingPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <LinkIcon className="w-4 h-4" />
                  View Page
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {selectedLead.referralUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Referral URL
                </label>
                <a 
                  href={selectedLead.referralUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <LinkIcon className="w-4 h-4" />
                  View Source
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {selectedLead.lastLoginDate && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Last Login
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(selectedLead.lastLoginDate)}
                  </span>
                </div>
              </div>
            )}
          </div>
          {selectedLead.headline && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Headline
              </label>
              <p className="text-gray-900 dark:text-white">{selectedLead.headline}</p>
            </div>
          )}
          {selectedLead.bio && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Bio
              </label>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedLead.bio}</p>
            </div>
          )}
        </div>

        {/* Signup Answers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Signup Answers
          </h2>
          {selectedLead.signupAnswers && selectedLead.signupAnswers.length > 0 ? (
            <div className="space-y-6">
              {selectedLead.signupAnswers.map((answer, index) => (
                <div key={answer.questionId || index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {answer.question || 'Untitled Question'}
                    </h3>
                    {answer.questionKey && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        <Tag className="w-3 h-3" />
                        {answer.questionKey}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    {renderAnswer(answer)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                No signup answers available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LmsLeadDetails;
