import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen,
  Bookmark,
  Maximize,
  List
} from 'lucide-react';
import ApiService from '../services/ApiService';
import { ENDPOINTS } from '../config/api';
import './BookReader.css';

const WORDS_PER_PAGE = 300;

const BookReader = ({ bookId, onClose }) => {
  const [bookContent, setBookContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0); // 0 = cover, 1+ = spreads
  const [showTOC, setShowTOC] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [isFlipping, setIsFlipping] = useState(false);

  // Convert chapters to pages
  const convertToPages = (chapters) => {
    const allPages = [];
    
    chapters.forEach((chapter) => {
      // Add chapter title page
      allPages.push({
        type: 'chapter-title',
        chapterIndex: chapter.chapterIndex,
        title: chapter.title,
        chapterId: chapter.id
      });

      // Combine all chapter content
      const chapterText = chapter.elements
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(el => el.content)
        .join('\n\n');

      // Split into pages based on word count
      const words = chapterText.split(/\s+/);
      let currentPageWords = [];
      let wordCount = 0;

      words.forEach((word, index) => {
        currentPageWords.push(word);
        wordCount++;

        if (wordCount >= WORDS_PER_PAGE || index === words.length - 1) {
          allPages.push({
            type: 'content',
            text: currentPageWords.join(' '),
            chapterIndex: chapter.chapterIndex,
            chapterTitle: chapter.title
          });
          currentPageWords = [];
          wordCount = 0;
        }
      });
    });

    return allPages;
  };

  useEffect(() => {
    const fetchBookContent = async () => {
      setLoading(true);
      try {
        const response = await ApiService.get(ENDPOINTS.BOOK_CONTENT(bookId));
        const data = response.data || response;
        
        console.log('Book Content API Response:', data);
        console.log('Front Cover URL:', data.frontCoverImageUrl);
        console.log('Back Cover URL:', data.backCoverImageurl);
        
        setBookContent(data);
        
        if (data.chapters && data.chapters.length > 0) {
          const bookPages = convertToPages(data.chapters);
          setPages(bookPages);
        }
      } catch (error) {
        console.error('Error fetching book content:', error);
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchBookContent();
    }
  }, [bookId]);

  const totalSpreads = Math.ceil(pages.length / 2) + 1; // +1 for cover
  const currentPageNum = currentSpreadIndex === 0 ? 0 : (currentSpreadIndex - 1) * 2 + 1;

  const nextSpread = () => {
    if (currentSpreadIndex < totalSpreads - 1) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentSpreadIndex(prev => prev + 1);
        setIsFlipping(false);
      }, 600);
    }
  };

  const prevSpread = () => {
    if (currentSpreadIndex > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentSpreadIndex(prev => prev - 1);
        setIsFlipping(false);
      }, 600);
    }
  };

  const goToPage = (pageIndex) => {
    const spreadIndex = Math.floor(pageIndex / 2) + 1;
    setCurrentSpreadIndex(spreadIndex);
    setShowTOC(false);
  };

  const toggleBookmark = () => {
    if (bookmarks.includes(currentPageNum)) {
      setBookmarks(bookmarks.filter(p => p !== currentPageNum));
    } else {
      setBookmarks([...bookmarks, currentPageNum]);
    }
  };

  const openBook = () => {
    setCurrentSpreadIndex(1);
  };

  // Get left and right pages for current spread
  const getSpreadPages = () => {
    if (currentSpreadIndex === 0) {
      return { left: null, right: null, isCover: true };
    }
    
    const leftPageIndex = (currentSpreadIndex - 1) * 2;
    const rightPageIndex = leftPageIndex + 1;
    
    return {
      left: pages[leftPageIndex] || null,
      right: pages[rightPageIndex] || null,
      isCover: false
    };
  };

  const { left: leftPage, right: rightPage, isCover } = getSpreadPages();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center z-[100]">
        <div className="text-center">
          <BookOpen className="w-20 h-20 text-amber-500 animate-pulse mx-auto mb-6" />
          <p className="text-white text-xl font-serif">Loading your book...</p>
        </div>
      </div>
    );
  }

  if (!bookContent) {
    return null;
  }

  // Hardcover Book Cover View
  if (isCover) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center z-[100] p-8">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all z-10"
          title="Close"
        >
          <X className="w-7 h-7" />
        </button>

        {/* Hardcover Book */}
        <div 
          className="relative cursor-pointer transform transition-all duration-700 hover:scale-105 hover:-rotate-1"
          onClick={openBook}
          style={{
            perspective: '2000px',
          }}
        >
          {/* Book Shadow */}
          <div className="absolute inset-0 bg-black/60 blur-3xl transform translate-y-8 scale-95"></div>
          
          {/* Hardcover */}
          <div 
            className="relative rounded-r-xl shadow-2xl overflow-hidden"
            style={{
              width: '400px',
              height: '600px',
              boxShadow: '20px 20px 60px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.3)',
            }}
          >
            {/* Book Spine Effect */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
            
            {/* Front Cover Image or Gradient */}
            {bookContent.frontCoverImageUrl ? (
              <>
                <img 
                  src={bookContent.frontCoverImageUrl} 
                  alt={bookContent.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load front cover image:', bookContent.frontCoverImageUrl);
                    e.target.style.display = 'none';
                  }}
                />
                {/* Fallback gradient if image fails */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 -z-10"></div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900"></div>
            )}
            
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
            
            {/* Cover Content */}
            <div className="relative h-full flex flex-col items-center justify-center p-12 text-center z-10">
              {!bookContent.frontCoverImageUrl && (
                <>
                  {/* Decorative Border */}
                  <div className="absolute inset-8 border-4 border-amber-400/30 rounded-lg"></div>
                  
                  {/* Book Icon */}
                  <BookOpen className="w-24 h-24 text-amber-200 mb-8 relative z-10" />
                </>
              )}
              
              {/* Title */}
              <h1 className="text-5xl font-serif font-bold text-white mb-6 leading-tight relative z-10 drop-shadow-2xl">
                {bookContent.title}
              </h1>
              
              {/* Subtitle */}
              {bookContent.subTitle && (
                <p className="text-xl font-serif text-white/90 mb-8 relative z-10 drop-shadow-lg">
                  {bookContent.subTitle}
                </p>
              )}
              
              {/* Author */}
              <p className="text-2xl font-serif text-white/95 relative z-10 drop-shadow-lg">
                by {bookContent.authorFirstName} {bookContent.authorLastName}
              </p>
              
              {/* Click to Open Hint */}
              <div className="absolute bottom-12 left-0 right-0 text-center">
                <p className="text-white text-sm font-serif animate-pulse drop-shadow-lg">
                  Click to open
                </p>
              </div>
            </div>

            {/* Book Thickness/Pages Effect */}
            <div className="absolute right-0 top-2 bottom-2 w-1 bg-white/90"></div>
            <div className="absolute right-1 top-3 bottom-3 w-1 bg-white/70"></div>
            <div className="absolute right-2 top-4 bottom-4 w-1 bg-white/50"></div>
          </div>
        </div>
      </div>
    );
  }

  // Table of Contents View
  if (showTOC) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center z-[100] p-8">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all z-10"
          title="Close"
        >
          <X className="w-7 h-7" />
        </button>

        <div className="bg-amber-50 rounded-lg shadow-2xl max-w-3xl w-full h-[85vh] overflow-hidden flex flex-col">
          {/* TOC Header */}
          <div className="bg-gradient-to-r from-amber-700 to-amber-800 px-8 py-6 text-center">
            <h1 className="text-4xl font-serif font-bold text-white mb-2">Table of Contents</h1>
            <p className="text-amber-100 font-serif">{bookContent.title}</p>
          </div>

          {/* TOC Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-3">
              {bookContent.chapters.map((chapter, index) => {
                const pageIndex = pages.findIndex(p => 
                  p.type === 'chapter-title' && p.chapterIndex === chapter.chapterIndex
                );
                return (
                  <button
                    key={chapter.id}
                    onClick={() => {
                      setShowTOC(false);
                      setTimeout(() => goToPage(pageIndex), 100);
                    }}
                    className="w-full flex items-start justify-between gap-4 p-4 text-left bg-white hover:bg-amber-100 rounded-lg transition-all group border-l-4 border-amber-600"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-amber-600 font-semibold mb-1">
                        Chapter {chapter.chapterIndex}
                      </div>
                      <h3 className="text-lg font-serif text-gray-800 group-hover:text-amber-900">
                        {chapter.title}
                      </h3>
                    </div>
                    <div className="text-amber-600 font-serif text-sm">
                      Page {pageIndex + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TOC Footer */}
          <div className="px-8 py-4 bg-amber-100 border-t border-amber-200 flex justify-center">
            <button
              onClick={() => setShowTOC(false)}
              className="px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-serif transition-all"
            >
              Start Reading
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Book Reading View with Two-Page Spread
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col z-[100]">
      {/* Top Controls */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center gap-4">
          <BookOpen className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-white font-serif font-semibold">{bookContent.title}</h2>
            <p className="text-gray-400 text-sm">by {bookContent.authorFirstName} {bookContent.authorLastName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTOC(true)}
            className="p-2 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-all"
            title="Table of Contents"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={toggleBookmark}
            className={`p-2 rounded-lg transition-all ${bookmarks.includes(currentPageNum) ? 'text-amber-500 bg-amber-900/20' : 'text-gray-400 hover:text-amber-400 hover:bg-gray-800'}`}
            title="Bookmark"
          >
            <Bookmark className="w-5 h-5" fill={bookmarks.includes(currentPageNum) ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-all"
            title="Fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Book Container - Two Page Spread */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-8">
        <div className={`flex gap-2 h-full max-w-7xl w-full transition-all duration-600 ${isFlipping ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
          
          {/* Left Page */}
          <div className="flex-1 bg-amber-50 rounded-l-lg shadow-2xl overflow-hidden" style={{ maxWidth: '500px' }}>
            {leftPage ? (
              <div className="h-full flex flex-col p-12">
                <div className="flex-1 overflow-y-auto">
                  {leftPage.type === 'chapter-title' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="text-sm text-amber-600 font-serif mb-4 uppercase tracking-widest">
                        Chapter {leftPage.chapterIndex}
                      </div>
                      <h1 className="text-4xl font-serif font-bold text-gray-900 leading-tight">
                        {leftPage.title}
                      </h1>
                    </div>
                  ) : (
                    <div className="font-serif text-base leading-relaxed text-gray-800">
                      <p className="whitespace-pre-wrap text-justify first-letter:text-6xl first-letter:font-bold first-letter:text-amber-700 first-letter:mr-2 first-letter:float-left first-letter:leading-none">
                        {leftPage.text}
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-6 text-center border-t border-gray-300 mt-auto">
                  <span className="text-xs text-gray-500 font-serif">{(currentSpreadIndex - 1) * 2 + 1}</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center overflow-hidden relative">
                {/* Back Cover Image or Gradient */}
                {bookContent.backCoverImageurl ? (
                  <>
                    <img 
                      src={bookContent.backCoverImageurl} 
                      alt="Back Cover"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Failed to load back cover image:', bookContent.backCoverImageurl);
                        e.target.style.display = 'none';
                      }}
                    />
                    {/* Fallback gradient if image fails */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 -z-10"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900"></div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40"></div>
                
                {/* End Text */}
                <div className="text-center p-12 relative z-10">
                  <BookOpen className="w-20 h-20 text-white mb-6 mx-auto drop-shadow-2xl" />
                  <h2 className="text-3xl font-serif font-bold text-white mb-4 drop-shadow-lg">The End</h2>
                  <p className="text-white font-serif text-lg drop-shadow-lg">Thank you for reading</p>
                </div>
              </div>
            )}
          </div>

          {/* Center Binding */}
          <div className="w-2 bg-gray-900 shadow-inner rounded"></div>

          {/* Right Page */}
          <div className="flex-1 bg-amber-50 rounded-r-lg shadow-2xl overflow-hidden" style={{ maxWidth: '500px' }}>
            {rightPage ? (
              <div className="h-full flex flex-col p-12">
                <div className="flex-1 overflow-y-auto">
                  {rightPage.type === 'chapter-title' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="text-sm text-amber-600 font-serif mb-4 uppercase tracking-widest">
                        Chapter {rightPage.chapterIndex}
                      </div>
                      <h1 className="text-4xl font-serif font-bold text-gray-900 leading-tight">
                        {rightPage.title}
                      </h1>
                    </div>
                  ) : (
                    <div className="font-serif text-base leading-relaxed text-gray-800">
                      <p className="whitespace-pre-wrap text-justify first-letter:text-6xl first-letter:font-bold first-letter:text-amber-700 first-letter:mr-2 first-letter:float-left first-letter:leading-none">
                        {rightPage.text}
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-6 text-center border-t border-gray-300 mt-auto">
                  <span className="text-xs text-gray-500 font-serif">{(currentSpreadIndex - 1) * 2 + 2}</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <BookOpen className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex-shrink-0 px-6 py-4 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 flex items-center justify-between">
        <button
          onClick={prevSpread}
          disabled={currentSpreadIndex === 0 || isFlipping}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        <div className="flex items-center gap-4">
          <div className="text-gray-400 font-serif text-sm">
            Page <span className="text-amber-400 font-semibold">{currentPageNum > 0 ? currentPageNum : 'Cover'}</span> of <span className="text-amber-400 font-semibold">{pages.length}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-300"
              style={{ width: `${(currentSpreadIndex / totalSpreads) * 100}%` }}
            ></div>
          </div>
        </div>

        <button
          onClick={nextSpread}
          disabled={currentSpreadIndex >= totalSpreads - 1 || isFlipping}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default BookReader;
