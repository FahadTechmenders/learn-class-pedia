import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, ArrowRight, Building2, MapPin } from 'lucide-react';
import { LeadAvatar, LeadTypeBadge, VerificationIcons, ActiveBadge } from './LeadsListParts';

const COLUMNS = [
  { key: 'lead', label: 'Lead', sortKey: 'customerName', className: 'min-w-[240px]' },
  { key: 'institute', label: 'Institute', sortKey: 'institute' },
  { key: 'type', label: 'Customer Type', sortKey: 'customerType' },
  { key: 'country', label: 'Country', sortKey: 'country' },
  { key: 'verification', label: 'Verification' },
  { key: 'status', label: 'Status' },
  { key: 'signup', label: 'Signup Date', sortKey: 'signupDate' },
  { key: 'action', label: '', className: 'w-36 text-right' },
];

const SortIcon = ({ active, direction }) => {
  if (!active) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />;
  return direction === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
};

const DesktopLeadsTable = ({ leads, sortBy, sortDirection, onSort, onView }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
    <table className="w-full table-auto">
      <thead className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
        <tr>
          {COLUMNS.map((col) => {
            const sortable = Boolean(col.sortKey);
            const active = sortable && sortBy === col.sortKey;
            return (
              <th
                key={col.key}
                scope="col"
                onClick={sortable ? () => onSort(col.sortKey) : undefined}
                aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap ${sortable ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white' : ''} ${col.className || ''}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.label}
                  {sortable && <SortIcon active={active} direction={sortDirection} />}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/70">
        {leads.map((lead) => (
          <tr
            key={lead.id}
            onClick={() => onView(lead.id)}
            className="group cursor-pointer transition-colors hover:bg-blue-50/40 dark:hover:bg-gray-700/40"
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <LeadAvatar initials={lead.initials} size="sm" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{lead.name}</div>
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} title={lead.phone || undefined} className="block text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 truncate max-w-[220px]">
                      {lead.email}
                    </a>
                  )}
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-sm">
              {lead.institute ? (
                <span className="inline-flex items-center gap-1.5 text-gray-800 dark:text-gray-100">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{lead.institute}</span>
                </span>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not provided</span>
              )}
            </td>
            <td className="px-4 py-3">
              <LeadTypeBadge type={lead.customerType} description={lead.customerTypeDescription} />
            </td>
            <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
              {lead.country ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {lead.country}
                </span>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not provided</span>
              )}
            </td>
            <td className="px-4 py-3">
              <VerificationIcons emailVerified={lead.emailVerified} phoneVerified={lead.phoneVerified} />
            </td>
            <td className="px-4 py-3">
              <ActiveBadge active={lead.active} />
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              {lead.signupDate ? (
                <>
                  <div className="text-sm text-gray-900 dark:text-white">{lead.signupDate}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{lead.signupTime}</div>
                </>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">Unknown</span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={(e) => { e.stopPropagation(); onView(lead.id); }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap"
              >
                View
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default DesktopLeadsTable;
