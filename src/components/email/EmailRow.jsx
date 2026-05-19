import React from 'react';
import { Star, Paperclip, AlertCircle } from 'lucide-react';
import UserAvatar from './UserAvatar';
import EmailBadge from './EmailBadge';
import { formatEmailDate } from '../../utils/emailUtils';
import { useTheme } from '../../context/ThemeContext';

const EmailRow = ({
  email,
  isSelected = false,
  isActive = false,
  onSelect,
  onClick,
  onStarToggle
}) => {
  const { theme } = useTheme();

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect?.(email.id);
  };

  const handleStarClick = (e) => {
    e.stopPropagation();
    onStarToggle?.(email.id);
  };

  return (
    <div
      onClick={() => onClick?.(email)}
      className={`
        group flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-all duration-200 relative
        ${isActive
          ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 shadow-sm'
          : isSelected
            ? 'bg-gray-50 dark:bg-gray-800/50'
            : !email.read 
              ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30'
              : 'bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/30'
        }
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 via-blue-500 to-purple-600" />
      )}
      <div className="flex items-center gap-3 flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxClick}
          onClick={handleCheckboxClick}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 cursor-pointer"
        />
        
        <button
          onClick={handleStarClick}
          className={`transition-all duration-200 ${
            email.starred
              ? 'text-yellow-500 hover:text-yellow-600'
              : 'text-gray-300 dark:text-gray-600 hover:text-yellow-500'
          }`}
        >
          <Star className={`w-5 h-5 ${email.starred ? 'fill-current' : ''}`} />
        </button>

        {email.important && (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
      </div>

      <UserAvatar user={email.from} size="sm" className="flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-semibold text-sm truncate ${!email.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {email.from.name}
          </span>
          {email.labels && email.labels.length > 0 && (
            <div className="flex items-center gap-1">
              {email.labels.slice(0, 2).map(labelId => (
                <EmailBadge key={labelId} labelId={labelId} />
              ))}
              {email.labels.length > 2 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{email.labels.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <h3 className={`text-sm truncate ${!email.read ? 'font-semibold text-gray-900 dark:text-white' : 'font-normal text-gray-700 dark:text-gray-300'}`}>
            {email.subject}
          </h3>
          {email.hasAttachments && (
            <Paperclip className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          )}
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
          {email.preview}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <span className={`text-xs ${!email.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          {formatEmailDate(email.timestamp)}
        </span>
      </div>
    </div>
  );
};

export default EmailRow;
