import { EMAIL_FOLDERS, EMAIL_STATUS } from '../constants/emailConstants';
import { API_CONFIG, ENDPOINTS } from '../config/api';
import appSettings from '../config/appSettings';

class EmailService {
  constructor() {
    this.folderIdMap = {
      [EMAIL_FOLDERS.INBOX]: 1,
      [EMAIL_FOLDERS.SENT]: 2,
      [EMAIL_FOLDERS.DRAFTS]: 3,
      [EMAIL_FOLDERS.TRASH]: 4
    };
    this.dynamicFolderMap = {}; // Will be populated from API
    // Use local URL in development, production URL otherwise
    this.baseUrl = appSettings.environment === 'development' 
      ? API_CONFIG.BASE_URL_Local 
      : API_CONFIG.BASE_URL;
  }

  // Update folder map from API
  updateFolderMap(folders) {
    const slugMap = {
      'Inbox': 'inbox',
      'Sent': 'sent',
      'Drafts': 'drafts',
      'Trash': 'trash',
      'Spam': 'spam',
      'All Mail': 'all',
      'Outbound': 'Outbound'
    };
    
    folders.forEach(folder => {
      const slug = slugMap[folder.name] || folder.name.toLowerCase();
      this.dynamicFolderMap[slug] = folder.id;
    });
  }

  transformApiEmail(apiEmail) {
    return {
      id: apiEmail.id,
      threadId: `thread-${apiEmail.id}`,
      from: {
        name: apiEmail.fromEmail?.split('@')[0] || 'Unknown',
        email: apiEmail.fromEmail || '',
        avatar: null
      },
      to: apiEmail.toEmail ? [{ email: apiEmail.toEmail, name: apiEmail.toEmail.split('@')[0] }] : [],
      cc: apiEmail.ccEmail ? [{ email: apiEmail.ccEmail, name: apiEmail.ccEmail.split('@')[0] }] : [],
      bcc: [],
      subject: apiEmail.subject || '(No Subject)',
      preview: apiEmail.bodyPreview?.replace(/<[^>]*>/g, '').substring(0, 150) || '',
      body: apiEmail.bodyPreview || '',
      timestamp: apiEmail.createdAt,
      read: apiEmail.isRead,
      starred: apiEmail.isStarred,
      important: false,
      labels: apiEmail.labelTypeId ? [apiEmail.labelTypeId] : [],
      folder: this.getFolderNameById(apiEmail.emailFolderId),
      priority: 'normal',
      hasAttachments: apiEmail.hasAttachment,
      attachments: [],
      attachmentCount: apiEmail.attachmentCount || 0
    };
  }

  getFolderNameById(folderId) {
    const folderMap = {
      1: EMAIL_FOLDERS.INBOX,
      2: EMAIL_FOLDERS.SENT,
      3: EMAIL_FOLDERS.DRAFTS,
      4: EMAIL_FOLDERS.TRASH
    };
    return folderMap[folderId] || EMAIL_FOLDERS.INBOX;
  }

  async getEmails(folder = EMAIL_FOLDERS.INBOX, filters = {}) {
    try {
      const params = new URLSearchParams({
        PageNumber: filters.page || 1,
        PageSize: filters.pageSize || 50
      });

      if (filters.search) {
        params.append('SearchEmail', filters.search);
      }

      // Only add EmailFolderId if it's not ALL or STARRED or IMPORTANT
      if (folder !== EMAIL_FOLDERS.ALL && folder !== EMAIL_FOLDERS.STARRED && folder !== EMAIL_FOLDERS.IMPORTANT) {
        // Try dynamic folder map first, then fall back to static map
        const folderId = this.dynamicFolderMap[folder] || this.folderIdMap[folder];
        console.log('Folder:', folder, 'FolderId:', folderId, 'DynamicMap:', this.dynamicFolderMap);
        // Don't add EmailFolderId if it's 5 (special folder like All Mail)
        if (folderId && folderId !== 5) {
          params.append('EmailFolderId', folderId);
        }
      }

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_LIST}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch emails');
      }

      let emails = result.data.items.map(item => this.transformApiEmail(item));

      // Client-side filtering for special folders
      if (folder === EMAIL_FOLDERS.STARRED) {
        emails = emails.filter(email => email.starred);
      } else if (folder === EMAIL_FOLDERS.IMPORTANT) {
        emails = emails.filter(email => email.important);
      }

      // Apply label filter
      if (filters.labels && filters.labels.length > 0) {
        emails = emails.filter(email =>
          filters.labels.some(label => email.labels.includes(label))
        );
      }

