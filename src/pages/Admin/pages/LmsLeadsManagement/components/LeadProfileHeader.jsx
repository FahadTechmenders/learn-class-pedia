import React from 'react';
import { CheckCircle, Circle, Activity, MapPin, Hash, Mail, Phone } from 'lucide-react';
import { StatusBadge } from './LeadCardPrimitives';
import { getFullName, getInitials, hasValue } from '../leadDetailsHelpers';

const LeadProfileHeader = ({ lead }) => {
  const name = getFullName(lead) || 'Unnamed Lead';
  const initials = getInitials(lead);

  return (
    <header className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 opacity-95" />
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />

      <div className="relative px-5 lg:px-8 pt-14 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <div className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-gray-800 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {hasValue(lead.profileImageUrl) ? (
              <img src={lead.profileImageUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white tracking-wide">{initials}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">{name}</h1>
            {hasValue(lead.customerType) && (
              <p className="text-base font-medium text-blue-700 dark:text-blue-300">{lead.customerType}</p>
            )}
            {hasValue(lead.customerTypeDescription) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{lead.customerTypeDescription}</p>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-col sm:items-end gap-2 text-sm text-gray-600 dark:text-gray-300">
            {hasValue(lead.country) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                {lead.country}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Hash className="w-4 h-4 text-gray-400" />
              Customer #{lead.customerId}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
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
    </header>
  );
};

export default LeadProfileHeader;
