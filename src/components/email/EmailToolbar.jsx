import {
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Star,
  Tag,
  MoreVertical,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const EmailToolbar = ({
  selectedCount = 0,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  onRefresh,
  onSelectAll,
  onClearSelection,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
  onStar,
  onMoveToSpam,
  onAddLabel,
  onPrevPage,
  onNextPage,
  hasSelection = false
}) => {
  const { theme } = useTheme();

  const ActionButton = ({ icon: Icon, label, onClick, disabled = false, danger = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg transition-all duration-200 group relative
        ${disabled
          ? 'opacity-40 cursor-not-allowed'
          : danger
            ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }
      `}
      title={label}
    >
      <Icon className="w-5 h-5" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {label}
      </span>
    </button>
  );

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={hasSelection && selectedCount === totalCount}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectAll?.();
                } else {
                  onClearSelection?.();
                }
              }}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 cursor-pointer"
            />
            {hasSelection && (
              <button
                onClick={onClearSelection}
                className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear ({selectedCount})
              </button>
            )}
          </div>

          {hasSelection ? (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-300 dark:border-gray-700">
              <ActionButton icon={Archive} label="Archive" onClick={onArchive} />
              <ActionButton icon={Trash2} label="Delete" onClick={onDelete} danger />
              <ActionButton icon={MailOpen} label="Mark as read" onClick={onMarkRead} />
              <ActionButton icon={Mail} label="Mark as unread" onClick={onMarkUnread} />
              <ActionButton icon={Star} label="Star" onClick={onStar} />
              <ActionButton icon={AlertCircle} label="Report spam" onClick={onMoveToSpam} danger />
              <ActionButton icon={Tag} label="Add label" onClick={onAddLabel} />
            </div>
          ) : (
            <button
              onClick={onRefresh}
              className="ml-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {totalCount > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {((currentPage - 1) * 50) + 1}-{Math.min(currentPage * 50, totalCount)} of {totalCount}
            </span>
          )}
          
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailToolbar;
