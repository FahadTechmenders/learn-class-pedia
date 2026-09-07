import React from 'react';
import { CheckCircle, Circle, Activity, MapPin, Hash, Mail, Phone, CalendarDays, Building2, LogIn } from 'lucide-react';
import { StatusBadge } from './LeadCardPrimitives';
import { getFullName, getInitials, hasValue, formatDate } from '../leadDetailsHelpers';
import { getCustomerTypeIcon } from './LeadsListParts';

const MetaItem = ({ icon: Icon, label, value, muted = false }) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</div>
      <div className={`text-sm font-medium truncate ${muted ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-white'}`}>{value}</div>
    </div>
  </div>
);

const LeadProfileHeader = ({ lead }) => {
  const name = getFullName(lead) || 'Unnamed Lead';
  const initials = getInitials(lead);
  const TypeIcon = getCustomerTypeIcon(lead.customerType);
  const signupDate = formatDate(lead.signupDate);

  return (
    <header className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* Banner: identity in white on gradient */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 lg:px-8 py-6">
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-24 h-24 rounded-2xl ring-4 ring-white/80 dark:ring-gray-800 shadow-xl bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden flex-shrink-0">
            {hasValue(lead.profileImageUrl) ? (
              <img src={lead.profileImageUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white tracking-wide">{initials}</span>
            )}
          </div>

          <div className="flex-1 min-w-0 text-white">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-2xl lg:text-3xl font-bold leading-tight truncate">{name}</h1>
              {hasValue(lead.customerType) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-medium backdrop-blur">
                  <TypeIcon className="w-3.5 h-3.5" />
                  {lead.customerType}
                </span>
              )}
            </div>
            {hasValue(lead.customerTypeDescription) && (
              <p className="mt-1.5 text-sm text-white/80 max-w-2xl">{lead.customerTypeDescription}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge tone={lead.isActive ? 'success' : 'neutral'} icon={Activity}>
                {lead.isActive ? 'Active' : 'Inactive'}
              </StatusBadge>
              <StatusBadge tone={lead.isEmailVerified ? 'success' : 'warning'} icon={lead.isEmailVerified ? CheckCircle : Circle}>
                <Mail className="w-3 h-3" />
                {lead.isEmailVerified ? 'Email Verified' : 'Email Pending'}
              </StatusBadge>
              <StatusBadge tone={lead.isPhoneVerified ? 'success' : 'warning'} icon={lead.isPhoneVerified ? CheckCircle : Circle}>
                <Phone className="w-3 h-3" />
                {lead.isPhoneVerified ? 'Phone Verified' : 'Phone Pending'}
              </StatusBadge>
            </div>
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="px-5 lg:px-8 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 lg:divide-x lg:divide-gray-100 dark:lg:divide-gray-700">
          <MetaItem icon={MapPin} label="Location" value={hasValue(lead.country) ? lead.country : 'Not provided'} muted={!hasValue(lead.country)} />
          <div className="lg:pl-6"><MetaItem icon={Hash} label="Customer ID" value={`#${lead.customerId}`} /></div>
          <div className="lg:pl-6"><MetaItem icon={CalendarDays} label="Signed up" value={signupDate || 'Unknown'} muted={!signupDate} /></div>
          <div className="lg:pl-6"><MetaItem icon={LogIn} label="Signup method" value={hasValue(lead.signupType) ? lead.signupType : 'Not specified'} muted={!hasValue(lead.signupType)} /></div>
          <div className="lg:pl-6"><MetaItem icon={Building2} label="Institute" value={hasValue(lead.institute) ? lead.institute : 'Not provided'} muted={!hasValue(lead.institute)} /></div>
        </div>
      </div>
    </header>
  );
};

export default LeadProfileHeader;
