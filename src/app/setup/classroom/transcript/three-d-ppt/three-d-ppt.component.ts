import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SafeHtmlPipe } from '../../../../services/safe-html.pipe';

export type PPTTheme = 'light' | 'dark' | 'blue';

interface Lecture {
  id?: number;
  title?: string;
  content?: string;
  sectionType?: string;
  contentSectionOrder?: number;
}

interface Slide {
  index: number;
  title: string;
  content: string;
  subtitle?: string;
  mainTitle?:string
}

@Component({
  selector: 'app-3d-ppt',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './three-d-ppt.component.html',
  styleUrls: ['./three-d-ppt.component.scss'],
})
export class ThreeDPPTComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() lectures: Lecture[] = [];
  @Input() pptTitle: string = 'Lecture Slides';
  @Input() mainCourseTitle: string = '';
  @Output() slideChanged = new EventEmitter<number>();
  @Output() presentationCompleted = new EventEmitter<void>();

  slides: Slide[] = [];
  currentIndex = 0;
  isTransitioning = false;
  transitionDirection: 'next' | 'prev' = 'next';

  // Presentation state
  theme: PPTTheme = 'light';
  isFullscreen = false;
  isPresentationMode = false;
  showNotes = false;

  // Search state
  showSearchPopup = false;
  searchQuery = '';
  searchResults: { pageIndex: number; pageLabel: string; snippet: string }[] = [];
  highlightTerm = '';

  // Zoom state
  showZoomSlider = false;
  zoomLevel = 100;

  // Nav buttons visibility based on scroll
  showNavButtons = false;

  private scrollHandler: any;

  private readonly transitionDurationMs = 600;
  private completedOnce = false;
  private readonly isBrowser: boolean;

  constructor(
    private cdr: ChangeDetectorRef,
    private hostEl: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.buildSlides();
    this.restoreState();
  }

  ngAfterViewInit(): void {
    this.cdr.markForCheck();
    if (this.isBrowser) {
      this.scrollHandler = this.onScroll.bind(this);
      // Listen to scroll on window and host element
      window.addEventListener('scroll', this.scrollHandler);
      this.hostEl.nativeElement.addEventListener('scroll', this.scrollHandler);
      // Also check parent elements
      let parent = this.hostEl.nativeElement.parentElement;
      while (parent) {
        parent.addEventListener('scroll', this.scrollHandler);
        parent = parent.parentElement;
      }
      console.log('Scroll listeners attached');
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.hostEl.nativeElement.removeEventListener('scroll', this.scrollHandler);
      let parent = this.hostEl.nativeElement.parentElement;
      while (parent) {
        parent.removeEventListener('scroll', this.scrollHandler);
        parent = parent.parentElement;
      }
    }
  }

  onScroll(event?: Event): void {
    const target = event?.target as HTMLElement;
    const scrollY = target?.scrollTop || window.scrollY || window.pageYOffset || 0;
    const viewportHeight = window.innerHeight;
    const scrollPercentage = (scrollY / viewportHeight) * 100;
    const shouldShow = scrollPercentage > 30;
    if (this.showNavButtons !== shouldShow) {
      this.showNavButtons = shouldShow;
      this.cdr.detectChanges();
      console.log('Scroll triggered - scrollY:', scrollY, 'Scroll %:', scrollPercentage.toFixed(1), 'Show nav:', shouldShow);
    }
  }

  get currentSlideNumber(): string {
    return `${this.currentIndex + 1} / ${this.slides.length}`;
  }

  get progressPercent(): number {
    if (this.slides.length === 0) return 0;
    return ((this.currentIndex + 1) / this.slides.length) * 100;
  }

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
    switch (ev.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        ev.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        ev.preventDefault();
        this.prev();
        break;
      case 'Home':
        ev.preventDefault();
        this.goFirst();
        break;
      case 'End':
        ev.preventDefault();
        this.goLast();
        break;
      case 'f':
      case 'F':
        if (ev.ctrlKey || ev.metaKey) {
          ev.preventDefault();
          this.toggleFullscreen();
        }
        break;
      case 'p':
      case 'P':
        if (!ev.ctrlKey && !ev.metaKey) {
          ev.preventDefault();
          this.togglePresentationMode();
        }
        break;
    }
  }

  next(): void {
    if (this.isTransitioning || this.currentIndex >= this.slides.length - 1) return;
    this.transitionDirection = 'next';
    this.animateTo(this.currentIndex + 1);
  }

  prev(): void {
    if (this.isTransitioning || this.currentIndex <= 0) return;
    this.transitionDirection = 'prev';
    this.animateTo(this.currentIndex - 1);
  }

  goFirst(): void {
    if (this.isTransitioning || this.currentIndex === 0) return;
    this.transitionDirection = 'prev';
    this.currentIndex = 0;
    this.emitSlideChanged();
    this.persistState();
    this.cdr.markForCheck();
  }

  goLast(): void {
    if (this.isTransitioning || this.currentIndex >= this.slides.length - 1) return;
    this.transitionDirection = 'next';
    this.currentIndex = this.slides.length - 1;
    this.emitSlideChanged();
    this.checkCompletion();
    this.persistState();
    this.cdr.markForCheck();
  }

  goTo(index: number): void {
    const clamped = Math.max(0, Math.min(this.slides.length - 1, index));
    if (this.isTransitioning || clamped === this.currentIndex) return;
    this.transitionDirection = clamped > this.currentIndex ? 'next' : 'prev';
    this.animateTo(clamped);
  }

  setTheme(theme: PPTTheme): void {
    this.theme = theme;
    this.persistState();
    this.cdr.markForCheck();
  }

  cycleTheme(): void {
    const order: PPTTheme[] = ['light', 'dark', 'blue'];
    const next = order[(order.indexOf(this.theme) + 1) % order.length];
    this.setTheme(next);
  }

  togglePresentationMode(): void {
    this.isPresentationMode = !this.isPresentationMode;
    this.cdr.markForCheck();
  }

  toggleNotes(): void {
    this.showNotes = !this.showNotes;
    this.cdr.markForCheck();
  }

  toggleSearchPopup(): void {
    this.showSearchPopup = !this.showSearchPopup;
    if (!this.showSearchPopup) {
      this.searchQuery = '';
      this.searchResults = [];
    }
    this.cdr.markForCheck();
  }

  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.performSearch();
  }

  performSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.searchResults = [];
      this.cdr.markForCheck();
      return;
    }
    this.searchResults = [];
    for (const slide of this.slides) {
      const plainText = this.stripHtml(slide.content);
      const fullText = (slide.mainTitle || '') + ' ' + (slide.title || '') + ' ' + plainText;
      const lowerFull = fullText.toLowerCase();
      const idx = lowerFull.indexOf(query);
      if (idx !== -1) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(fullText.length, idx + query.length + 60);
        let snippet = fullText.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < fullText.length) snippet = snippet + '...';
        this.searchResults.push({
          pageIndex: slide.index,
          pageLabel: `Page ${slide.index + 1}`,
          snippet,
        });
      }
    }
    this.cdr.markForCheck();
  }

  goToSearchResult(pageIndex: number): void {
    this.highlightTerm = this.searchQuery.trim();
    this.showSearchPopup = false;
    this.searchQuery = '';
    this.searchResults = [];
    // Navigate even if same page
    if (pageIndex === this.currentIndex) {
      this.cdr.markForCheck();
      return;
    }
    this.transitionDirection = pageIndex > this.currentIndex ? 'next' : 'prev';
    this.currentIndex = pageIndex;
    this.emitSlideChanged();
    this.persistState();
    this.cdr.markForCheck();
  }

  clearHighlight(): void {
    this.highlightTerm = '';
    this.cdr.markForCheck();
  }

  getHighlightedContent(html: string): string {
    if (!this.highlightTerm) return html;
    const regex = new RegExp(`(${this.escapeRegex(this.highlightTerm)})`, 'gi');
    // Highlight in text nodes only (avoid breaking HTML tags)
    return html.replace(/>([^<]*)</g, (match, textContent) => {
      const highlighted = textContent.replace(regex, '<mark style="background:#fde68a;padding:1px 2px;border-radius:2px;">$1</mark>');
      return '>' + highlighted + '<';
    });
  }

  highlightMatch(text: string): string {
    if (!this.searchQuery.trim()) return text;
    const regex = new RegExp(`(${this.escapeRegex(this.searchQuery.trim())})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private stripHtml(html: string): string {
    if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  toggleZoomSlider(): void {
    this.showZoomSlider = !this.showZoomSlider;
    this.cdr.markForCheck();
  }

  zoomIn(): void {
    if (this.zoomLevel < 200) {
      this.zoomLevel += 10;
      this.cdr.markForCheck();
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 50) {
      this.zoomLevel -= 10;
      this.cdr.markForCheck();
    }
  }

  onZoomChange(event: Event): void {
    this.zoomLevel = +(event.target as HTMLInputElement).value;
    this.cdr.markForCheck();
  }

  toggleFullscreen(): void {
    if (!this.isBrowser) return;
    const doc: any = document;
    const el: any = this.hostEl.nativeElement;
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!fsEl) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    } else {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    }
  }

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  onFullscreenChange(): void {
    if (!this.isBrowser) return;
    const doc: any = document;
    this.isFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    this.cdr.markForCheck();
  }

  private animateTo(target: number): void {
    this.isTransitioning = true;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.currentIndex = target;
      this.emitSlideChanged();
      this.cdr.markForCheck();

      setTimeout(() => {
        this.isTransitioning = false;
        this.checkCompletion();
        this.persistState();
        this.cdr.markForCheck();
      }, this.transitionDurationMs);
    }, 50);
  }

  private emitSlideChanged(): void {
    this.slideChanged.emit(this.currentIndex);
  }

  private checkCompletion(): void {
    if (!this.completedOnce && this.slides.length > 0 && this.currentIndex === this.slides.length - 1) {
      this.completedOnce = true;
      this.presentationCompleted.emit();
    }
  }

  private buildSlides(): void {
    const sorted = [...(this.lectures || [])].sort((a, b) => {
      const ao = a.contentSectionOrder ?? 0;
      const bo = b.contentSectionOrder ?? 0;
      return ao - bo;
    });

    this.slides = sorted.map((lec, i) => {
      const { title, content } = this.extractTitleAndContent(lec);
      return {
        index: i,
        title,
        content,
        mainTitle:lec.title || '',
        subtitle: lec.sectionType || `Slide ${i + 1}`,
      };
    });
  }

  private extractTitleAndContent(lecture: Lecture): { title: string; content: string } {
    const raw = lecture.content ?? '';
    if (!raw) {
      return { title: lecture.title || 'Untitled', content: '' };
    }
    if (typeof document === 'undefined') {
      return { title: lecture.title || 'Untitled', content: raw };
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = raw;
    const h2 = tmp.querySelector('h2');
    const title = h2?.textContent?.trim() || lecture.title || 'Untitled';
    if (h2) h2.remove();
    return { title, content: tmp.innerHTML };
  }

  private storageKey(): string {
    return `3d-ppt:${this.pptTitle}`;
  }

  private persistState(): void {
    if (!this.isBrowser) return;
    try {
      const payload = {
        currentIndex: this.currentIndex,
        theme: this.theme,
      };
      localStorage.setItem(this.storageKey(), JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  private restoreState(): void {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.currentIndex === 'number') {
        this.currentIndex = Math.max(0, Math.min(this.slides.length - 1, data.currentIndex));
      }
      if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'blue') this.theme = data.theme;
    } catch {
      /* ignore */
    }
  }
}
