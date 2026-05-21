import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Mail, Edit, Menu, X } from 'lucide-react';
import { useEmail } from '../../../../hooks/email/useEmail';
import { EMAIL_FOLDERS } from '../../../../constants/emailConstants';
import EmailSidebar from '../../../../components/email/EmailSidebar';
import EmailList from '../../../../components/email/EmailList';
import EmailDetailsPanel from '../../../../components/email/EmailDetailsPanel';
import ComposeEmailDrawer from '../../../../components/email/ComposeEmailDrawer';
import { useTheme } from '../../../../context/ThemeContext';
import emailService from '../../../../services/emailService';

const Email = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { theme } = useTheme();

  const {
    emails,
    selectedEmail,
    loading,
    folderCounts,
    selectedEmails,
    fetchEmails,
    fetchEmailById,
    markAsRead,
    markAsUnread,
    toggleStar,
    deleteEmails,
    archiveEmails,
    moveToSpam,
    moveToFolder,
    sendEmail,
    saveDraft,
    fetchFolderCounts,
    toggleEmailSelection,
    selectAllEmails,
    clearSelection,
    setSelectedEmail
  } = useEmail();

  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentLabel, setCurrentLabel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState('compose');
  const [composeInitialData, setComposeInitialData] = useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showEmailDetails, setShowEmailDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageSize] = useState(50);
  const [foldersLoaded, setFoldersLoaded] = useState(false);

  // Load folders on mount
  useEffect(() => {
    const initFolders = async () => {
      await emailService.getFolders();
      setFoldersLoaded(true);
    };
    initFolders();
  }, []);

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const folder = pathParts[pathParts.length - 1];
    
    if (folder && Object.values(EMAIL_FOLDERS).includes(folder)) {
      setCurrentFolder(folder);
    } else if (location.pathname === '/admin/email') {
      setCurrentFolder(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Only load emails if folders have been loaded
    if (!foldersLoaded) return;
    
    setCurrentPage(1);
    loadEmails();
    // Removed loadFolderCounts() - not needed since we don't display counts in sidebar
  }, [currentFolder, currentLabel, searchTerm, foldersLoaded]);

  useEffect(() => {
    loadEmails();
  }, [currentPage]);

  useEffect(() => {
    if (id) {
      loadEmailById(id);
      setShowEmailDetails(true);
    } else {
      setSelectedEmail(null);
      setShowEmailDetails(false);
    }
  }, [id]);

  const loadEmails = async () => {
    try {
      // Don't load emails if no folder is selected and no label is selected
      if (!currentFolder && !currentLabel) {
        setTotalEmails(0);
        setUnreadCount(0);
        return;
      }

      const filters = {
        page: currentPage,
        pageSize: pageSize
      };

      if (searchTerm) {
        filters.search = searchTerm;
      }

      if (currentLabel) {
        filters.labelTypeId = currentLabel;
      }

      // When label is selected, don't pass folder parameter
      const folder = currentLabel ? null : currentFolder;

      const result = await fetchEmails(folder, filters);
      setTotalEmails(result?.total || 0);
      setUnreadCount(result?.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load emails:', error);
    }
  };

  const loadEmailById = async (emailId) => {
    try {
      // Check if email is already read before fetching
      const currentEmail = emails.find(e => e.id === emailId);
      const wasUnread = currentEmail && !currentEmail.read;
      
      await fetchEmailById(emailId);
      
      // Only reload list and counts if email was previously unread
      // This avoids unnecessary API calls when viewing already-read emails
      if (wasUnread) {
        setTimeout(() => {
          loadEmails();
          loadFolderCounts();
        }, 300);
      }
    } catch (error) {
      console.error('Failed to load email:', error);
    }
  };

  const loadFolderCounts = async () => {
    try {
      await fetchFolderCounts();
    } catch (error) {
      console.error('Failed to load folder counts:', error);
    }
  };

  const handleFolderChange = (folder) => {
    setCurrentFolder(folder);
    setCurrentLabel(null);
    setCurrentPage(1);
    navigate(`/admin/email/${folder}`);
    setShowMobileSidebar(false);
  };

  const handleLabelChange = (labelId) => {
    setCurrentLabel(labelId);
    setCurrentFolder(EMAIL_FOLDERS.INBOX);
    setCurrentPage(1);
    setShowMobileSidebar(false);
  };

  const handleEmailClick = (email) => {
    navigate(`/admin/email/${currentFolder}/${email.id}`);
  };

  const handleCloseDetails = () => {
    navigate(`/admin/email/${currentFolder}`);
  };

  const handleCompose = () => {
    setComposeMode('compose');
    setComposeInitialData(null);
    setShowCompose(true);
  };

  const handleReply = (email) => {
    setComposeMode('reply');
    setComposeInitialData({
      to: email.from.email,
      subject: `Re: ${email.subject}`,
      body: `\n\n---\nOn ${new Date(email.timestamp).toLocaleString()}, ${email.from.name} wrote:\n${email.body}`
    });
    setShowCompose(true);
  };

  const handleReplyAll = (email) => {
    setComposeMode('replyAll');
    const recipients = [email.from, ...email.to.filter(r => r.email !== 'you@company.com')];
    setComposeInitialData({
      to: recipients.map(r => r.email).join(', '),
      cc: email.cc?.map(r => r.email).join(', ') || '',
      subject: `Re: ${email.subject}`,
      body: `\n\n---\nOn ${new Date(email.timestamp).toLocaleString()}, ${email.from.name} wrote:\n${email.body}`
    });
    setShowCompose(true);
  };

  const handleForward = (email) => {
    setComposeMode('forward');
    setComposeInitialData({
      subject: `Fwd: ${email.subject}`,
      body: `\n\n---\nForwarded message from ${email.from.name}:\n${email.body}`
    });
    setShowCompose(true);
  };

  const handleSendEmail = async (emailData) => {
    try {
      await sendEmail(emailData);
      await loadEmails();
      await loadFolderCounts();
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  };

  const handleSaveDraft = async (emailData) => {
    try {
      await saveDraft(emailData);
      await loadFolderCounts();
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedEmails.length === 0) return;

    try {
      switch (action) {
        case 'markRead':
          await markAsRead(selectedEmails);
          break;
        case 'markUnread':
          await markAsUnread(selectedEmails);
          break;
        case 'archive':
          await archiveEmails(selectedEmails);
          break;
        case 'delete':
          await Promise.all(selectedEmails.map(id => deleteEmails(id)));
          break;
        case 'spam':
          await moveToSpam(selectedEmails);
          break;
        case 'star':
          await toggleStar(selectedEmails);
          break;
      }
      await loadEmails();
      await loadFolderCounts();
      clearSelection();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleStarToggle = async (emailId) => {
    try {
      await toggleStar(emailId);
      await loadEmails();
      await loadFolderCounts();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex overflow-hidden my-4 rounded-md ">
        <div className={`
          ${showMobileSidebar ? 'fixed inset-0 z-30 bg-white dark:bg-gray-900' : 'hidden'}
          lg:block lg:relative
        `}>
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email</h2>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <EmailSidebar
            currentFolder={currentFolder}
            onFolderChange={(folder) => {
              handleFolderChange(folder);
              setShowMobileSidebar(false);
            }}
            folderCounts={folderCounts}
            currentLabel={currentLabel}
            onLabelChange={handleLabelChange}
            unreadCount={unreadCount}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="lg:hidden flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {currentFolder}
            </h1>
          </div>

          <div className=" flex overflow-hidden h-screen">
            <div className={`
              
              w-[456px] bg-white dark:bg-gray-900 flex-shrink-0
            `}>
              <EmailList
                emails={emails}
                loading={loading}
                selectedEmails={selectedEmails}
                activeEmailId={id ? parseInt(id) : null}
                onEmailSelect={toggleEmailSelection}
                onEmailClick={handleEmailClick}
                onStarToggle={handleStarToggle}
                emptyStateType={currentFolder}
                searchTerm={searchTerm}
                onSearch={setSearchTerm}
                onFilterToggle={() => setShowFilters(!showFilters)}
                showFilters={showFilters}
                onRefresh={loadEmails}
                onSelectAll={selectAllEmails}
                onClearSelection={clearSelection}
                onMarkRead={() => handleBulkAction('markRead')}
                onMarkUnread={() => handleBulkAction('markUnread')}
                onArchive={() => handleBulkAction('archive')}
                onDelete={() => handleBulkAction('delete')}
                onMoveToSpam={() => handleBulkAction('spam')}
                onAddLabel={() => console.log('Add label')}
                currentPage={currentPage}
                totalEmails={totalEmails}
                unreadCount={unreadCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>

            <div className={`
              ${showEmailDetails ? 'flex-1' : 'hidden'}
              lg:block lg:flex-1 border-l border-gray-200 dark:border-gray-800 overflow-hidden
            `}>
              <EmailDetailsPanel
                email={selectedEmail}
                onClose={handleCloseDetails}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onArchive={async () => {
                  await archiveEmails([selectedEmail.id]);
                  handleCloseDetails();
                  await loadEmails();
                }}
                onDelete={async () => {
                  await deleteEmails(selectedEmail.id);
                  handleCloseDetails();
                  await loadEmails();
                }}
                onStar={async () => {
                  // toggleStar already updates local state in useEmail hook
                  await toggleStar(selectedEmail.id);
                  // No need to reload entire list or refresh details
                }}
                onMarkRead={async (emailId, isRead) => {
                  // markAsRead already updates local state in useEmail hook
                  await markAsRead([emailId], isRead);
                  // Note: Folder counts will be updated on next email list refresh
                  // Removed loadFolderCounts() to avoid triggering unnecessary reloads
                }}
                onMoveToFolder={async (folderId) => {
                  await moveToFolder(selectedEmail.id, folderId);
                  handleCloseDetails();
                  await loadEmails();
                  await loadFolderCounts();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleCompose}
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-200 hover:scale-110 z-30"
      >
        <Edit className="w-6 h-6" />
      </button>

      <ComposeEmailDrawer
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        initialData={composeInitialData}
        mode={composeMode}
      />
    </div>
  );
};

export default Email;
