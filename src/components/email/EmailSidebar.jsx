import React, { useState, useEffect } from 'react';
import { 
  Inbox,
  Send,
  Star,
  FileText,
  AlertCircle,
  Mail,
  Trash2,
  Tag,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash
} from 'lucide-react';
import emailService from '../../services/emailService';

const EmailSidebar = ({
  currentFolder,
  onFolderChange,
  isCollapsed = false,
  currentLabel = null,
  onLabelChange
}) => {
  const [showLabels, setShowLabels] = useState(true);
  const [labels, setLabels] = useState([]);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [folders, setFolders] = useState([]);

  // Color mapping for folders
  const colorMap = {
    'Inbox': 'text-blue-600 dark:text-blue-400',
    'Sent': 'text-green-600 dark:text-green-400',
    'Drafts': 'text-gray-600 dark:text-gray-400',
    'Trash': 'text-red-600 dark:text-red-400',
    'Spam': 'text-orange-600 dark:text-orange-400',
    'Starred': 'text-yellow-600 dark:text-yellow-400',
    'All Mail': 'text-purple-600 dark:text-purple-400',
    'Outgoing': 'text-teal-600 dark:text-teal-400'
  };

  useEffect(() => {
    loadLabels();
    loadFolders();
  }, []);

  const loadLabels = async () => {
    const fetchedLabels = await emailService.getLabels();
    // Ensure we always set an array
    setLabels(Array.isArray(fetchedLabels) ? fetchedLabels : []);
  };

  const loadFolders = async () => {
    const apiFolders = await emailService.getFolders();
    
    // Map icon names from API to Lucide React components
    const iconComponentMap = {
      'Inbox': Inbox,
      'Send': Send,
      'Star': Star,
      'FileText': FileText,
      'AlertCircle': AlertCircle,
      'Mail': Mail,
      'Trash2': Trash2
    };
    
    // Map API folders to include colors and slugs
    const slugMap = {
      'Inbox': 'inbox',
      'Sent': 'sent',
      'Drafts': 'drafts',
      'Trash': 'trash',
      'Spam': 'spam',
      'All Mail': 'all',
      'Outgoing': 'outgoing',
      'Starred': 'starred'
    };
    
    const mappedFolders = apiFolders.map(folder => ({
      id: folder.id,
      label: folder.name,
      slug: slugMap[folder.name] || folder.name.toLowerCase().replace(/\s+/g, '-'),
      icon: iconComponentMap[folder.icon] || Inbox, // Map icon name to Lucide component
      color: colorMap[folder.name] || 'text-gray-600 dark:text-gray-400'
    }));
    setFolders(mappedFolders);
  };

  const handleCreateLabel = () => {
    setEditingLabel(null);
    setShowLabelModal(true);
  };

  const handleEditLabel = (label) => {
    setEditingLabel(label);
    setShowLabelModal(true);
  };

  const handleDeleteLabel = async (labelId) => {
    if (window.confirm('Are you sure you want to delete this label?')) {
      const result = await emailService.deleteLabel(labelId);
      if (result.success) {
        loadLabels();
      }
    }
  };


  // Removed: const labels = Object.values(EMAIL_LABELS); - now using API labels from state

  const FolderItem = ({ folder }) => {
    const isActive = currentFolder === folder.slug;
    const IconComponent = folder.icon;

    return (
      <button
        onClick={() => onFolderChange(folder.slug)}
        className={`
          w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg transition-all duration-200 relative group
          ${isActive
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }
          ${isCollapsed ? 'justify-center' : ''}
        `}
        title={isCollapsed ? folder.label : undefined}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 dark:bg-blue-400 rounded-r-md" />
        )}
        <div className={`
          flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-blue-100 dark:bg-blue-800/30' 
            : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
          }
        `}>
          <IconComponent className={`w-5 h-5 transition-all duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : folder.color}`} />
        </div>
        {!isCollapsed && (
          <span className={`flex-1 text-left text-sm transition-all duration-200 ${isActive ? 'font-medium' : 'font-normal'}`}>
            {folder.label}
          </span>
        )}
      </button>
    );
  };

  const LabelItem = ({ label }) => {
    const isActive = currentLabel === label.id;
    const [showActions, setShowActions] = useState(false);

    return (
      <div
        className="relative group"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <button
          className={`
            w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative
            ${isActive
              ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 font-semibold shadow-sm'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:translate-x-1'
            }
          `}
          onClick={() => onLabelChange?.(label.id)}
        >
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-blue-600 via-blue-500 to-purple-600 rounded-r-full shadow-lg shadow-blue-500/50 animate-pulse" />
          )}
          <div 
            className={`w-3 h-3 rounded-full ${isActive ? 'scale-110' : 'group-hover:scale-105'} transition-all duration-300`}
            style={{ backgroundColor: label.bgColor || label.color }}
          />
          {!isCollapsed && (
            <>
              <span className={`flex-1 text-left text-sm transition-all duration-300 ${isActive ? 'tracking-wide' : ''}`}>{label.name}</span>
              {showActions && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditLabel(label);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Edit label"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLabel(label.id);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded"
                    title="Delete label"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className={`h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-1">
          {folders.map(folder => (
            <FolderItem key={folder.id} folder={folder} />
          ))}
        </div>

        {!isCollapsed && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className="flex-1 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 px-2 py-1"
              >
                {showLabels ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Tag className="w-4 h-4" />
                <span className="flex-1 text-left text-sm font-medium">Labels</span>
              </button>
              <button
                onClick={handleCreateLabel}
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                title="Create new label"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {showLabels && (
              <div className="space-y-1 pl-2">
                {labels?.length === 0 ? (
                  <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    No labels yet. Click + to create one.
                  </div>
                ) : (
                  labels?.map(label => (
                    <LabelItem key={label.id} label={label} />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Storage</span>
              <span>2.5 GB / 15 GB</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-1.5 rounded-full" style={{ width: '16.67%' }} />
            </div>
          </div>
        </div>
      )}

      {showLabelModal && (
        <LabelModal
          label={editingLabel}
          onClose={() => setShowLabelModal(false)}
          onSave={async (labelData) => {
            if (editingLabel) {
              await emailService.updateLabel(editingLabel.id, labelData);
            } else {
              await emailService.createLabel(labelData);
            }
            loadLabels();
            setShowLabelModal(false);
          }}
        />
      )}
    </div>
  );
};

const LabelModal = ({ label, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: label?.name || '',
    color: label?.color || '#3B82F6',
    bgColor: label?.bgColor || '#3B82F6'
  });

  const predefinedColors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Gray', value: '#6B7280' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {label ? 'Edit Label' : 'Create New Label'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Label Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter label name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value, bgColor: color.value })}
                  className={`w-full h-10 rounded-lg transition-all ${
                    formData.color === color.value
                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {label ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailSidebar;
