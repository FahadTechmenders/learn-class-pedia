import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const GenericDropdown = ({
  items = [],
  value = null,
  onChange,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  allowClear = true,
  displayField = 'name',
  valueField = 'id',
  searchable = true,
  multiple = false,
  showSelectAll = false,
  onSearch,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Filter items based on search term (only if no onSearch function provided)
  const filteredItems = useMemo(() => {
    if (!searchTerm || !searchable || onSearch) return items; // Don't filter if server-side search is enabled
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter(item => 
      item[displayField]?.toLowerCase().includes(lowerSearchTerm) ||
      item.description?.toLowerCase().includes(lowerSearchTerm) ||
      item.email?.toLowerCase().includes(lowerSearchTerm) ||
      item.title?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [items, searchTerm, searchable, displayField, onSearch]);

  // Handle search term change
  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    
    // Call onSearch immediately if provided (server-side search)
    if (onSearch) {
      onSearch(newSearchTerm);
    }
  };

  const getSelectedDisplayName = () => {
    if (multiple) {
      if (!value || value.length === 0) return placeholder;
      
      const selectedItems = items.filter(item => 
        value.includes(item[valueField])
      );
      
      if (selectedItems.length === 0) return placeholder;
      if (selectedItems.length === 1) return selectedItems[0][displayField];
      
      return `${selectedItems.length} items selected`;
    }
    
    if (value === null || value === undefined) return placeholder;

    const selected = items.find(
      item => String(item[valueField]) === String(value)
    );

    return selected ? selected[displayField] : placeholder;
  };


  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (!multiple) return;
    const currentValue = Array.isArray(value) ? value : [];
    const allItemValues = items.map(item => item[valueField] || item.courseId || item.id);
    const allSelected = allItemValues.length > 0 && allItemValues.every(v => currentValue.includes(v));

    if (allSelected) {
      onChange([]);
    } else {
      onChange(allItemValues);
    }
  };

  // Handle item selection
  const handleSelect = (itemValue) => {
    // Ensure itemValue is not undefined (null is allowed for clearing)
    if (itemValue === undefined) {
      console.error('itemValue is undefined, skipping selection');
      return;
    }
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(itemValue)
        ? currentValue.filter(v => v !== itemValue)
        : [...currentValue, itemValue];
      onChange(newValue);
    } else {
      onChange(itemValue);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 flex items-center justify-between cursor-pointer ${
          disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`flex-1 px-4 truncate ${
          (multiple && (!value || value.length === 0)) || (!multiple && (value === null || value === '')) ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
        }`}>
          {getSelectedDisplayName()}
        </span>
        <div className="flex items-center space-x-2">
          {allowClear && ((multiple && value && value.length > 0) || (!multiple && value)) && (
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange(multiple ? [] : null);
              }}
            >
              ×
            </button>
          )}
          <ChevronDown 
            size={16} 
            className={`text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          {searchable && (
            <div 
              className="p-3 border-b border-gray-200 dark:border-gray-700"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search 
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 ${loading ? 'animate-spin' : ''}`}
                  size={16} 
                />
                <input
                  type="text"
                  placeholder={`Search ${placeholder.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  autoComplete="off"
                  autoFocus
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Select All */}
          {multiple && showSelectAll && items.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <button
                className="flex items-center w-full text-left cursor-pointer hover:bg-gray-100 rounded px-1 py-1 transition-colors"
                onClick={handleSelectAll}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={items.length > 0 && items.every(item => {
                    const itemValue = item[valueField] || item.courseId || item.id;
                    return Array.isArray(value) && value.includes(itemValue);
                  })}
                  className="w-4 h-4 mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700">
                  {items.length > 0 && items.every(item => {
                    const itemValue = item[valueField] || item.courseId || item.id;
                    return Array.isArray(value) && value.includes(itemValue);
                  }) ? 'Deselect All' : 'Select All'}
                </span>
              </button>
            </div>
          )}

          {/* Items List */}
          <div className="overflow-y-auto max-h-60">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => {
               
                // Handle different field access patterns
                const itemValue = item[valueField] || item.courseId || item.id;
                
                
                const isSelected = multiple 
                  ? (Array.isArray(value) && value.includes(itemValue))
                  : (value === itemValue);
                
                return (
                  <div
                    key={itemValue || index}
                    className={`flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`}
                    onClick={() => {
                     
                      handleSelect(itemValue);
                    }}
                  >
                    {multiple ? (
                      <input
                        type="checkbox"
                        readOnly
                        checked={isSelected}
                        className="w-4 h-4 mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    ) : (
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        isSelected ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'
                      }`} />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item[displayField]}</div>
                      {item?.description ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                      ) :  <div className="text-xs text-gray-500 dark:text-gray-400">{item.title}</div>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm ? 'No items found' : 'No items available'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericDropdown;
