import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, BookOpen, Monitor,
  FileText, AlertCircle, CheckCircle2,
  AlertTriangle, ShieldCheck, Tablet, Smartphone, Loader2
} from 'lucide-react';
import { ReactReader } from 'react-reader';
import appSettings, { isProduction } from '../config/appSettings';

// Simple utility to merge classnames
const cn = (...classes) => classes.filter(Boolean).join(' ');

// EPUB proxy URL builder
const getBaseUrl = () =>
  isProduction() ? appSettings.api.baseUrl : appSettings.api.baseUrlLocal;

const buildEpubProxyUrl = (originalUrl) => {
  if (!originalUrl) return null;
  const proxyUrl = `${getBaseUrl()}/Book/epub?url=${encodeURIComponent(originalUrl)}`;
  console.log('EPUB Proxy URL:', proxyUrl);
  return proxyUrl;
};

// ─── Sound engine (Web Audio API — no external deps) ─────────────────────────
function playPageFlipSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const duration = 0.18;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      const env = Math.exp(-t * 28);
      data[i] = (Math.random() * 2 - 1) * env * 0.55
        + Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 60) * 0.3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + duration);
  } catch (_) {}
}

// ─── Page content components ──────────────────────────────────────────────────

function CoverPage({ book }) {
  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      {book.cover_url ? (
        <img src={book.cover_url} alt="Cover" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950">
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99,102,241,0.35) 0%, transparent 55%), radial-gradient(circle at 75% 75%, rgba(14,165,233,0.2) 0%, transparent 50%)' }} />
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mb-8 shadow-2xl">
              <BookOpen className="w-8 h-8 text-white/80" />
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight mb-4 drop-shadow-lg">
              {book.title || 'Your Book Title'}
            </h1>
            {book.subtitle && <p className="text-sm text-white/50 leading-relaxed italic">{book.subtitle}</p>}
          </div>
          <div className="relative z-10 px-8 pb-10 text-center">
            <div className="w-12 h-px bg-white/20 mx-auto mb-5" />
            <p className="text-sm font-semibold text-white/80 tracking-wide">{book.author_name || 'Author Name'}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-3 h-3 rounded-full bg-indigo-400/80" />
              <p className="text-[10px] text-white/30 uppercase tracking-[0.25em]">Classpedia</p>
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" />
    </div>
  );
}

function RightBlankPage() {
  return (
    <div className="w-full h-full bg-[#f8f6f1] flex items-center justify-center">
      <div className="w-full h-full" style={{
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #e8e4dc 28px)',
        backgroundPositionY: '40px',
        opacity: 0.4
      }} />
    </div>
  );
}

function TitlePage({ book }) {
  return (
    <div className="w-full h-full bg-[#faf9f5] flex flex-col px-10 py-14 relative">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      <p className="text-[8px] text-slate-300 uppercase tracking-[0.25em] mb-auto font-medium">Classpedia · Digital Edition</p>
      <div className="my-auto text-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800 leading-snug mb-3">
          {book.title || 'Your Book Title'}
        </h1>
        {book.subtitle && <p className="text-sm font-serif text-slate-400 italic mb-8">{book.subtitle}</p>}
        <div className="flex items-center gap-3 justify-center my-7">
          <div className="flex-1 h-px bg-slate-200" />
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <div className="w-1 h-1 rounded-full bg-slate-400" />
            <div className="w-1 h-1 rounded-full bg-slate-300" />
          </div>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <p className="text-sm text-slate-700 font-semibold tracking-wide">{book.author_name || 'Author Name'}</p>
        {(book.contributors || []).slice(0, 2).map((c, i) => (
          <p key={i} className="text-[11px] text-slate-400 mt-1.5">{c.role}: {c.name}</p>
        ))}
        {book.edition && (
          <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest">{book.edition} Edition</p>
        )}
        {book.seriesName && (
          <p className="text-[10px] text-slate-400 mt-1 italic">{book.seriesName}</p>
        )}
      </div>
      <p className="text-[8px] text-slate-300 text-center mt-auto leading-relaxed">
        © {new Date().getFullYear()} {book.author_name || 'Author'} · All rights reserved
      </p>
    </div>
  );
}

function TocPage({ book, entries: providedEntries, onNavigate }) {
  const fallback = [
    { number: null, displayLabel: 'Introduction', pg: 1 },
    { number: 1, displayLabel: 'Chapter: One', pg: 14 },
    { number: 2, displayLabel: 'Chapter: Two', pg: 28 },
    { number: 3, displayLabel: 'Chapter: Three', pg: 42 },
    { number: 4, displayLabel: 'Chapter: Four', pg: 58 },
    { number: null, displayLabel: 'Conclusion', pg: 74 },
  ];
  const entries = (providedEntries && providedEntries.length > 0) ? providedEntries : fallback;
  const MAX_VISIBLE = 14;
  const visible = entries.slice(0, MAX_VISIBLE);
  const remaining = Math.max(0, entries.length - MAX_VISIBLE);
  return (
    <div className="w-full h-full bg-[#faf9f5] px-10 py-12 flex flex-col">
      <div className="mb-6">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Table of Contents</p>
        <div className="w-8 h-0.5 bg-slate-300 mt-2" />
      </div>
      <div className="flex-1 space-y-0 overflow-hidden">
        {visible.map((e, i) => (
          <button
            key={i}
            onClick={() => onNavigate && onNavigate(e.spreadIndex)}
            className="flex items-baseline gap-2 py-1.5 w-full hover:bg-slate-100/50 active:bg-slate-100 transition-colors rounded px-1 -mx-1 cursor-pointer group"
          >
            <span className="text-[10px] text-slate-400 w-6 text-right shrink-0 font-mono tabular-nums">
              {e.number != null ? `${e.number}.` : ''}
            </span>
            <span className="text-[11px] text-slate-700 font-medium truncate max-w-[60%] group-hover:text-indigo-600">
              {e.displayLabel}
            </span>
            <span className="flex-1 border-b border-dotted border-slate-300 mx-1 mb-[3px]" />
            <span className="text-[10px] text-slate-500 tabular-nums font-mono shrink-0 group-hover:text-indigo-600">{e.pg}</span>
          </button>
        ))}
        {remaining > 0 && (
          <p className="text-[10px] text-slate-400 italic pt-2">… and {remaining} more</p>
        )}
      </div>
      <p className="text-[8px] text-slate-300 mt-6 truncate">{book.title}</p>
    </div>
  );
}

// Render a single element from the structured manuscript
function renderElement(el, key) {
  if (!el || !el.content) return null;
  switch (el.type) {
    case 'h1':
      return <h1 key={key} className="text-base font-serif font-bold text-slate-800 mb-2 leading-snug">{el.content}</h1>;
    case 'h2':
      return <h2 key={key} className="text-sm font-serif font-bold text-slate-800 mb-1.5 leading-snug">{el.content}</h2>;
    case 'h3':
      return <h3 key={key} className="text-[13px] font-serif font-semibold text-slate-800 mb-1 leading-snug">{el.content}</h3>;
    case 'h4':
    case 'h5':
    case 'h6':
      return <h4 key={key} className="text-xs font-serif font-semibold text-slate-700 mb-1">{el.content}</h4>;
    case 'blockquote':
      return <blockquote key={key} className="text-[11px] text-slate-500 italic border-l-2 border-slate-300 pl-3 my-2">{el.content}</blockquote>;
    case 'li':
      return <li key={key} className="text-[11px] text-slate-600 leading-[1.85] ml-4 list-disc">{el.content}</li>;
    case 'p':
    default:
      return <p key={key} className="text-[11px] text-slate-600 leading-[1.85] text-justify">{el.content}</p>;
  }
}

