import { useState } from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  RefreshCw, 
  Archive, 
  Trash2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import EmailRow from './EmailRow';
import EmptyState from './EmptyState';
const EmailList = ({
  emails = [],
  loading = false,
  selectedEmails = [],
  activeEmailId = null,
  onEmailSelect,
  onEmailClick,
  onStarToggle,
  emptyStateType = 'inbox',
  searchTerm = '',
  onSearch,
  onFilterToggle,
  showFilters = false,
  onRefresh,
  onSelectAll,
  onClearSelection,
  onArchive,
  onDelete,
  onMoveToSpam,
  currentPage = 1,
  totalEmails = 0,
  unreadCount = 0,
  pageSize = 25,
  onPageChange
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClearSearch = () => {
    onSearch?.('');
  };

  const isAllSelected = emails.length > 0 && selectedEmails.length === emails.length;
  const isSomeSelected = selectedEmails.length > 0 && selectedEmails.length < emails.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectAll?.();
    } else {
      onClearSelection?.();
    }
  };

  const ActionButton = ({ icon: Icon, label, onClick, danger = false }) => (
    <button
      onClick={onClick}
      className={`
        p-2 rounded-lg transition-all duration-200 group relative
        ${danger
          ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }
      `}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {label}
      </span>
    </button>
  );

  const hasSelection = selectedEmails.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar with Actions */}
      <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected;
            }}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 cursor-pointer"
          />

          {!hasSelection && unreadCount > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {unreadCount} unread
              </span>
            </div>
          )}

          {hasSelection && (
            <div className="flex items-center gap-1 mr-2">
              <ActionButton icon={Archive} label="Archive" onClick={onArchive} />
              <ActionButton icon={Trash2} label="Delete" onClick={onDelete} danger />
              <ActionButton icon={AlertCircle} label="Report spam" onClick={onMoveToSpam} danger />
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                {selectedEmails.length} selected
              </span>
            </div>
          )}
          
          <div className={`
            flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
            ${isFocused
              ? 'border-blue-500 dark:border-blue-400 shadow-md shadow-blue-500/20 bg-white dark:bg-gray-800'
              : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
            }
          `}>
            <Search className={`w-4 h-4 flex-shrink-0 ${isFocused ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearch?.(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search emails..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onFilterToggle}
              className={`
                p-1.5 rounded-lg transition-all duration-200
                ${showFilters
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500'
                }
              `}
              title="Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        { !emails || emails.length === 0 ? (
          <EmptyState type={emptyStateType} searchTerm={searchTerm} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {emails.map(email => (
              <EmailRow
                key={email.id}
                email={email}
                isSelected={selectedEmails.includes(email.id)}
                isActive={activeEmailId === email.id}
                onSelect={onEmailSelect}
                onClick={onEmailClick}
                onStarToggle={onStarToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalEmails > 0 && (
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalEmails)} of {totalEmails}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Page {currentPage} of {Math.ceil(totalEmails / pageSize)}
              </span>
              <button
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalEmails / pageSize)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailList;
