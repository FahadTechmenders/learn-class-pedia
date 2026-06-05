import { useState } from 'react';
import { ReactReader } from 'react-reader';

const EpubReader = ({ url, title }) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  const handleError = (err) => {
    console.error('EPUB Reader Error:', err);
    setError('Failed to load the book in the EPUB reader.');
  };

  if (!url || error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium mb-2 text-lg">Preview Unavailable</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error || 'No book URL provided'}</p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>Browser Restriction:</strong> If the CDN does not allow cross-origin EPUB reads, epub.js cannot render it inside this page.
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              You can still open the EPUB file directly in a new tab.
            </p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Open Book Directly
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" style={{ position: 'relative' }}>
      <ReactReader
        url={url}
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
