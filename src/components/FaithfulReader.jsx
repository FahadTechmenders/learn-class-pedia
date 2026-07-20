import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import { renderAsync } from 'docx-preview';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, FileText, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ENDPOINTS, API_CONFIG } from '../config/api';
import { getCachedFile, setCachedFile } from '../utils/fileCache';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Request deduplication cache to prevent multiple simultaneous fetches
const requestCache = new Map();

function playPageFlipSound() {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
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

async function getArrayBuffer(book) {
  const file = book?.manuscriptFile;
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  
  const url = book?.manuscript_url || book?.manuscriptUrl;
  if (url) {
    // Determine file extension
    const filename = book?.manuscript_filename || book?.manuscriptFilename || '';
    const ext = (filename.split('.').pop() || '').toLowerCase();
    
    // Use backend API for all supported file types to bypass CORS
    let apiEndpoint = null;
    if (ext === 'epub') {
      apiEndpoint = ENDPOINTS.BOOK_EPUB(url);
    } else if (ext === 'pdf') {
      apiEndpoint = ENDPOINTS.BOOK_PDF(url);
    } else if (ext === 'docx' || ext === 'doc') {
      apiEndpoint = ENDPOINTS.BOOK_DOCX(url);
    }
    
    if (apiEndpoint) {
      const cacheKey = apiEndpoint;
      
      // Return existing promise if request is already in flight
      if (requestCache.has(cacheKey)) {
        console.log(`[FaithfulReader] Reusing in-flight request for ${ext.toUpperCase()}`);
        return requestCache.get(cacheKey);
      }
      
      // Create new request promise
      const requestPromise = (async () => {
        try {
          // Check IndexedDB cache first
          const cachedData = await getCachedFile(apiEndpoint);
          if (cachedData) {
            console.log(`[FaithfulReader] Using cached ${ext.toUpperCase()} from IndexedDB`);
            return cachedData;
          }
          
          // Fetch from backend API
          const apiUrl = `${API_CONFIG.BASE_URL}${apiEndpoint}`;
          console.log(`[FaithfulReader] Fetching ${ext.toUpperCase()} via backend API:`, apiUrl);
          const res = await fetch(apiUrl, {
            cache: 'no-store' // Bypass HTTP cache, use IndexedDB instead
          });
          if (!res.ok) throw new Error(`Backend API error: ${res.status}`);
          
          const arrayBuffer = await res.arrayBuffer();
          console.log(`[FaithfulReader] ${ext.toUpperCase()} fetched successfully (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
          
          // Cache in IndexedDB for next time
          setCachedFile(apiEndpoint, arrayBuffer).catch(err => {
            console.warn('[FaithfulReader] Failed to cache file:', err);
          });
          
          return arrayBuffer;
        } catch (apiError) {
          console.warn('[FaithfulReader] Backend API failed:', apiError);
          throw new Error(`Failed to load manuscript: ${apiError.message}`);
        } finally {
          // Clean up request cache after completion
          setTimeout(() => requestCache.delete(cacheKey), 1000);
        }
      })();
      
      requestCache.set(cacheKey, requestPromise);
      return requestPromise;
    }
    
    // For unsupported file types, fetch directly
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch manuscript (${res.status})`);
    return await res.arrayBuffer();
  }
  return null;
}

function fileExtension(book) {
  const name = book?.manuscript_filename || book?.manuscriptFilename || book?.manuscriptFile?.name || '';
  return (name.split('.').pop() || '').toLowerCase();
}

function CenterMessage({ icon: Icon = FileText, title, subtitle = null, spin = false }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-8 bg-slate-100">
      <Icon className={`w-8 h-8 text-slate-400 ${spin ? 'animate-spin' : ''}`} />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">{subtitle}</p>}
    </div>
  );
}

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
              <FileText className="w-8 h-8 text-white/80" />
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

// Resolve image sources inside an EPUB section to archive blob URLs.
// epub.js's default string-substitution reliably rewrites <img src> but often
// misses SVG <image xlink:href> used by EPUB 2.0 "image-based text" books, so
// those pages render as broken images. This walks the section document (before
// serialization) and replaces both <img src> and SVG <image href/xlink:href>
// with blob: URLs created straight from the zip archive.
async function resolveEpubImages(doc, section, book) {
  if (!doc || !book || !book.archive || typeof book.archive.createUrl !== 'function') return;
  const XLINK = 'http://www.w3.org/1999/xlink';
  const sectionUrl = (section && (section.url || section.href)) || '';
  const baseHref = 'https://epub.local/' + String(sectionUrl).replace(/^\//, '');

  const toArchivePath = (src) => {
    try { return new URL(src, baseHref).pathname; } catch (_) { return null; }
  };

  const tasks = [];
  const handle = (getSrc, setSrc) => {
    const src = getSrc();
    if (!src) return;
    const low = src.trim().toLowerCase();
    if (low.startsWith('blob:') || low.startsWith('data:') || low.startsWith('http://') || low.startsWith('https://')) return;
    const path = toArchivePath(src);
    if (!path) return;
    tasks.push(
      book.archive.createUrl(path, { base64: false })
        .then((blobUrl) => { if (blobUrl) setSrc(blobUrl); })
        .catch(() => {})
    );
  };

  const imgs = doc.getElementsByTagName ? doc.getElementsByTagName('img') : [];
  for (let i = 0; i < imgs.length; i++) {
    const el = imgs[i];
    handle(() => el.getAttribute('src'), (v) => el.setAttribute('src', v));
  }

  const images = doc.getElementsByTagName ? doc.getElementsByTagName('image') : [];
  for (let i = 0; i < images.length; i++) {
    const el = images[i];
    handle(
      () => (el.getAttributeNS && el.getAttributeNS(XLINK, 'href')) || el.getAttribute('xlink:href') || el.getAttribute('href'),
      (v) => {
        try { if (el.setAttributeNS) el.setAttributeNS(XLINK, 'href', v); } catch (_) {}
        try { el.setAttribute('href', v); } catch (_) {}
      }
    );
  }

  await Promise.all(tasks);
}

// ─── EPUB reader (epub.js — faithful, CONTINUOUS SCROLL, 2.0 / 3.0 + images) ──
// Renders the real EPUB exactly as authored (its own background, headings, page
// structure, images) in a smooth vertical scroll. The uploaded cover is injected
// as the very first thing in the book flow so it scrolls naturally. Zoom reflows
// via the reader's own font-size — the original page area is never re-styled.
function EpubReader({ arrayBuffer, frameWidth, fontPct, sampleMode, sampleStartFrac, sampleEndFrac, coverUrl }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!viewerRef.current || !arrayBuffer) return;
    let destroyed = false;
    let rendition;
    let book;
    (async () => {
      try {
        // Clone the buffer so pdf/docx paths never share a detached buffer.
        book = ePub(arrayBuffer.slice(0));
        bookRef.current = book;
        await book.ready;
        if (destroyed) return;

        // Rewrite <img>/<svg image> sources to archive blob URLs so EPUB 2.0
        // image-based-text pages actually display (runs before serialization).
        if (book.archived && book.spine?.hooks?.content) {
          book.spine.hooks.content.register((doc, section) => resolveEpubImages(doc, section, book));
        }

        const spine = /** @type {any} */ (book.spine);
        let firstIndex = spine?.spineItems?.[0]?.index ?? 0;

        // Sample mode: keep ONLY the spine sections inside the configured sample
        // page-range fraction, so the reader shows just the excerpt — still the
        // real, faithfully-rendered EPUB content (never synthetic).
        if (sampleMode) {
          const items = spine?.spineItems || [];
          const n = items.length;
          if (n > 0) {
            const s = Math.max(0, Math.floor(n * (sampleStartFrac || 0)));
            const e = Math.min(n, Math.max(s + 1, Math.ceil(n * (sampleEndFrac || 1))));
            spine.spineItems = items.slice(s, e);
            firstIndex = spine.spineItems[0]?.index ?? firstIndex;
          }
        }

        rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'scrolled',        // continuous vertical scroll
          manager: 'continuous',   // lazy-load sections while scrolling
          spread: 'none',
          allowScriptedContent: true,
        });
        renditionRef.current = rendition;

        // Fix epub.js continuous scroll "snap-back" when scrolling up (browser
        // scroll-anchoring vs. lazily-injected sections). Ref: epub.js #1303/#1416.
        try {
          const mgr = /** @type {any} */ (rendition).manager?.container;
          if (mgr) mgr.style.setProperty('overflow-anchor', 'none', 'important');
        } catch (_) {}

        rendition.hooks.content.register((contents) => {
          try {
            const doc = contents?.document;
            if (!doc) return;
            doc.documentElement.style.setProperty('overflow-anchor', 'none', 'important');
            if (doc.body) doc.body.style.setProperty('overflow-anchor', 'none', 'important');
          } catch (_) {}
        });

        try { rendition.themes.fontSize(`${fontPct}%`); } catch (_) {}
        await rendition.display();
        if (!destroyed) setStatus('ready');
      } catch (e) {
        console.error('[EPUB] render error', e);
        if (!destroyed) setStatus('error');
      }
    })();
    return () => {
      destroyed = true;
      try { rendition && rendition.destroy(); } catch (_) {}
      try { book && book.destroy(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrayBuffer, sampleMode, sampleStartFrac, sampleEndFrac]);

  // Zoom: change the reader's own font-size (content reflows, stays original).
  useEffect(() => {
    try { renditionRef.current?.themes?.fontSize(`${fontPct}%`); } catch (_) {}
  }, [fontPct]);

  // Keep the rendition sized to its container (view-mode width changes, resize).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const v = viewerRef.current;
      if (v && renditionRef.current) {
        try { renditionRef.current.resize(v.clientWidth, v.clientHeight); } catch (_) {}
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center gap-3 p-2 sm:p-3">
      {/* Cover rendered in the parent document (not inside the epub.js iframe).
          This is version-independent: it always displays for EPUB 2.0 and 3.0
          regardless of the section's XHTML namespace or embedded CSP. */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt="Cover"
          className="bg-white shadow-xl rounded-sm shrink-0"
          style={{ width: frameWidth, maxWidth: '100%' }}
        />
      )}
      <div
        ref={containerRef}
        className="relative bg-white shadow-xl rounded-sm overflow-hidden shrink-0 w-full"
        style={{ width: frameWidth, maxWidth: '100%', height: '100%', maxHeight: '100%' }}
      >
        <div ref={viewerRef} className="w-full h-full" />

        {status === 'loading' && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <CenterMessage icon={Loader2} spin title="Loading book…" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <CenterMessage icon={AlertCircle} title="Could not render this EPUB" subtitle="The file may be corrupted or use an unsupported feature." />
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceFrame({ type, children }) {
  const wrap = 'w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 p-4';
  if (type === 'tablet') {
    return (
      <div className={wrap}>
        <div className="relative bg-slate-800 rounded-[28px] p-3" style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.35)' }}>
          <div className="absolute right-[-6px] top-24 w-1.5 h-10 bg-slate-700 rounded-r-md" />
          <div className="bg-slate-100 rounded-[18px] overflow-hidden" style={{ width: 480, height: 620, maxWidth: '82vw', maxHeight: '72vh' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={wrap}>
      <div className="relative bg-slate-900 rounded-[42px] p-2.5" style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.35)' }}>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-full z-30 border border-slate-800" />
        <div className="bg-slate-100 rounded-[34px] overflow-hidden" style={{ width: 320, height: 650, maxWidth: '82vw', maxHeight: '74vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── PDF reader (pdf.js — renders the real pages to canvas) ────────────────────
function PdfReader({ arrayBuffer, coverUrl, pageWidth, sampleStart, sampleEnd }) {
  const pagesRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!pagesRef.current || !arrayBuffer) return;
    let cancelled = false;
    const container = pagesRef.current;
    container.innerHTML = '';
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        // Sample mode → render only the configured page range (real PDF pages).
        const from = sampleStart > 0 ? Math.max(1, sampleStart) : 1;
        const to = sampleEnd > 0 ? Math.min(sampleEnd, pdf.numPages) : pdf.numPages;
        for (let n = from; n <= to; n++) {
          if (cancelled) return;
          // eslint-disable-next-line no-await-in-loop
          const page = await pdf.getPage(n);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = typeof pageWidth === 'number' ? `${pageWidth}px` : pageWidth;
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'bg-white shadow-xl rounded-sm';
          container.appendChild(canvas);
          // eslint-disable-next-line no-await-in-loop
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (n === 1 && !cancelled) setStatus('ready');
        }
        if (!cancelled) setStatus('ready');
      } catch (e) {
        console.error('[PDF] render error', e);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrayBuffer, sampleStart, sampleEnd]);

  // Apply zoom by resizing existing canvases when pageWidth (fontScale) changes,
  // without re-rendering the whole PDF.
  useEffect(() => {
    const container = pagesRef.current;
    if (!container) return;
    const w = typeof pageWidth === 'number' ? `${pageWidth}px` : pageWidth;
    container.querySelectorAll('canvas').forEach((c) => {
      c.style.width = w;
    });
  }, [pageWidth]);

  return (
    <div className="w-full h-full overflow-auto bg-slate-200">
      <div className="flex flex-col items-center gap-5 py-6 px-3">
        {coverUrl && !(sampleStart > 1) && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: pageWidth, maxWidth: '100%' }} />
        )}
        {status === 'loading' && <CenterMessage icon={Loader2} spin title="Rendering PDF…" />}
        {status === 'error' && <CenterMessage icon={AlertCircle} title="Could not render this PDF" />}
        <div
          ref={pagesRef}
          className="flex flex-col items-center gap-5 w-full"
        />
      </div>
    </div>
  );
}

function DocxReader({ arrayBuffer, coverUrl, fontScale = 1, frameWidth = 440, sampleActive = false, sampleStart = 0, sampleStartFrac = 0, sampleEndFrac = 1 }) {
  const scrollRef = useRef(null);
  const hostRef = useRef(null);
  const naturalWRef = useRef(0);
  const [status, setStatus] = useState('loading');

  const applyZoom = useCallback(() => {
    const el = hostRef.current;
    const sc = scrollRef.current;
    if (!el || !sc) return;
    
    const natural = naturalWRef.current;
    let z = fontScale || 1;
    if (natural > 0) {
      const avail = Math.min(frameWidth, sc.clientWidth - 28);
      const fit = Math.min(1, avail / natural);
      z = fit * (fontScale || 1);
    }
    
    // Use CSS transform instead of zoom for smoother scaling
    el.style.setProperty('transform', `scale(${z})`);
    el.style.setProperty('transform-origin', 'top center');
    el.style.setProperty('transition', 'transform 0.15s ease-out');
  }, [fontScale, frameWidth]);

  const applyCrop = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;
    const wrapper = el.querySelector('.docx-wrapper') || el;
    if (sampleActive && sampleEndFrac < 1) {
      const prevZoom = el.style.zoom || '';
      wrapper.style.marginTop = '0px';
      el.style.maxHeight = 'none';
      el.style.zoom = '1';
      const full = el.scrollHeight;
      el.style.zoom = prevZoom;
      if (full > 0) {
        const startFrac = Math.max(0, Math.min(sampleStartFrac || 0, sampleEndFrac));
        const h = Math.max(1, Math.round(full * (sampleEndFrac - startFrac)));
        el.style.maxHeight = `${h}px`;
        el.style.overflowY = 'hidden';
        wrapper.style.marginTop = startFrac > 0 ? `-${Math.round(full * startFrac)}px` : '0px';
      }
    } else {
      el.style.maxHeight = 'none';
      el.style.overflowY = 'visible';
      wrapper.style.marginTop = '0px';
    }
  }, [sampleActive, sampleStartFrac, sampleEndFrac]);

  useEffect(() => {
    if (!hostRef.current || !arrayBuffer) return;
    let cancelled = false;
    const el = hostRef.current;
    el.innerHTML = '';
    el.style.setProperty('zoom', '1');
    renderAsync(arrayBuffer.slice(0), el, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
    })
      .then(() => {
        if (cancelled) return;
        const wrapper = el.querySelector('.docx-wrapper');
        if (wrapper) {
          wrapper.style.background = 'transparent';
          wrapper.style.padding = '0';
          wrapper.style.boxShadow = 'none';
        }
        const page = el.querySelector('.docx');
        naturalWRef.current = page ? page.offsetWidth : 0;

        applyZoom();
        applyCrop();
        setStatus('ready');
      })
      .catch((e) => { console.error('[DOCX] render error', e); if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [arrayBuffer, applyZoom, applyCrop]);

  useEffect(() => { applyZoom(); applyCrop(); }, [applyZoom, applyCrop]);
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const obs = new ResizeObserver(() => { applyZoom(); applyCrop(); });
    obs.observe(sc);
    return () => obs.disconnect();
  }, [applyZoom, applyCrop]);

  return (
    <div ref={scrollRef} className="w-full h-full overflow-auto bg-slate-200">
      <div className="flex flex-col items-center gap-5 py-6 px-3">
        {coverUrl && !(sampleStart > 1) && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: frameWidth, maxWidth: '100%' }} />
        )}
        {status === 'loading' && <CenterMessage icon={Loader2} spin title="Rendering document…" />}
        {status === 'error' && <CenterMessage icon={AlertCircle} title="Could not render this document" />}
        <div ref={hostRef} className="docx-host" style={{ transformOrigin: 'top center' }} />
      </div>
    </div>
  );
}