      return {
        emails,
        total: result.data.totalCount,
        unreadCount: result.data.unreadCount || 0,
        page: result.data.page,
        pageSize: result.data.pageSize
      };
    } catch (error) {
      console.error('Error fetching emails:', error);
      return {
        emails: [],
        total: 0,
        page: 1,
        pageSize: 50
      };
    }
  }

  async getEmailById(id, markAsRead = true) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_BY_ID(id)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Email not found');
      }

      const result = await response.json();
      
      // Handle both response formats: {success: true, data: {...}} and {isSuccess: true, data: {...}}
      const isSuccess = result.success || result.isSuccess;
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Email not found');
      }

      const emailData = this.transformApiEmailDetail(result.data);

      // Mark as read if email is unread and markAsRead is true
      if (markAsRead && !emailData.read) {
        await this.markAsReadById(id);
        emailData.read = true; // Update local state
      }

      return emailData;
    } catch (error) {
      console.error('Error fetching email:', error);
      throw error;
    }
  }

  async markAsReadById(id, isRead = true) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_MARK_AS_READ(id)}?IsRead=${isRead}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark email as read');
      }

      const result = await response.json();
      const isSuccess = result.success || result.isSuccess;
      
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Failed to mark email as read');
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking email as read:', error);
      // Don't throw error - marking as read is not critical
      return { success: false, error };
    }
  }

  transformApiEmailDetail(apiEmail) {
    return {
      id: apiEmail.id,
      threadId: `thread-${apiEmail.id}`,
      from: {
        name: apiEmail.fromEmail?.split('@')[0] || 'Unknown',
        email: apiEmail.fromEmail || '',
        avatar: null
      },
      to: apiEmail.toEmail ? [{ email: apiEmail.toEmail, name: apiEmail.toEmail.split('@')[0] }] : [],
      cc: apiEmail.ccEmail ? [{ email: apiEmail.ccEmail, name: apiEmail.ccEmail.split('@')[0] }] : [],
      bcc: [],
      subject: apiEmail.subject || '(No Subject)',
      preview: apiEmail.bodyPreview?.replace(/<[^>]*>/g, '').substring(0, 150) || '',
      body: apiEmail.body || apiEmail.plainText || '',
      timestamp: apiEmail.createdAt,
      read: apiEmail.isRead,
      starred: apiEmail.isStarred,
      important: false,
      labels: apiEmail.labelTypeId ? [apiEmail.labelTypeId] : [],
      labelDetails: apiEmail.labelTypeId ? {
        id: apiEmail.labelTypeId,
        name: apiEmail.labelName,
        color: apiEmail.labelColor,
        bgColor: apiEmail.labelBgColor
      } : null,
      folder: this.getFolderNameById(apiEmail.emailFolderId),
      priority: 'normal',
      hasAttachments: apiEmail.hasAttachments,
      attachments: apiEmail.attachments || [],
      attachmentCount: apiEmail.attachmentCount || 0,
      replyMode: apiEmail.replyMode,
      parentEmailId: apiEmail.parentEmailId
    };
  }

  async toggleStar(emailId, isStarred) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_TOGGLE_STAR(emailId)}?IsStarred=${isStarred}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to toggle star');
      }

      const result = await response.json();
      const isSuccess = result.success || result.isSuccess;
      
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Failed to toggle star');
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error toggling email star:', error);
      return { success: false, error };
    }
  }

  async markAsRead(emailIds) {
    try {
      const token = localStorage.getItem('adminToken');
      const results = await Promise.all(
        emailIds.map(async (id) => {
          const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_MARK_AS_READ(id)}?isRead=true`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to mark email ${id} as read`);
          }

          const result = await response.json();
          const isSuccess = result.success || result.isSuccess;
          
          if (!isSuccess) {
            throw new Error(result.message || result.errorMessage || `Failed to mark email ${id} as read`);
          }

          return result;
        })
      );

      return { success: true, data: results };
    } catch (error) {
      console.error('Error marking emails as read:', error);
      return { success: false, error };
    }
  }

  async markAsUnread(emailIds) {
    try {
      const token = localStorage.getItem('adminToken');
      const results = await Promise.all(
        emailIds.map(async (id) => {
          const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_MARK_AS_READ(id)}?isRead=false`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to mark email ${id} as unread`);
          }

          const result = await response.json();
          const isSuccess = result.success || result.isSuccess;
          
          if (!isSuccess) {
            throw new Error(result.message || result.errorMessage || `Failed to mark email ${id} as unread`);
          }

          return result;
        })
      );

      return { success: true, data: results };
    } catch (error) {
      console.error('Error marking emails as unread:', error);
      return { success: false, error };
    }
  }

  async toggleImportant(emailIds) {
    // TODO: Implement API call
    console.log('Toggle important:', emailIds);
    return { success: true };
  }

  async deleteEmails(emailIds) {
    // TODO: Implement API call
    console.log('Delete emails:', emailIds);
    return { success: true };
  }

  async archiveEmails(emailIds) {
    // TODO: Implement API call
    console.log('Archive emails:', emailIds);
    return { success: true };
  }

  async moveToSpam(emailIds) {
    // TODO: Implement API call
    console.log('Move to spam:', emailIds);
    return { success: true };
  }

  async moveToFolder(emailIds, folder) {
    // TODO: Implement API call
    console.log('Move to folder:', emailIds, folder);
    return { success: true };
  }

  async addLabel(emailIds, label) {
    // TODO: Implement API call
    console.log('Add label:', emailIds, label);
    return { success: true };
  }

  async removeLabel(emailIds, label) {
    // TODO: Implement API call
    console.log('Remove label:', emailIds, label);
    return { success: true };
  }

  async sendEmail(emailData) {
    // TODO: Implement API call
    console.log('Send email:', emailData);
    return { success: true, email: emailData };
  }

  async saveDraft(emailData) {
    // TODO: Implement API call
    console.log('Save draft:', emailData);
    return { success: true, email: emailData };
  }

  async getFolderCounts() {
    try {
      // Fetch counts for each folder
      const folders = [
        { id: 1, key: EMAIL_FOLDERS.INBOX },
        { id: 2, key: EMAIL_FOLDERS.SENT },
        { id: 3, key: EMAIL_FOLDERS.DRAFTS },
        { id: 4, key: EMAIL_FOLDERS.TRASH }
      ];

      const counts = {
        [EMAIL_FOLDERS.ALL]: 0,
        [EMAIL_FOLDERS.STARRED]: 0,
        [EMAIL_FOLDERS.IMPORTANT]: 0,
        unread: 0
      };

      // Fetch count for each folder
      for (const folder of folders) {
        try {
          const params = new URLSearchParams({
            PageNumber: 1,
            PageSize: 1,
            EmailFolderId: folder.id
          });

          const token = localStorage.getItem('adminToken');
          const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_LIST}?${params}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              counts[folder.key] = result.data.totalCount;
              counts[EMAIL_FOLDERS.ALL] += result.data.totalCount;
            }
          }
        } catch (error) {
          console.error(`Error fetching count for folder ${folder.key}:`, error);
          counts[folder.key] = 0;
        }
      }

      return counts;
    } catch (error) {
      console.error('Error fetching folder counts:', error);
      return {
        [EMAIL_FOLDERS.INBOX]: 0,
        [EMAIL_FOLDERS.SENT]: 0,
        [EMAIL_FOLDERS.DRAFTS]: 0,
        [EMAIL_FOLDERS.SPAM]: 0,
        [EMAIL_FOLDERS.TRASH]: 0,
        [EMAIL_FOLDERS.STARRED]: 0,
        [EMAIL_FOLDERS.IMPORTANT]: 0,
        [EMAIL_FOLDERS.ALL]: 0,
        unread: 0
      };
    }
  }

  // Label Management
  async getLabels() {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_LABELS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch labels');
      }

      const result = await response.json();
      const isSuccess = result.success || result.isSuccess;
      
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Failed to fetch labels');
      }

      // Handle different response formats
      const data = result.data;
      
      // If data is already an array, return it
      if (Array.isArray(data)) {
        return data;
      }
      
      // If data is a single object (as per your API response), wrap it in an array
      if (data && typeof data === 'object' && data.id) {
        return [data];
      }
      
      // Try to extract array from nested properties
      if (data && typeof data === 'object') {
        return data.items || data.labels || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching labels:', error);
      return [];
    }
  }

  async createLabel(labelData) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_LABELS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(labelData)
      });

      if (!response.ok) {
        throw new Error('Failed to create label');
      }

      const result = await response.json();
      const isSuccess = result.success || result.isSuccess;
      
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Failed to create label');
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error creating label:', error);
      return { success: false, error };
    }
  }

  async updateLabel(labelId, labelData) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_LABELS}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: labelId, ...labelData })
      });

      if (!response.ok) {
        throw new Error('Failed to update label');
      }

      const result = await response.json();
      const isSuccess = result.success || result.isSuccess;
      
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Failed to update label');
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error updating label:', error);
      return { success: false, error };
    }
  }

  async deleteLabel(labelId) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_LABEL_BY_ID(labelId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete label');
      }

      const result = await response.json();
      const isSuccess = result.success || result.isSuccess;
      
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Failed to delete label');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting label:', error);
      return { success: false, error };
    }
  }

  async assignLabel(emailId, labelTypeId) {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_ASSIGN_LABEL(emailId)}?labelTypeId=${labelTypeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to assign label');
      }

      const result = await response.json();
      const isSuccess = result.success || result.isSuccess;
      
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Failed to assign label');
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error assigning label:', error);
      return { success: false, error };
    }
  }

  async getFolders() {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.EMAIL_FOLDERS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const result = await response.json();
      const isSuccess = result.success || result.isSuccess;
      
      if (!isSuccess) {
        throw new Error(result.message || result.errorMessage || 'Failed to fetch folders');
      }

      const folders = result.data || [];
      // Update the dynamic folder map
      this.updateFolderMap(folders);
      
      return folders;
    } catch (error) {
      console.error('Error fetching folders:', error);
      return [];
    }
  }
}

export default new EmailService();
