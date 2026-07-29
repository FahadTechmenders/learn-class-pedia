import React, { createContext, useContext, useState, useEffect } from 'react';
import { preloadAllManuscripts } from '../services/manuscriptPreloader';
import { 
  cacheManuscripts, 
  onServiceWorkerMessage, 
  isServiceWorkerActive,
  waitForServiceWorkerActive,
  getCacheStats,
  getCachedUrls 
} from '../utils/serviceWorkerManager';
import ApiService from '../services/ApiService';
import { ENDPOINTS, API_CONFIG } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [manuscriptPreloadStatus, setManuscriptPreloadStatus] = useState({
    isPreloading: false,
    progress: 0,
    currentBook: null,
    stats: null
  });

  useEffect(() => {
    const authStatus = localStorage.getItem('isAdminAuthenticated');
    const userData = localStorage.getItem('userData');
    
    setIsAuthenticated(authStatus === 'true');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeProgress = onServiceWorkerMessage('DOWNLOAD_PROGRESS', (data) => {
      setManuscriptPreloadStatus(prev => ({
        ...prev,
        isPreloading: true,
        progress: data.progress,
        currentBook: {
          bookTitle: data.filename,
          current: data.completed,
          total: data.total
        }
      }));
    });

    const unsubscribeComplete = onServiceWorkerMessage('CACHE_COMPLETE', (data) => {
      setManuscriptPreloadStatus({
        isPreloading: false,
        progress: 100,
        currentBook: null,
        stats: data.stats
      });
    });

    const unsubscribeStarted = onServiceWorkerMessage('CACHE_STARTED', (data) => {
      setManuscriptPreloadStatus({
        isPreloading: true,
        progress: 0,
        currentBook: null,
        stats: { total: data.total }
      });
    });

    const unsubscribeFailed = onServiceWorkerMessage('DOWNLOAD_FAILED', (data) => {
      console.warn('[AuthContext] Download failed:', data.filename, data.error);
    });

    const pollInterval = setInterval(() => {
      if (isServiceWorkerActive()) {
        startManuscriptPreload();
      }
    }, 10 * 60 * 1000);

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeStarted();
      unsubscribeFailed();
      clearInterval(pollInterval);
    };
  }, [isAuthenticated]);

  const fetchUncachedFileUrls = async () => {
    try {
      // Get already cached URLs from Service Worker
      let cachedUrls = [];
      if (isServiceWorkerActive()) {
        cachedUrls = await getCachedUrls();
        console.log(`[AuthContext] Found ${cachedUrls.length} cached manuscripts`);
        console.log('[AuthContext] Cached URLs:', cachedUrls.map(url => {
          const bookIdMatch = url.match(/\/books\/(\d+)\//);
          return bookIdMatch ? `Book ${bookIdMatch[1]}` : url;
        }));
      }
      
      const payload = {
        fileUrls: cachedUrls,
        updatedAt: new Date(0).toISOString()
      };
      
      console.log('[AuthContext] Sending to backend:', payload);
      
      const response = await ApiService.post(ENDPOINTS.BOOK_FILE_URLS, payload);
      const responseData = response?.data || response || {};
      const fileUrlItems = responseData?.fileUrls || [];
      
      console.log(`[AuthContext] Backend returned ${fileUrlItems.length} uncached manuscripts`);
      console.log('[AuthContext] File URLs from API:', fileUrlItems.map(f => {
        const url = f.fileUrl || f.url || f;
        const bookIdMatch = url.match(/\/books\/(\d+)\//);
        return { bookId: bookIdMatch ? bookIdMatch[1] : 'unknown', url };
      }));
      return fileUrlItems;
    } catch (error) {
      console.error('[AuthContext] Error fetching file URLs:', error);
      return [];
    }
  };

  const startManuscriptPreload = async () => {
    // On first load the SW may be registered but not yet controlling the page.
    // Wait for it to take control before deciding to fall back.
    const swActive = await waitForServiceWorkerActive();

    if (!swActive) {
      console.warn('[AuthContext] Service Worker not active after wait, skipping preload');
      return;
    }

    try {
      const fileUrlItems = await fetchUncachedFileUrls();
      
      if (fileUrlItems.length === 0) {
        setManuscriptPreloadStatus({
          isPreloading: false,
          progress: 100,
          currentBook: null,
          stats: { total: 0, completed: 0 }
        });
        return;
      }

      await cacheManuscripts(fileUrlItems, API_CONFIG.BASE_URL);
      
    } catch (error) {
      console.error('[AuthContext] Manuscript preload failed:', error);
      setManuscriptPreloadStatus({
        isPreloading: false,
        progress: 0,
        currentBook: null,
        stats: { success: false, error: error.message }
      });
    }
  };

  const startFallbackPreload = async () => {
    setManuscriptPreloadStatus({
      isPreloading: true,
      progress: 0,
      currentBook: null,
      stats: null
    });

    try {
      const result = await preloadAllManuscripts(
        (progress) => {
          setManuscriptPreloadStatus(prev => ({
            ...prev,
            progress
          }));
        },
        (bookInfo) => {
          setManuscriptPreloadStatus(prev => ({
            ...prev,
            currentBook: bookInfo
          }));
        }
      );

      setManuscriptPreloadStatus({
        isPreloading: false,
        progress: 100,
        currentBook: null,
        stats: result
      });
    } catch (error) {
      console.error('[AuthContext] Fallback preload failed:', error);
      setManuscriptPreloadStatus({
        isPreloading: false,
        progress: 0,
        currentBook: null,
        stats: { success: false, error: error.message }
      });
    }
  };

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('isAdminAuthenticated', 'true');
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Start manuscript preloading in background
    setTimeout(() => {
      startManuscriptPreload();
    }, 1000); // Delay 1 second to let the UI settle
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('userData');
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    manuscriptPreloadStatus,
    startManuscriptPreload
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
