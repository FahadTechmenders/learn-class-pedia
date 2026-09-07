import React from 'react';
import {
  User, Mail, Phone, Globe, ShieldCheck, CheckCircle, Circle, Activity,
  Megaphone, Link as LinkIcon, ExternalLink, LogIn, Compass,
  Clock, CalendarDays, History, Building2, UserCircle
} from 'lucide-react';
import { SectionCard, InfoRow, StatusBadge } from './LeadCardPrimitives';
import { getFullName, hasValue, formatDateTime, formatUrlLabel } from '../leadDetailsHelpers';

const NotProvided = () => <span className="text-gray-400 dark:text-gray-500 italic">Not provided</span>;

export const ContactInformationCard = ({ lead }) => {
  const name = getFullName(lead);
  return (
    <SectionCard title="Contact Information" icon={User}>
      <InfoRow label="Name" icon={User}>{hasValue(name) ? name : <NotProvided />}</InfoRow>
      <InfoRow label="Email" icon={Mail}>
        {hasValue(lead.email) ? (
          <a href={`mailto:${lead.email}`} className="text-blue-600 dark:text-blue-400 hover:underline break-all">{lead.email}</a>
        ) : <NotProvided />}
      </InfoRow>
      <InfoRow label="Phone" icon={Phone}>
        {hasValue(lead.phone) ? (
          <a href={`tel:${(lead.phoneCountryCode ?? '') + (lead.phoneNumber ?? '') || lead.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">{lead.phone}</a>
        ) : <NotProvided />}
      </InfoRow>
      <InfoRow label="Country" icon={Globe}>{hasValue(lead.country) ? lead.country : <NotProvided />}</InfoRow>
    </SectionCard>
  );
};

const VerificationRow = ({ icon: Icon, label, verified, verifiedLabel = 'Verified', pendingLabel = 'Pending verification' }) => (
  <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
    verified
      ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-900/20'
      : 'border-amber-100 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-900/20'
  }`}>
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${verified ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
    </div>
    <StatusBadge tone={verified ? 'success' : 'warning'} icon={verified ? CheckCircle : Circle}>
      {verified ? verifiedLabel : pendingLabel}
    </StatusBadge>
  </div>
);

export const VerificationCard = ({ lead }) => (
  <SectionCard title="Account Verification" icon={ShieldCheck}>
    <div className="space-y-3">
      <VerificationRow icon={Mail} label="Email Verification" verified={lead.isEmailVerified} />
      <VerificationRow icon={Phone} label="Phone Verification" verified={lead.isPhoneVerified} />
      <VerificationRow icon={Activity} label="Account Status" verified={lead.isActive} verifiedLabel="Active" pendingLabel="Inactive" />
    </div>
  </SectionCard>
);

const UrlValue = ({ url }) => {
  const label = formatUrlLabel(url);
  if (!label) return <NotProvided />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={url} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline max-w-full">
      <span className="truncate">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
    </a>
  );
};

export const LeadAcquisitionCard = ({ lead }) => (
  <SectionCard title="Lead Acquisition" icon={Megaphone}>
    <InfoRow label="Landing Page" icon={LinkIcon}><UrlValue url={lead.landingPageUrl} /></InfoRow>
    <InfoRow label="Referral Source" icon={Compass}><UrlValue url={lead.referralUrl} /></InfoRow>
    <InfoRow label="Advertising Medium" icon={Megaphone}>
      {hasValue(lead.advertisingMedium) ? <StatusBadge tone="info">{lead.advertisingMedium}</StatusBadge> : <NotProvided />}
    </InfoRow>
    <InfoRow label="Signup Method" icon={LogIn}>
      {hasValue(lead.signupType) ? <StatusBadge tone="info">{lead.signupType}</StatusBadge> : <NotProvided />}
    </InfoRow>
  </SectionCard>
);

export const CustomerActivityCard = ({ lead }) => {
  const signedUp = formatDateTime(lead.signupDate);
  const lastLogin = formatDateTime(lead.lastLoginDate);
  const updated = formatDateTime(lead.updatedAt);
  return (
    <SectionCard title="Customer Activity" icon={Clock}>
      <InfoRow label="Signed Up" icon={CalendarDays}>{signedUp || <NotProvided />}</InfoRow>
      <InfoRow label="Last Login" icon={LogIn}>{lastLogin || <span className="text-gray-400 dark:text-gray-500 italic">No login recorded</span>}</InfoRow>
      <InfoRow label="Last Updated" icon={History} muted={!updated}>{updated || 'Not updated yet'}</InfoRow>
    </SectionCard>
  );
};

export const InstituteCard = ({ lead }) => {
  if (!hasValue(lead.institute)) return null;
  return (
    <SectionCard title="Institute" icon={Building2}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white break-words">{lead.institute}</div>
      </div>
    </SectionCard>
  );
};

export const ProfileInformationCard = ({ lead }) => {
  const hasHeadline = hasValue(lead.headline);
  const hasBio = hasValue(lead.bio);
  if (!hasHeadline && !hasBio) return null;
  return (
    <SectionCard title="Profile Information" icon={UserCircle}>
      {hasHeadline && <InfoRow label="Headline">{lead.headline}</InfoRow>}
      {hasBio && <InfoRow label="About"><p className="whitespace-pre-wrap leading-relaxed">{lead.bio}</p></InfoRow>}
    </SectionCard>
  );
};
