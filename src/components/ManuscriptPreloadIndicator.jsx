import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Download, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const ManuscriptPreloadIndicator = () => {
  const { manuscriptPreloadStatus } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show indicator when preloading starts
    if (manuscriptPreloadStatus.isPreloading) {
      setIsVisible(true);
      setIsExpanded(true);
    }
    
    // Hide after completion (with delay)
    if (!manuscriptPreloadStatus.isPreloading && manuscriptPreloadStatus.stats) {
      setTimeout(() => {
        setIsExpanded(false);
        setTimeout(() => setIsVisible(false), 300);
      }, 5000);
    }
  }, [manuscriptPreloadStatus.isPreloading, manuscriptPreloadStatus.stats]);

  if (!isVisible) return null;

  const { isPreloading, progress, currentBook, stats } = manuscriptPreloadStatus;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {isPreloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : stats?.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <div>
              <h3 className="font-semibold text-sm">
                {isPreloading ? 'Preloading Manuscripts' : stats?.success ? 'Preload Complete' : 'Preload Failed'}
              </h3>
              <p className="text-xs text-indigo-100">
                {isPreloading ? `${progress}% complete` : stats?.success ? 'All books cached' : 'Error occurred'}
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 space-y-3">
            {/* Progress Bar */}
            {isPreloading && (
              <div className="space-y-2">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {currentBook && (
                  <div className="text-xs text-slate-600">
                    <span className="font-medium">Processing:</span> {currentBook.bookTitle || `Book ${currentBook.bookId}`}
                    <span className="text-slate-400 ml-2">
                      ({currentBook.current}/{currentBook.total})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-green-600 font-semibold">Downloaded</div>
                  <div className="text-green-900 text-lg font-bold">{stats.downloaded || 0}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <div className="text-blue-600 font-semibold">Cached</div>
                  <div className="text-blue-900 text-lg font-bold">{stats.cached || 0}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <div className="text-slate-600 font-semibold">Skipped</div>
                  <div className="text-slate-900 text-lg font-bold">{stats.skipped || 0}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-red-600 font-semibold">Failed</div>
                  <div className="text-red-900 text-lg font-bold">{stats.failed || 0}</div>
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 border border-slate-200">
              <Download className="w-3 h-3 inline mr-1" />
              Books will load instantly from cache when you open them
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManuscriptPreloadIndicator;
