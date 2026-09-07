import React from 'react';
import {
  UserPlus, Users, Building2, BookOpen, GraduationCap, Rocket, User,
  Mail, Phone, CheckCircle, Circle, Activity, Layers, FileText, RefreshCw,
  SearchX, AlertCircle, X
} from 'lucide-react';
import { StatusBadge } from './LeadCardPrimitives';

const TYPE_ICON_RULES = [
  { test: /institute|school|university|owner/i, icon: Building2 },
  { test: /learner.*author|author.*learner/i, icon: GraduationCap },
  { test: /author|publisher|writer/i, icon: BookOpen },
  { test: /leap|signup|business/i, icon: Rocket },
];

export const getCustomerTypeIcon = (customerType) => {
  if (!customerType) return User;
  const rule = TYPE_ICON_RULES.find((r) => r.test.test(customerType));
  return rule ? rule.icon : Users;
};

export const LeadAvatar = ({ initials, size = 'md' }) => {
  const sizes = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className={`${sizes[size]} rounded-full flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-800`}>
      {initials}
    </div>
  );
};

export const LeadTypeBadge = ({ type, description, showDescription = false, clamp = 2 }) => {
  if (!type) return <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not specified</span>;
  const Icon = getCustomerTypeIcon(type);
  return (
    <div className="min-w-0">
      <span
        title={description || undefined}
        className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800"
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{type}</span>
      </span>
      {showDescription && description && (
        <p className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${clamp === 1 ? 'line-clamp-1' : 'line-clamp-2'}`} title={description}>
          {description}
        </p>
      )}
    </div>
  );
};

export const VerificationBadges = ({ emailVerified, phoneVerified, compact = false }) => (
  <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'flex-col items-start sm:flex-row sm:items-center'}`}>
    <StatusBadge tone={emailVerified ? 'success' : 'warning'} icon={emailVerified ? CheckCircle : Circle}>
      <Mail className="w-3 h-3" />
      {compact ? (emailVerified ? 'Email ✓' : 'Email') : (emailVerified ? 'Email Verified' : 'Email Pending')}
    </StatusBadge>
    <StatusBadge tone={phoneVerified ? 'success' : 'warning'} icon={phoneVerified ? CheckCircle : Circle}>
      <Phone className="w-3 h-3" />
      {compact ? (phoneVerified ? 'Phone ✓' : 'Phone') : (phoneVerified ? 'Phone Verified' : 'Phone Pending')}
    </StatusBadge>
  </div>
);

const VerificationIcon = ({ icon: Icon, verified, label }) => (
  <span
    title={`${label}: ${verified ? 'Verified' : 'Pending verification'}`}
    aria-label={`${label} ${verified ? 'verified' : 'pending'}`}
    className={`relative inline-flex items-center justify-center w-7 h-7 rounded-lg border ${
      verified
        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300'
        : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-500'
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {verified && <CheckCircle className="absolute -top-1 -right-1 w-3 h-3 text-emerald-600 bg-white dark:bg-gray-800 rounded-full" />}
  </span>
);

export const VerificationIcons = ({ emailVerified, phoneVerified }) => (
  <div className="inline-flex items-center gap-1.5">
    <VerificationIcon icon={Mail} verified={emailVerified} label="Email" />
    <VerificationIcon icon={Phone} verified={phoneVerified} label="Phone" />
  </div>
);

export const ActiveBadge = ({ active }) => (
  <StatusBadge tone={active ? 'success' : 'neutral'} icon={Activity}>
    {active ? 'Active' : 'Inactive'}
  </StatusBadge>
);

export const LeadsPageHeader = ({ totalRecords, onRefresh, refreshing }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
        <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
          <UserPlus className="w-5 h-5" />
        </span>
        LMS Leads
      </h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-xl">
        Manage and review ClassPedia signups, prospects and potential LMS customers.
      </p>
    </div>
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{totalRecords.toLocaleString()}</div>
        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-1">Total Leads</div>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        title="Refresh"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  </div>
);

const SummaryCard = ({ icon: Icon, label, value, hint, accent }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">{label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{hint}</div>}
    </div>
  </div>
);

export const LeadsSummaryCards = ({ totalRecords, customerTypesCount, leads }) => {
  const verifiedEmails = leads.filter((l) => l.emailVerified).length;
  const activeLeads = leads.filter((l) => l.active).length;
  const pageValue = (count) => (leads.length ? `${count} / ${leads.length}` : '—');

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
      <SummaryCard icon={Users} label="Total Leads" value={totalRecords.toLocaleString()} hint="All LMS leads" accent="bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" />
      <SummaryCard icon={Layers} label="Customer Types" value={customerTypesCount ?? '—'} hint="Available lead types" accent="bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300" />
      <SummaryCard icon={Mail} label="Verified Emails · Current Page" value={pageValue(verifiedEmails)} hint="Loaded records only" accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300" />
      <SummaryCard icon={Activity} label="Active Leads · Current Page" value={pageValue(activeLeads)} hint="Loaded records only" accent="bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" />
    </div>
  );
};

export const LeadsEmptyState = ({ hasFilters, onClear }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-14 text-center">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-300 flex items-center justify-center mb-4">
      {hasFilters ? <SearchX className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No LMS leads found</h3>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      {hasFilters ? 'Try changing your search or filters.' : 'New signups will appear here once they register.'}
    </p>
    {hasFilters && (
      <button onClick={onClear} className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
        <X className="w-4 h-4" />
        Clear Filters
      </button>
    )}
  </div>
);

export const LeadsErrorState = ({ onRetry, retrying }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-14 text-center">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-4">
      <AlertCircle className="w-7 h-7" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Unable to load LMS leads</h3>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">We couldn't retrieve the leads right now.</p>
    <button onClick={onRetry} disabled={retrying} className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
      <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
      Retry
    </button>
  </div>
);
