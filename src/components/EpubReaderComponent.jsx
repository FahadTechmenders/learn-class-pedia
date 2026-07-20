import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, ChevronLeft, ChevronRight, BookOpen, Monitor,
  FileText, AlertCircle, CheckCircle2,
  AlertTriangle, ShieldCheck, Tablet, Smartphone, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import FaithfulReader from './FaithfulReader';


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

// Custom title page with book details (shown first)
function CustomTitlePage({ book }) {
  const currentYear = new Date().getFullYear();
  return (
    <div className="w-full h-full bg-[#faf9f5] flex flex-col items-center justify-center px-12 py-16 relative">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      
      {/* Top branding */}
      <div className="absolute top-8 left-0 right-0 text-center">
        <p className="text-[9px] text-slate-300 uppercase tracking-[0.3em] font-medium">Classpedia · Digital Edition</p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md">
        <h1 className="text-3xl font-serif font-bold text-slate-800 leading-tight mb-4">
          {book.title || 'Untitled Book'}
        </h1>
        
        {book.description && (
          <p className="text-xs font-serif text-slate-400 italic leading-relaxed mb-8">
            {book.description.substring(0, 150)}{book.description.length > 150 ? '...' : ''}
          </p>
        )}

        {/* Decorative divider */}
        <div className="flex items-center gap-3 justify-center my-8">
          <div className="w-12 h-px bg-slate-200" />
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          </div>
          <div className="w-12 h-px bg-slate-200" />
        </div>

        <p className="text-base text-slate-700 font-semibold tracking-wide mb-2">
          {book.author_name || 'Author Name'}
        </p>
        
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-6">1st Edition</p>
        <p className="text-[9px] text-slate-300 italic mt-1">Legends of Eldoria</p>
      </div>

      {/* Bottom copyright */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[8px] text-slate-300">
          © {currentYear} {book.author_name || 'Author'} · All rights reserved
        </p>
      </div>
    </div>
  );
}

// Table of contents page
function TableOfContentsPage({ book, chapters, onNavigateToSpread }) {
  return (
    <div className="w-full h-full bg-[#faf9f5] px-10 py-12 flex flex-col relative">
      <div className="mb-8">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Table of Contents</p>
        <div className="w-16 h-0.5 bg-slate-300" />
      </div>
      
      <div className="flex-1 space-y-2 overflow-y-auto">
        {chapters.map((chapter, idx) => (
          <button
            key={idx}
            onClick={() => onNavigateToSpread && onNavigateToSpread(chapter.spreadIndex)}
            className="flex items-baseline gap-3 py-2 w-full hover:bg-slate-100/50 active:bg-slate-100 transition-colors rounded px-2 -mx-2 cursor-pointer group text-left"
          >
            <span className="text-[11px] text-slate-400 w-8 text-right shrink-0 font-mono tabular-nums">
              {chapter.number != null ? `${chapter.number}.` : ''}
            </span>
            <span className="text-xs text-slate-700 font-medium flex-1 group-hover:text-indigo-600">
            Chapter: {chapter.title}
            </span>
            <span className="flex-shrink-0 border-b border-dotted border-slate-300 w-12 mb-1" />
            <span className="text-[11px] text-slate-500 tabular-nums font-mono shrink-0 group-hover:text-indigo-600 w-8 text-right">
              {chapter.pageNumber || idx + 1}
            </span>
          </button>
        ))}
        {chapters.length > 12 && (
          <p className="text-[10px] text-slate-400 italic pt-3 text-center">
            ... and {chapters.length - 12} more
          </p>
        )}
      </div>
      
      <p className="text-[8px] text-slate-300 mt-8 text-center truncate">{book.title}</p>
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
        {book.edition_number && (
          <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest">{book.edition_number} Edition</p>
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
  // Cap visible TOC items so we don't overflow the page; rest fold into a "… + N more" line
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

// Render a single element from the structured manuscript.
// (Desktop font-size zoom is applied by scaling the whole page frame, so sizes
// here stay fixed — this keeps layout identical across single/dual/tablet/mobile.)
function renderElement(el, key) {
  if (!el) return null;
  if (el.type !== 'image' && !el.content) return null;
  switch (el.type) {
    case 'image':
      // Fit the full image inside the page frame (handles full-page scanned
      // images in image-based / fixed-layout EPUBs without clipping).
      return el.src ? (
        <img
          key={key}
          src={el.src}
          alt={el.alt || ''}
          className="max-w-full max-h-full w-auto object-contain block mx-auto"
          loading="lazy"
        />
      ) : null;
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

// Character budget per page — used by paginateChapter to split content fairly
// regardless of paragraph length.
const CHARS_PER_PAGE = 1400;
const FIRST_PAGE_BUDGET = 1000; // first page of a chapter loses room to the chapter intro block

// Estimate visual cost of an element (rough char-equivalent of vertical space).
function elementCost(el) {
  const len = (el?.content || '').length;
  switch (el?.type) {
    case 'image': return CHARS_PER_PAGE;
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

// Split paragraphs / blockquotes that on their own exceed a page so they can flow
// across multiple pages instead of being silently clipped by overflow-hidden.
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

// Paginate a chapter's elements into pages using the char budget.
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

function ContentPage({ book, displayTitle, chapterNumber, kind, elements }) {
  // Top-left header per spec:
  //   real chapter → "<index>: Chapter: <title>" (falls back to book title
  //                  when the parsed chapter title is missing/empty)
  //   front matter → "<label>" (no chapter number)
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
      {/* Top bar — chapter index + title */}
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest truncate font-semibold">
          {headerLeft}
        </p>
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
            <p className="text-sm font-semibold text-slate-700">{book.manuscript_url}</p>
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
          &ldquo;{book.description
            ? book.description.slice(0, 200) + (book.description.length > 200 ? '…' : '')
            : 'Your book description will appear here on the back cover.'}&rdquo;
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
      {/* Spine shadow on left edge */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />
    </div>
  );
}

// ─── Structural blocking checks ───────────────────────────────────────────────
// Formatting warnings are derived from the parsed EPUB (formatting.service) and
// grammar warnings from LanguageTool (grammar.service); only the hard structural
// requirements that block publishing live here.
function buildIssues(book) {
  const issues = [];
  if (!book.manuscript_url) issues.push({ id: 'no_manuscript', severity: 'error', category: 'formatting', word: null, title: 'No manuscript uploaded', desc: 'Upload your manuscript file (EPUB, PDF, or DOCX) in the Content step.' });
  if (!book.cover_url) issues.push({ id: 'no_cover', severity: 'error', category: 'formatting', word: null, title: 'Missing front cover', desc: 'A front cover image is required before your book can be published.' });
  return issues;
}

// ─── Two-page spread config ───────────────────────────────────────────────────
// We display pages in spreads: [cover | blank], [title | toc], [ch1L | ch1R], …
// Each "spread" has a left and right component

// "Chapter N" / roman / numeric bare label patterns used when stripping
// duplicate headings from chapter bodies and when extracting display titles.
const BARE_CHAPTER_LABEL_RE = /^(chapter\s+[ivxlcdm0-9]+|part\s+[ivxlcdm0-9]+|prologue|epilogue|[ivxlcdm]+|[0-9]+)\.?\s*$/i;
const isBareChapterLabel = (s) => BARE_CHAPTER_LABEL_RE.test((s || '').trim());

// Front-matter title patterns → friendly label.
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

// Detect whether a parsed section is a real chapter or front matter.
//
// Strategy: be PERMISSIVE — any section with substantive body content is a
// chapter unless it clearly matches a front-matter pattern (cover / title
// page / copyright / dedication / etc.) or is too small to be a real chapter.
// This mirrors how a reader perceives the book even when the EPUB doesn't
// embed explicit "Chapter N" markers.
function classifyChapter(chapter, bookTitleLc) {
  const title = (chapter?.title || '').trim();
  const titleLc = title.toLowerCase();
  const elements = Array.isArray(chapter?.elements) ? chapter.elements : [];
  const totalChars = elements.reduce((s, el) => s + (el?.content?.length || 0), 0);
  const paragraphCount = elements.filter((el) => el?.type === 'p').length;

  // 1. Title matches a known front-matter pattern → front.
  for (const fm of FRONT_MATTER_PATTERNS) {
    if (fm.re.test(title)) return { kind: 'front', label: fm.label };
  }

  // 2. Title equals the book title AND content is small → title page.
  if (titleLc && titleLc === bookTitleLc && totalChars < 600) {
    return { kind: 'front', label: 'Title Page' };
  }

  // 3. Project Gutenberg boilerplate page (title + license / metadata).
  if (/project\s+gutenberg/i.test(title) && totalChars < 2000) {
    return { kind: 'front', label: 'Title Page' };
  }

  // 4. Very short sections (likely cover, separator, etc.).
  //    Exception: sections containing images are real content pages, not front matter.
  const imageCount = elements.filter((el) => el?.type === 'image').length;
  if ((totalChars < 250 || paragraphCount < 1) && imageCount === 0) {
    return { kind: 'front', label: title || 'Front Matter' };
  }

  // 5. Otherwise treat as a real chapter.
  return { kind: 'chapter' };
}

// Extract a display title from a chapter:
//   1. If chapter.title contains an embedded title after a marker
//      (e.g. "Chapter I. Down the Rabbit-Hole"), strip the marker.
//   2. Otherwise scan the first ~12 elements for a heading or short paragraph
//      that isn't the book title and isn't a bare "Chapter N" label.
function computeDisplayTitle(chapter, bookTitleLc) {
  const elements = Array.isArray(chapter?.elements) ? chapter.elements : [];
  const ct = (chapter?.title || '').trim();
  const ctLc = ct.toLowerCase();

  // 1. chapter.title path
  if (ct && ctLc !== bookTitleLc) {
    if (!isBareChapterLabel(ct)) {
      // Strip a leading "Chapter X" / "Part X" / roman / numeric prefix if present.
      const stripped = ct
        .replace(/^(chapter\s+[ivxlcdm0-9]+|part\s+[ivxlcdm0-9]+|[ivxlcdm]+|[0-9]+)[\s.\u2014\u2013:\-_]+/i, '')
        .trim();
      if (stripped && stripped.toLowerCase() !== bookTitleLc) return stripped;
    }
  }

  // 2. Scan elements: prefer non-marker, non-book-title heading;
  //    fall back to a short paragraph that looks like a subtitle.
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
    // Headings are always candidates.
    if (isH) return t;
    // Accept short paragraphs as titles only if we already saw a chapter marker
    // (so we don't accidentally pick up body text as the title).
    if (isP && sawMarker && t.length <= 80) return t;
  }
  return '';
}

function buildSpreads(book, onNavigateToSpread) {
  const structure = book.manuscript_structure || book.structure;
  const chapters = structure?.chapters || [];
  const bookTitleLc = (book?.title || '').trim().toLowerCase();

  // Pre-process each section:
  //  - classify as real chapter vs. front matter
  //  - compute display-only chapter title
  //  - strip leading duplicate headings (book title, bare "Chapter N" labels,
  //    or the display title itself) so the page header doesn't repeat them
  //  - paginate elements within the per-page char budget
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

  // Flatten into a sequential list of content pages and build a clean TOC.
  //  - All leading front matter (title page, copyright, preface, etc.) is
  //    collapsed into a single "Introduction" entry pointing at page 1.
  //  - Each real chapter gets its own entry; missing chapter titles fall back
  //    to the book title so the row is never blank.
  //  - Trailing back matter (bookmarks, indexes, etc.) is omitted from the TOC
  //    but still rendered in the reading flow.
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
      // Single consolidated Introduction entry for all leading front matter.
      tocEntries.push({
        number: null,
        displayLabel: 'Introduction',
        pg: startPage,
        contentPageIndex: contentPageStartIndex,
      });
    }
    // Front matter sections after the first chapter (back matter) are not
    // added to the TOC, but their pages still appear in the reading flow.

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

  const labelOf = (p) => {
    if (!p) return '';
    if (p.kind === 'chapter' && p.chapterNumber) {
      return p.displayTitle
        ? `Chapter ${p.chapterNumber}: ${p.displayTitle}`
        : `Chapter ${p.chapterNumber}`;
    }
    return p.displayTitle || '';
  };

  // Build chapter list for table of contents
  const chapterList = processedChapters
    .filter(ch => ch.kind === 'chapter')
    .map((ch, idx) => ({
      number: ch.chapterNumber,
      title: ch.displayTitle || `Chapter ${ch.chapterNumber}`,
      pageNumber: contentPages.find(p => p.chapter === ch.chapter)?.pageNumber || idx + 1,
      spreadIndex: idx + 3 // Offset by custom title, TOC, and cover pages
    }));

  // Page list: Cover first, then custom title page, TOC, and manuscript content
  const pageList = [
    { render: (b) => <CoverPage book={b} />, label: 'Cover', pageNum: null },
    { render: (b) => <CustomTitlePage book={b} />, label: 'Title', pageNum: null },
    { render: (b) => <TableOfContentsPage book={b} chapters={chapterList} onNavigateToSpread={onNavigateToSpread} />, label: 'Contents', pageNum: null },
  ];

  if (contentPages.length > 0) {
    // For all parsed formats (EPUB, PDF, DOCX), show paginated content
    contentPages.forEach((p) => {
      pageList.push({
        render: (b) => (
          <ContentPage
            book={b}
            kind={p.kind}
            chapterNumber={p.chapterNumber}
            displayTitle={p.displayTitle}
            elements={p.elements}
            pageNumber={p.pageNumber}
          />
        ),
        label: labelOf(p),
        pageNum: p.pageNumber,
      });
    });
  } else if (book.manuscript_url) {
    // Fallback: show manuscript info if no parsed structure
    pageList.push({ render: (b) => <ManuscriptPage book={b} />, label: 'Manuscript', pageNum: null });
  }

  // Pair the flat page list into left/right spreads. The last page may stay
  // unpaired (right = null) — no synthetic blank facing page is added.
  const spreads = [];
  for (let i = 0; i < pageList.length; i += 2) {
    const l = pageList[i];
    const r = pageList[i + 1] || null;
    spreads.push({
      left: l.render,
      right: r ? r.render : null,
      leftLabel: l.label,
      rightLabel: r ? r.label : '',
      leftPageNum: l.pageNum ?? null,
      rightPageNum: r ? (r.pageNum ?? null) : null,
    });
  }

  // Location index for the Quality Check sidebar: map each content page to the
  // spread that displays it, so an issue can jump to the exact page. The cover
  // occupies flat index 0, so content page i sits at flat index i+1 →
  // spread Math.floor((i + 1) / 2).
  const chapterSpreadIndex = {};
  const contentPageLocator = contentPages.map((p, i) => {
    const spreadIndex = Math.floor((i + 1) / 2);
    const ci = p.chapter?.chapterIndex;
    if (ci != null && chapterSpreadIndex[ci] === undefined) chapterSpreadIndex[ci] = spreadIndex;
    const text = (p.elements || []).map((e) => e?.content || '').join(' ');
    return { spreadIndex, chapterIndex: ci ?? null, text };
  });
  /** @type {any} */
  const result = spreads;
  result.chapterSpreadIndex = chapterSpreadIndex;
  result.contentPageLocator = contentPageLocator;
  return result;
}

// ─── Flip Page animation ──────────────────────────────────────────────────────
// Uses CSS 3D: the "flipping leaf" rotates around the center spine.
// Technique: two halves (front/back of the turning page) share a rotateY.

function FlipLeaf({ direction, fromContent, toContent, pageH, pageW }) {
  // The leaf covers the full width during animation then disappears
  const [phase, setPhase] = useState('start'); // start → mid → end
  const leafRef = useRef(null);

  useEffect(() => {
    // Force reflow then animate
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
      {/* The turning leaf — pivots around its left (next) or right (prev) edge */}
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
        {/* Front face */}
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
        {/* Back face */}
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
      {/* Fold shadow that sweeps across */}
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

// ─── Sample-chapter view (functionality ported from BookPreviewer2) ───────────
// Renders a paragraph with certain words underlined (wavy red) for grammar issues.
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

// Chapter-wise spreads for the sample view — each spread is one chapter (left + right page).
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

// Build sample spreads from the REAL paginated manuscript, limited to the
// sample page range configured in the Content step (samplePageStart /
// samplePageEnd). Works uniformly for EPUB, PDF and DOCX because all three are
// parsed into the same manuscript_structure and paginated by buildSpreads.
// Falls back to the generic sample spreads when no manuscript content or no
// sample range is available.
function buildManuscriptSampleSpreads(fullSpreads, book, highlightWords) {
  const start = parseInt(book?.samplePageStart, 10) || 1;
  const end = parseInt(book?.samplePageEnd, 10) || 0;

  // Flatten the content pages out of the full-book spreads. Only content
  // spreads carry page numbers (leftPageNum / rightPageNum).
  const pages = [];
  (fullSpreads || []).forEach((s) => {
    if (s.leftPageNum != null) pages.push({ render: s.left, label: s.leftLabel, pageNum: s.leftPageNum });
    if (s.rightPageNum != null) pages.push({ render: s.right, label: s.rightLabel, pageNum: s.rightPageNum });
  });

  const inRange = end > 0
    ? pages.filter((p) => p.pageNum >= start && p.pageNum <= end)
    : pages;

  // No parsed manuscript pages (or nothing in range) → generic sample preview.
  if (inRange.length === 0) return buildSampleSpreads(book, highlightWords);

  const spreads = [];
  for (let i = 0; i < inRange.length; i += 2) {
    const l = inRange[i];
    const r = inRange[i + 1];
    spreads.push({
      left: l.render,
      right: r ? r.render : () => <RightBlankPage />,
      leftLabel: l.label,
      rightLabel: r ? r.label : '',
      leftPageNum: l.pageNum,
      rightPageNum: r ? r.pageNum : null,
    });
  }
  return spreads;
}

// ─── Main Previewer ───────────────────────────────────────────────────────────

export default function BookPreviewer({ book, onClose, onApprove }) {
  const [viewMode, setViewMode] = useState('desktop');
  const [activeTab, setActiveTab] = useState('grammar');
  const [fontScale, setFontScale] = useState(1);
  const FONT_MIN = 0.8;
  const FONT_MAX = 2;
  const FONT_STEP = 0.1;
  const decreaseFont = () => setFontScale((s) => Math.max(FONT_MIN, Math.round((s - FONT_STEP) * 10) / 10));
  const increaseFont = () => setFontScale((s) => Math.min(FONT_MAX, Math.round((s + FONT_STEP) * 10) / 10));
  const [approved, setApproved] = useState(false);
  const canvasRef = useRef(null);
  

  // Escape key to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Font-size spinner (desktop KPF reader only) */}
            {viewMode === 'desktop' && (
              <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-1 py-1">
                <button
                  onClick={decreaseFont}
                  disabled={fontScale <= FONT_MIN}
                  title="Decrease font size"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
                  <span className="text-xs font-bold leading-none">A−</span>
                </button>
                <span className="text-[11px] font-medium text-slate-500 tabular-nums w-9 text-center select-none">
                  {Math.round(fontScale * 100)}%
                </span>
                <button
                  onClick={increaseFont}
                  disabled={fontScale >= FONT_MAX}
                  title="Increase font size"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
                  <span className="text-sm font-bold leading-none">A+</span>
                </button>
              </div>
            )}
            {/* Approve button */}
            {/* <button
              onClick={() => {
                setApproved(true);
                if (onApprove) onApprove();
                setTimeout(onClose, 800);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200 transition-all"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Approve
            </button> */}
            <button onClick={onClose}
              className="w-8 h-8 shrink-0 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border border-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body: canvas ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Center canvas: FaithfulReader shows original manuscript format ── */}
          <div ref={canvasRef} className="flex-1 relative overflow-hidden">
            {book.isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 z-50">
                <div className="flex flex-col items-center gap-6 max-w-md px-8">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-indigo-400" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-800">Loading Manuscript File is too large</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Parsing and preparing your book for preview...
                    </p>
                    <p className="text-xs text-slate-400 italic">
                      This may take a few moments for large files
                    </p>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <FaithfulReader 
                book={book} 
                fontScale={fontScale} 
                viewMode={viewMode} 
                sampleMode={false}
              />
            )}
          </div>
        </div>

        {/* ── Bottom toolbar ── */}
        <div className="shrink-0 flex flex-wrap items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 gap-y-2 gap-x-4 bg-white border-t border-slate-100">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs text-slate-400 truncate">{book.manuscript_filename || 'Manuscript preview'}</span>
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