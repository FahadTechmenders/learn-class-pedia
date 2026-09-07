import React from 'react';
import { Building2, Mail, Phone, MapPin, CalendarDays, ArrowRight } from 'lucide-react';
import { TiltCard } from './LeadCardPrimitives';
import { LeadAvatar, LeadTypeBadge, VerificationBadges, ActiveBadge } from './LeadsListParts';

const Row = ({ icon: Icon, children, muted = false }) => (
  <div className="flex items-start gap-2.5 min-w-0">
    <Icon className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
    <div className={`text-sm min-w-0 flex-1 break-words ${muted ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-800 dark:text-gray-100'}`}>{children}</div>
  </div>
);

const stop = (e) => e.stopPropagation();

export const LeadMobileCard = ({ lead, onView }) => (
  <TiltCard
    as="article"
    maxTilt={2}
    className="p-4 sm:p-5 flex flex-col gap-4 cursor-pointer"
  >
    <div onClick={() => onView(lead.id)} className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <LeadAvatar initials={lead.initials} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{lead.name}</h3>
            <ActiveBadge active={lead.active} />
          </div>
          <div className="mt-1">
            <LeadTypeBadge type={lead.customerType} />
          </div>
        </div>
      </div>

      {lead.customerTypeDescription && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2" title={lead.customerTypeDescription}>
          {lead.customerTypeDescription}
        </p>
      )}

      <div className="space-y-2.5">
        <Row icon={Building2} muted={!lead.institute}>
          <span className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 not-italic">Institute</span>
          {lead.institute || 'Not provided'}
        </Row>
        {lead.email && (
          <Row icon={Mail}>
            <a href={`mailto:${lead.email}`} onClick={stop} className="hover:text-blue-600 break-all">{lead.email}</a>
          </Row>
        )}
        {lead.phone && (
          <Row icon={Phone}>
            <a href={`tel:${lead.phone}`} onClick={stop} className="hover:text-blue-600">{lead.phone}</a>
          </Row>
        )}
        <Row icon={MapPin} muted={!lead.country}>{lead.country || 'Not provided'}</Row>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Verification</div>
        <VerificationBadges emailVerified={lead.emailVerified} phoneVerified={lead.phoneVerified} />
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 min-w-0">
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {lead.signupDate ? `${lead.signupDate}, ${lead.signupTime}` : 'Signup date unknown'}
            {lead.signupType && <span className="text-gray-400 dark:text-gray-500"> • via {lead.signupType}</span>}
          </span>
        </div>
      </div>
    </div>

    <button
      onClick={() => onView(lead.id)}
      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
    >
      View Lead Details
      <ArrowRight className="w-4 h-4" />
    </button>
  </TiltCard>
);

export const MobileLeadsGrid = ({ leads, onView }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {leads.map((lead) => <LeadMobileCard key={lead.id} lead={lead} onView={onView} />)}
  </div>
);

export default MobileLeadsGrid;
