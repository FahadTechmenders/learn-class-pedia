import  { useState, useEffect } from 'react';
import {
  X,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  Star,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Mail,
  MailOpen,
  Tag,
  ArrowLeft,
  CornerUpLeft,
  CornerUpRight
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import AttachmentPreview from './AttachmentPreview';
import { formatFullDate, formatRecipients } from '../../utils/emailUtils';
import { useTheme } from '../../context/ThemeContext';
import ApiService from '../../services/ApiService';
import { ENDPOINTS } from '../../config/api';

const EmailDetailsPanel = ({
  email,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onStar,
  onMarkRead,
  onAssignLabel
}) => {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [labels, setLabels] = useState([]);
  const [loadingLabels, setLoadingLabels] = useState(false);

  // Fetch labels from API
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        setLoadingLabels(true);
        const response = await ApiService.get(ENDPOINTS.EMAIL_LABELS);
        setLabels(response.data || response || []);
      } catch (error) {
        setLabels([]);
      } finally {
        setLoadingLabels(false);
      }
    };

    fetchLabels();
  }, []);

  const handleDownloadAttachment = async (attachment) => {
    try {
      const fileUrl = attachment.fileUrl || attachment.filePath || attachment.url;
      const fileName = attachment.fileName || attachment.name || 'download';
      
      if (fileUrl) {
        // For images, open in new tab for viewing
        const contentType = attachment.contentType || attachment.type || '';
        if (contentType.startsWith('image/')) {
          window.open(fileUrl, '_blank');
        } else {
          // For other files, trigger download
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert('Unable to download attachment');
      }
    } catch (error) {
      alert('Failed to download attachment');
    }
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
        p-2 rounded-full transition-all duration-200
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
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <ActionButton
              icon={email.read ? MailOpen : Mail}
              label={email.read ? 'Mark as Unread' : 'Mark as Read'}
              onClick={() => onMarkRead?.(email.id, !email.read)}
            />
            <button
              onClick={() => onStar?.(email.id)}
              className={`
                p-2 rounded-full transition-all duration-200
                ${email.starred 
                  ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              title={email.starred ? 'Unstar' : 'Star'}
            >
              <Star 
                className={`w-5 h-5 transition-all ${email.starred ? 'fill-current' : ''}`}
              />
            </button>
            <ActionButton icon={Trash2} label="Delete" onClick={() => onDelete?.(email.id)} danger />
            <div className="relative">
              <button
                onClick={() => setShowLabelMenu(!showLabelMenu)}
                className="p-2 rounded-full transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                title="Assign Label"
              >
                <Tag className="w-5 h-5" />
              </button>
              
              {showLabelMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowLabelMenu(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-30 max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Assign Label
                      </div>
                      {loadingLabels ? (
                        <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                            <span>Loading labels...</span>
                          </div>
                        </div>
                      ) : labels.length > 0 ? (
                        labels.map((label) => (
                          <button
                            key={label.id}
                            onClick={() => {
                              onAssignLabel?.(email.id, label.id);
                              setShowLabelMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            <span 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: label.color || label.bgColor }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                              {label.name}
                            </span>
                            {email.labelId === label.id && (
                              <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No labels available
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <ActionButton icon={CornerUpLeft} label="Reply" onClick={() => onReply?.(email)} />
            <ActionButton icon={Reply} label="Reply All" onClick={() => onReplyAll?.(email)} />
            <ActionButton icon={CornerUpRight} label="Forward" onClick={() => onForward?.(email)} />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 dark:text-white px-4 py-3">
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
                {email.attachments.map((attachment, index) => (
                  <AttachmentPreview
                    key={attachment.id || index}
                    attachment={attachment}
                    onDownload={() => handleDownloadAttachment(attachment)}
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
