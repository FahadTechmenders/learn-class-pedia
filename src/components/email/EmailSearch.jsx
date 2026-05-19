import React, { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const EmailSearch = ({ onSearch, onFilterToggle, showFilters = false }) => {
  const { theme } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (value) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  const handleClear = () => {
    setSearchValue('');
    onSearch?.('');
  };

  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className={`
          flex-1 flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all duration-200
          ${isFocused
            ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20 bg-white dark:bg-gray-800'
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
          }
        `}>
          <Search className={`w-5 h-5 flex-shrink-0 ${isFocused ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search emails..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          />
          {searchValue && (
            <button
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={onFilterToggle}
          className={`
            p-2.5 rounded-lg border transition-all duration-200
            ${showFilters
              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
          title="Filters"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default EmailSearch;
