import React from 'react';
import { getInitials } from '../../utils/emailUtils';

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  const avatarClass = sizeClasses[size] || sizeClasses.md;

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${avatarClass} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${avatarClass} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ${className}`}
    >
      {getInitials(user?.name || user?.email || '?')}
    </div>
  );
};

export default UserAvatar;