const VIEW_BASE_WIDTH = { desktop: 720, tablet: 600, mobile: 480 };

export default function FaithfulReader({ book, fontScale = 1, viewMode = 'desktop', sampleMode = false }) {
  const [buffer, setBuffer] = useState(null);
  const [state, setState] = useState('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const ext = fileExtension(book);

  // Extract stable primitive values for dependencies
  const manuscriptUrl = book?.manuscript_url || book?.manuscriptUrl;
  const manuscriptFileName = book?.manuscriptFile?.name;
  const manuscriptFileSize = book?.manuscriptFile?.size;

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setBuffer(null);
    (async () => {
      try {
        const ab = await getArrayBuffer(book);
        if (cancelled) return;
        if (!ab) { setState('nofile'); return; }
        setBuffer(ab);
        setState('ready');
      } catch (e) {
        console.error('[FaithfulReader] load error', e);
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [manuscriptUrl, manuscriptFileName, manuscriptFileSize]);

  if (state === 'loading') {
    const progressText = loadProgress > 0 ? `Loading... ${loadProgress}%` : 'Loading manuscript file is too large...';
    return <CenterMessage icon={Loader2} spin title={progressText} />;
  }
  if (state === 'nofile') return <CenterMessage icon={FileText} title="No manuscript uploaded" subtitle="Upload an EPUB, PDF, or DOCX file to preview your book." />;
  if (state === 'error' || !buffer) return <CenterMessage icon={AlertCircle} title="Could not load the manuscript" subtitle="Please re-upload the file and try again." />;

  const coverUrl = book?.cover_url || book?.coverUrl;
  const baseW = VIEW_BASE_WIDTH[viewMode] || VIEW_BASE_WIDTH.desktop;
  const fontPct = Math.round((fontScale || 1) * 100);
  const docWidth = Math.round(baseW * (fontScale || 1));

  const total = parseInt(book?.totalPages, 10) || 0;
  const sStart = parseInt(book?.samplePageStart, 10) || 1;
  const sEnd = parseInt(book?.samplePageEnd, 10) || 0;
  const hasSample = sEnd > 0 && total > 0;
  const activeSample = sampleMode && hasSample;
  const sampleStartFrac = hasSample ? Math.max(0, (sStart - 1) / total) : 0;
  const sampleEndFrac = hasSample ? Math.min(1, sEnd / total) : 1;

  let reader;
  if (ext === 'epub') {
    reader = <EpubReader arrayBuffer={buffer} frameWidth={baseW} fontPct={fontPct} sampleMode={activeSample} sampleStartFrac={sampleStartFrac} sampleEndFrac={sampleEndFrac} coverUrl={coverUrl} />;
  } else if (ext === 'pdf') {
    reader = <PdfReader arrayBuffer={buffer} coverUrl={coverUrl} pageWidth={docWidth} sampleStart={activeSample ? sStart : 0} sampleEnd={activeSample ? sEnd : 0} />;
  } else if (ext === 'docx' || ext === 'doc') {
    reader = <DocxReader arrayBuffer={buffer} coverUrl={coverUrl} fontScale={fontScale} frameWidth={baseW} sampleActive={activeSample} sampleStart={activeSample ? sStart : 0} sampleStartFrac={sampleStartFrac} sampleEndFrac={sampleEndFrac} />;
  } else {
    return <CenterMessage icon={FileText} title={`Preview not supported for .${ext || 'this'} files`} subtitle="Supported formats: EPUB, PDF, DOCX." />;
  }

  if (viewMode === 'tablet' || viewMode === 'mobile') {
    return <DeviceFrame type={viewMode}>{reader}</DeviceFrame>;
  }
  return <div className="w-full h-full overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200">{reader}</div>;
}
