import React from 'react';
import { Inbox, Send, FileText, Trash2, AlertCircle, Star } from 'lucide-react';

const EmptyState = ({ type = 'inbox', searchTerm = '' }) => {
  const states = {
    inbox: {
      icon: Inbox,
      title: 'No emails in inbox',
      description: 'Your inbox is empty. New emails will appear here.',
      color: 'text-blue-500'
    },
    sent: {
      icon: Send,
      title: 'No sent emails',
      description: 'Emails you send will appear here.',
      color: 'text-green-500'
    },
    drafts: {
      icon: FileText,
      title: 'No drafts',
      description: 'Your draft emails will be saved here.',
      color: 'text-yellow-500'
    },
    trash: {
      icon: Trash2,
      title: 'Trash is empty',
      description: 'Deleted emails will appear here.',
      color: 'text-gray-500'
    },
    starred: {
      icon: Star,
      title: 'No starred emails',
      description: 'Star important emails to find them here.',
      color: 'text-yellow-500'
    },
    search: {
      icon: AlertCircle,
      title: 'No results found',
      description: searchTerm ? `No emails match "${searchTerm}"` : 'Try a different search term.',
      color: 'text-gray-500'
    }
  };

  const state = states[type] || states.inbox;
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <div className={`mb-4 p-6 rounded-full bg-gray-100 dark:bg-gray-800 ${state.color}`}>
        <Icon className="w-16 h-16" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {state.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
        {state.description}
      </p>
    </div>
  );
};

export default EmptyState;
