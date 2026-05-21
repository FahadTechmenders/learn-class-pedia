export const EMAIL_FOLDERS = {
  INBOX: 'inbox',
  SENT: 'sent',
  DRAFTS: 'drafts',
  SPAM: 'spam',
  TRASH: 'trash',
  STARRED: 'starred',
  OUTGOING: 'outgoing',
  ALL: 'all'
};

export const EMAIL_LABELS = {
  WORK: { id: 'work', name: 'Work', color: 'blue' },
  PERSONAL: { id: 'personal', name: 'Personal', color: 'green' },
  URGENT: { id: 'urgent', name: 'Urgent', color: 'red' },
  FOLLOW_UP: { id: 'follow-up', name: 'Follow Up', color: 'yellow' },
  MEETING: { id: 'meeting', name: 'Meeting', color: 'purple' },
  NEWSLETTER: { id: 'newsletter', name: 'Newsletter', color: 'gray' }
};

export const EMAIL_PRIORITY = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

export const EMAIL_STATUS = {
  READ: 'read',
  UNREAD: 'unread',
  DRAFT: 'draft',
  SENT: 'sent'
};

export const ITEMS_PER_PAGE = 50;

export const KEYBOARD_SHORTCUTS = {
  COMPOSE: 'c',
  REPLY: 'r',
  REPLY_ALL: 'a',
  FORWARD: 'f',
  DELETE: 'Delete',
  ARCHIVE: 'e',
  STAR: 's',
  MARK_READ: 'i',
  SEARCH: '/',
  SELECT_ALL: 'Ctrl+a',
  NEXT_EMAIL: 'j',
  PREV_EMAIL: 'k',
  ESCAPE: 'Escape'
};

export const ATTACHMENT_TYPES = {
  PDF: { icon: 'FileText', color: 'red', extensions: ['.pdf'] },
  IMAGE: { icon: 'Image', color: 'blue', extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'] },
  DOCUMENT: { icon: 'FileText', color: 'blue', extensions: ['.doc', '.docx', '.txt', '.rtf'] },
  SPREADSHEET: { icon: 'FileSpreadsheet', color: 'green', extensions: ['.xls', '.xlsx', '.csv'] },
  PRESENTATION: { icon: 'Presentation', color: 'orange', extensions: ['.ppt', '.pptx'] },
  VIDEO: { icon: 'Video', color: 'purple', extensions: ['.mp4', '.avi', '.mov', '.wmv'] },
  AUDIO: { icon: 'Music', color: 'pink', extensions: ['.mp3', '.wav', '.ogg'] },
  ARCHIVE: { icon: 'Archive', color: 'gray', extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'] },
  OTHER: { icon: 'File', color: 'gray', extensions: [] }
};

export const EMAIL_ACTIONS = {
  REPLY: 'reply',
  REPLY_ALL: 'reply_all',
  FORWARD: 'forward',
  DELETE: 'delete',
  ARCHIVE: 'archive',
  MARK_READ: 'mark_read',
  MARK_UNREAD: 'mark_unread',
  STAR: 'star',
  UNSTAR: 'unstar',
  MOVE_TO_SPAM: 'move_to_spam',
  MOVE_TO_TRASH: 'move_to_trash',
  ADD_LABEL: 'add_label',
  REMOVE_LABEL: 'remove_label'
};
