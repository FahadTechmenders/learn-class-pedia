import React, { useState, useEffect } from 'react';
import {
  X,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  Star,
  MoreVertical,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  Paperclip,
  FolderOpen,
  Inbox,
  Send,
  FileText,
  AlertCircle,
  Mail,
  MailOpen
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import EmailBadge from './EmailBadge';
import AttachmentPreview from './AttachmentPreview';
import { formatFullDate, formatRecipients } from '../../utils/emailUtils';
import { useTheme } from '../../context/ThemeContext';
import emailService from '../../services/emailService';

const EmailDetailsPanel = ({
  email,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onStar,
  onMoveToFolder,
  onMarkRead
}) => {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [folders, setFolders] = useState([]);

  // Icon mapping for folder icons
  const iconMap = {
    'fas fa-inbox': Inbox,
    'fas fa-paper-plane': Send,
    'fas fa-file-alt': FileText,
    'fas fa-trash-alt': Trash2,
    'fas fa-exclamation-circle': AlertCircle
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    const apiFolders = await emailService.getFolders();
    // Map API folders to include Lucide icons
    const mappedFolders = apiFolders.map(folder => ({
      ...folder,
      icon: iconMap[folder.icon] || Inbox
    }));
    setFolders(mappedFolders);
  };

  const handleMoveToFolder = async (folderId) => {
    setShowFolderDropdown(false);
    onMoveToFolder?.(folderId);
  };

  const getCurrentFolderId = () => {
    return email.emailFolderId || null;
  };

  const getCurrentFolderName = () => {
    return email.folderName || null;
  };

  const isStarredFolder = (folder) => {
    return folder.name === 'Starred' && email.starred;
  };

  const isCurrentFolder = (folder) => {
    const currentFolderId = getCurrentFolderId();
    const currentFolderName = getCurrentFolderName();
    
    // Check by ID first, then by name as fallback
    return folder.id === currentFolderId || folder.name === currentFolderName;
  };

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Select an email to view</p>
      </div>
    );
  }

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
      <Icon className="w-5 h-5" />
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ActionButton icon={Archive} label="Archive" onClick={() => onArchive?.(email.id)} />
            <ActionButton icon={Trash2} label="Delete" onClick={() => onDelete?.(email.id)} danger />
            <ActionButton
              icon={email.read ? Mail : MailOpen}
              label={email.read ? 'Mark as Unread' : 'Mark as Read'}
              onClick={() => onMarkRead?.(email.id, !email.read)}
            />
            <button
              onClick={() => onStar?.(email.id)}
              className={`
                p-2 rounded-lg transition-all duration-200 group relative
                ${email.starred 
                  ? 'text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-500' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
                hover:bg-gray-100 dark:hover:bg-gray-800
              `}
              title={email.starred ? 'Unstar' : 'Star'}
            >
              <Star 
                className={`w-5 h-5 transition-all ${email.starred ? 'fill-current' : ''}`}
              />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {email.starred ? 'Unstar' : 'Star'}
              </span>
            </button>
            <div className="relative">
              <ActionButton 
                icon={FolderOpen} 
                label="Move to Folder" 
                onClick={() => setShowFolderDropdown(!showFolderDropdown)} 
              />
              
              {showFolderDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowFolderDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                    {folders.map((folder) => {
                      const FolderIcon = folder.icon;
                      const isCurrent = isCurrentFolder(folder);
                      const isStarred = isStarredFolder(folder);
                      const isSelected = isCurrent || isStarred;
                      return (
                        <button
                          key={folder.id}
                          onClick={() => handleMoveToFolder(folder.id)}
                          disabled={isSelected}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                            isSelected
                              ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                          }`}
                        >
                          <FolderIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white flex-1">
                            {folder.name}
                          </span>
                          {isSelected && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
            <ActionButton icon={Printer} label="Print" onClick={() => window.print()} />
            <ActionButton icon={Download} label="Download" onClick={() => {}} />
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {email.subject}
        </h1>

        {email.labelDetails && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: email.labelDetails.bgColor || email.labelDetails.color }}
            >
              <span className="w-2 h-2 rounded-full bg-white/30" />
              {email.labelDetails.name}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          <div className="flex items-start gap-4 mb-6">
            <UserAvatar user={email.from} size="lg" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {email.from.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {email.from.email}
                  </p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFullDate(email.timestamp)}
                </span>
              </div>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mt-2"
              >
                <span>to {formatRecipients(email.to)}</span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showDetails && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm space-y-2">
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300 w-16">From:</span>
                    <span className="text-gray-600 dark:text-gray-400">{email.from.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300 w-16">To:</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {email.to.map(r => r.email).join(', ')}
                    </span>
                  </div>
                  {email.cc && email.cc.length > 0 && (
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-16">Cc:</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {email.cc.map(r => r.email).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300 w-16">Date:</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatFullDate(email.timestamp)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {email.hasAttachments && email.attachments && email.attachments.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {email.attachments.map(attachment => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                    onDownload={() => console.log('Download', attachment)}
                  />
                ))}
              </div>
            </div>
          )}

          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onReply?.(email)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <Reply className="w-4 h-4" />
            <span className="text-sm font-medium">Reply</span>
          </button>
          <button
            onClick={() => onReplyAll?.(email)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <ReplyAll className="w-4 h-4" />
            <span className="text-sm font-medium">Reply All</span>
          </button>
          <button
            onClick={() => onForward?.(email)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <Forward className="w-4 h-4" />
            <span className="text-sm font-medium">Forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailDetailsPanel;
