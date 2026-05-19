import React from 'react';
import { getLabelColor } from '../../utils/emailUtils';
import { EMAIL_LABELS } from '../../constants/emailConstants';

const EmailBadge = ({ labelId, onRemove, className = '' }) => {
  const label = Object.values(EMAIL_LABELS).find(l => l.id === labelId);
  
  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getLabelColor(labelId)} ${className}`}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(labelId);
          }}
          className="hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </span>
  );
};

export default EmailBadge;
