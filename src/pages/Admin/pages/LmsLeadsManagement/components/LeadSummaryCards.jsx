import React from 'react';
import { BadgeCheck, LogIn, Globe, CalendarDays } from 'lucide-react';
import { TiltCard } from './LeadCardPrimitives';
import { formatDate, formatTime, hasValue } from '../leadDetailsHelpers';

const LeadSummaryCard = ({ icon: Icon, label, value, support, accent }) => (
  <TiltCard className="p-4 lg:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
        <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white truncate">{value}</div>
        {support && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{support}</div>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </TiltCard>
);

const LeadSummaryCards = ({ lead }) => {
  const signupDate = formatDate(lead.signupDate);
  const signupTime = formatTime(lead.signupDate);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <LeadSummaryCard
        icon={BadgeCheck}
        label="Customer Type"
        value={hasValue(lead.customerType) ? lead.customerType : 'Not provided'}
        support={lead.customerTypeDescription}
        accent="bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
      />
      <LeadSummaryCard
        icon={LogIn}
        label="Signup Method"
        value={hasValue(lead.signupType) ? lead.signupType : 'Not provided'}
        accent="bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300"
      />
      <LeadSummaryCard
        icon={Globe}
        label="Country"
        value={hasValue(lead.country) ? lead.country : 'Not provided'}
        accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
      />
      <LeadSummaryCard
        icon={CalendarDays}
        label="Signed Up"
        value={signupDate || 'Not provided'}
        support={signupTime}
        accent="bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
      />
    </div>
  );
};

export default LeadSummaryCards;
