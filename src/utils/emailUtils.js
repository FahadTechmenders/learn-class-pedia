import { ATTACHMENT_TYPES } from '../constants/emailConstants';

export const formatEmailDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now - date;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMs / (1000 * 60));
    return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
  }

  if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours}h ago`;
  }

  if (diffInDays < 7) {
    const days = Math.floor(diffInDays);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatFullDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const getAttachmentType = (filename) => {
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  
  for (const [type, config] of Object.entries(ATTACHMENT_TYPES)) {
    if (config.extensions.includes(extension)) {
      return { type, ...config };
    }
  }
  
  return { type: 'OTHER', ...ATTACHMENT_TYPES.OTHER };
};

export const getInitials = (name) => {
  if (!name) return '?';
  
  // If it's an email address, extract first letter before @
  if (name.includes('@')) {
    const emailPrefix = name.split('@')[0];
    return emailPrefix.charAt(0).toUpperCase();
  }
  
  // If it's a name with spaces, get first letter of first and last name
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  // Otherwise, get first letter
  return name.charAt(0).toUpperCase();
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const stripHtmlTags = (html) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export const highlightSearchTerm = (text, searchTerm) => {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const parseEmailAddresses = (input) => {
  if (!input) return [];
  
  const addresses = input.split(/[,;]/).map(addr => addr.trim()).filter(Boolean);
  return addresses.map(addr => {
    const match = addr.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: addr, email: addr };
  });
};

export const formatRecipients = (recipients) => {
  if (!recipients || recipients.length === 0) return '';
  
  if (recipients.length === 1) {
    return recipients[0].name || recipients[0].email;
  }
  
  if (recipients.length === 2) {
    return `${recipients[0].name || recipients[0].email}, ${recipients[1].name || recipients[1].email}`;
  }
  
  return `${recipients[0].name || recipients[0].email} +${recipients.length - 1}`;
};

export const getLabelColor = (labelId) => {
  const colors = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    personal: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    'follow-up': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    meeting: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    newsletter: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  };
  
  return colors[labelId] || colors.work;
};

export const getPriorityColor = (priority) => {
  const colors = {
    high: 'text-red-600 dark:text-red-400',
    normal: 'text-gray-600 dark:text-gray-400',
    low: 'text-blue-600 dark:text-blue-400'
  };
  
  return colors[priority] || colors.normal;
};

export const generateEmailId = () => {
  return `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const isToday = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isYesterday = (timestamp) => {
  const date = new Date(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

export const groupEmailsByDate = (emails) => {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: []
  };

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  emails.forEach(email => {
    const emailDate = new Date(email.timestamp);
    
    if (isToday(email.timestamp)) {
      groups.today.push(email);
    } else if (isYesterday(email.timestamp)) {
      groups.yesterday.push(email);
    } else if (emailDate > weekAgo) {
      groups.thisWeek.push(email);
    } else if (emailDate > monthAgo) {
      groups.thisMonth.push(email);
    } else {
      groups.older.push(email);
    }
  });

  return groups;
};
