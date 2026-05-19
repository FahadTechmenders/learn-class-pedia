import React from 'react';
import { FileText, Image, FileSpreadsheet, File, Archive, Video, Music, Download } from 'lucide-react';
import { formatFileSize, getAttachmentType } from '../../utils/emailUtils';

const AttachmentPreview = ({ attachment, compact = false, onDownload }) => {
  const attachmentType = getAttachmentType(attachment.name);

  const iconMap = {
    FileText,
    Image,
    FileSpreadsheet,
    File,
    Archive,
    Video,
    Music
  };

  const Icon = iconMap[attachmentType.icon] || File;

  const colorClasses = {
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
    gray: 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  };

  const colorClass = colorClasses[attachmentType.color] || colorClasses.gray;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
        <Icon className="w-3.5 h-3.5" />
        <span className="truncate max-w-[150px]">{attachment.name}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-200 group cursor-pointer"
      onClick={() => onDownload?.(attachment)}
    >
      <div className={`p-2.5 rounded-lg ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {attachment.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <button
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDownload?.(attachment);
        }}
      >
        <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
};

export default AttachmentPreview;
