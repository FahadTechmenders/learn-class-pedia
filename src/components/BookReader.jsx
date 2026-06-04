import { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen,
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
  const [bookmarks, setBookmarks] = useState([]);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showBackCover, setShowBackCover] = useState(false);

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
    } else if (currentSpreadIndex === totalSpreads - 1) {
      // Show back cover after last page
      setIsFlipping(true);
      setTimeout(() => {
        setShowBackCover(true);
        setIsFlipping(false);
      }, 600);
    }
  };

  const prevSpread = () => {
    if (showBackCover) {
      // Go back from back cover to last page
      setIsFlipping(true);
      setTimeout(() => {
        setShowBackCover(false);
        setIsFlipping(false);
      }, 600);
    } else if (currentSpreadIndex > 0) {
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
    setShowTOC(true);
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

  // Table of Contents View - Check this FIRST
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

        {/* Two-Page TOC Spread */}
        <div className="flex gap-2 h-full max-w-7xl w-full items-center justify-center">
          
          {/* Left TOC Page - Title and Author Only */}
          <div className="bg-white rounded-l-lg shadow-2xl overflow-hidden" style={{ width: '500px', height: '700px' }}>
            <div className="h-full flex flex-col items-center justify-center p-8">
              {/* Book Title and Author */}
              <div className="text-center">
                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4 leading-tight">
                  {bookContent.title}
                </h2>
                <p className="text-base font-serif text-gray-600">
                  by {bookContent.authorFirstName} {bookContent.authorLastName}
                </p>
              </div>

              {/* Page Number */}
              <div className="absolute bottom-12 text-center">
                <span className="text-xs text-gray-500 font-serif">iv</span>
              </div>
            </div>
          </div>

          {/* Center Binding */}
          <div className="w-2 bg-gray-900 shadow-inner rounded" style={{ height: '700px' }}></div>

          {/* Right TOC Page - Contents */}
          <div className="bg-white rounded-r-lg shadow-2xl overflow-hidden" style={{ width: '500px', height: '700px' }}>
            <div className="h-full flex flex-col p-8">
              {/* Contents Header with Ornament */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-3">Contents</h1>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-px bg-gray-400 w-16"></div>
                  <div className="text-gray-400">✦</div>
                  <div className="h-px bg-gray-400 w-16"></div>
                </div>
              </div>

              {/* All Chapters */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {bookContent.chapters.map((chapter) => {
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
                      className="w-full flex items-baseline gap-2 text-left hover:text-gray-600 transition-colors group"
                    >
                      <span className="text-gray-700 font-serif text-sm flex-shrink-0">{chapter.chapterIndex}</span>
                      <span className="flex-1 font-serif text-gray-900 group-hover:text-gray-600">{chapter.title}</span>
                      <span className="flex-shrink-0 border-b border-dotted border-gray-400 flex-grow mx-2" style={{ minWidth: '20px' }}></span>
                      <span className="text-gray-600 font-serif text-sm flex-shrink-0">{pageIndex + 1}</span>
                    </button>
                  );
                })}
              </div>

              {/* Page Number */}
              <div className="text-center mt-6 pt-4 border-t border-gray-200">
                <span className="text-xs text-gray-500 font-serif">v</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Reading Button - Below the book */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => {
              setShowTOC(false);
              setCurrentSpreadIndex(1);
            }}
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-serif transition-all shadow-lg"
          >
            Start Reading from Beginning
          </button>
        </div>
      </div>
    );
  }

  // Back Cover View
  if (showBackCover) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center z-[100] p-8">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all z-10"
          title="Close"
        >
          <X className="w-7 h-7" />
        </button>

        {/* Back Cover with Hover Controls */}
        <div 
          className="relative transform transition-all duration-700 group"
          style={{
            perspective: '2000px',
          }}
        >
          {/* Book Shadow */}
          <div className="absolute inset-0 bg-black/60 blur-3xl transform translate-y-8 scale-95"></div>
          
          {/* Back Cover */}
          <div 
            className="relative rounded-l-xl shadow-2xl overflow-hidden cursor-pointer"
            style={{
              width: '400px',
              height: '600px',
              boxShadow: '-20px 20px 60px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.3)',
            }}
          >
            {/* Book Spine Effect on Right */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/60 to-transparent z-10"></div>
            
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
            
            {/* Hover Overlay with Controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 flex flex-col gap-4">
                <button
                  onClick={prevSpread}
                  className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-amber-50 text-gray-900 rounded-lg font-serif transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  <ChevronLeft className="w-6 h-6" />
                  <span className="text-lg">Continue Reading</span>
                </button>
                
                <button
                  onClick={onClose}
                  className="flex items-center gap-3 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-serif transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  <X className="w-6 h-6" />
                  <span className="text-lg">Close Book</span>
                </button>
              </div>
            </div>
          
            {/* Book Thickness/Pages Effect on Left */}
            <div className="absolute left-0 top-2 bottom-2 w-1 bg-white/90"></div>
            <div className="absolute left-1 top-3 bottom-3 w-1 bg-white/70"></div>
            <div className="absolute left-2 top-4 bottom-4 w-1 bg-white/50"></div>
          </div>
        </div>
      </div>
    );
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none"></div>
            
            {/* Cover Content */}
            <div className="relative h-full flex flex-col items-center justify-center p-12 text-center z-10 pointer-events-none">
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

  // Book Reading View with Two-Page Spread
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col z-[100]">
      {/* Top Controls */}
      <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all z-10"
          title="Close"
        >
          <X className="w-7 h-7" />
        </button>
      {/* Book Container - Two Page Spread */}
      <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-8">
        <div className={`flex gap-2 items-center justify-center transition-all duration-600 ${isFlipping ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`} style={{ height: '700px' }}>
          
          {/* Left Page */}
          <div className="bg-white rounded-l-lg shadow-2xl overflow-hidden" style={{ width: '500px', height: '700px' }}>
            {leftPage ? (
              <div className="h-full flex flex-col p-8">
                <div className="flex-1 overflow-auto book-content" style={{ maxHeight: 'calc(100% - 50px)' }}>
                  {leftPage.type === 'chapter-title' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="text-sm text-gray-600 font-serif mb-4 uppercase tracking-widest">
                        Chapter {leftPage.chapterIndex}
                      </div>
                      <h1 className="text-4xl font-serif font-bold text-gray-900 leading-tight">
                        {leftPage.title}
                      </h1>
                    </div>
                  ) : (
                    <div className="font-serif text-base leading-relaxed text-gray-800">
                      <p className="whitespace-pre-wrap text-justify first-letter:text-6xl first-letter:font-bold first-letter:text-gray-800 first-letter:mr-2 first-letter:float-left first-letter:leading-none">
                        {leftPage.text}
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-4 text-center border-t border-gray-300 mt-auto flex-shrink-0">
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
          <div className="bg-white rounded-r-lg shadow-2xl overflow-hidden" style={{ width: '500px', height: '700px' }}>
            {rightPage ? (
              <div className="h-full flex flex-col p-8">
                <div className="flex-1 overflow-auto book-content" style={{ maxHeight: 'calc(100% - 50px)' }}>
                  {rightPage.type === 'chapter-title' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="text-sm text-gray-600 font-serif mb-4 uppercase tracking-widest">
                        Chapter {rightPage.chapterIndex}
                      </div>
                      <h1 className="text-4xl font-serif font-bold text-gray-900 leading-tight">
                        {rightPage.title}
                      </h1>
                    </div>
                  ) : (
                    <div className="font-serif text-base leading-relaxed text-gray-800">
                      <p className="whitespace-pre-wrap text-justify first-letter:text-6xl first-letter:font-bold first-letter:text-gray-800 first-letter:mr-2 first-letter:float-left first-letter:leading-none">
                        {rightPage.text}
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-4 text-center border-t border-gray-300 mt-auto flex-shrink-0">
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
      <div className="flex-shrink-0 px-2 py-2 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 flex items-center justify-between">
        <button
          onClick={prevSpread}
          disabled={currentSpreadIndex === 0 || isFlipping}
          className="flex items-center gap-2 px-2 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
          disabled={isFlipping}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {currentSpreadIndex === totalSpreads - 1 ? 'Finish' : 'Next'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default BookReader;
