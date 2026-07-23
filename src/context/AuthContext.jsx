import React, { createContext, useContext, useState, useEffect } from 'react';
import { preloadAllManuscripts } from '../services/manuscriptPreloader';

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

  const startManuscriptPreload = async () => {
    setManuscriptPreloadStatus({
      isPreloading: true,
      progress: 0,
      currentBook: null,
      stats: null
    });

    try {
      const result = await preloadAllManuscripts(
        // Progress callback
        (progress) => {
          setManuscriptPreloadStatus(prev => ({
            ...prev,
            progress
          }));
        },
        // Book complete callback
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

      console.log('[AuthContext] Manuscript preload completed:', result);
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
