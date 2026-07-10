import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import { renderAsync } from 'docx-preview';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, FileText, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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

function EpubReader({ arrayBuffer, frameWidth, fontPct, sampleMode, sampleStartFrac, sampleEndFrac, coverUrl, book }) {
  const pagesRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (!arrayBuffer) return;
    let destroyed = false;
    (async () => {
      try {
        const epubBook = ePub(arrayBuffer.slice(0));
        await epubBook.ready;
        if (destroyed) return;

        const spine = epubBook.spine;
        let spineItems = spine?.spineItems || [];

        if (sampleMode && spineItems.length > 0) {
          const n = spineItems.length;
          const s = Math.max(0, Math.floor(n * (sampleStartFrac || 0)));
          const e = Math.min(n, Math.max(s + 1, Math.ceil(n * (sampleEndFrac || 1))));
          spineItems = spineItems.slice(s, e);
        }

        const renderedPages = [];
        
        for (let i = 0; i < spineItems.length; i++) {
          if (destroyed) return;
          const item = spineItems[i];
          
          try {
            const section = epubBook.spine.get(item.href);
            await section.load(epubBook.load.bind(epubBook));
            
            const tempDiv = document.createElement('div');
            tempDiv.style.width = `${frameWidth}px`;
            tempDiv.style.padding = '2rem 2.5rem';
            tempDiv.style.fontFamily = 'Georgia, "Times New Roman", serif';
            tempDiv.style.fontSize = `${fontPct}%`;
            tempDiv.style.lineHeight = '1.75';
            tempDiv.style.color = '#1e293b';
            tempDiv.style.background = '#ffffff';
            tempDiv.style.textAlign = 'justify';
            
            const contents = section.document?.body?.innerHTML || '';
            tempDiv.innerHTML = contents;
            
            // Apply styling to elements
            const paragraphs = tempDiv.querySelectorAll('p');
            paragraphs.forEach(p => {
              p.style.marginBottom = '1rem';
              p.style.textIndent = '1.5rem';
            });
            
            const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(h => {
              h.style.fontFamily = 'Georgia, serif';
              h.style.color = '#0f172a';
              h.style.marginTop = '1.5rem';
              h.style.marginBottom = '1rem';
              h.style.lineHeight = '1.3';
            });
            
            const images = tempDiv.querySelectorAll('img');
            images.forEach(img => {
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              img.style.display = 'block';
              img.style.margin = '1.5rem auto';
            });
            
            renderedPages.push({
              index: i,
              html: tempDiv.innerHTML
            });
          } catch (err) {
            console.warn(`Failed to load section ${i}:`, err);
          }
        }
        
        if (!destroyed) {
          setPages(renderedPages);
          setStatus('ready');
        }
        
        epubBook.destroy();
      } catch (e) {
        console.error('[EPUB] render error', e);
        if (!destroyed) setStatus('error');
      }
    })();
    return () => { destroyed = true; };
  }, [arrayBuffer, sampleMode, sampleStartFrac, sampleEndFrac, frameWidth, fontPct]);

  return (
    <div className="w-full h-full overflow-auto bg-slate-200">
      <div className="flex flex-col items-center gap-5 py-6 px-3">
        {coverUrl && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: frameWidth, maxWidth: '100%' }} />
        )}
        {status === 'loading' && <CenterMessage icon={Loader2} spin title="Loading book…" />}
        {status === 'error' && <CenterMessage icon={AlertCircle} title="Could not render this EPUB" subtitle="The file may be corrupted or use an unsupported feature." />}
        <div ref={pagesRef} className="flex flex-col gap-5 w-full" style={{ maxWidth: frameWidth }}>
          {pages.map((page, i) => (
            <div 
              key={i}
              className="bg-white shadow-xl rounded-sm overflow-hidden"
              style={{ 
                minHeight: '600px',
                padding: '2rem 2.5rem',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: `${fontPct}%`,
                lineHeight: '1.75',
                color: '#1e293b',
                background: '#ffffff',
                textAlign: 'justify'
              }}
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
          ))}
        </div>
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

