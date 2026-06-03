import { useState, useEffect } from 'react';
import { ReactReader } from 'react-reader';
import { getProxiedBookUrl } from '../services/bookProxyService';

const EpubReader = ({ url, title }) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEpub = async () => {
      if (!url) {
        setError('No book URL provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        let response;
        let fetchError;
        
        try {
          const proxiedUrl = getProxiedBookUrl(url);
          response = await fetch(proxiedUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/epub+zip',
            },
          });
          
          if (!response.ok) {
            throw new Error(`Proxy failed: ${response.statusText}`);
          }
        } catch (proxyErr) {
          console.warn('Backend proxy failed, trying direct access:', proxyErr);
          fetchError = proxyErr;
          
          response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit',
          });

          if (!response.ok) {
            throw new Error(`Direct access failed: ${response.statusText}`);
          }
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        console.error('EPUB Download Error:', err);
        setError('Failed to load the book. CORS restrictions prevent direct preview.');
        setLoading(false);
      }
    };

    loadEpub();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url]);

  const handleError = (err) => {
    console.error('EPUB Reader Error:', err);
    setError('Failed to load the book. Please try again.');
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium mb-2 text-lg">Preview Unavailable</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>CORS Restriction:</strong> The book file is hosted on a different domain that doesn't allow direct preview.
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Contact your system administrator to enable CORS on the CDN server.
            </p>
          </div>
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Book Instead
          </a>
        </div>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center p-8">
          <p className="text-gray-600 dark:text-gray-400">No book available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" style={{ position: 'relative' }}>
      <ReactReader
        url={blobUrl}
        location={location}
        locationChanged={(epubcfi) => setLocation(epubcfi)}
        title={title}
        showToc={true}
        tocOpen={false}
        epubOptions={{
          flow: 'paginated',
          manager: 'default',
        }}
        getRendition={(rendition) => {
          try {
            rendition.themes.default({
              '::selection': {
                background: 'rgba(99, 102, 241, 0.3)',
              },
              body: {
                padding: '20px !important',
              },
            });
          } catch (err) {
            handleError(err);
          }
        }}
      />
    </div>
  );
};

export default EpubReader;
