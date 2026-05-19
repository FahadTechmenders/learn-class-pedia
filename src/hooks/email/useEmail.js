import { useState, useCallback, useEffect } from 'react';
import emailService from '../../services/emailService';
import { EMAIL_FOLDERS } from '../../constants/emailConstants';

export const useEmail = () => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [folderCounts, setFolderCounts] = useState({});
  const [selectedEmails, setSelectedEmails] = useState([]);

  const fetchEmails = useCallback(async (folder = EMAIL_FOLDERS.INBOX, filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await emailService.getEmails(folder, filters);
      setEmails(result.emails);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmailById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const email = await emailService.getEmailById(id);
      setSelectedEmail(email);
      await emailService.markAsRead([id]);
      return email;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmailThread = useCallback(async (threadId) => {
    try {
      setLoading(true);
      setError(null);
      const thread = await emailService.getEmailThread(threadId);
      return thread;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (emailIds) => {
    try {
      await emailService.markAsRead(emailIds);
      setEmails(prev => prev.map(email =>
        emailIds.includes(email.id) ? { ...email, read: true } : email
      ));
      if (selectedEmail && emailIds.includes(selectedEmail.id)) {
        setSelectedEmail(prev => ({ ...prev, read: true }));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [selectedEmail]);

  const markAsUnread = useCallback(async (emailIds) => {
    try {
      await emailService.markAsUnread(emailIds);
      setEmails(prev => prev.map(email =>
        emailIds.includes(email.id) ? { ...email, read: false } : email
      ));
      if (selectedEmail && emailIds.includes(selectedEmail.id)) {
        setSelectedEmail(prev => ({ ...prev, read: false }));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [selectedEmail]);

  const toggleStar = useCallback(async (emailIds) => {
    try {
      await emailService.toggleStar(emailIds);
      setEmails(prev => prev.map(email =>
        emailIds.includes(email.id) ? { ...email, starred: !email.starred } : email
      ));
      if (selectedEmail && emailIds.includes(selectedEmail.id)) {
        setSelectedEmail(prev => ({ ...prev, starred: !prev.starred }));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [selectedEmail]);

  const toggleImportant = useCallback(async (emailIds) => {
    try {
      await emailService.toggleImportant(emailIds);
      setEmails(prev => prev.map(email =>
        emailIds.includes(email.id) ? { ...email, important: !email.important } : email
      ));
      if (selectedEmail && emailIds.includes(selectedEmail.id)) {
        setSelectedEmail(prev => ({ ...prev, important: !prev.important }));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [selectedEmail]);

  const deleteEmails = useCallback(async (emailIds) => {
    try {
      await emailService.deleteEmails(emailIds);
      setEmails(prev => prev.filter(email => !emailIds.includes(email.id)));
      if (selectedEmail && emailIds.includes(selectedEmail.id)) {
        setSelectedEmail(null);
      }
      setSelectedEmails([]);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [selectedEmail]);

  const archiveEmails = useCallback(async (emailIds) => {
    try {
      await emailService.archiveEmails(emailIds);
      setEmails(prev => prev.filter(email => !emailIds.includes(email.id)));
      if (selectedEmail && emailIds.includes(selectedEmail.id)) {
        setSelectedEmail(null);
      }
      setSelectedEmails([]);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [selectedEmail]);

  const moveToSpam = useCallback(async (emailIds) => {
    try {
      await emailService.moveToSpam(emailIds);
      setEmails(prev => prev.filter(email => !emailIds.includes(email.id)));
      if (selectedEmail && emailIds.includes(selectedEmail.id)) {
        setSelectedEmail(null);
      }
      setSelectedEmails([]);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [selectedEmail]);

  const moveToFolder = useCallback(async (emailIds, folder) => {
    try {
      await emailService.moveToFolder(emailIds, folder);
      setEmails(prev => prev.filter(email => !emailIds.includes(email.id)));
      setSelectedEmails([]);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const addLabel = useCallback(async (emailIds, label) => {
    try {
      await emailService.addLabel(emailIds, label);
      setEmails(prev => prev.map(email =>
        emailIds.includes(email.id)
          ? { ...email, labels: [...new Set([...email.labels, label])] }
          : email
      ));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeLabel = useCallback(async (emailIds, label) => {
    try {
      await emailService.removeLabel(emailIds, label);
      setEmails(prev => prev.map(email =>
        emailIds.includes(email.id)
          ? { ...email, labels: email.labels.filter(l => l !== label) }
          : email
      ));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const sendEmail = useCallback(async (emailData) => {
    try {
      setLoading(true);
      const result = await emailService.sendEmail(emailData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDraft = useCallback(async (emailData) => {
    try {
      const result = await emailService.saveDraft(emailData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchFolderCounts = useCallback(async () => {
    try {
      const counts = await emailService.getFolderCounts();
      setFolderCounts(counts);
      return counts;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const toggleEmailSelection = useCallback((emailId) => {
    setSelectedEmails(prev =>
      prev.includes(emailId)
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  }, []);

  const selectAllEmails = useCallback(() => {
    setSelectedEmails(emails.map(email => email.id));
  }, [emails]);

  const clearSelection = useCallback(() => {
    setSelectedEmails([]);
  }, []);

  return {
    emails,
    selectedEmail,
    loading,
    error,
    folderCounts,
    selectedEmails,
    fetchEmails,
    fetchEmailById,
    fetchEmailThread,
    markAsRead,
    markAsUnread,
    toggleStar,
    toggleImportant,
    deleteEmails,
    archiveEmails,
    moveToSpam,
    moveToFolder,
    addLabel,
    removeLabel,
    sendEmail,
    saveDraft,
    fetchFolderCounts,
    toggleEmailSelection,
    selectAllEmails,
    clearSelection,
    setSelectedEmail
  };
};
