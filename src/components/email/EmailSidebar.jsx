import React from 'react';
import { 
  Inbox, 
  Send, 
  FileText, 
  Star, 
  AlertCircle, 
  Trash2, 
  Archive,
  Mail,
  Tag,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { EMAIL_FOLDERS, EMAIL_LABELS } from '../../constants/emailConstants';
import { useTheme } from '../../context/ThemeContext';

const EmailSidebar = ({
  currentFolder,
  onFolderChange,
  folderCounts = {},
  isCollapsed = false,
  onToggleCollapse,
  currentLabel = null,
  onLabelChange
}) => {
  const { theme } = useTheme();
  const [showLabels, setShowLabels] = React.useState(true);

  const folders = [
    {
      id: EMAIL_FOLDERS.INBOX,
      label: 'Inbox',
      icon: Inbox,
      count: folderCounts[EMAIL_FOLDERS.INBOX] || 0,
      unreadCount: folderCounts.unread || 0,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: EMAIL_FOLDERS.STARRED,
      label: 'Starred',
      icon: Star,
      count: folderCounts[EMAIL_FOLDERS.STARRED] || 0,
      color: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      id: EMAIL_FOLDERS.IMPORTANT,
      label: 'Important',
      icon: AlertCircle,
      count: folderCounts[EMAIL_FOLDERS.IMPORTANT] || 0,
      color: 'text-red-600 dark:text-red-400'
    },
    {
      id: EMAIL_FOLDERS.SENT,
      label: 'Sent',
      icon: Send,
      count: folderCounts[EMAIL_FOLDERS.SENT] || 0,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      id: EMAIL_FOLDERS.DRAFTS,
      label: 'Drafts',
      icon: FileText,
      count: folderCounts[EMAIL_FOLDERS.DRAFTS] || 0,
      color: 'text-gray-600 dark:text-gray-400'
    },
    {
      id: EMAIL_FOLDERS.SPAM,
      label: 'Spam',
      icon: AlertCircle,
      count: folderCounts[EMAIL_FOLDERS.SPAM] || 0,
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      id: EMAIL_FOLDERS.TRASH,
      label: 'Trash',
      icon: Trash2,
      count: folderCounts[EMAIL_FOLDERS.TRASH] || 0,
      color: 'text-gray-600 dark:text-gray-400'
    },
    {
      id: EMAIL_FOLDERS.ALL,
      label: 'All Mail',
      icon: Mail,
      count: folderCounts[EMAIL_FOLDERS.ALL] || 0,
      color: 'text-purple-600 dark:text-purple-400'
    }
  ];

  const labels = Object.values(EMAIL_LABELS);

  const FolderItem = ({ folder }) => {
    const isActive = currentFolder === folder.id;
    const Icon = folder.icon;
    const showUnread = folder.id === EMAIL_FOLDERS.INBOX && folder.unreadCount > 0;

    return (
      <button
        onClick={() => onFolderChange(folder.id)}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative group
          ${isActive
            ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 font-semibold shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:translate-x-1'
          }
          ${isCollapsed ? 'justify-center' : ''}
        `}
        title={isCollapsed ? folder.label : undefined}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-blue-600 via-blue-500 to-purple-600 rounded-r-full shadow-lg shadow-blue-500/50 animate-pulse" />
        )}
        <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400 scale-110' : folder.color + ' group-hover:scale-105'}`} />
        {!isCollapsed && (
          <>
            <span className={`flex-1 text-left text-sm transition-all duration-300 ${isActive ? 'tracking-wide' : ''}`}>{folder.label}</span>
            {showUnread ? (
              <span className="px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-md shadow-red-500/30 animate-pulse">
                {folder.unreadCount}
              </span>
            ) : folder.count > 0 ? (
              <span className={`
                px-2 py-0.5 text-xs font-semibold rounded-full transition-all duration-300
                ${isActive 
                  ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                }
              `}>
                {folder.count}
              </span>
            ) : null}
          </>
        )}
      </button>
    );
  };

  const LabelItem = ({ label }) => {
    const isActive = currentLabel === label.id;
    const labelColorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      gray: 'bg-gray-500'
    };

    return (
      <button
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative group
          ${isActive
            ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 font-semibold shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:translate-x-1'
          }
        `}
        onClick={() => onLabelChange?.(label.id)}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-blue-600 via-blue-500 to-purple-600 rounded-r-full shadow-lg shadow-blue-500/50 animate-pulse" />
        )}
        <div className={`w-3 h-3 rounded-full ${labelColorClasses[label.color]} ${isActive ? 'scale-110' : 'group-hover:scale-105'} transition-all duration-300`} />
        {!isCollapsed && (
          <span className={`flex-1 text-left text-sm transition-all duration-300 ${isActive ? 'tracking-wide' : ''}`}>{label.name}</span>
        )}
      </button>
    );
  };

  return (
    <div className={`h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-1">
          {folders.map(folder => (
            <FolderItem key={folder.id} folder={folder} />
          ))}
        </div>

        {!isCollapsed && (
          <div className="space-y-1">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              {showLabels ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Tag className="w-4 h-4" />
              <span className="flex-1 text-left text-sm font-medium">Labels</span>
            </button>
            
            {showLabels && (
              <div className="space-y-1 pl-2">
                {labels.map(label => (
                  <LabelItem key={label.id} label={label} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Storage</span>
              <span>2.5 GB / 15 GB</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-1.5 rounded-full" style={{ width: '16.67%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailSidebar;