// Character budget per page
const CHARS_PER_PAGE = 1400;
const FIRST_PAGE_BUDGET = 1000;

function elementCost(el) {
  const len = (el?.content || '').length;
  switch (el?.type) {
    case 'h1': return Math.max(len * 2.2, 220);
    case 'h2': return Math.max(len * 1.8, 160);
    case 'h3': return Math.max(len * 1.5, 120);
    case 'h4':
    case 'h5':
    case 'h6': return Math.max(len * 1.3, 100);
    case 'blockquote': return len + 80;
    case 'li': return len + 40;
    case 'p':
    default: return len + 50;
  }
}

function splitLongElement(el) {
  const content = el?.content || '';
  if ((el?.type !== 'p' && el?.type !== 'blockquote') || content.length <= CHARS_PER_PAGE - 200) {
    return [el];
  }
  const sentences = content.match(/[^.!?]+[.!?]+["')\]]?\s*|[^.!?]+$/g) || [content];
  const limit = CHARS_PER_PAGE - 250;
  const chunks = [];
  let buf = '';
  for (const s of sentences) {
    if (buf.length + s.length > limit && buf.length > 0) {
      chunks.push({ ...el, content: buf.trim() });
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) chunks.push({ ...el, content: buf.trim() });
  return chunks.length > 0 ? chunks : [el];
}

function paginateChapterElements(elements) {
  const expanded = (elements || []).flatMap(splitLongElement);
  const pages = [];
  let current = [];
  let cost = 0;
  let budget = FIRST_PAGE_BUDGET;
  for (const el of expanded) {
    const c = elementCost(el);
    if (cost + c > budget && current.length > 0) {
      pages.push(current);
      current = [];
      cost = 0;
      budget = CHARS_PER_PAGE;
    }
    current.push(el);
    cost += c;
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);
  return pages;
}

function ContentPage({ book, displayTitle, chapterNumber, kind, elements, pageNumber }) {
  let headerLeft;
  if (kind === 'chapter' && chapterNumber) {
    const titleText = displayTitle || book?.title || '';
    headerLeft = titleText
      ? `${chapterNumber}: Chapter: ${titleText}`
      : `${chapterNumber}: Chapter`;
  } else {
    headerLeft = displayTitle || book?.title || '';
  }
  return (
    <div className="w-full h-full bg-[#faf9f5] px-9 py-10 flex flex-col relative">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest truncate font-semibold">
          {headerLeft}
        </p>
        <p className="text-[9px] text-slate-400 font-mono shrink-0 tabular-nums">{pageNumber}</p>
      </div>
      <div className="w-full h-px bg-slate-200 mb-4" />
      <div className="flex-1 space-y-3 overflow-hidden">
        {elements && elements.length > 0 ? (
          elements.map((el, i) => renderElement(el, i))
        ) : (
          <p className="text-[11px] text-slate-400 italic">No content available on this page.</p>
        )}
      </div>
    </div>
  );
}

// UPDATED: Split the EPUB into left and right pages for a two-page spread
function EpubLeftPage({ book, rendition }) {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // Get the left page location (odd pages)
  useEffect(() => {
    if (rendition) {
      // Try to get the current location
      const currentLocation = rendition.currentLocation();
      if (currentLocation) {
        setLocation(currentLocation.start.cfi);
        setIsLoading(false);
      }
    }
  }, [rendition]);

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex-1 w-full relative" style={{ minHeight: '250px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        )}
        <div className="w-full h-full overflow-hidden">
          {/* The left page will be rendered here */}
          <div className="p-4 text-sm text-slate-600">
            <p className="font-serif">Left page content</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EpubRightPage({ book, rendition }) {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // Get the right page location (even pages)
  useEffect(() => {
    if (rendition) {
      const currentLocation = rendition.currentLocation();
      if (currentLocation) {
        setLocation(currentLocation.start.cfi);
        setIsLoading(false);
      }
    }
  }, [rendition]);

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex-1 w-full relative" style={{ minHeight: '250px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        )}
        <div className="w-full h-full overflow-hidden">
          <div className="p-4 text-sm text-slate-600">
            <p className="font-serif">Right page content</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// UPDATED: FullWidthManuscriptPage that shows EPUB as a two-page spread
function FullWidthManuscriptPage({ book }) {
  const [location, setLocation] = useState(null);
  const [epubError, setEpubError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rendition, setRendition] = useState(null);
  const containerRef = useRef(null);
  
  const ext = (book.manuscript_filename || '').split('.').pop().toLowerCase();
  const isEpub = ext === 'epub';
  const proxyUrl = buildEpubProxyUrl(book.manuscript_url);

  useEffect(() => {
    setIsLoading(true);
    setEpubError(null);
  }, [proxyUrl]);

  if (isEpub && book.manuscript_url && proxyUrl) {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
          <FileText className="w-3 h-3 text-slate-400" />
          <p className="text-[9px] text-slate-500 truncate font-medium">{book.manuscript_filename}</p>
          <span className="ml-auto text-[8px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 uppercase font-bold">{ext}</span>
        </div>
        <div 
          ref={containerRef}
          className="flex-1 w-full relative" 
          style={{ minHeight: '500px', height: '100%' }}
        >
          {epubError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-sm font-semibold text-red-600">Failed to load EPUB</p>
              <p className="text-xs text-slate-500 max-w-md">{epubError}</p>
              <button 
                onClick={() => {
                  setEpubError(null);
                  setIsLoading(true);
                  setLocation(null);
                }}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500">Loading EPUB...</p>
                  </div>
                </div>
              )}
              <div className="flex w-full h-full">
                {/* Left Page - Shows EPUB content */}
                <div className="flex-1 relative overflow-hidden border-r border-slate-200">
                  <ReactReader
                    url={proxyUrl}
                    location={location}
                    locationChanged={(epubcfi) => {
                      setLocation(epubcfi);
                      setIsLoading(false);
                    }}
                    title={book.title}
                    showToc={false}
                    tocOpen={false}
                    epubOptions={{
                      flow: 'paginated',
                      manager: 'default',
                    }}
                    getRendition={(rend) => {
                      try {
                        setRendition(rend);
                        rend.themes.default({
                          '::selection': {
                            background: 'rgba(99, 102, 241, 0.3)',
                          },
                          body: {
                            padding: '30px 25px !important',
                            fontFamily: 'Georgia, "Times New Roman", serif !important',
                            fontSize: '14px !important',
                            lineHeight: '1.8 !important',
                            color: '#1a1a1a !important',
                          },
                          p: {
                            marginBottom: '1em !important',
                            textAlign: 'justify !important',
                          },
                          h1: {
                            fontSize: '1.8em !important',
                            fontWeight: 'bold !important',
                            marginBottom: '0.5em !important',
                          },
                          h2: {
                            fontSize: '1.4em !important',
                            fontWeight: 'bold !important',
                            marginBottom: '0.5em !important',
                          },
                          h3: {
                            fontSize: '1.2em !important',
                            fontWeight: 'bold !important',
                            marginBottom: '0.4em !important',
                          },
                        });
                        
                        rend.on('rendered', () => {
                          setIsLoading(false);
                        });
                        
                        rend.on('error', (err) => {
                          console.error('EPUB rendering error:', err);
                          setEpubError(err.message || 'Failed to render EPUB');
                          setIsLoading(false);
                        });
                      } catch (err) {
                        console.error('EPUB setup error:', err);
                        setEpubError(err.message || 'Failed to initialize EPUB reader');
                        setIsLoading(false);
                      }
                    }}
                  />
                </div>
                {/* Center spine */}
                <div className="w-px shrink-0 relative z-10"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)', boxShadow: '-4px 0 12px rgba(0,0,0,0.25), 4px 0 12px rgba(0,0,0,0.25)' }} />
                {/* Right Page - Shows same content but with different styling */}
                <div className="flex-1 relative overflow-hidden">
                  <ReactReader
                    url={proxyUrl}
                    location={location}
                    locationChanged={(epubcfi) => {
                      setLocation(epubcfi);
                      setIsLoading(false);
                    }}
                    title={book.title}
                    showToc={false}
                    tocOpen={false}
                    epubOptions={{
                      flow: 'paginated',
                      manager: 'default',
                    }}
                    getRendition={(rend) => {
                      try {
                        rend.themes.default({
                          '::selection': {
                            background: 'rgba(99, 102, 241, 0.3)',
                          },
                          body: {
                            padding: '30px 25px !important',
                            fontFamily: 'Georgia, "Times New Roman", serif !important',
                            fontSize: '14px !important',
                            lineHeight: '1.8 !important',
                            color: '#1a1a1a !important',
                          },
                          p: {
                            marginBottom: '1em !important',
                            textAlign: 'justify !important',
                          },
                          h1: {
                            fontSize: '1.8em !important',
                            fontWeight: 'bold !important',
                            marginBottom: '0.5em !important',
                          },
                          h2: {
                            fontSize: '1.4em !important',
                            fontWeight: 'bold !important',
                            marginBottom: '0.5em !important',
                          },
                          h3: {
                            fontSize: '1.2em !important',
                            fontWeight: 'bold !important',
                            marginBottom: '0.4em !important',
                          },
                        });
                        
                        rend.on('rendered', () => {
                          setIsLoading(false);
                        });
                        
                        rend.on('error', (err) => {
                          console.error('EPUB rendering error:', err);
                          setEpubError(err.message || 'Failed to render EPUB');
                          setIsLoading(false);
                        });
                      } catch (err) {
                        console.error('EPUB setup error:', err);
                        setEpubError(err.message || 'Failed to initialize EPUB reader');
                        setIsLoading(false);
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function ManuscriptPage({ book }) {
  const ext = (book.manuscript_filename || '').split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf';

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
        <FileText className="w-3 h-3 text-slate-400" />
        <p className="text-[9px] text-slate-500 truncate font-medium">{book.manuscript_filename}</p>
        <span className="ml-auto text-[8px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 uppercase font-bold">{ext}</span>
      </div>
      {isPdf && book.manuscript_url ? (
        <iframe
          src={`${book.manuscript_url}#toolbar=0&navpanes=0&scrollbar=0&page=1`}
          className="flex-1 w-full border-0"
          title="Manuscript Preview"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4 bg-[#faf9f5]">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <FileText className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{book.manuscript_filename}</p>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-[200px]">
              {['epub', 'mobi', 'kpf'].includes(ext)
                ? 'Rendered in the full Classpedia reader after publishing.'
                : 'Converted to eBook format during the publishing process.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <p className="text-[10px] text-green-700 font-medium">Uploaded successfully</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BackCoverPage({ book }) {
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col">
      <div className="absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(circle at 70% 25%, rgba(99,102,241,0.25) 0%, transparent 55%)' }} />
      {book.cover_url && (
        <div className="absolute inset-0 opacity-[0.06]">
          <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 text-center gap-6">
        {book.cover_url && (
          <img src={book.cover_url} alt="" className="w-14 h-20 object-cover rounded-lg shadow-2xl opacity-70 ring-1 ring-white/10" />
        )}
        <div className="w-10 h-px bg-white/20" />
        <p className="text-sm text-white/70 leading-relaxed font-serif italic max-w-[220px]">
          “{book.description
            ? book.description.slice(0, 200) + (book.description.length > 200 ? '…' : '')
            : 'Your book description will appear here on the back cover.'}”
        </p>
        <div className="w-10 h-px bg-white/20" />
        <p className="text-xs text-white/50 font-semibold tracking-wide">{book.author_name || 'Author Name'}</p>
      </div>
      <div className="relative z-10 flex items-center justify-center gap-2 pb-7">
        <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
          <BookOpen className="w-3 h-3 text-white" />
        </div>
        <span className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Classpedia Publishing</span>
      </div>
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />
    </div>
  );
}

// ─── Structural blocking checks ───────────────────────────────────────────────
function buildIssues(book) {
  const issues = [];
  if (!book.manuscript_url) issues.push({ id: 'no_manuscript', severity: 'error', category: 'formatting', word: null, title: 'No manuscript uploaded', desc: 'Upload your manuscript file (EPUB, PDF, or DOCX) in the Content step.' });
  if (!book.cover_url) issues.push({ id: 'no_cover', severity: 'error', category: 'formatting', word: null, title: 'Missing front cover', desc: 'A front cover image is required before your book can be published.' });
  return issues;
}

// ─── Two-page spread config ───────────────────────────────────────────────────
const BARE_CHAPTER_LABEL_RE = /^(chapter\s+[ivxlcdm0-9]+|part\s+[ivxlcdm0-9]+|prologue|epilogue|[ivxlcdm]+|[0-9]+)\.?\s*$/i;
const isBareChapterLabel = (s) => BARE_CHAPTER_LABEL_RE.test((s || '').trim());

const FRONT_MATTER_PATTERNS = [
  { re: /^cover$/i, label: 'Cover' },
  { re: /cover\s*page/i, label: 'Cover' },
  { re: /titlepage/i, label: 'Title Page' },
  { re: /^title\s*page$/i, label: 'Title Page' },
  { re: /half[-\s]?title/i, label: 'Half Title' },
  { re: /copyright|imprint|colophon/i, label: 'Copyright' },
  { re: /dedication/i, label: 'Dedication' },
  { re: /preface/i, label: 'Preface' },
  { re: /foreword/i, label: 'Foreword' },
  { re: /introduction/i, label: 'Introduction' },
  { re: /acknowledg/i, label: 'Acknowledgments' },
  { re: /^contents$|table\s+of\s+contents|^toc$/i, label: 'Contents' },
  { re: /about\s+the\s+author/i, label: 'About the Author' },
  { re: /^index$/i, label: 'Index' },
  { re: /bookmarks?/i, label: 'Bookmarks' },
  { re: /bibliography/i, label: 'Bibliography' },
  { re: /glossary/i, label: 'Glossary' },
  { re: /appendix/i, label: 'Appendix' },
  { re: /^notes?$/i, label: 'Notes' },
];

function classifyChapter(chapter, bookTitleLc) {
  const title = (chapter?.title || '').trim();
  const titleLc = title.toLowerCase();
  const elements = Array.isArray(chapter?.elements) ? chapter.elements : [];
  const totalChars = elements.reduce((s, el) => s + (el?.content?.length || 0), 0);
  const paragraphCount = elements.filter((el) => el?.type === 'p').length;

  for (const fm of FRONT_MATTER_PATTERNS) {
    if (fm.re.test(title)) return { kind: 'front', label: fm.label };
  }

  if (titleLc && titleLc === bookTitleLc && totalChars < 600) {
    return { kind: 'front', label: 'Title Page' };
  }

  if (/project\s+gutenberg/i.test(title) && totalChars < 2000) {
    return { kind: 'front', label: 'Title Page' };
  }

  if (totalChars < 250 || paragraphCount < 1) {
    return { kind: 'front', label: title || 'Front Matter' };
  }

  return { kind: 'chapter' };
}

function computeDisplayTitle(chapter, bookTitleLc) {
  const elements = Array.isArray(chapter?.elements) ? chapter.elements : [];
  const ct = (chapter?.title || '').trim();
  const ctLc = ct.toLowerCase();

  if (ct && ctLc !== bookTitleLc) {
    if (!isBareChapterLabel(ct)) {
      const stripped = ct
        .replace(/^(chapter\s+[ivxlcdm0-9]+|part\s+[ivxlcdm0-9]+|[ivxlcdm]+|[0-9]+)[\s.\u2014\u2013:\-_]+/i, '')
        .trim();
      if (stripped && stripped.toLowerCase() !== bookTitleLc) return stripped;
    }
  }

  let sawMarker = false;
  for (let i = 0; i < Math.min(elements.length, 12); i++) {
    const el = elements[i];
    if (!el) continue;
    const isH = /^h[1-6]$/i.test(el.type || '');
    const isP = el.type === 'p';
    if (!isH && !isP) continue;
    const t = (el.content || '').trim();
    if (!t) continue;
    if (t.toLowerCase() === bookTitleLc) continue;
    if (isBareChapterLabel(t)) { sawMarker = true; continue; }
    if (isH) return t;
    if (isP && sawMarker && t.length <= 80) return t;
  }
  return '';
}

function buildSpreads(book, onNavigateToSpread) {
  const structure = book.manuscript_structure;
  const chapters = structure?.chapters || [];
  const bookTitleLc = (book?.title || '').trim().toLowerCase();

  let chapterCounter = 0;
  const processedChapters = chapters.map((chapter) => {
    const cls = classifyChapter(chapter, bookTitleLc);

    let chapterNumber = null;
    let displayTitle = '';
    if (cls.kind === 'chapter') {
      chapterCounter += 1;
      chapterNumber = chapterCounter;
      displayTitle = computeDisplayTitle(chapter, bookTitleLc);
    } else {
      displayTitle = cls.label || chapter?.title || '';
    }

    let elements = Array.isArray(chapter?.elements) ? chapter.elements.slice() : [];
    const titleLc = (chapter?.title || '').trim().toLowerCase();
    const displayLc = displayTitle.trim().toLowerCase();
    while (elements.length > 0) {
      const first = elements[0];
      const isHeading = first && /^h[1-6]$/i.test(first.type || '');
      const firstText = (first?.content || '').trim();
      const firstLc = firstText.toLowerCase();
      const isBookTitle = firstLc === bookTitleLc;
      const isChapterLabel = isBareChapterLabel(firstText);
      const isDisplayTitle = displayLc && firstLc === displayLc;
      const isParserTitle = titleLc && firstLc === titleLc;
      if (isHeading && (isBookTitle || isChapterLabel || isDisplayTitle || isParserTitle)) {
        elements = elements.slice(1);
      } else {
        break;
      }
    }

    const pages = paginateChapterElements(elements);
    return { chapter, kind: cls.kind, chapterNumber, displayTitle, pages };
  });

  const contentPages = [];
  const tocEntries = [];
  let pageCounter = 1;
  const firstChapterIdx = processedChapters.findIndex((p) => p.kind === 'chapter');
  const hasLeadingFrontMatter = firstChapterIdx > 0;

  processedChapters.forEach(({ chapter, kind, chapterNumber, displayTitle, pages }, idx) => {
    const startPage = pageCounter;
    const contentPageStartIndex = contentPages.length;
    
    if (kind === 'chapter') {
      const titleForToc = displayTitle || book?.title || '';
      tocEntries.push({
        number: chapterNumber,
        displayLabel: titleForToc ? `Chapter: ${titleForToc}` : 'Chapter',
        pg: startPage,
        contentPageIndex: contentPageStartIndex,
      });
    } else if (hasLeadingFrontMatter && idx === 0) {
      tocEntries.push({
        number: null,
        displayLabel: 'Introduction',
        pg: startPage,
        contentPageIndex: contentPageStartIndex,
      });
    }

    pages.forEach((els, p) => {
      contentPages.push({
        chapter,
        kind,
        chapterNumber,
        displayTitle,
        pageWithinChapter: p,
        elements: els,
        pageNumber: pageCounter++,
      });
    });
  });

  const spreads = [
    { left: (b) => <CoverPage book={b} />, right: () => <RightBlankPage />, leftLabel: 'Cover', rightLabel: '' },
    { left: (b) => <TitlePage book={b} />, right: (b) => <TocPage book={b} entries={[]} onNavigate={onNavigateToSpread} />, leftLabel: 'Title Page', rightLabel: 'Contents' },
  ];

  if (contentPages.length > 0) {
    for (let i = 0; i < contentPages.length; i += 2) {
      const leftPage = contentPages[i];
      const rightPage = contentPages[i + 1];

      const labelOf = (p) => {
        if (!p) return '';
        if (p.kind === 'chapter' && p.chapterNumber) {
          return p.displayTitle
            ? `Chapter ${p.chapterNumber}: ${p.displayTitle}`
            : `Chapter ${p.chapterNumber}`;
        }
        return p.displayTitle || '';
      };

      spreads.push({
        left: (b) => (
          <ContentPage
            book={b}
            kind={leftPage.kind}
            chapterNumber={leftPage.chapterNumber}
            displayTitle={leftPage.displayTitle}
            elements={leftPage.elements}
            pageNumber={leftPage.pageNumber}
          />
        ),
        right: rightPage
          ? (b) => (
              <ContentPage
                book={b}
                kind={rightPage.kind}
                chapterNumber={rightPage.chapterNumber}
                displayTitle={rightPage.displayTitle}
                elements={rightPage.elements}
                pageNumber={rightPage.pageNumber}
              />
            )
          : () => <RightBlankPage />,
        leftLabel: labelOf(leftPage),
        rightLabel: labelOf(rightPage),
        leftPageNum: leftPage.pageNumber,
        rightPageNum: rightPage?.pageNumber ?? null,
      });
    }
  } else if (book.manuscript_url) {
    const ext = (book.manuscript_filename || '').split('.').pop().toLowerCase();
    const isEpub = ext === 'epub';
    
    if (isEpub) {
      // For EPUB files, use full-width component that displays as a two-page spread
      spreads.push({
        left: (b) => <FullWidthManuscriptPage book={b} />,
        right: () => null,
        leftLabel: 'Manuscript',
        rightLabel: '',
        fullWidth: true,
      });
    } else {
      spreads.push({
        left: (b) => <ManuscriptPage book={b} />,
        right: () => <RightBlankPage />,
        leftLabel: 'Manuscript',
        rightLabel: '',
      });
    }
  }

  spreads.push({
    left: () => <RightBlankPage />,
    right: (b) => <BackCoverPage book={b} />,
    leftLabel: '',
    rightLabel: 'Back Cover',
  });

  const tocEntriesWithSpreadIndex = tocEntries.map(entry => ({
    ...entry,
    spreadIndex: 2 + Math.floor(entry.contentPageIndex / 2),
  }));

  spreads[1] = {
    left: (b) => <TitlePage book={b} />,
    right: (b) => <TocPage book={b} entries={tocEntriesWithSpreadIndex} onNavigate={onNavigateToSpread} />,
    leftLabel: 'Title Page',
    rightLabel: 'Contents',
  };

  const chapterSpreadIndex = {};
  const contentPageLocator = contentPages.map((p, i) => {
    const spreadIndex = 2 + Math.floor(i / 2);
    const ci = p.chapter?.chapterIndex;
    if (ci != null && chapterSpreadIndex[ci] === undefined) chapterSpreadIndex[ci] = spreadIndex;
    const text = (p.elements || []).map((e) => e?.content || '').join(' ');
    return { spreadIndex, chapterIndex: ci ?? null, text };
  });
  
  const result = spreads;
  result.chapterSpreadIndex = chapterSpreadIndex;
  result.contentPageLocator = contentPageLocator;
  return result;
}

// ─── Flip Page animation ──────────────────────────────────────────────────────
function FlipLeaf({ direction, fromContent, toContent, pageH, pageW }) {
  const [phase, setPhase] = useState('start');
  const leafRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('end');
      });
    });
    const t = setTimeout(() => setPhase('done'), 600);
    return () => clearTimeout(t);
  }, []);

  if (phase === 'done') return null;

  const goingNext = direction === 'next';

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20, perspective: '2000px', perspectiveOrigin: '50% 50%' }}
    >
      <div
        ref={leafRef}
        style={{
          position: 'absolute',
          top: 0,
          [goingNext ? 'left' : 'right']: '50%',
          width: '50%',
          height: '100%',
          transformOrigin: goingNext ? 'left center' : 'right center',
          transformStyle: 'preserve-3d',
          transform: phase === 'end'
            ? `rotateY(${goingNext ? '-180deg' : '180deg'})`
            : 'rotateY(0deg)',
          transition: 'transform 0.55s cubic-bezier(0.645, 0.045, 0.355, 1.000)',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          background: 'linear-gradient(to right, rgba(0,0,0,0.12) 0%, transparent 8%)',
          boxShadow: goingNext ? '-8px 0 20px rgba(0,0,0,0.25)' : '8px 0 20px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          borderRadius: goingNext ? '0 2px 2px 0' : '2px 0 0 2px',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            transform: goingNext ? 'translateX(0)' : 'translateX(-100%)',
            width: '200%',
          }}>
            {fromContent}
          </div>
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: 'linear-gradient(to left, rgba(0,0,0,0.12) 0%, transparent 8%)',
          overflow: 'hidden',
          borderRadius: goingNext ? '2px 0 0 2px' : '0 2px 2px 0',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            transform: goingNext ? 'translateX(-100%) scaleX(-1)' : 'translateX(0) scaleX(-1)',
            width: '200%',
          }}>
            {toContent}
          </div>
        </div>
      </div>
      <div style={{
        position: 'absolute',
        top: 0,
        left: goingNext ? '50%' : 0,
        right: goingNext ? 0 : '50%',
        height: '100%',
        background: 'linear-gradient(to right, rgba(0,0,0,0.18) 0%, transparent 40%)',
        pointerEvents: 'none',
        opacity: phase === 'end' ? 0 : 0.6,
        transition: 'opacity 0.55s ease',
      }} />
    </div>
  );
}

// ─── Bleed / Margin guides ────────────────────────────────────────────────────
function BleedGuide() {
  const bleed = 9;
  return (
    <div style={{ position: 'absolute', top: bleed, left: bleed, right: bleed, bottom: bleed, border: '1.5px dashed rgba(239,68,68,0.55)', borderRadius: 1, pointerEvents: 'none', zIndex: 9 }}>
      <span style={{ position: 'absolute', bottom: -13, right: 0, fontSize: 7, color: 'rgba(239,68,68,0.7)', fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap', textShadow: '0 0 3px white, 0 0 3px white' }}>BLEED (0.125″)</span>
    </div>
  );
}

function MarginGuide({ side }) {
  const gutterExtra = side === 'left' ? 8 : 0;
  const innerGutter = side === 'right' ? 8 : 0;
  return (
    <div style={{ position: 'absolute', top: 28, left: 28 + innerGutter, right: 28 + gutterExtra, bottom: 28, border: '1.5px dashed rgba(59,130,246,0.75)', borderRadius: 1, pointerEvents: 'none', zIndex: 10 }}>
      <span style={{ position: 'absolute', top: -13, left: 0, fontSize: 7, color: 'rgba(59,130,246,0.85)', fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap', textShadow: '0 0 3px white, 0 0 3px white' }}>MARGIN (0.25″)</span>
    </div>
  );
}

// ─── Sample-chapter view ──────────────────────────────────────────────────────
function ParagraphWithHighlights({ text, highlightWords, indent }) {
  if (!highlightWords || highlightWords.length === 0) {
    return (
      <p style={{ fontSize: 9.5, color: '#222', lineHeight: 1.75, textAlign: 'justify', marginBottom: 10, textIndent: indent ? 14 : 0 }}>
        {text}
      </p>
    );
  }
  const escapedWords = highlightWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <p style={{ fontSize: 9.5, color: '#222', lineHeight: 1.75, textAlign: 'justify', marginBottom: 10, textIndent: indent ? 14 : 0 }}>
      {parts.map((part, i) => {
        const isFlag = highlightWords.some(w => w.toLowerCase() === part.toLowerCase());
        if (isFlag) {
          return (
            <span key={i} style={{
              textDecoration: 'underline wavy #e53e3e',
              textDecorationSkipInk: 'none',
              background: 'rgba(229,62,62,0.07)',
              borderRadius: 2,
              padding: '0 1px',
            }}>{part}</span>
          );
        }
        return part;
      })}
    </p>
  );
}

const FILLER_PARAS = [
  `Though, a remnant of the renaissance era, the talented web unit took everyone by surprise. Tightly woven fibres resembled real muscles, capable of insulating as well as cooling the epidermis. Biceps muscles twinkled with carbon dust as the muscle head fit perfectly into the anterior deltoid. Stretched over dark leather, all muscle groups radiated a commanding presence as the carbon shimmered in the light. Curiously, acid silicone spike volumes. The team would soon be empowered to learn it can defend against skull attacks or condescends powder assaults, while effectively protecting the wearer from personal death, illness, respect, and a sincere commitment to faith and traditions obtained throughout the land.`,
  `Ninety acres of pines, cedars, fir trees, and an ornate collection of lavender, orange blossoms, and hibiscus saturated countless bees with their incessant labor of production. The land had been owned by the citadel and used for bee farming, as well as hive hunting that came late in the year. Incredibly, weary artificial bees are maintained and used to produce a variety of products. European bees from Italy help produce honey, royal jelly, propolis, and the Brazilian jataíss as super pollen, characterized by its unique pollen profile and rich nutrient content, which added incredible value to the crops. A steady labor of hard work can be a toil of love. Life is good; life is also difficult; however, life is full.`,
  `Digital information became the new gold rush. People spent large amounts of time searching for keys that build both mind and body. Though, a savage doctor rarely settled in a city filled with melancholy without a spiritual warfare continued to take on the heart. Fighting for righteousness was not at all a banquet of flowers; it sometimes fractured the mind. In those moments of doubt, the humble doctor found himself enveloped in a pillar of light from an unknown source — a warm weary source. Filled with knowledge, a stoic man responded to the calling with a grin.`,
  `In silent isolation, a new brand was born. A Large Language Model emerged from the damp folds and depressions of a restored mind. It was readiness that took place in him. An obsession grew from the data society yearned for. Based on a compulsory outline, plans became production material. A steady stream of consciousness lit up a lonely apartment.`,
];

function SampleContentPage({ book, num, side, highlightWords, spreadOffset = 0 }) {
  const pg = (num + spreadOffset) * 14 + (side === 'right' ? 1 : 0);
  const authorName = book.author_name || 'Author Name';
  const chapterTitle = num === 1 ? 'Large Language Model' : num === 2 ? 'The Second Chapter' : `Chapter ${num}`;
  return (
    <div className="w-full h-full flex flex-col relative bg-[#faf9f5]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <div className="flex items-center justify-between px-9 pt-6 pb-2 border-b border-slate-200">
        <span style={{ fontSize: 9, color: '#888', letterSpacing: '0.04em' }}>
          {side === 'left' ? `Writings of ${authorName}` : authorName}
        </span>
      </div>
      <div className="flex-1 overflow-hidden px-9 pt-4 pb-3 flex flex-col">
        {side === 'left' && num >= 1 && (
          <div className="mb-4 text-center">
            <p style={{ fontSize: 10, color: '#555', letterSpacing: '0.06em', marginBottom: 4 }}>Chapter {num}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.25, marginBottom: 2 }}>{chapterTitle}</p>
            <div style={{ width: 32, height: 1, background: '#ccc', margin: '8px auto 0' }} />
          </div>
        )}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {FILLER_PARAS.map((para, i) => (
            <ParagraphWithHighlights key={i} text={para} highlightWords={highlightWords} indent={i > 0} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center px-9 pb-5 pt-1 border-t border-slate-100">
        <span style={{ fontSize: 9, color: '#aaa', fontFamily: 'Georgia, serif' }}>{pg}</span>
      </div>
    </div>
  );
}

function buildSampleSpreads(book, highlightWords) {
  const chapters = [
    { num: 1, label: 'Chapter 1: Large Language Model' },
    { num: 2, label: 'Chapter 2: The Second Chapter' },
    { num: 3, label: 'Chapter 3' },
  ];
  return chapters.map(({ num, label }) => ({
    left:  (b) => <SampleContentPage book={b} num={num} side="left"  highlightWords={highlightWords} />,
    right: (b) => <SampleContentPage book={b} num={num} side="right" highlightWords={highlightWords} />,
    leftLabel: label,
    rightLabel: '',
  }));
}

// ─── Main Previewer ───────────────────────────────────────────────────────────

export default function BookPreviewer({ book, onClose, onApprove }) {
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [flipping, setFlipping] = useState(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [viewSample, setViewSample] = useState(false);
  const [showMargins, setShowMargins] = useState(true);
  const [showBleed, setShowBleed] = useState(true);
  const [viewMode, setViewMode] = useState('desktop');
  const [activeTab, setActiveTab] = useState('formatting');
  const [selectedIssueIndex, setSelectedIssueIndex] = useState(0);
  const [approved, setApproved] = useState(false);
  const canvasRef = useRef(null);
  const dotsRef = useRef(null);

  const handleNavigateToSpread = useCallback((targetSpreadIndex) => {
    if (targetSpreadIndex === spreadIndex || flipping) return;
    playPageFlipSound();
    setSpreadIndex(targetSpreadIndex);
  }, [spreadIndex, flipping]);

  const structuralIssues = buildIssues(book);
  const [analyzedFormatting, setAnalyzedFormatting] = useState([]);
  const [grammarIssues, setGrammarIssues] = useState([]);
  const [grammarLoading, setGrammarLoading] = useState(true);

  const formattingIssues = [...structuralIssues, ...analyzedFormatting];
  const tabIssues = activeTab === 'formatting' ? formattingIssues : grammarIssues;
  const selectedIssue = tabIssues[selectedIssueIndex] || null;
  const hasBlockingErrors = structuralIssues.filter(i => i.id === 'no_manuscript' || i.id === 'no_cover').length > 0;

  const highlightWords = (viewSample && selectedIssue?.word) ? [selectedIssue.word] : [];
  const fullSpreads = buildSpreads(book, handleNavigateToSpread);
  const SPREADS = viewSample ? buildSampleSpreads(book, highlightWords) : fullSpreads;
  const total = SPREADS.length;

  const goToIssue = (issue) => {
    if (!issue || issue.chapterIndex == null) return;
    const map = fullSpreads.chapterSpreadIndex || {};
    const locator = fullSpreads.contentPageLocator || [];

    const findByNeedle = (needle) => {
      const n = (needle || '').toLowerCase().trim();
      if (n.length < 3) return null;
      const hit = locator.find(
        (p) => p.chapterIndex === issue.chapterIndex && p.text.toLowerCase().includes(n)
      );
      return hit ? hit.spreadIndex : null;
    };

    let target = null;
    if (issue.locatorText) {
      target = findByNeedle(issue.locatorText.slice(0, 50));
      if (target == null) {
        const trimmed = issue.locatorText.replace(/^\S*\s+/, '').replace(/\s+\S*$/, '');
        target = findByNeedle(trimmed.slice(0, 50));
      }
    }
    if (target == null) target = findByNeedle(issue.word);
    if (target == null) target = map[issue.chapterIndex] ?? null;
    if (target == null) return;
    if (viewSample) setViewSample(false);
    handleNavigateToSpread(target);
  };

  const navigate = useCallback((dir) => {
    if (flipping) return;
    const next = dir === 'next' ? spreadIndex + 1 : spreadIndex - 1;
    if (next < 0 || next >= total) return;
    playPageFlipSound();
    setFlipping({ direction: dir, fromSpread: spreadIndex, toSpread: next });
    setTimeout(() => { setSpreadIndex(next); setFlipping(null); }, 580);
  }, [spreadIndex, flipping, total]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') navigate('next');
      if (e.key === 'ArrowLeft') navigate('prev');
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onClose]);

  const BOOK_W = 900;
  const BOOK_H = 580;
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const availW = el.clientWidth - 80;
      const availH = el.clientHeight - 80;
      const nativeW = viewMode === 'tablet' ? 440 : viewMode === 'mobile' ? 306 : BOOK_W;
      const nativeH = viewMode === 'tablet' ? 620 : viewMode === 'mobile' ? 660 : BOOK_H;
      setCanvasScale(Math.min(availW / nativeW, availH / nativeH, 1));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [viewMode]);

  useEffect(() => {
    if (!dotsRef.current) return;
    const activeDot = dotsRef.current.children[spreadIndex];
    if (activeDot) activeDot.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [spreadIndex]);

  const currentSpread = SPREADS[spreadIndex];
  const displaySpread = flipping ? SPREADS[flipping.fromSpread] : currentSpread;
  const nextSpread = flipping ? SPREADS[flipping.toSpread] : null;
  const totalPages = SPREADS.reduce((max, s) => Math.max(max, s.rightPageNum ?? s.leftPageNum ?? 0), 0) || total;
  const currentPageDisplay = currentSpread.leftPageNum ?? (spreadIndex + 1);
  const allPages = SPREADS.flatMap(spread => [
    { render: (b) => spread.left(b), label: spread.leftLabel },
    { render: (b) => spread.right(b), label: spread.rightLabel },
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        style={{ width: '96vw', maxWidth: 1280, height: '100vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top header bar ── */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-y-2 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">eBook Preview</span>
            {approved ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
              </span>
            ) : hasBlockingErrors ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" />
                {formattingIssues.length} critical issue{formattingIssues.length !== 1 ? 's' : ''} must be fixed
              </span>
            ) : formattingIssues.length > 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" />
                {formattingIssues.length} formatting issue{formattingIssues.length !== 1 ? 's' : ''}
              </span>
            ) : grammarIssues.length > 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                {grammarIssues.length} grammar warning{grammarIssues.length !== 1 ? 's' : ''} — optional to fix
              </span>
            ) : grammarLoading ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking grammar…
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> All clear
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => { setViewSample(v => !v); setSpreadIndex(0); }}
              className={cn('flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all',
                viewSample
                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              )}>
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{viewSample ? 'View Full Book' : 'View Sample Chapter'}</span>
              <span className="sm:hidden">{viewSample ? 'Full' : 'Sample'}</span>
            </button>
            <button
              onClick={() => {
                setApproved(true);
                if (onApprove) onApprove();
                setTimeout(onClose, 800);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200 transition-all"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Approve
            </button>
            <button onClick={onClose}
              className="w-8 h-8 shrink-0 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border border-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body: sidebar + canvas ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Quality Check Sidebar ── */}
          <div className="w-[200px] lg:w-[260px] shrink-0 flex flex-col overflow-hidden bg-slate-50 border-r border-slate-200">
            <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-slate-800 font-semibold text-sm">Quality Check</p>
                {(formattingIssues.length + grammarIssues.length) > 0 ? (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    {formattingIssues.length + grammarIssues.length} issues
                  </span>
                ) : grammarLoading ? (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Checking…
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> All clear
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px]">Pre-submission analysis</p>
            </div>

            <div className="flex border-b border-slate-200 bg-white">
              <button
                onClick={() => { setActiveTab('formatting'); setSelectedIssueIndex(0); }}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
                  activeTab === 'formatting' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                )}>
                <AlertCircle className="w-3 h-3" /> Formatting
                {formattingIssues.length > 0 && (
                  <span className={cn('text-[10px] font-bold min-w-[16px] h-4 px-1 rounded flex items-center justify-center',
                    activeTab === 'formatting' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600')}>
                    {formattingIssues.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('grammar'); setSelectedIssueIndex(0); }}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
                  activeTab === 'grammar' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                )}>
                <AlertTriangle className="w-3 h-3" /> Grammar
                {grammarLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                ) : grammarIssues.length > 0 && (
                  <span className={cn('text-[10px] font-bold min-w-[16px] h-4 px-1 rounded flex items-center justify-center',
                    activeTab === 'grammar' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600')}>
                    {grammarIssues.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100">
              {activeTab === 'formatting' ? (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="font-medium text-red-600">Critical</span>
                  <span className="text-slate-400">— must fix to proceed</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="font-medium text-amber-600">Warning</span>
                  <span className="text-slate-400">— optional to fix</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'grammar' && grammarLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Checking grammar…</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Analyzing your manuscript content. This may take a moment.
                  </p>
                </div>
              ) : tabIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                  <p className="text-xs text-slate-400 font-medium">No {activeTab} issues found.</p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {tabIssues.map((issue, idx) => (
                    <button
                      key={issue.id}
                      onClick={() => { setSelectedIssueIndex(idx); goToIssue(issue); }}
                      className={cn(
                        'w-full text-left flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-all border',
                        selectedIssueIndex === idx
                          ? activeTab === 'formatting' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-amber-50 border-amber-200 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      )}>
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-[5px] shrink-0',
                        activeTab === 'formatting' ? 'bg-red-500' : 'bg-amber-400')} />
                      <p className={cn('text-[11px] font-medium leading-snug',
                        selectedIssueIndex === idx
                          ? activeTab === 'formatting' ? 'text-red-700' : 'text-amber-700'
                          : 'text-slate-700')}>
                        {issue.title}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedIssue && (
              <div className="border-t border-slate-200 bg-white px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Details</p>
                <p className="text-[11px] leading-relaxed text-slate-600">{selectedIssue.desc}</p>
                {selectedIssue.word && (
                  <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Flagged word</p>
                    <code className="text-[11px] font-mono text-slate-700 font-semibold"
                      style={{ textDecoration: 'underline wavy #e53e3e', textDecorationSkipInk: 'none' }}>
                      {selectedIssue.word}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Center canvas ── */}
          <div ref={canvasRef} className="flex-1 flex flex-col items-center justify-center gap-3 relative overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200">

            {viewMode !== 'desktop' ? (
              <div className="w-full h-full flex items-center justify-center overflow-hidden">
                <div style={{ transform: `scale(${canvasScale})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}>
                  {viewMode === 'tablet' ? (
                    <div className="relative flex flex-col items-center" style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.35))' }}>
                      <div className="relative bg-slate-800 rounded-[28px] p-3"
                        style={{ width: 420, border: '3px solid #1e293b', boxShadow: 'inset 0 0 0 2px #334155' }}>
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-600 border border-slate-500" />
                        <div className="absolute right-[-6px] top-24 w-1.5 h-10 bg-slate-700 rounded-r-md" />
                        <div className="absolute right-[-6px] top-40 w-1.5 h-7 bg-slate-700 rounded-r-md" />
                        <div className="bg-slate-100 rounded-[18px] overflow-hidden" style={{ height: 520 }}>
                          <div className="flex items-center justify-between px-4 py-1.5 bg-white border-b border-slate-100">
                            <span className="text-[9px] font-semibold text-slate-600">9:41</span>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-1.5 bg-slate-400 rounded-sm" />
                              <div className="w-3.5 h-2 border border-slate-400 rounded-sm flex items-center px-0.5"><div className="w-2 h-1 bg-slate-400 rounded-sm" /></div>
                            </div>
                          </div>
                          <div className="overflow-y-auto flex flex-col items-center gap-4 py-4 px-3 bg-slate-100" style={{ height: 490 }}>
                            {allPages.map((page, i) => {
                              const NATIVE_W = 450, NATIVE_H = 580;
                              const CONTAINER_W = 360;
                              const s = CONTAINER_W / NATIVE_W;
                              const scaledH = Math.round(NATIVE_H * s);
                              return (
                                <div key={i} className="shrink-0 w-full flex flex-col items-center gap-1">
                                  <div className="w-full rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm" style={{ height: scaledH }}>
                                    <div style={{ width: NATIVE_W, height: NATIVE_H, transform: `scale(${s})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                                      {page.render(book)}
                                    </div>
                                  </div>
                                  {page.label && <span className="text-[9px] text-slate-400">{page.label}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 w-20 h-1 bg-slate-600 rounded-full opacity-60" />
                    </div>
                  ) : (
                    <div className="relative flex flex-col items-center" style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.35))' }}>
                      <div className="relative bg-slate-900 rounded-[44px] p-2.5"
                        style={{ width: 280, border: '3px solid #0f172a', boxShadow: 'inset 0 0 0 2px #1e293b' }}>
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-full z-10 border border-slate-800" />
                        <div className="absolute left-[-5px] top-24 w-1.5 h-8 bg-slate-700 rounded-l-md" />
                        <div className="absolute left-[-5px] top-36 w-1.5 h-12 bg-slate-700 rounded-l-md" />
                        <div className="absolute right-[-5px] top-36 w-1.5 h-16 bg-slate-700 rounded-r-md" />
                        <div className="bg-white rounded-[36px] overflow-hidden" style={{ height: 580 }}>
                          <div className="flex items-center justify-between px-5 pt-3 pb-1 bg-white">
                            <span className="text-[10px] font-bold text-slate-800">9:41</span>
                            <div className="flex items-center gap-1">
                              <div className="w-3.5 h-1.5 bg-slate-700 rounded-sm" />
                              <div className="w-4 h-2 border border-slate-700 rounded-sm flex items-center px-0.5"><div className="w-2 h-1 bg-slate-700 rounded-sm" /></div>
                            </div>
                          </div>
                          <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[10px] font-semibold text-slate-700">eBook Reader</span>
                          </div>
                          <div className="overflow-y-auto flex flex-col items-center gap-3 py-3 px-3 bg-slate-50" style={{ height: 530 }}>
                            {allPages.map((page, i) => {
                              const NATIVE_W = 450, NATIVE_H = 580;
                              const CONTAINER_W = 228;
                              const s = CONTAINER_W / NATIVE_W;
                              const scaledH = Math.round(NATIVE_H * s);
                              return (
                                <div key={i} className="shrink-0 w-full flex flex-col items-center gap-1">
                                  <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm" style={{ height: scaledH }}>
                                    <div style={{ width: NATIVE_W, height: NATIVE_H, transform: `scale(${s})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                                      {page.render(book)}
                                    </div>
                                  </div>
                                  {page.label && <span className="text-[9px] text-slate-400">{page.label}</span>}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-center pb-2 pt-1 bg-white">
                            <div className="w-24 h-1 bg-slate-300 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Desktop: two-page spread with flip animation ── */
              <>
                <div className="flex items-center z-10 w-full justify-center px-4 h-[74vh]">
                  <button onClick={() => navigate('prev')} disabled={spreadIndex === 0 || !!flipping}
                    className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white transition-all disabled:opacity-20 bg-white/70 shadow-sm border border-slate-200">
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative"
                      style={{
                        width: BOOK_W, height: BOOK_H,
                        transform: `scale(${canvasScale})`, transformOrigin: 'center center',
                        transition: 'transform 0.2s ease',
                        filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.24))',
                      }}>
                      <div className="absolute inset-0 rounded-sm overflow-hidden border border-slate-300 bg-white">
                        {displaySpread.fullWidth ? (
                          <div className="w-full h-full">
                            {displaySpread.left(book)}
                          </div>
                        ) : (
                          <div className="flex w-full h-full">
                            <div className="flex-1 relative overflow-hidden">
                              {displaySpread.left(book)}
                              {showBleed && spreadIndex > 0 && <BleedGuide side="left" />}
                              {showMargins && spreadIndex > 0 && <MarginGuide side="left" />}
                            </div>
                            <div className="w-px shrink-0 relative z-10"
                              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)', boxShadow: '-4px 0 12px rgba(0,0,0,0.25), 4px 0 12px rgba(0,0,0,0.25)' }} />
                            <div className="flex-1 relative overflow-hidden">
                              {displaySpread.right(book)}
                              {showBleed && spreadIndex > 0 && <BleedGuide side="right" />}
                              {showMargins && spreadIndex > 0 && <MarginGuide side="right" />}
                            </div>
                          </div>
                        )}
                        {flipping && nextSpread && (
                          <FlipLeaf
                            direction={flipping.direction}
                            fromContent={
                              <div className="flex w-full h-full" style={{ width: BOOK_W, height: BOOK_H }}>
                                <div className="flex-1">{displaySpread.left(book)}</div>
                                <div className="flex-1">{displaySpread.right(book)}</div>
                              </div>
                            }
                            toContent={
                              <div className="flex w-full h-full" style={{ width: BOOK_W, height: BOOK_H }}>
                                <div className="flex-1">{nextSpread.left(book)}</div>
                                <div className="flex-1">{nextSpread.right(book)}</div>
                              </div>
                            }
                            pageW={BOOK_W / 2}
                            pageH={BOOK_H}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => navigate('next')} disabled={spreadIndex === total - 1 || !!flipping}
                    className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white transition-all disabled:opacity-20 bg-white/70 shadow-sm border border-slate-200">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Dots nav */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="flex items-center gap-2">
                    <button onClick={() => dotsRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 bg-white/80 border border-slate-200">
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <div ref={dotsRef} className="flex items-center gap-1.5 overflow-x-hidden px-1 max-w-[300px]"
                      style={{ scrollbarWidth: 'none' }}>
                      {SPREADS.map((_, i) => (
                        <button key={i}
                          onClick={() => { if (i !== spreadIndex && !flipping) { playPageFlipSound(); setSpreadIndex(i); } }}
                          className={cn('rounded-full transition-all duration-300 shrink-0',
                            i === spreadIndex ? 'w-5 h-1.5 bg-indigo-500' : 'w-1.5 h-1.5 bg-slate-400 hover:bg-slate-600'
                          )}
                        />
                      ))}
                    </div>
                    <button onClick={() => dotsRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 bg-white/80 border border-slate-200">
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-500 text-[10px] font-medium text-center truncate max-w-[280px]">
                    {[currentSpread.leftLabel, currentSpread.rightLabel].filter(Boolean).join(' · ') || `Spread ${spreadIndex + 1}`}
                    <span className="text-slate-300 mx-1.5">·</span>
                    <span className="text-slate-400">← → keys · Esc to close</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Bottom toolbar ── */}
        <div className="shrink-0 flex flex-wrap items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 gap-y-2 gap-x-4 bg-white border-t border-slate-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowBleed(v => !v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors',
                showBleed ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              )}>
              <span style={{ fontSize: 9, border: showBleed ? '1.5px dashed rgba(239,68,68,0.8)' : '1.5px dashed #aaa', borderRadius: 2, padding: '1px 3px' }}>B</span>
              {showBleed ? 'Hide Bleed' : 'Show Bleed'}
            </button>
            <button
              onClick={() => setShowMargins(v => !v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors',
                showMargins ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              )}>
              <span style={{ fontSize: 9, border: showMargins ? '1.5px dashed rgba(59,130,246,0.8)' : '1.5px dashed #aaa', borderRadius: 2, padding: '1px 3px' }}>M</span>
              {showMargins ? 'Hide Margin' : 'Show Margin'}
            </button>
            <span className="text-xs text-slate-400 tabular-nums">{currentPageDisplay} / {totalPages}</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setViewMode('desktop')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                viewMode === 'desktop' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
            <button onClick={() => setViewMode('tablet')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                viewMode === 'tablet' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <Tablet className="w-3.5 h-3.5" /> Tablet
            </button>
            <button onClick={() => setViewMode('mobile')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                viewMode === 'mobile' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}