import { Component, OnInit, OnDestroy, inject, signal, computed, PLATFORM_ID, effect, AfterViewChecked, ViewEncapsulation, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';
import { AssessmentService } from '../../services/assessment.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SpeechService } from '../../services/speech.service';
import { environment } from '../../environments/environment';
import { Overview } from './overview/overview';
import { Notebook } from './notebook/notebook';
import { Transcript } from './transcript/transcript';
import { Quiz } from './quiz/quiz';
import { KeyPoints } from './key-points/key-points';
import { CompletionModal } from '../../shared/completion-modal/completion-modal';
import { StartAssessment } from '../assessment/start-assessment/start-assessment';
import { FinalAssessment } from '../assessment/final-assessment/final-assessment';
import { FailedAssessment } from '../assessment/failed-assessment/failed-assessment';
import { ClearedAssessment } from '../assessment/cleared-assessment/cleared-assessment';
import { EnrolledCourses } from '../classroom/enrolled-courses/enrolled-courses';
import { VideoPlayerComponent } from './video-player/video-player';
import { Chat } from './chat/chat';
import { ToastrService } from 'ngx-toastr';
import { map, Subject, switchMap, takeUntil } from 'rxjs';
import { SecurityService } from '../../services/security.service';
import { WarningAssessment } from '../assessment/warning-assessment/warning-assessment';
import { MoodMascot } from './mood-mascot/mood-mascot';
import { MoodService } from '../../services/mood.service';

@Component({
  selector: 'app-classroom',
  standalone: true,
  imports: [CommonModule, Overview, Notebook, Quiz, Transcript, KeyPoints, CompletionModal, StartAssessment, FinalAssessment, FailedAssessment, ClearedAssessment, EnrolledCourses, VideoPlayerComponent, Chat, WarningAssessment, MoodMascot],
  templateUrl: './classroom.html',
  styleUrl: './classroom.sass',
  encapsulation: ViewEncapsulation.None
})
export class ClassroomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild(Quiz) quizComponent?: Quiz;
  @ViewChild('tabContainer') tabContainer?: ElementRef;
  @ViewChild(VideoPlayerComponent) videoPlayer?: VideoPlayerComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public courseService = inject(CourseService);
  private speechService = inject(SpeechService)
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  private toastr = inject(ToastrService);
  private assessmentService = inject(AssessmentService);
  private securityService = inject(SecurityService);
  private moodService = inject(MoodService);

  // Warning popup state (persists across all assessment screens)
  showWarningPopup = signal(false);
  warningMessage = signal('');
  currentWarningCount = signal(0);
  warningType = signal('');
  maxWarnings = 1;

  course = signal<any>(null);
  courseTree = signal<any>(null);
  lectureSection = signal<any>(null);
  courseTitle = signal<string>('');
  progress = signal<any>(null);
  lectureContent = signal<SafeHtml>('');
  groupedByTitle = signal<Record<string, Record<string, any[]>>>({});
  lectureTitles = computed(() => Object.keys(this.groupedByTitle()));
  activeSection = signal<any>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isPlaying = signal(false);
  expandedChapters = signal<Set<string>>(new Set());
  expandedCertificates = signal<Set<number>>(new Set());
  activeCertificateId = signal<number | null>(null);
  expandedShortCourses = signal<Set<number>>(new Set());
  activeTab = signal<'overview' | 'keyPoints' | 'notebook' | 'transcript' | 'quiz'>('overview');
  activeLectureTitle = signal<string | null>(null);
  activeLectureIndex = signal<number>(0);
  lectureStartTimes: number[] = [];
  activeShortCourseId = signal<number | null>(null);
  isContentReady = signal(false);
  currentShortCourse = signal<any>(null);
  courseSlug = signal<string>('');
  showPauseOverlay = signal(false);
  private pauseOverlayTimeout: any = null;
  showCompletionModal = signal(false);
  completionData = signal<any>(null);
  courseLevel = signal<string>('');
  existingSeasionCourseId = signal<number>(0)
  videoDuration = signal<number>(0)
  assessmentStep = signal<'none' | 'start' | 'final' | 'failed' | 'cleared' | 'maxattempts'>('none');
  assessmentResult = signal<any>(null);
  isStartingAssessment = signal(false);
  completeOrderPayload = signal<any>({
    shortCourseId: null,
    courseCertificateId: null,
    professionalCertificateId: null
  });

  // Career path level detail ID (null for regular courses)
  careerPathLevelDetailId = signal<number | null>(null);
  careerPathLevelName = signal<string>('');
  careerPathLevelLabel = computed(() => {
    if (!this.careerPathLevelDetailId()) return '';
    return this.careerPathLevelName() || '';
  });

  private destroy$ = new Subject<void>();
  private progressInterval: any = null;
  private progressStartTime: number = 0;
  private lastProgressUpdate: number = 0;
  allSections = computed(() => {
    const sections: any[] = [];
    const grouped = this.groupedByTitle();
    const titles = Object.keys(grouped);
    titles.forEach(title => {
      const types = Object.keys(grouped[title]);
      types.forEach(type => {
        sections.push(...grouped[title][type]);
      });
    });
    return sections;
  });

  isSidebarOpen = signal<boolean>(false);

  // Reset assessment loading state when assessmentStep changes
  resetAssessmentLoading = effect(() => {
    const step = this.assessmentStep();
    if (step === 'start' || step === 'final' || step === 'cleared' || step === 'maxattempts') {
      this.isStartingAssessment.set(false);
    }
  });

  // ---- Mascot reactive event wiring (intelligent companion) ----
  // True when the mascot should be hidden (during assessment screens)
  mascotHidden = computed(() => {
    const s = this.assessmentStep();
    return s === 'start' || s === 'final' || s === 'cleared' || s === 'failed' || s === 'maxattempts';
  });

  // Drive mascot mood from the assessment lifecycle
  private moodAssessmentEffect = effect(() => {
    const step = this.assessmentStep();
    const result = this.assessmentResult();
    this.moodService.onAssessmentStep(step, {
      attemptsUsed: result?.attemptsUsed,
    });
  });

  // Drive mascot mood from the active classroom tab (helpful / writing)
  private moodTabEffect = effect(() => {
    const tab = this.activeTab();
    // Only apply tab moods while not in an assessment screen
    if (this.assessmentStep() === 'none') {
      this.moodService.setActiveTab(tab);
    }
  });

  // Mascot reacts to other student events
  private moodAlertsEffect = effect(() => {
    if (this.showWarningPopup()) this.moodService.react('warning-shown');
  });
  private moodCompletionEffect = effect(() => {
    if (this.showCompletionModal()) this.moodService.react('course-completed');
  });

  // Check if device is large screen (desktop)
  private isLargeScreen = signal<boolean>(false);

  private checkScreenSize() {
    const isLarge = window.innerWidth >= 1024; // lg breakpoint
    this.isLargeScreen.set(isLarge);
    // Auto-open sidebar on large screens, close on small screens
    this.isSidebarOpen.set(isLarge);
  }

  // Check if all shortCourses are completed across all certificates
  allShortCoursesCompleted = computed(() => {
    const tree = this.courseTree();
    if (!tree) return false;

    if (tree.courseTypeId === 1 && tree.professionalCourse?.courseCertificates) {
      for (const cert of tree.professionalCourse.courseCertificates) {
        if (cert.shortCourses?.some((sc: any) => !sc.isCompleted)) {
          return false;
        }
      }
      return true;
    } else if (tree.courseTypeId === 2 && tree.certificateCourse?.shortCourses) {
      return !tree.certificateCourse.shortCourses.some((sc: any) => !sc.isCompleted);
    }
    return tree.isCompleted || false;
  });

  totalLearningItems = computed(() => {
    const sc = this.currentShortCourse();
    if (sc?.lectures) {
      return sc.lectures.length;
    }
    return 0;
  });

  completedItems = computed(() => {
    const progress = this.progress();
    if (!progress) return 0;
    const percentage = progress.completionPercentage || 0;
    const total = this.totalLearningItems();
    return Math.round((percentage / 100) * total);
  });

  completionPercentage = computed(() => {
    const progress = this.progress();
    return progress?.completionPercentage || 0;
  });

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  currentSectionIndex = computed(() => {
    const active = this.activeSection();
    if (!active) return -1;
    return this.allSections().findIndex(s =>
      s.id === active.id && s.sectionTitle === active.sectionTitle && s.sectionType === active.sectionType
    );
  });

  currentTime = computed(() => this.speechService.currentTime());
  totalDuration = computed(() => this.speechService.totalDuration());
  calculatedTotalDuration = signal<number>(0);
  estimatedTimeMinutes = signal<number>(0);
  currentWordIndex = computed(() => this.speechService.currentWordIndex());
  isCompleted = computed(() => this.speechService.isCompleted());

  highlightedContent = computed(() => {
    const section = this.activeSection();
    if (!section?.content) return '';

    const wordIndex = this.currentWordIndex();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = section.content;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (wordIndex < 0 || wordIndex >= words.length) {
      return this.sanitizer.bypassSecurityTrustHtml(section.content);
    }

    let highlightedText = '';
    words.forEach((word, idx) => {
      if (idx === wordIndex) {
        highlightedText += `<span id="current-word" style="background-color: #facc15; color: black; padding: 0 2px; border-radius: 2px;">${word}</span> `;
      } else {
        highlightedText += word + ' ';
      }
    });

    return this.sanitizer.bypassSecurityTrustHtml(`<div style="line-height: 2;">${highlightedText.trim()}</div>`);
  });

  constructor() {
    effect(() => {
      if (this.isCompleted()) {
        this.isPlaying.set(false);
        this.speechService.isCompleted.set(false);
        this.speechService.isPaused.set(false);
        // Auto-select next lecture when current one finishes
        this.goToNextSection();
      }
    });

    // Check screen size on init and resize
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
      window.addEventListener('resize', () => this.checkScreenSize());

      // Set up global reference for onclick handler
      (window as any).angularComponentRef = this;
    }
  }

  toggleChapter(title: string) {
    const current = this.expandedChapters();
    const newSet = new Set<string>();
    if (!current.has(title)) {
      newSet.add(title);
    }
    this.expandedChapters.set(newSet);
  }

  toggleCertificate(certificateId: number) {
    const current = new Set(this.expandedCertificates());
    if (current.has(certificateId)) {
      current.delete(certificateId);
    } else {
      current.add(certificateId);
    }
    this.expandedCertificates.set(current);
  }

  isCertificateExpanded(certificateId: number): boolean {
    return this.expandedCertificates().has(certificateId);
  }

  toggleShortCourse(shortCourseId: number) {
    const current = new Set(this.expandedShortCourses());
    if (current.has(shortCourseId)) {
      current.delete(shortCourseId);
    } else {
      current.add(shortCourseId);
    }
    this.expandedShortCourses.set(current);
  }

  isShortCourseExpanded(shortCourseId: number): boolean {
    return this.expandedShortCourses().has(shortCourseId);
  }

  onTreeLectureSelect(lecture: any) {
    if (!lecture) return;
    this.activeLectureTitle.set(lecture.title ?? lecture.sectionTitle ?? null);
    this.onSectionSelect(lecture);
  }

  isChapterExpanded(title: string): boolean {
    return this.expandedChapters().has(title);
  }
  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Lumi mascot: classroom intro animation (Reading ↔ Lumi still for 1 min)
    this.moodService.startClassroom();

    // Subscribe to warning popup events (persists across all assessment screens)
    this.securityService.showWarningPopup.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.warningMessage.set(data.message);
      this.currentWarningCount.set(data.warningCount);
      this.warningType.set(data.type || '');
      this.showWarningPopup.set(true);
    });

    this.route.queryParams.subscribe(params => {
      const token = params['t'] || params['token'];
      const courseId = params['courseId'];
      const careerPathLevelDetailId = params['careerPathLevelDetailId'];
      const lectureId = params['lectureId'];

      // Set career path level detail ID if present
      if (careerPathLevelDetailId) {
        this.careerPathLevelDetailId.set(parseInt(careerPathLevelDetailId));
      }

      if (token && (courseId || careerPathLevelDetailId)) {
        const idToStore = careerPathLevelDetailId ? parseInt(careerPathLevelDetailId) : parseInt(courseId);
        this.authService.storeSession({
          courseId: idToStore,
          lectureId: lectureId || null,
          sessionToken: token,
          careerPathLevelDetailId: careerPathLevelDetailId ? parseInt(careerPathLevelDetailId) : null
        });
        this.existingSeasionCourseId.set(idToStore);

        // Remove token from URL immediately after storing it (only in production/staging)
        if (environment.HIDE_URL_PARAMS) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            queryParamsHandling: '',
            replaceUrl: true
          });
        }

        this.loadCourseDataWithToken(idToStore, token);
      } else {
        const existingSession = this.authService.getStoredSession();
        if (existingSession?.courseId && existingSession?.sessionToken) {
          // Restore career path level detail ID from session if present
          if (existingSession.careerPathLevelDetailId) {
            this.careerPathLevelDetailId.set(existingSession.careerPathLevelDetailId);
          }
          this.existingSeasionCourseId.set(existingSession.courseId);
          this.loadCourseData(this.existingSeasionCourseId());
        } else {
          this.error.set('No access token provided. Please access through the main portal.');
          this.isLoading.set(false);
        }
      }
    });
  }

  private loadCourseData(courseId: number) {
    const token = this.authService.getToken();
    this.loadCourseDataWithToken(courseId, token);
  }

  private loadCourseDataWithToken(courseId: number, token: string | null) {
    this.isLoading.set(true);

    // Use career path API if careerPathLevelDetailId is present, otherwise use regular course API
    const courseDetailsApi = this.careerPathLevelDetailId()
      ? this.courseService.getCareerPathDetailWithToken(courseId, token)
      : this.courseService.getCourseDetailsV2WithToken(courseId, token);

    courseDetailsApi.pipe(
      map((res: any) => res?.isSuccess !== undefined ? res.data : res),
      switchMap((courseDetails: any) => {
        this.courseSlug.set(courseDetails?.slug || '');
        this.courseLevel.set(courseDetails?.courseLevelName || '');
        this.course.set(courseDetails);
        // Set estimatedTimeMinutes from course details API
        if (courseDetails?.estimatedTimeMinutes) {
          this.estimatedTimeMinutes.set(courseDetails.estimatedTimeMinutes);
        }
        // Set career path details for career path courses
        if (courseDetails?.levelId) {
          this.careerPathLevelDetailId.set(courseDetails.levelId);
        }
        if (courseDetails?.levelName) {
          this.careerPathLevelName.set(courseDetails.levelName);
        }

        const courseTypeIdFromDetails = courseDetails?.courseTypeId;
        // Use career path tree API if careerPathLevelDetailId is present, otherwise use regular tree API
        const treeApi = this.careerPathLevelDetailId()
          ? this.courseService.getCareerPathTreeWithToken(courseId, token)
          : this.courseService.getCourseTreeV2WithToken(courseId, token);

        return treeApi.pipe(
          map((treeRes: any) => treeRes?.isSuccess !== undefined ? treeRes.data : treeRes),
          map((tree: any) => {
            // For career path courses, transform the structure to match professional course format
            if (this.careerPathLevelDetailId() && tree) {
              // Set courseTypeId to 1 (Professional) for career path courses
              tree.courseTypeId = 1;

              // Transform careerPathLevel to professionalCourse structure
              if (tree.careerPathLevel) {
                // Merge title and description from courseDetails into careerPathLevel
                tree.careerPathLevel = {
                  ...tree.careerPathLevel,
                  title: courseDetails?.title || tree.careerPathLevel.title,
                  description: courseDetails?.description || tree.careerPathLevel.description
                };

                tree.professionalCourse = {
                  professionalCourseId: tree.careerPathLevel.careerPathLevelMapId,
                  courseCertificates: tree.careerPathLevel.courseCertificates || []
                };
                // Keep careerPathLevel for Overview tab

                // Set isCompleted based on actual completion status of all short courses
                let allCompleted = true;
                if (tree.careerPathLevel.courseCertificates) {
                  for (const cert of tree.careerPathLevel.courseCertificates) {
                    if (cert.shortCourses?.some((sc: any) => !sc.isCompleted)) {
                      allCompleted = false;
                      break;
                    }
                  }
                }
                tree.isCompleted = allCompleted;
              }
            } else {
              // Always use courseTypeId from the details API as the authoritative source
              if (courseTypeIdFromDetails && tree) {
                tree.courseTypeId = courseTypeIdFromDetails;
              }
            }

            this.courseTree.set(tree);
            return this.courseService.extractLectureSectionsFromTree(tree);
          })
        )
      }),
    ).subscribe({
      next: (data: any) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
          this.isLoading.set(false);
          return;
        }
        this.lectureSection.set(data);
        if (Array.isArray(data)) {
          const grouped: Record<string, Record<string, any[]>> = {};

          data.forEach((item: any) => {
            const title = item.sectionTitle;
            const type = item.sectionType;

            if (!grouped[title]) {
              grouped[title] = {};
            }
            if (!grouped[title][type]) {
              grouped[title][type] = [];
            }
            grouped[title][type].push(item);
          });

          this.groupedByTitle.set(grouped);
        }
        const tree = this.courseTree();
        if (tree?.courseTypeId === 1 && tree?.professionalCourse?.courseCertificates?.length > 0) {
          const certs = tree.professionalCourse.courseCertificates;

          // Find first incomplete shortCourse across ALL certificates
          let targetCert: any = null;
          let targetSc: any = null;
          let allCompleted = true;

          for (const cert of certs) {
            if (cert.shortCourses?.length > 0) {
              const incompleteSc = cert.shortCourses.find((sc: any) => !sc.isCompleted);
              if (incompleteSc) {
                targetCert = cert;
                targetSc = incompleteSc;
                allCompleted = false;
                break;
              }
            }
          }

          // If all completed, use first certificate's first shortCourse
          if (!targetCert || !targetSc) {
            targetCert = certs[0];
            targetSc = targetCert.shortCourses?.[0];
          }

          if (targetCert && targetSc) {
            this.activeCertificateId.set(targetCert.courseCertificateId);
            this.expandedCertificates.set(new Set([targetCert.courseCertificateId]));
            this.completeOrderPayload.set({
              courseCertificateId: targetCert.courseCertificateId,
              shortCourseId: targetSc.shortCourseId,
              professionalCertificateId: this.courseTree()?.professionalCourse?.professionalCourseId,
              careerPathLevelMapId: this.careerPathLevelDetailId() ? this.courseTree()?.careerPathLevel?.careerPathLevelMapId : null
            });
            this.selectFirstShortCourse(targetSc);
            this.refreshProgress();
            if (allCompleted && this.assessmentStep() !== 'none') {
              // this.toastr.info('All lectures completed. Ready to start the final assessment.', 'Info');
            }
          }

          tree.professionalCourse.courseCertificates =
            tree.professionalCourse.courseCertificates.map((cert: any) => ({
              ...cert,
              shortCourses: (cert.shortCourses || []).map((sc: any) => ({
                ...sc,
                certificateId: cert.courseCertificateId
              }))
            }));
        } else if (tree?.courseTypeId === 2 && tree?.certificateCourse?.shortCourses?.length > 0) {
          const shortCourses = tree.certificateCourse.shortCourses;
          const incompleteSc = shortCourses.find((sc: any) => !sc.isCompleted);
          const targetSc = incompleteSc || shortCourses[0];
          this.completeOrderPayload.set({
            courseCertificateId: tree.courseId,
            shortCourseId: targetSc.shortCourseId,
            professionalCertificateId: null
          });
          this.selectFirstShortCourse(targetSc);
          this.refreshProgress();
          if (!incompleteSc && this.assessmentStep() !== 'none') {
            // this.toastr.info('All lectures completed. Ready to start the final assessment.', 'Info');
          }
        } else if (tree?.courseTypeId === 3 && tree?.shortCourseLectures?.length > 0) {
          this.completeOrderPayload.set({
            courseCertificateId: null,
            shortCourseId: tree.courseId,
            professionalCertificateId: null
          })
          const firstLec = tree.shortCourseLectures[0];
          this.selectFirstLecture(firstLec);
          this.refreshProgress();
          // Fetch estimatedTimeMinutes from ShortCourseDetail API
          this.courseService.getShortCourseDetails(this.courseSlug(), token).pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (details: any) => {
                if (details?.data?.estimatedTimeMinutes) {
                  this.estimatedTimeMinutes.set(details.data.estimatedTimeMinutes);
                }
              }
            });
        }

        // Check initial assessment status
        this.checkInitialAssessmentStatus();

        this.isLoading.set(false);
      },

      error: (err: any) => {
        console.error('Course Load Error:', err);
        this.isLoading.set(false);
      }
    });
  }

  private startProgressTracking(token: string | null) {
    this.progressStartTime = Date.now();
    this.lastProgressUpdate = this.progress()?.secondsWatched || 0;

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      this.updateProgress(token);
    }, 20000);
  }

  private updateProgress(token: string | null) {
    const tree = this.courseTree();
    if (!tree) return;

    // Only update progress if audio is playing
    if (!this.isPlaying()) return;

    const elapsedSeconds = Math.floor((Date.now() - this.progressStartTime) / 1000);
    const totalSecondsWatched = this.lastProgressUpdate + elapsedSeconds;

    // Auto-detect current lecture based on audio position
    const currentAudioTime = this.speechService.currentTime();
    if (this.lectureStartTimes.length > 0) {
      for (let i = this.lectureStartTimes.length - 1; i >= 0; i--) {
        if (currentAudioTime >= this.lectureStartTimes[i]) {
          this.activeLectureIndex.set(i);
          break;
        }
      }
    }

    const currentLecIndex = this.activeLectureIndex();
    const totalLectures = this.totalLearningItems();
    const completionPercentage = totalLectures > 0
      ? Math.min(100, Math.round(((currentLecIndex + 1) / totalLectures) * 100 * 10) / 10)
      : 0;

    let payload: any = {
      shortCourseId: null,
      courseCertificateId: null,
      professionalCourseId: null,
      completionPercentage: completionPercentage,
      secondsWatched: totalSecondsWatched,
      lastPositionSeconds: this.speechService.currentTime() || 0
    };

    if (tree.courseTypeId === 1) {
      payload.shortCourseId = this.completeOrderPayload().shortCourseId;
      payload.courseCertificateId = this.completeOrderPayload().courseCertificateId;
      payload.professionalCourseId = this.completeOrderPayload().professionalCertificateId;
    } else if (tree.courseTypeId === 2) {
      payload.shortCourseId = this.completeOrderPayload().shortCourseId;
      payload.courseCertificateId = this.completeOrderPayload().courseCertificateId;
      payload.professionalCourseId = null;
    } else if (tree.courseTypeId === 3) {
      payload.shortCourseId = tree.courseId;
      payload.courseCertificateId = null;
      payload.professionalCourseId = null;
    }

    this.courseService.updateCourseProgressWithToken(payload, token).subscribe({
      next: (res: any) => {
        const data = res.isSuccess !== undefined ? res.data : res;
        this.progress.set(data);
      },
      error: (err: any) => console.error('Progress Update Error:', err)
    });
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // getSectionHeading(type: string): string {
  //   const map: Record<string, string> = {
  //     introduction: 'Introduction',
  //     main_topic_early: 'Main Topic',
  //     main_topic_mid: 'Inter: Main Topic',
  //     main_topic_advanced: 'Adv: Main Topic',
  //     facts: 'Facts / Case Studies',
  //     summary: 'Summary',
  //     conclusion: 'Conclusion'
  //   };

  //   return map[type] ?? type;
  // }

  getSectionTypesForTitle(title: string): string[] {
    const titleData = this.groupedByTitle()[title];
    return titleData ? Object.keys(titleData) : [];
  }

  getSectionDuration(section: any): number {
    if (!section?.content) return 0;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = section.content;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
    const wordsPerMinute = 150;
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  }

  formatSectionTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }

  getLectureTotalDuration(lectureTitle: string): number {
    const grouped = this.groupedByTitle();
    const titleData = grouped[lectureTitle];
    if (!titleData) return 0;

    let totalSeconds = 0;
    Object.keys(titleData).forEach(sectionType => {
      const sections = titleData[sectionType];
      sections.forEach((section: any) => {
        totalSeconds += this.getSectionDuration(section);
      });
    });
    return totalSeconds;
  }

  getTotalCourseDuration(): number {
    const titles = this.lectureTitles();
    let totalSeconds = 0;
    titles.forEach(title => {
      totalSeconds += this.getLectureTotalDuration(title);
    });
    return totalSeconds;
  }

  getShortCourseDuration(sc: any): string {
    if (!isPlatformBrowser(this.platformId)) return '0min';

    // Check if this is the active short course with video playing
    const tree = this.courseTree();
    const isActiveShortCourse = this.activeShortCourseId() === sc.shortCourseId;

    if (tree?.videoUrl && isActiveShortCourse) {
      const duration = this.videoDuration();
      if (duration > 0) {
        // Format as MM:SS for video
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    // Otherwise calculate text/audio duration
    let totalSeconds = 0;
    if (sc.lectures && sc.lectures.length > 0) {
      sc.lectures.forEach((lec: any) => {
        // Check lectureSections array
        if (lec.lectureSections && lec.lectureSections.length > 0) {
          lec.lectureSections.forEach((section: any) => {
            totalSeconds += this.getSectionDuration(section);
          });
        }
        // Also check if lecture itself has content
        if (lec.content) {
          totalSeconds += this.getSectionDuration(lec);
        }
      });
    }
    const mins = Math.max(1, Math.ceil(totalSeconds / 60));
    return `${mins} min`;
  }

  onSectionSelect(section: any) {
    this.stopSpeech();

    this.courseTitle.set(section.sectionTitle);
    this.activeSection.set(section);
    this.courseService.activeSection.set(section);

    this.lectureContent.set(
      this.sanitizer.bypassSecurityTrustHtml(section.content)
    );
  }

  onLectureSelect(lectureTitle: string) {
    this.toggleChapter(lectureTitle);
    this.activeLectureTitle.set(lectureTitle);

    // Get all sections for this lecture and combine their content
    const grouped = this.groupedByTitle();
    const sectionTypes = Object.keys(grouped[lectureTitle] || {});

    if (sectionTypes.length > 0) {
      // Get the first section to set as active
      const firstSection = grouped[lectureTitle][sectionTypes[0]][0];

      // Combine all section contents for this lecture
      let combinedContent = '';
      sectionTypes.forEach(type => {
        grouped[lectureTitle][type].forEach((section: any) => {
          combinedContent += section.content + '<br/><br/>';
        });
      });

      this.stopSpeech();
      this.courseTitle.set(lectureTitle);
      this.activeSection.set({ ...firstSection, content: combinedContent, sectionTitle: lectureTitle });
      this.courseService.activeSection.set({ ...firstSection, content: combinedContent, sectionTitle: lectureTitle });
      this.lectureContent.set(this.sanitizer.bypassSecurityTrustHtml(combinedContent));
    }
  }

  refreshProgress() {
    const token = this.authService.getToken();
    const selectedId = this.completeOrderPayload()?.shortCourseId;
    if (!selectedId) return;
    this.courseService.getCourseProgressWithToken(selectedId, token).subscribe({
      next: (res: any) => {
        const data = res.isSuccess !== undefined ? res.data : res;
        this.progress.set(data);
        this.startProgressTracking(token);
      },
      error: (err: any) => console.error('Progress Refresh Error:', err)
    });
  }

  prepareLectureSectionsAndSetActive(sc: any) {
    const allSections: any[] = [];
    let combinedContent = '';
    let allPdfPaths: string[] = [];

    if (sc.lectures && sc.lectures.length > 0) {
      sc.lectures.forEach((lec: any) => {
        if (lec.lectureSections && lec.lectureSections.length > 0) {
          allSections.push(...lec.lectureSections);
          lec.lectureSections.forEach((section: any) => {
            if (section.content) combinedContent += section.content + '<br/><br/>';
            if (section.pdfPath) allPdfPaths.push(section.pdfPath);
          });
        }
        if (lec.content && !combinedContent) combinedContent += lec.content + '<br/><br/>';
        if (lec.pdfPath) allPdfPaths.push(lec.pdfPath);
      });
    }

    if (allSections.length > 0) this.lectureSection.set(allSections);

    if (allSections.length > 0 || combinedContent) {
      const firstSection = allSections[0] || sc.lectures?.[0] || {};
      const pdfPath = allPdfPaths.filter(p => p).join(',');
      const sectionData = { ...firstSection, content: combinedContent, sectionTitle: sc.title, pdfPath: pdfPath || firstSection.pdfPath };
      this.activeSection.set(sectionData);
      this.courseService.activeSection.set(sectionData);
    }

    // For video courses, prepare content immediately without waiting for user to click play
    const tree = this.courseTree();
    if (tree?.videoUrl && combinedContent) {
      this.lectureContent.set(this.sanitizer.bypassSecurityTrustHtml(combinedContent));
      this.isContentReady.set(true);
    }
  }

  selectFirstShortCourse(sc: any) {
    this.activeShortCourseId.set(sc.shortCourseId);
    this.expandedShortCourses.set(new Set([sc.shortCourseId]));
    this.currentShortCourse.set(sc);
    this.courseTitle.set(sc.title);
    this.isContentReady.set(false);
    this.prepareLectureSectionsAndSetActive(sc);

    // Set videoUrl from shortCourse to courseTree for video player (courseTypeId 1 & 2)
    const tree = this.courseTree();
    if (tree && sc.videoUrl) {
      this.courseTree.set({ ...tree, videoUrl: sc.videoUrl });
    } else if (tree && !sc.videoUrl) {
      // Remove videoUrl if shortCourse doesn't have one
      const { videoUrl, ...treeWithoutVideo } = tree;
      this.courseTree.set(treeWithoutVideo);
    }
  }

  selectFirstLecture(lec: any) {
    // For courseTypeId=3 - select first lecture directly (no accordion)
    const tree = this.courseTree();
    const allLectures = tree?.shortCourseLectures || [];
    const lectureIndex = allLectures.findIndex((l: any) => l.id === lec.id);

    this.courseTitle.set(lec.title || lec.courseTitle || 'Lecture');
    this.isContentReady.set(false);
    this.activeLectureIndex.set(lectureIndex >= 0 ? lectureIndex : 0);
    this.activeLectureTitle.set(lec.title || lec.courseTitle || null);

    // Set lecture section with this single lecture
    this.lectureSection.set([lec]);

    // Create a pseudo short course object with ALL lectures for playback compatibility
    this.currentShortCourse.set({
      shortCourseId: tree?.courseId,
      title: tree?.courseTitle,
      lectures: allLectures.map((l: any) => ({ ...l, lectureSections: [l] }))
    });

    // For courseTypeId 3, videoUrl is at tree level (not lecture level)
    // Keep the tree's videoUrl if it exists
    if (tree && tree.videoUrl) {
      // Tree already has videoUrl, keep it
      this.courseTree.set({ ...tree });
    } else if (tree && lec.videoUrl) {
      // Fallback: if lecture has videoUrl (for backward compatibility)
      this.courseTree.set({ ...tree, videoUrl: lec.videoUrl, videoDuration: lec.videoDuration || 0 });
    }

    // Calculate total duration for short courses (courseTypeId=3)
    if (tree?.courseTypeId === 3) {
      const lectureContents: string[] = [];
      let combinedContent = '';

      allLectures.forEach((lecture: any) => {
        let lecContent = '';
        if (lecture.content) {
          lecContent = lecture.content + '<br/><br/>';
        }
        lectureContents.push(lecContent);
        combinedContent += lecContent;
      });

      if (combinedContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = combinedContent;
        const fullText = tempDiv.textContent || tempDiv.innerText || '';
        const totalWords = fullText.split(/\s+/).filter((w: string) => w.length > 0).length;
        const wordsPerMinute = 150 * this.speechService.rate();
        const durationInSeconds = Math.ceil((totalWords / wordsPerMinute) * 60);
        this.calculatedTotalDuration.set(durationInSeconds);

        // Calculate lecture start times
        let cumulativeWords = 0;
        this.lectureStartTimes = [];

        lectureContents.forEach((lecHtml) => {
          const startSeconds = (cumulativeWords / wordsPerMinute) * 60;
          this.lectureStartTimes.push(startSeconds);
          tempDiv.innerHTML = lecHtml;
          const lecText = tempDiv.textContent || tempDiv.innerText || '';
          const wordCount = lecText.split(/\s+/).filter((w: string) => w.length > 0).length;
          cumulativeWords += wordCount;
        });
      }
    }

    // Set activeSection so transcript/download work on initial load
    if (lec.content) {
      this.activeSection.set({ ...lec, sectionTitle: lec.title || lec.courseTitle });
      this.courseService.activeSection.set({ ...lec, sectionTitle: lec.title || lec.courseTitle });
    }

    // For video courses (courseTypeId 3), prepare content immediately
    if (tree?.videoUrl && tree?.courseTypeId === 3) {
      const lectureContents: string[] = [];
      let combinedContent = '';

      allLectures.forEach((lecture: any) => {
        if (lecture.content) {
          combinedContent += lecture.content + '<br/><br/>';
        }
      });

      if (combinedContent) {
        this.lectureContent.set(this.sanitizer.bypassSecurityTrustHtml(combinedContent));
        this.isContentReady.set(true);
      }
    }
  }

  onLectureSelectType3(lec: any) {
    const tree = this.courseTree();
    const allLectures = tree?.shortCourseLectures || [];
    const lectureIndex = allLectures.findIndex((l: any) => l.id === lec.id);

    this.completeOrderPayload.set({
      shortCourseId: tree?.courseId,
      courseCertificateId: null,
      professionalCertificateId: null
    });
    this.stopSpeech();
    this.courseTitle.set(lec.title || lec.courseTitle || 'Lecture');
    this.isContentReady.set(false);
    this.lectureContent.set('');
    this.activeLectureIndex.set(lectureIndex >= 0 ? lectureIndex : 0);
    this.activeLectureTitle.set(lec.title || lec.courseTitle || null);

    // Set lecture section with this single lecture
    this.lectureSection.set([lec]);

    // Create a pseudo short course object with ALL lectures for playback compatibility
    this.currentShortCourse.set({
      shortCourseId: tree?.courseId,
      title: tree?.courseTitle,
      lectures: allLectures.map((l: any) => ({ ...l, lectureSections: [l] }))
    });

    // Set activeSection so transcript/download work immediately
    if (lec.content) {
      this.activeSection.set({ ...lec, sectionTitle: lec.title || lec.courseTitle });
      this.courseService.activeSection.set({ ...lec, sectionTitle: lec.title || lec.courseTitle });
    }
    this.refreshProgress();
  }

  onShortCourseSelectType1(sc: any) {
    // Block selection only if going FORWARD and current shortCourse is not completed
    const currentScId = this.activeShortCourseId();
    const tree = this.courseTree();

    if (sc.shortCourseId !== currentScId && tree?.courseTypeId === 1) {
      // Check if selecting a NEXT shortCourse (not previous)
      const certs = tree.professionalCourse?.courseCertificates || [];
      let currentGlobalIndex = -1;
      let targetGlobalIndex = -1;
      let globalIdx = 0;
      let currentScFromTree: any = null;

      for (const cert of certs) {
        for (const s of cert.shortCourses || []) {
          if (s.shortCourseId === currentScId) {
            currentGlobalIndex = globalIdx;
            currentScFromTree = s; // Get current shortCourse from tree (has updated isCompleted)
          }
          if (s.shortCourseId === sc.shortCourseId) targetGlobalIndex = globalIdx;
          globalIdx++;
        }
      }

      // Only block if going forward AND current lecture is not completed
      if (targetGlobalIndex > currentGlobalIndex && currentScFromTree && !currentScFromTree.isCompleted) {
        // Allow navigation if assessment failed and it's second-last or last attempt
        if (this.assessmentStep() === 'failed' && this.assessmentService.attemptsRemaining() <= 2) {
          // Allow navigation - user can review lectures after failing
        } else {
          // Block if lecture hasn't been played yet (progress is 0)
          if (this.currentTime() === 0) {
            this.toastr.warning(`Please complete "${currentScFromTree.title}" before moving to the next one.`, 'Play Required');
            return;
          }
          // Block if current shortCourse quiz is not completed
          this.toastr.warning(`Please complete the quiz for "${currentScFromTree.title}" before moving to the next lecture.`, 'Quiz Required');
          return;
        }
      }
    }

    // Ensure activeCertificateId is set correctly for the current certificate
    if (tree?.courseTypeId === 1) {
      const certs = tree.professionalCourse?.courseCertificates || [];
      for (const cert of certs) {
        if (cert.shortCourses?.some((s: any) => s.shortCourseId === sc.shortCourseId)) {
          this.activeCertificateId.set(cert.courseCertificateId);
          break;
        }
      }
    }

    this.completeOrderPayload.set({
      shortCourseId: sc.shortCourseId,
      courseCertificateId: this.activeCertificateId() || sc.certificateId,
      professionalCertificateId: this.courseTree()?.professionalCourse?.professionalCourseId,
      careerPathLevelMapId: this.careerPathLevelDetailId() ? this.courseTree()?.careerPathLevel?.careerPathLevelMapId : null
    });
    this.stopSpeech();
    this.activeShortCourseId.set(sc.shortCourseId);
    this.currentShortCourse.set(sc);
    this.courseTitle.set(sc.title);
    this.isContentReady.set(false);
    this.lectureContent.set('');
    // Toggle expand state
    const current = new Set(this.expandedShortCourses());
    if (current.has(sc.shortCourseId)) {
      current.delete(sc.shortCourseId);
    } else {
      current.clear();
      current.add(sc.shortCourseId);
    }
    this.expandedShortCourses.set(current);

    this.prepareLectureSectionsAndSetActive(sc);
    this.refreshProgress();

    // Set videoUrl from shortCourse to courseTree for video player (courseTypeId 1)
    if (tree && sc.videoUrl) {
      this.courseTree.set({ ...tree, videoUrl: sc.videoUrl });
    } else if (tree && !sc.videoUrl) {
      const { videoUrl, ...treeWithoutVideo } = tree;
      this.courseTree.set(treeWithoutVideo);
    }

    // Hide assessment components when user clicks on lecture after failing
    if (this.assessmentStep() === 'failed') {
      this.assessmentStep.set('none');
      this.selectFirstLectureForCourseType3();
    }

    // Navigate to course route if not already on course page
    // if (this.router.url !== '/course' && this.router.url !== '/course/classroom' && this.router.url !== '/classroom') {
    //   this.router.navigate(['/course']);
    // }
  }

  onShortCourseSelect(sc: any) {
    // Block selection only if going FORWARD and current shortCourse is not completed
    const currentScId = this.activeShortCourseId();
    const tree = this.courseTree();

    if (sc.shortCourseId !== currentScId && tree?.courseTypeId === 2) {
      // Check if selecting a NEXT shortCourse (not previous)
      const shortCourses = tree.certificateCourse?.shortCourses || [];
      const currentIndex = shortCourses.findIndex((s: any) => s.shortCourseId === currentScId);
      const targetIndex = shortCourses.findIndex((s: any) => s.shortCourseId === sc.shortCourseId);
      const currentScFromTree = shortCourses[currentIndex]; // Get from tree (has updated isCompleted)

      // Only block if going forward AND current lecture is not completed
      if (targetIndex > currentIndex && currentScFromTree && !currentScFromTree.isCompleted) {
        // Allow navigation if assessment failed and it's second-last or last attempt
        if (this.assessmentStep() === 'failed' && this.assessmentService.attemptsRemaining() <= 2) {
          // Allow navigation - user can review lectures after failing
        } else {
          this.toastr.warning(
            `Please complete the lecture and its quiz for "${currentScFromTree.title}" before proceeding to the next.`,
            'Completion Required'
          );
          return;
        }
      }
    }
    this.completeOrderPayload.set({
      shortCourseId: sc.shortCourseId,
      courseCertificateId: this.courseTree()?.courseId,
      professionalCertificateId: null
    });
    this.stopSpeech();
    this.activeShortCourseId.set(sc.shortCourseId);
    this.currentShortCourse.set(sc);
    this.courseTitle.set(sc.title);
    this.isContentReady.set(false);
    this.lectureContent.set('');
    // Toggle expand state
    const current = new Set(this.expandedShortCourses());
    if (current.has(sc.shortCourseId)) {
      current.delete(sc.shortCourseId);
    } else {
      // Close all others, open this one
      current.clear();
      current.add(sc.shortCourseId);
    }
    this.expandedShortCourses.set(current);

    this.prepareLectureSectionsAndSetActive(sc);
    this.refreshProgress();

    // Set videoUrl from shortCourse to courseTree for video player (courseTypeId 2)
    if (tree && sc.videoUrl) {
      this.courseTree.set({ ...tree, videoUrl: sc.videoUrl });
    } else if (tree && !sc.videoUrl) {
      const { videoUrl, ...treeWithoutVideo } = tree;
      this.courseTree.set(treeWithoutVideo);
    }

    // Hide assessment components when user clicks on lecture after failing
    if (this.assessmentStep() === 'failed') {
      this.assessmentStep.set('none');
      this.selectFirstLectureForCourseType3();
    }

    // Navigate to course route if not already on course page
    // if (this.router.url !== '/course' && this.router.url !== '/course/classroom' && this.router.url !== '/classroom') {
    //   this.router.navigate(['/course']);
    // }
  }

  playShortCourse() {
    const sc = this.currentShortCourse();
    if (!sc) return;

    // Combine all lecture content and calculate lecture start times
    let combinedContent = '';
    const lectureContents: string[] = [];

    if (sc.lectures && sc.lectures.length > 0) {
      sc.lectures.forEach((lec: any) => {
        let lecContent = '';
        if (lec.lectureSections && lec.lectureSections.length > 0) {
          lec.lectureSections.forEach((section: any) => {
            if (section.content) {
              lecContent += section.content + '<br/><br/>';
            }
          });
        }
        if (!lecContent && lec.content) {
          lecContent = lec.content + '<br/><br/>';
        }
        lectureContents.push(lecContent);
        combinedContent += lecContent;
      });
    }

    // Fallback: use lectureSection signal if no content found
    if (!combinedContent) {
      const sections = this.lectureSection();
      if (sections && sections.length > 0) {
        sections.forEach((section: any) => {
          if (section.content) {
            combinedContent += section.content + '<br/><br/>';
          }
        });
      }
    }

    if (combinedContent) {
      // Calculate total duration from combined content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = combinedContent;
      const fullText = tempDiv.textContent || tempDiv.innerText || '';
      const totalWords = fullText.split(/\s+/).filter((w: string) => w.length > 0).length;
      const wordsPerMinute = 150 * this.speechService.rate();
      const durationInSeconds = Math.ceil((totalWords / wordsPerMinute) * 60);
      this.calculatedTotalDuration.set(durationInSeconds);

      // Calculate lecture start times based on word counts
      let cumulativeWords = 0;
      this.lectureStartTimes = [];

      lectureContents.forEach((lecHtml) => {
        const startSeconds = (cumulativeWords / wordsPerMinute) * 60;
        this.lectureStartTimes.push(startSeconds);
        tempDiv.innerHTML = lecHtml;
        const lecText = tempDiv.textContent || tempDiv.innerText || '';
        const wordCount = lecText.split(/\s+/).filter((w: string) => w.length > 0).length;
        cumulativeWords += wordCount;
      });

      this.lectureContent.set(this.sanitizer.bypassSecurityTrustHtml(combinedContent));
      this.isContentReady.set(true);
      this.activeLectureIndex.set(0);

      // Set active section for speech
      const firstSection = sc.lectures?.[0]?.lectureSections?.[0] || this.lectureSection()?.[0];
      if (firstSection) {
        this.activeSection.set({ ...firstSection, content: combinedContent, sectionTitle: sc.title });
        this.courseService.activeSection.set({ ...firstSection, content: combinedContent, sectionTitle: sc.title });
      }

      // Start speech
      tempDiv.innerHTML = combinedContent;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      this.speechService.speak(text);
      this.isPlaying.set(true);
    }
  }

  onLecturePlay(lectureTitle: string) {
    this.activeLectureTitle.set(lectureTitle);

    // Get all sections for this lecture and combine their content
    const grouped = this.groupedByTitle();
    const sectionTypes = Object.keys(grouped[lectureTitle] || {});

    if (sectionTypes.length > 0) {
      // Get the first section to set as active
      const firstSection = grouped[lectureTitle][sectionTypes[0]][0];

      // Combine all section contents for this lecture
      let combinedContent = '';
      sectionTypes.forEach(type => {
        grouped[lectureTitle][type].forEach((section: any) => {
          combinedContent += section.content + '<br/><br/>';
        });
      });

      this.stopSpeech();
      this.courseTitle.set(lectureTitle);
      this.activeSection.set({ ...firstSection, content: combinedContent, sectionTitle: lectureTitle });
      this.courseService.activeSection.set({ ...firstSection, content: combinedContent, sectionTitle: lectureTitle });
      this.lectureContent.set(this.sanitizer.bypassSecurityTrustHtml(combinedContent));
    }
  }

  logout() {
    this.authService.clearSession();
  };

  toggleSpeech() {
    if (this.isPlaying()) {
      this.speechService.pause();
      this.isPlaying.set(false);
      this.showPauseOverlayWithTimer();
    } else {
      this.hidePauseOverlay();
      if (this.speechService.isPaused()) {
        this.speechService.resume();
        this.isPlaying.set(true);
      } else {
        // If content not ready, play the short course first
        if (!this.isContentReady()) {
          this.playShortCourse();
        } else {
          const section = this.activeSection();
          if (section?.content) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = section.content;
            const text = tempDiv.textContent || tempDiv.innerText || '';
            this.speechService.speak(text);
            this.isPlaying.set(true);
          }
        }
      }
    }
  }

  showPauseOverlayWithTimer() {
    if (this.pauseOverlayTimeout) {
      clearTimeout(this.pauseOverlayTimeout);
    }
    this.showPauseOverlay.set(true);
    this.pauseOverlayTimeout = setTimeout(() => {
      this.showPauseOverlay.set(false);
    }, 5000);
  }

  hidePauseOverlay() {
    if (this.pauseOverlayTimeout) {
      clearTimeout(this.pauseOverlayTimeout);
    }
    this.showPauseOverlay.set(false);
  }

  stopSpeech() {
    this.speechService.stop();
    this.isPlaying.set(false);
  }

  stopAllMedia() {
    // Stop video playback if video player exists and is playing
    if (this.videoPlayer && this.videoPlayer.isVideoPlaying) {
      this.videoPlayer.onPause();
    }

    // Stop audio/speech playback
    this.stopSpeech();
  }

  pauseVideoFromNotebook() {
    if (this.isPlaying()) {
      this.speechService.pause();
      this.isPlaying.set(false);
    }
  }

  resumeVideoFromNotebook() {
    if (this.speechService.isPaused()) {
      this.speechService.resume();
      this.isPlaying.set(true);
    }
  }

  goToPreviousSection() {
    const sc = this.currentShortCourse();
    if (!sc?.lectures || this.lectureStartTimes.length === 0) return;
    const index = this.activeLectureIndex();
    if (index > 0) {
      const newIndex = index - 1;
      const prevLecture = sc.lectures[newIndex];
      this.activeLectureIndex.set(newIndex);
      this.activeLectureTitle.set(prevLecture?.title || null);
      this.speechService.seekToTime(this.lectureStartTimes[newIndex]);

      // For courseTypeId=3, update lectureSection and activeSection
      const tree = this.courseTree();
      if (tree?.courseTypeId === 3 && prevLecture) {
        this.courseTitle.set(prevLecture.title || prevLecture.courseTitle || 'Lecture');
        this.lectureSection.set([prevLecture]);
        if (prevLecture.content) {
          this.activeSection.set({ ...prevLecture, sectionTitle: prevLecture.title || prevLecture.courseTitle });
          this.courseService.activeSection.set({ ...prevLecture, sectionTitle: prevLecture.title || prevLecture.courseTitle });
        }
      }
    }
  }

  goToNextSection() {
    const sc = this.currentShortCourse();
    if (!sc?.lectures || this.lectureStartTimes.length === 0) return;
    const index = this.activeLectureIndex();
    const tree = this.courseTree();

    if (index < sc.lectures.length - 1) {
      const newIndex = index + 1;
      const nextLecture = sc.lectures[newIndex];
      this.activeLectureIndex.set(newIndex);
      this.activeLectureTitle.set(nextLecture?.title || null);
      this.speechService.seekToTime(this.lectureStartTimes[newIndex]);

      // For courseTypeId=3, update lectureSection and activeSection
      if (tree?.courseTypeId === 3 && nextLecture) {
        this.courseTitle.set(nextLecture.title || nextLecture.courseTitle || 'Lecture');
        this.lectureSection.set([nextLecture]);
        if (nextLecture.content) {
          this.activeSection.set({ ...nextLecture, sectionTitle: nextLecture.title || nextLecture.courseTitle });
          this.courseService.activeSection.set({ ...nextLecture, sectionTitle: nextLecture.title || nextLecture.courseTitle });
        }
      }
    } else {
      // Last lecture reached - call progress API and handle based on courseTypeId
      this.stopSpeech();
      this.onLastLectureComplete();
    }
  }

  onLastLectureComplete() {
    const tree = this.courseTree();
    if (!tree) return;

    // Call progress/complete API
    // const payload = {
    //   shortCourseId: this.completeOrderPayload().shortCourseId ?? null,
    //   courseCertificateId: this.completeOrderPayload().courseCertificateId ?? null,
    //   professionalCertificateId: this.completeOrderPayload().professionalCertificateId ?? null
    // };

    this.refreshCourseTree(() => {
      if (tree.courseTypeId === 3) {
        // courseTypeId=3: Start Assessment directly (no quiz)
        this.startAssessment();
      } else if (tree.courseTypeId === 1 || tree.courseTypeId === 2) {
        // courseTypeId=1&2: Show Quiz tab and scroll to it
        this.scrollToQuiz();
      }
    });
    // this.courseService.completeCourse(payload).pipe(takeUntil(this.destroy$)).subscribe({
    //   next: (res: any) => {
    //     if (res?.isSuccess) {

    //     }
    //   },
    //   error: (err: any) => {
    //     console.error('Complete Course Error:', err);
    //   }
    // });
  }

  onVideoDurationChange(duration: number) {
    this.videoDuration.set(duration);
  }

  onVideoTimeUpdate(currentTime: number) {
    // Update speech service with current video time so notebook gets correct time
    this.speechService.setCurrentTime(currentTime);
  }

  formatVideoDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }


  private isDraggingSlider = false;

  onSliderStart() {
    this.isDraggingSlider = true;
    if (this.isPlaying()) {
      this.speechService.pause();
    }
  }

  onSliderEnd() {
    this.isDraggingSlider = false;
  }

  onSliderChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const time = parseFloat(input.value);
    this.speechService.seekToTime(time);
    if (this.isPlaying()) {
      this.isPlaying.set(true);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  downloadLecturePdf(lecture: any, event: Event) {
    event.stopPropagation();
    if (!lecture) return;

    const title = lecture.title || 'Lecture';
    const content = lecture.content || lecture.description || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          h1 { color: #2655FF; margin-bottom: 20px; }
          .content { font-size: 14px; color: #333; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="content">${content}</div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  downloadShortCoursePdf(sc: any, event: Event) {
    event.stopPropagation();
    if (!sc) return;

    const title = sc.title || 'Short Course';
    let content = '';

    if (sc.lectures && sc.lectures.length > 0) {
      sc.lectures.forEach((lec: any, idx: number) => {
        content += `<h2>Section ${idx + 1}: ${lec.title || ''}</h2>`;
        content += `<div>${lec.content || lec.description || ''}</div><br/>`;
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          h1 { color: #2655FF; margin-bottom: 20px; }
          h2 { color: #333; margin-top: 30px; }
          .content { font-size: 14px; color: #333; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="content">${content}</div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private lastScrolledWordIndex = -1;

  ngAfterViewChecked() {
    if (this.isPlaying() && !this.isDraggingSlider && isPlatformBrowser(this.platformId)) {
      const wordIndex = this.currentWordIndex();
      if (wordIndex !== this.lastScrolledWordIndex && wordIndex >= 0) {
        this.lastScrolledWordIndex = wordIndex;
        const currentWord = document.getElementById('current-word');
        const container = document.getElementById('content-container');
        if (currentWord && container) {
          const wordRect = currentWord.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          const wordBottom = wordRect.bottom;
          const containerBottom = containerRect.bottom;

          if (wordBottom > containerBottom - 50) {
            const scrollTop = container.scrollTop + (wordRect.top - containerRect.top) - (containerRect.height / 2);
            container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
          }
        }
      }
    }
  };


  onCompletionModalClose() {
    this.showCompletionModal.set(false);
    this.completionData.set(null);
    this.goToNextLecture();
  }

  refreshCourseTree(callback?: () => void) {
    const courseId = this.existingSeasionCourseId() || this.courseTree()?.courseId;
    const token = this.authService.getToken();
    const courseTypeId = this.courseTree()?.courseTypeId;
    if (!courseId || !courseTypeId) {
      if (callback) callback();
      return;
    }

    // Use career path tree API if careerPathLevelDetailId is present
    const treeApi = this.careerPathLevelDetailId()
      ? this.courseService.getCareerPathTreeWithToken(courseId, token)
      : this.courseService.getCourseTreeV2WithToken(courseId, token);

    treeApi
      .pipe(
        map((res: any) => res?.isSuccess !== undefined ? res.data : res),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (tree: any) => {

          // Transform career path tree structure if needed
          if (this.careerPathLevelDetailId() && tree) {
            tree.courseTypeId = 1;
            if (tree.careerPathLevel) {
              tree.professionalCourse = {
                professionalCourseId: tree.careerPathLevel.careerPathLevelMapId,
                courseCertificates: tree.careerPathLevel.courseCertificates || []
              };
            }
            // Set isCompleted based on actual completion status of all short courses
            let allCompleted = true;
            if (tree.careerPathLevel?.courseCertificates) {
              for (const cert of tree.careerPathLevel.courseCertificates) {
                if (cert.shortCourses?.some((sc: any) => !sc.isCompleted)) {
                  allCompleted = false;
                  break;
                }
              }
            }
            tree.isCompleted = allCompleted;
          }

          // Preserve courseTypeId from the details API (authoritative source)
          if (tree && courseTypeId) {
            tree.courseTypeId = courseTypeId;
          }
          // Preserve videoUrl if it exists in current tree (for courseTypeId 1 & 2)
          const currentTree = this.courseTree();
          if (currentTree?.videoUrl) {
            tree.videoUrl = currentTree.videoUrl;
          }
          this.courseTree.set(tree);
          if (callback) callback();
        },
        error: (err: any) => {
          console.error('Refresh Course Tree Error:', err);
          if (callback) callback();
        }
      });
  }

  selectIncompleteWithoutRefresh() {
    // Select next incomplete lecture WITHOUT calling tree API
    this.selectIncompleteShortCourse(() => {
      // Switch to lecture content tab after lecture is selected
      this.activeTab.set('transcript');

      // Reset quiz component loading state
      if (this.quizComponent) {
        this.quizComponent.resetMovingState();
      }
    });
  }

  refreshTreeAndSelectIncomplete() {
    this.refreshCourseTree(() => {
      this.selectIncompleteShortCourse(() => {
        // Switch to lecture content tab after everything is loaded
        this.activeTab.set('transcript');

        // Reset quiz component loading state after tree is refreshed and next lecture is selected
        if (this.quizComponent) {
          this.quizComponent.resetMovingState();
        }
      });
    });
  }

  goToNextLecture() {
    const tree = this.courseTree();
    if (!tree) return;

    if (tree.courseTypeId === 1 && tree.professionalCourse?.courseCertificates) {
      const certs = tree.professionalCourse.courseCertificates;
      const currentScId = this.activeShortCourseId();
      const currentCertId = this.activeCertificateId();

      // Find current certificate and short course indices
      const certIndex = certs.findIndex((c: any) => c.courseCertificateId === currentCertId);
      if (certIndex === -1) return;

      const currentCert = certs[certIndex];
      const scIndex = currentCert.shortCourses?.findIndex((sc: any) => sc.shortCourseId === currentScId) ?? -1;

      // Try next short course in same certificate
      if (scIndex !== -1 && scIndex < (currentCert.shortCourses?.length || 0) - 1) {
        const nextSc = currentCert.shortCourses[scIndex + 1];
        this.onShortCourseSelectType1(nextSc);
        return;
      }

      // Try first short course in next certificate
      if (certIndex < certs.length - 1) {
        const nextCert = certs[certIndex + 1];
        this.expandedCertificates.set(new Set([nextCert.courseCertificateId]));
        this.activeCertificateId.set(nextCert.courseCertificateId);
        if (nextCert.shortCourses?.length > 0) {
          this.onShortCourseSelectType1(nextCert.shortCourses[0]);
        }
      }
    } else if (tree.courseTypeId === 2 && tree.certificateCourse?.shortCourses) {
      const shortCourses = tree.certificateCourse.shortCourses;
      const currentScId = this.activeShortCourseId();
      const scIndex = shortCourses.findIndex((sc: any) => sc.shortCourseId === currentScId);

      if (scIndex !== -1 && scIndex < shortCourses.length - 1) {
        const nextSc = shortCourses[scIndex + 1];
        this.onShortCourseSelect(nextSc);
      }
    }
  }

  getAssessmentCourseId(): number | null {
    if (this.completeOrderPayload().shortCourseId) {
      return this.completeOrderPayload().shortCourseId;
    }
    const tree = this.courseTree();
    if (tree?.courseTypeId === 3) {
      return tree.courseId;
    } else if (tree?.courseTypeId === 2 && tree?.certificateCourse?.shortCourses?.length > 0) {
      return tree.certificateCourse.shortCourses[0].shortCourseId;
    } else if (tree?.courseTypeId === 1 && tree?.professionalCourse?.courseCertificates?.length > 0) {
      const firstCert = tree.professionalCourse.courseCertificates[0];
      if (firstCert.shortCourses?.length > 0) {
        return firstCert.shortCourses[0].shortCourseId;
      }
    }
    return null;
  };

  checkIsAssessmentAccess(): boolean {
    const tree = this.courseTree();
    if (tree?.courseTypeId == 2) {
      const shortCourse = tree?.certificateCourse?.shortCourses?.find((item: any) => item.shortCourseId === this.activeShortCourseId());
      if (shortCourse?.isCompleted) {
        return true;
      }
    }
    if (tree?.courseTypeId == 3) {
      if (tree?.isCompleted) {
        return true;
      }
    }
    else if (tree?.courseTypeId == 1) {
      const certificate = tree?.professionalCourse?.courseCertificates?.find((item: any) => item.courseCertificateId === this.activeCertificateId());
      const shortCourse = certificate?.shortCourses?.find((item: any) => item.shortCourseId === this.activeShortCourseId());
      if (shortCourse?.isCompleted) {
        return true;
      }
    }
    return false;
  }

  startAssessment(shouldCloseSidebar = false) {
    if (shouldCloseSidebar && window.innerWidth < 1024) {
      this.isSidebarOpen.set(false);
    }
    this.isStartingAssessment.set(true);

    // Stop any playing video and audio before starting assessment
    this.stopAllMedia();

    const token = this.authService.getToken();
    const courseId = this.existingSeasionCourseId();
    if (!courseId) {
      this.assessmentStep.set('start');
      return;
    }

    const careerPathLevelMapId = this.courseTree()?.careerPathLevel?.careerPathLevelMapId;

    let getAttemptStatusObservable;
    if (this.careerPathLevelDetailId() && careerPathLevelMapId) {
      getAttemptStatusObservable = this.assessmentService.getAttemptStatus(courseId, token, careerPathLevelMapId);
    } else {
      getAttemptStatusObservable = this.assessmentService.getAttemptStatus(courseId, token);
    }

    getAttemptStatusObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: async (res: any) => {
        const data = res?.isSuccess !== undefined ? res.data : res;
        if (data?.canTakeAssessment === false) {
          if (data?.isAssessmentCompleted === true) {
            this.assessmentResult.set({
              attemptsUsed: data.attemptsUsed,
              attemptsRemaining: data.attemptsRemaining,
              maxAttempts: data.maxAttempts,
              requiresRepurchase: data.requiresRepurchase,
              score: data.score,
              scorePercentage: data.scorePercentage,
              passingPercentage: data.passingPercentage,
              resultStatus: 'AlreadyPassed',
              pngPath: data.pngPath,
              pdfPath: data?.pdfPath,
              publicCertificateLink: data.publicCertificateLink,
              htmlPath: data.htmlPath,
              correctAnswers: data.correctAnswers,
              customerEnrollmentId: data.customerEnrollmentId
            });
            this.assessmentStep.set('cleared');
          } else {
            this.assessmentResult.set({
              attemptsUsed: data.attemptsUsed,
              attemptsRemaining: data.attemptsRemaining,
              maxAttempts: data.maxAttempts,
              requiresRepurchase: data.requiresRepurchase,
              score: data.score,
              scorePercentage: data.score,
              correctAnswers: data.correctAnswers,
              totalQuestions: data.totalQuestions,
              wrongAnswers: data.wrongAnswers || (data.totalQuestions - data.correctAnswers),
              passingPercentage: data.passingPercentage || 70,
              resultStatus: 'MaxAttemptsExceeded',
              publicCertificateLink: data.publicCertificateLink,
              htmlPath: data.htmlPath,
              pngPath: data.pngPath,
              pdfPath: data.pdfPath,
              courseId: data.courseId,
              courseTitle: data.courseTitle || data.title,
              customerEnrollmentId: data.customerEnrollmentId
            });
            this.assessmentStep.set('maxattempts');
          }

        } else {
          this.deselectSidebarLectures();
          this.assessmentStep.set('start');
        }
      },
    });
  }


  onAssessmentNext(result: any) {
    if (result === 'start') {
      // When reattempting from failed screen, go to start screen first for dual display check
      // Clear the isAssessmentInProgress flag so dual display check happens
      this.assessmentResult.set({
        ...this.assessmentResult(),
        isAssessmentInProgress: false
      });
      this.deselectSidebarLectures();
      this.assessmentStep.set('start');
    } else if (result === 'final' || result === undefined) {
      // Deselect lectures when moving to final assessment
      this.deselectSidebarLectures();
      this.assessmentStep.set('final');
    } else if (typeof result === 'object' && result?.isPassed === false) {
      // Handle failed assessment object from final-assessment component
      this.deselectSidebarLectures();
      this.assessmentResult.set(result);
      this.assessmentStep.set('failed');
    } else if (typeof result === 'object' && result?.isPassed === true) {
      // Handle passed assessment object from final-assessment component
      this.deselectSidebarLectures();
      this.assessmentResult.set(result);
      this.assessmentStep.set('cleared');
    } else if (result === 'failed') {
      this._fetchAssessmentResultAndSetStep('failed');
    } else if (result === 'cleared') {
      this._fetchAssessmentResultAndSetStep('cleared');
    } else if (typeof result === 'object') {
      // Map attempt-status API response to assessment result format
      // Preserve certificate URL from previous assessment result if attempt-status returns null
      const existingCertificateUrl = this.assessmentResult()?.pngPath;
      const mappedResult = {
        attemptsUsed: result.attemptsUsed,
        attemptsRemaining: result.attemptsRemaining,
        maxAttempts: result.maxAttempts,
        requiresRepurchase: result.requiresRepurchase,
        score: result.score,
        scorePercentage: result.score, // Use score as scorePercentage
        resultStatus: result.isPassed ? 'Passed' : 'Failed',
        pdfPath: result?.pdfPath,
        pngPath: result.pngPath || existingCertificateUrl, // Use existing URL if new one is null
        // Include additional fields from attempt-status
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers || (result.totalQuestions - result.correctAnswers),
        passingPercentage: result.passingPercentage || 70, // Default to 70 if not provided
        isPassed: result.isPassed || result.isAssessmentCompleted,
        courseId: result.courseId,
        courseTitle: result.courseTitle || result.title,
        customerEnrollmentId: result.customerEnrollmentId
      };

      this.assessmentResult.set({
        ...mappedResult,
        publicCertificateLink: result.publicCertificateLink,
        htmlPath: result.htmlPath
      });
      if (result?.isPassed || result?.isAssessmentCompleted) {
        this.assessmentStep.set('cleared');
      } else if (result?.attemptsRemaining === 0) {
        this.assessmentStep.set('maxattempts');
      } else {
        this.assessmentStep.set('failed');
      }
    }
  }

  onAssessmentResult(data: any) {
    this.assessmentResult.set(data);
    const status = data?.resultStatus;
    if (status === 'Passed' || status === 'AlreadyPassed') {
      this.assessmentStep.set('cleared');
    } else if (status === 'MaxAttemptsExceeded') {
      this.assessmentStep.set('maxattempts');
    } else {
      this.assessmentStep.set('failed');
    }
  }

  _fetchAssessmentResultAndSetStep(defaultStep: 'failed' | 'cleared' | 'maxattempts') {
    // Deselect lectures when moving to assessment result screens
    this.deselectSidebarLectures();
    const token = this.authService.getToken();
    const courseId = this.existingSeasionCourseId();
    const careerPathLevelMapId = this.courseTree()?.careerPathLevel?.careerPathLevelMapId;

    this.assessmentService.getAttemptStatus(courseId, token, careerPathLevelMapId).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details: any) => {
          if (details?.isSuccess && details?.data) {
            const data = details.data;
            // Map attempt-status data properly
            this.assessmentResult.set({
              attemptsUsed: data.attemptsUsed,
              attemptsRemaining: data.attemptsRemaining,
              maxAttempts: data.maxAttempts,
              requiresRepurchase: data.requiresRepurchase,
              score: data.score,
              scorePercentage: data.score,
              totalQuestions: data.totalQuestions,
              correctAnswers: data.correctAnswers,
              wrongAnswers: data.wrongAnswers || (data.totalQuestions - data.correctAnswers),
              passingPercentage: data.passingPercentage || 70,
              isPassed: data.isPassed || data.isAssessmentCompleted,
              pngPath: data.pngPath,
              pdfPath: data.pdfPath,
              htmlPath: data.htmlPath,
              publicCertificateLink: data.publicCertificateLink,
              courseId: data.courseId,
              courseTitle: data.courseTitle || data.title,
              customerEnrollmentId: data.customerEnrollmentId,
              resultStatus: (data.isPassed || data.isAssessmentCompleted) ? 'Passed' : 'Failed'
            });

            if (data?.isPassed || data?.isAssessmentCompleted) {
              this.assessmentStep.set('cleared');
            } else if (data?.attemptsRemaining === 0) {
              this.assessmentStep.set('maxattempts');
            } else {
              this.assessmentStep.set(defaultStep);
            }
          } else {
            this.assessmentStep.set(defaultStep);
          }
        },
        error: () => {
          this.assessmentStep.set(defaultStep);
        }
      });
  }

  onAssessmentFinish() {
    this.assessmentStep.set('none');
    this.selectFirstLectureForCourseType3();
  }

  private checkInitialAssessmentStatus() {
    const token = this.authService.getToken();
    const courseId = this.existingSeasionCourseId();
    if (!courseId) {
      return;
    }

    const careerPathLevelMapId = this.courseTree()?.careerPathLevel?.careerPathLevelMapId;

    let getAttemptStatusObservable;
    if (this.careerPathLevelDetailId() && careerPathLevelMapId) {
      getAttemptStatusObservable = this.assessmentService.getAttemptStatus(courseId, token, careerPathLevelMapId);
    } else {
      getAttemptStatusObservable = this.assessmentService.getAttemptStatus(courseId, token);
    }

    getAttemptStatusObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.isSuccess !== undefined ? res.data : res;
        if (data?.canTakeAssessment === false && this.assessmentStep() === 'none') {
          if (data?.isAssessmentCompleted === true) {
            // Assessment passed - show cleared screen
            this.assessmentResult.set({
              attemptsUsed: data.attemptsUsed,
              attemptsRemaining: data.attemptsRemaining,
              maxAttempts: data.maxAttempts,
              requiresRepurchase: data.requiresRepurchase,
              score: data.score,
              scorePercentage: data.scorePercentage,
              passingPercentage: data.passingPercentage,
              resultStatus: 'AlreadyPassed',
              pngPath: data.pngPath,
              pdfPath: data?.pdfPath,
              htmlPath: data.htmlPath,
              publicCertificateLink: data.publicCertificateLink,
              correctAnswers: data.correctAnswers,
              totalQuestions: data.totalQuestions,
              customerEnrollmentId: data.customerEnrollmentId,
            });
            this.deselectSidebarLectures();
            this.assessmentStep.set('cleared');

            // Unselect lectures when assessment is completed
            this.activeShortCourseId.set(null);
            this.activeCertificateId.set(null);
            this.expandedShortCourses.set(new Set());
          } else {
            // Max attempts exceeded - show repurchase screen
            this.assessmentResult.set({
              attemptsUsed: data.attemptsUsed,
              attemptsRemaining: data.attemptsRemaining,
              maxAttempts: data.maxAttempts,
              requiresRepurchase: data.requiresRepurchase,
              score: data.score,
              scorePercentage: data.score,
              correctAnswers: data.correctAnswers,
              totalQuestions: data.totalQuestions,
              wrongAnswers: data.wrongAnswers || (data.totalQuestions - data.correctAnswers),
              passingPercentage: data.passingPercentage || 70,
              resultStatus: 'MaxAttemptsExceeded',
              publicCertificateLink: data.publicCertificateLink,
              htmlPath: data.htmlPath,
              pngPath: data.pngPath,
              pdfPath: data.pdfPath,
              courseId: data.courseId,
              courseTitle: data.courseTitle || data.title,
              customerEnrollmentId: data.customerEnrollmentId,
            });
                        this.deselectSidebarLectures();
            this.assessmentStep.set('maxattempts');

            // Unselect lectures when max attempts reached
            this.activeShortCourseId.set(null);
            this.activeCertificateId.set(null);
            this.expandedShortCourses.set(new Set());
          }
        } else if (data?.isAssessmentInProgress === true && this.assessmentStep() === 'none') {

          this.assessmentResult.set({
            isAssessmentInProgress: data.isAssessmentInProgress
          })
          this.assessmentStep.set('final');
        }
        else {
          this.assessmentResult.set({
            isAssessmentInProgress: data.isAssessmentInProgress
          })
        }
      },
      error: () => {
        // Silently handle error, don't affect course loading
      }
    });
  }

  onWarningAcknowledge() {
    this.showWarningPopup.set(false);
    this.securityService.dismissPopup();

    // Restore failed mood based on attempts after violation acknowledge
    const attemptsUsed = this.assessmentResult()?.attemptsUsed ?? 1;
    this.moodService.onViolationAcknowledge(attemptsUsed);

    // Tab close: auto-submit then close the tab
    if (this.warningType() === 'tab_close') {
      this.securityService.autoSubmitTriggered.next();
      // Close tab after a short delay to allow auto-submit to start
      setTimeout(() => {
        window.close();
      }, 1500);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.speechService.stop();
    this.isPlaying.set(false);
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    // Clean up global reference
    if (isPlatformBrowser(this.platformId)) {
      delete (window as any).angularComponentRef;
    }
  }

  deselectSidebarLectures() {
    // Reset sidebar selections when user lands on start assessment page
    this.activeShortCourseId.set(null);
    this.activeCertificateId.set(null);
    this.expandedShortCourses.set(new Set()); // Reset expanded short courses to collapse content
    this.activeLectureTitle.set(null); // Also deselect lecture for courseTypeId=3
  }

  selectFirstLectureForCourseType3() {
    const tree = this.courseTree();
    if (tree?.courseTypeId === 3 && tree?.shortCourseLectures?.length > 0) {
      this.completeOrderPayload.set({
        courseCertificateId: null,
        shortCourseId: tree.courseId,
        professionalCertificateId: null
      });
      const firstLec = tree.shortCourseLectures[0];
      this.selectFirstLecture(firstLec);
      this.refreshProgress();
    }
  }

  isFinalAssessmentButton() {
    // Hide Final Assessment button if assessment is cleared (completed)
    if (this.assessmentStep() === 'cleared') {
      return false;
    }

    if (this.courseTree()?.courseTypeId == 2) {
      return this.courseTree()?.isCompleted ? false : true;
    }
    if (this.courseTree()?.courseTypeId == 1) {
      return this.courseTree()?.isCompleted ? false : true;
    }
    if (this.courseTree()?.courseTypeId == 3) {
      return this.courseTree()?.isCompleted ? false : true;
    }
    return true;
  }

  switchToLectureContentTab() {
    this.activeTab.set('transcript');
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  selectIncompleteShortCourse(callback?: () => void) {
    const tree = this.courseTree();
    if (!tree) {
      if (callback) callback();
      return;
    }

    const currentScId = this.activeShortCourseId();
    const currentCertId = this.activeCertificateId();

    if (tree.courseTypeId === 1 && tree.professionalCourse?.courseCertificates) {
      const certs = tree.professionalCourse.courseCertificates;

      // Find current certificate index
      const currentCertIndex = certs.findIndex((c: any) => c.courseCertificateId === currentCertId);

      // First: Check remaining short courses in current certificate (after current one)
      if (currentCertIndex !== -1) {
        const currentCert = certs[currentCertIndex];
        const currentScIndex = currentCert.shortCourses?.findIndex((sc: any) => sc.shortCourseId === currentScId) ?? -1;

        // Look for incomplete after current short course in same certificate
        for (let i = currentScIndex + 1; i < (currentCert.shortCourses?.length || 0); i++) {
          const sc = currentCert.shortCourses[i];
          if (!sc.isCompleted) {
            // Ensure activeCertificateId is set correctly
            this.activeCertificateId.set(currentCert.courseCertificateId);
            this._selectShortCourseType1Direct(sc, callback);
            return;
          }
        }

        // Look for incomplete before current short course in same certificate
        for (let i = 0; i < currentScIndex; i++) {
          const sc = currentCert.shortCourses[i];
          if (!sc.isCompleted) {
            // Ensure activeCertificateId is set correctly
            this.activeCertificateId.set(currentCert.courseCertificateId);
            this._selectShortCourseType1Direct(sc, callback);
            return;
          }
        }
      }

      // Second: Check next certificates
      for (let certIdx = currentCertIndex + 1; certIdx < certs.length; certIdx++) {
        const cert = certs[certIdx];
        const incompleteSc = cert.shortCourses?.find((sc: any) => !sc.isCompleted);
        if (incompleteSc) {
          this.expandedCertificates.set(new Set([cert.courseCertificateId]));
          this.activeCertificateId.set(cert.courseCertificateId);
          this._selectShortCourseType1Direct(incompleteSc, callback);
          return;
        }
      }

      // Third: Check previous certificates (wrap around)
      for (let certIdx = 0; certIdx < currentCertIndex; certIdx++) {
        const cert = certs[certIdx];
        const incompleteSc = cert.shortCourses?.find((sc: any) => !sc.isCompleted);
        if (incompleteSc) {
          this.expandedCertificates.set(new Set([cert.courseCertificateId]));
          this.activeCertificateId.set(cert.courseCertificateId);
          this._selectShortCourseType1Direct(incompleteSc, callback);
          return;
        }
      }

    } else if (tree.courseTypeId === 2 && tree.certificateCourse?.shortCourses) {
      const shortCourses = tree.certificateCourse.shortCourses;
      const currentScIndex = shortCourses.findIndex((sc: any) => sc.shortCourseId === currentScId);

      // Look for incomplete after current
      for (let i = currentScIndex + 1; i < shortCourses.length; i++) {
        if (!shortCourses[i].isCompleted) {
          this._selectShortCourseType2Direct(shortCourses[i], callback);
          return;
        }
      }

      // Look for incomplete before current
      for (let i = 0; i < currentScIndex; i++) {
        if (!shortCourses[i].isCompleted) {
          this._selectShortCourseType2Direct(shortCourses[i], callback);
          return;
        }
      }
    }

    // If no incomplete lecture found, execute callback if provided
    if (callback) callback();
  }

  private refreshLectureSectionsForShortCourse(sc: any, callback?: () => void) {
    // Extract lecture sections from the current course tree
    const data = this.courseService.extractLectureSectionsFromTree(this.courseTree());

    if (data && Array.isArray(data)) {
      this.lectureSection.set(data);

      // Group by title for proper organization
      const grouped: Record<string, Record<string, any[]>> = {};
      data.forEach((item: any) => {
        const title = item.sectionTitle;
        const type = item.sectionType;

        if (!grouped[title]) {
          grouped[title] = {};
        }
        if (!grouped[title][type]) {
          grouped[title][type] = [];
        }
        grouped[title][type].push(item);
      });

      this.groupedByTitle.set(grouped);
    }

    if (callback) callback();
  }

  // Direct selection methods without restrictions (used by selectIncompleteShortCourse after quiz completion)
  private _selectShortCourseType1Direct(sc: any, callback?: () => void) {
    this.completeOrderPayload.set({
      shortCourseId: sc.shortCourseId,
      courseCertificateId: this.activeCertificateId() || sc.certificateId,
      professionalCertificateId: this.courseTree()?.professionalCourse?.professionalCourseId,
      careerPathLevelMapId: this.careerPathLevelDetailId() ? this.courseTree()?.careerPathLevel?.careerPathLevelMapId : null
    });
    this.stopSpeech();
    this.activeShortCourseId.set(sc.shortCourseId);
    this.currentShortCourse.set(sc);
    this.courseTitle.set(sc.title);
    this.isContentReady.set(false);
    this.lectureContent.set('');
    const current = new Set(this.expandedShortCourses());
    current.clear();
    current.add(sc.shortCourseId);
    this.expandedShortCourses.set(current);

    // Refresh lecture sections for the new short course
    this.refreshLectureSectionsForShortCourse(sc, () => {
      this.prepareLectureSectionsAndSetActive(sc);
      this.refreshProgress();
      if (callback) callback();
    });

    // Set videoUrl from shortCourse to courseTree for video player (courseTypeId 1)
    const tree = this.courseTree();
    if (tree && sc.videoUrl) {
      this.courseTree.set({ ...tree, videoUrl: sc.videoUrl });
    } else if (tree && !sc.videoUrl) {
      const { videoUrl, ...treeWithoutVideo } = tree;
      this.courseTree.set(treeWithoutVideo);
    }
  }

  private _selectShortCourseType2Direct(sc: any, callback?: () => void) {
    this.completeOrderPayload.set({
      shortCourseId: sc.shortCourseId,
      courseCertificateId: this.courseTree()?.courseId,
      professionalCertificateId: null
    });
    this.stopSpeech();
    this.activeShortCourseId.set(sc.shortCourseId);
    this.currentShortCourse.set(sc);
    this.courseTitle.set(sc.title);
    this.isContentReady.set(false);
    this.lectureContent.set('');
    const current = new Set(this.expandedShortCourses());
    current.clear();
    current.add(sc.shortCourseId);
    this.expandedShortCourses.set(current);

    // Refresh lecture sections for the new short course
    this.refreshLectureSectionsForShortCourse(sc, () => {
      this.prepareLectureSectionsAndSetActive(sc);
      this.refreshProgress();
      if (callback) callback();
    });

    // Set videoUrl from shortCourse to courseTree for video player (courseTypeId 2)
    const tree = this.courseTree();
    if (tree && sc.videoUrl) {
      this.courseTree.set({ ...tree, videoUrl: sc.videoUrl });
    } else if (tree && !sc.videoUrl) {
      const { videoUrl, ...treeWithoutVideo } = tree;
      this.courseTree.set(treeWithoutVideo);
    }
  }

  goToPreviousShortCourse() {
    const tree = this.courseTree();
    if (!tree) return;

    const currentScId = this.activeShortCourseId();
    const currentCertId = this.activeCertificateId();

    if (tree.courseTypeId === 1 && tree.professionalCourse?.courseCertificates) {
      const certs = tree.professionalCourse.courseCertificates;
      const currentCertIndex = certs.findIndex((c: any) => c.courseCertificateId === currentCertId);
      if (currentCertIndex === -1) return;

      const currentCert = certs[currentCertIndex];
      const currentScIndex = currentCert.shortCourses?.findIndex((sc: any) => sc.shortCourseId === currentScId) ?? -1;

      // Previous short course in same certificate
      if (currentScIndex > 0) {
        const prevSc = currentCert.shortCourses[currentScIndex - 1];
        this.onShortCourseSelectType1(prevSc);
        return;
      }

      // Previous certificate's last short course
      if (currentCertIndex > 0) {
        const prevCert = certs[currentCertIndex - 1];
        if (prevCert.shortCourses?.length > 0) {
          const lastSc = prevCert.shortCourses[prevCert.shortCourses.length - 1];
          this.expandedCertificates.set(new Set([prevCert.courseCertificateId]));
          this.activeCertificateId.set(prevCert.courseCertificateId);
          this.onShortCourseSelectType1(lastSc);
        }
      }
    } else if (tree.courseTypeId === 2 && tree.certificateCourse?.shortCourses) {
      const shortCourses = tree.certificateCourse.shortCourses;
      const currentScIndex = shortCourses.findIndex((sc: any) => sc.shortCourseId === currentScId);

      if (currentScIndex > 0) {
        this.onShortCourseSelect(shortCourses[currentScIndex - 1]);
      }
    }
  }

  goToNextShortCourse() {
    const tree = this.courseTree();
    if (!tree) return;

    const currentScId = this.activeShortCourseId();
    const currentCertId = this.activeCertificateId();

    if (tree.courseTypeId === 1 && tree.professionalCourse?.courseCertificates) {
      const certs = tree.professionalCourse.courseCertificates;
      const currentCertIndex = certs.findIndex((c: any) => c.courseCertificateId === currentCertId);
      if (currentCertIndex === -1) return;

      const currentCert = certs[currentCertIndex];
      const currentScIndex = currentCert.shortCourses?.findIndex((sc: any) => sc.shortCourseId === currentScId) ?? -1;
      const currentSc = currentCert.shortCourses?.[currentScIndex];

      // Next short course in same certificate
      if (currentScIndex < (currentCert.shortCourses?.length || 0) - 1) {
        const nextSc = currentCert.shortCourses[currentScIndex + 1];
        // Use direct method if current is completed (bypass restrictions)
        if (currentSc?.isCompleted) {
          this._selectShortCourseType1Direct(nextSc);
        } else {
          this.onShortCourseSelectType1(nextSc);
        }
        return;
      }

      // Next certificate's first short course
      if (currentCertIndex < certs.length - 1) {
        const nextCert = certs[currentCertIndex + 1];
        if (nextCert.shortCourses?.length > 0) {
          const firstSc = nextCert.shortCourses[0];
          this.expandedCertificates.set(new Set([nextCert.courseCertificateId]));
          this.activeCertificateId.set(nextCert.courseCertificateId);
          // Use direct method if current is completed (bypass restrictions)
          if (currentSc?.isCompleted) {
            this._selectShortCourseType1Direct(firstSc);
          } else {
            this.onShortCourseSelectType1(firstSc);
          }
        }
      }
    } else if (tree.courseTypeId === 2 && tree.certificateCourse?.shortCourses) {
      const shortCourses = tree.certificateCourse.shortCourses;
      const currentScIndex = shortCourses.findIndex((sc: any) => sc.shortCourseId === currentScId);
      const currentSc = shortCourses[currentScIndex];

      if (currentScIndex < shortCourses.length - 1) {
        // Use direct method if current is completed (bypass restrictions)
        if (currentSc?.isCompleted) {
          this._selectShortCourseType2Direct(shortCourses[currentScIndex + 1]);
        } else {
          this.onShortCourseSelect(shortCourses[currentScIndex + 1]);
        }
      }
    }
  }

  canGoPreviousShortCourse(): boolean {
    const tree = this.courseTree();
    if (!tree || tree.courseTypeId === 3) return false;

    const currentScId = this.activeShortCourseId();
    const currentCertId = this.activeCertificateId();

    if (tree.courseTypeId === 1 && tree.professionalCourse?.courseCertificates) {
      const certs = tree.professionalCourse.courseCertificates;
      const currentCertIndex = certs.findIndex((c: any) => c.courseCertificateId === currentCertId);
      if (currentCertIndex === -1) return false;

      const currentCert = certs[currentCertIndex];
      const currentScIndex = currentCert.shortCourses?.findIndex((sc: any) => sc.shortCourseId === currentScId) ?? -1;

      return currentScIndex > 0 || currentCertIndex > 0;
    } else if (tree.courseTypeId === 2 && tree.certificateCourse?.shortCourses) {
      const currentScIndex = tree.certificateCourse.shortCourses.findIndex((sc: any) => sc.shortCourseId === currentScId);
      return currentScIndex > 0;
    }
    return false;
  }

  scrollToQuiz() {
    this.activeTab.set('quiz');
    setTimeout(() => {
      const tabSection = document.querySelector('.screen-tab');
      if (tabSection) {
        tabSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  canGoNextShortCourse(): boolean {
    const tree = this.courseTree();
    if (!tree || tree.courseTypeId === 3) return false;

    const currentScId = this.activeShortCourseId();
    const currentCertId = this.activeCertificateId();

    if (tree.courseTypeId === 1 && tree.professionalCourse?.courseCertificates) {
      const certs = tree.professionalCourse.courseCertificates;
      const currentCertIndex = certs.findIndex((c: any) => c.courseCertificateId === currentCertId);
      const currentCert = certs[currentCertIndex];
      const currentScIndex = currentCert.shortCourses?.findIndex((sc: any) => sc.shortCourseId === currentScId) ?? -1;

      // Check if there are more short courses in current certificate
      if (currentScIndex < (currentCert.shortCourses?.length || 0) - 1) {
        return true;
      }
      // Check if there are more certificates
      if (currentCertIndex < certs.length - 1) {
        return true;
      }
    } else if (tree.courseTypeId === 2 && tree.certificateCourse?.shortCourses) {
      const currentScIndex = tree.certificateCourse.shortCourses.findIndex((sc: any) => sc.shortCourseId === currentScId);
      return currentScIndex < tree.certificateCourse.shortCourses.length - 1;
    }
    return false;
  }

  scrollTabs(direction: 'left' | 'right') {
    if (!this.tabContainer) return;

    const scrollAmount = 200;
    const element = this.tabContainer.nativeElement;

    if (direction === 'left') {
      element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  isMobile(): boolean {
    return window.innerWidth < 730;
  }
}