function PdfReader({ arrayBuffer, coverUrl, pageWidth, sampleStart, sampleEnd, pageMode }) {
  const pagesRef = useRef(null);
  const scrollRef = useRef(null);
  const dual = pageMode === 'dual';
  const [status, setStatus] = useState('loading');
  const prevPageWidthRef = useRef(pageWidth);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    if (!pagesRef.current || !arrayBuffer) return;
    let cancelled = false;
    const container = pagesRef.current;
    
    // Save scroll position before re-rendering
    const scrollContainer = scrollRef.current;
    const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    const savedScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
    const isZoomChange = prevPageWidthRef.current !== pageWidth && prevPageWidthRef.current !== undefined;
    
    container.innerHTML = '';
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        const from = sampleStart > 0 ? Math.max(1, sampleStart) : 1;
        const to = sampleEnd > 0 ? Math.min(sampleEnd, pdf.numPages) : pdf.numPages;
        for (let n = from; n <= to; n++) {
          if (cancelled) return;
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
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          
          // Restore scroll position immediately after each page renders (for zoom changes)
          if (isZoomChange && scrollContainer && savedScrollHeight > 0 && n === from) {
            const ratio = savedScrollTop / savedScrollHeight;
            const newScrollTop = ratio * scrollContainer.scrollHeight;
            scrollContainer.scrollTop = newScrollTop;
          }
          
          if (n === 1 && !cancelled) setStatus('ready');
        }
        if (!cancelled) {
          setStatus('ready');
          prevPageWidthRef.current = pageWidth;
        }
      } catch (e) {
        console.error('[PDF] render error', e);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [arrayBuffer, sampleStart, sampleEnd, pageWidth]);

  return (
    <div ref={scrollRef} className="w-full h-full overflow-auto bg-slate-200">
      <div className="flex flex-col items-center gap-5 py-6 px-3">
        {coverUrl && !(sampleStart > 1) && (
          <img src={coverUrl} alt="Cover" className="bg-white shadow-xl rounded-sm" style={{ width: pageWidth, maxWidth: '100%' }} />
        )}
        {status === 'loading' && <CenterMessage icon={Loader2} spin title="Rendering PDF…" />}
        {status === 'error' && <CenterMessage icon={AlertCircle} title="Could not render this PDF" />}
        <div
          ref={pagesRef}
          className="grid gap-5 w-full justify-center items-start"
          style={{ gridTemplateColumns: `repeat(${dual ? 2 : 1}, auto)` }}
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
    
    // Save absolute scroll position before zoom
    const savedScrollTop = sc.scrollTop;
    const savedScrollHeight = sc.scrollHeight;
    
    const natural = naturalWRef.current;
    let z = fontScale || 1;
    if (natural > 0) {
      const avail = Math.min(frameWidth, sc.clientWidth - 28);
      const fit = Math.min(1, avail / natural);
      z = fit * (fontScale || 1);
    }
    
    // Apply zoom
    el.style.setProperty('zoom', String(z));
    
    // Restore scroll position immediately based on ratio
    if (savedScrollHeight > 0) {
      const ratio = savedScrollTop / savedScrollHeight;
      const newScrollTop = ratio * sc.scrollHeight;
      sc.scrollTop = newScrollTop;
    }
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

export default function FaithfulReader({ book, fontScale = 1, viewMode = 'desktop', sampleMode = false, pageMode = 'single' }) {
  const [buffer, setBuffer] = useState(null);
  const [state, setState] = useState('loading');
  const ext = fileExtension(book);

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
  }, [book?.manuscriptFile, book?.manuscript_url, book?.manuscriptUrl]);

  if (state === 'loading') return <CenterMessage icon={Loader2} spin title="Loading manuscript…" />;
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
    reader = <EpubReader arrayBuffer={buffer} frameWidth={baseW} fontPct={fontPct} sampleMode={activeSample} sampleStartFrac={sampleStartFrac} sampleEndFrac={sampleEndFrac} coverUrl={coverUrl} book={book} />;
  } else if (ext === 'pdf') {
    reader = <PdfReader arrayBuffer={buffer} coverUrl={coverUrl} pageWidth={docWidth} sampleStart={activeSample ? sStart : 0} sampleEnd={activeSample ? sEnd : 0} pageMode={pageMode} />;
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
