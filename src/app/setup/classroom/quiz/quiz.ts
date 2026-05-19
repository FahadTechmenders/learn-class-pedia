import { Component, inject, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, signal } from '@angular/core';
import { AssessmentService } from '../../../services/assessment.service';
import { AuthService } from '../../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { SecurityService } from '../../../services/security.service';
import { MoodService } from '../../../services/mood.service';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [],
  templateUrl: './quiz.html',
  styleUrl: './quiz.sass',
})
export class Quiz implements OnInit, OnDestroy, OnChanges {
  questions = signal<any[]>([]);
  @Input() orderPayload: any = null;
  @Input() isCourseCompleted: boolean = false;
  @Input() isLectureCompleted: boolean = false;
  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);
  private assessmentService = inject(AssessmentService);
  isQuestionLoading = signal(false)
  isCompleting = signal(false);
  isSubmitted = signal(false);
  showCompletionScreen = signal(false);
  showAnswers = signal(false);
  quizResult = signal<any>(null);
  isMovingToNext = signal(false);
  isStartingAssessment = signal(false);
  @Output() moveToNextTopic = new EventEmitter<void>();
  @Output() refreshTree = new EventEmitter<void>();
  @Output() startAssessment = new EventEmitter<void>();
  @Output() goToDashboard = new EventEmitter<void>();
  @Output() selectIncomplete = new EventEmitter<void>();
  private securityService = inject(SecurityService);
  private moodService = inject(MoodService);

  ngOnInit(): void {
    this._fetchQuizes()
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['orderPayload']) {

    }

    if (changes['isLectureCompleted']) {
    }

    if (changes['orderPayload'] && !changes['orderPayload'].firstChange) {
      const previousShortCourseId = changes['orderPayload'].previousValue?.shortCourseId;
      const currentShortCourseId = changes['orderPayload'].currentValue?.shortCourseId;

      // Only reset if the shortCourseId actually changed
      if (previousShortCourseId !== currentShortCourseId) {
        this.resetQuizState();
        this._fetchQuizes();
      } else {
      }
    }
  }

  resetQuizState() {
    this.isSubmitted.set(false);
    this.showCompletionScreen.set(false);
    this.showAnswers.set(false);
    this.quizResult.set(null);
  }
  _fetchQuizes() {
    if (!this.orderPayload?.shortCourseId) return;
    this.isQuestionLoading.set(true);
    const token = this.authService.getToken();
    this.assessmentService.getQuizQuestions(this.orderPayload.shortCourseId, token).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details: any) => {
          this.questions.set(details['data']['questions'].map((q: any) => ({
            isSelect: false,
            selectedOption: '',
            ...q,
          })) || []);
          this.isQuestionLoading.set(false);
        },
        error: (err: any) => {
          console.error('Fetch Assessment Questions Error:', err);
        }
      });
  };

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onOptionChange(question: any, optionLetter: string) {
    const updated = this.questions().map(q => {
      if (q.id === question.id) {
        return { ...q, selectedOption: optionLetter, isSelect: true };
      }
      return q;
    });
    this.questions.set(updated);
    // Mascot acknowledges the choice with an idea pop
    this.moodService.react('quiz-option-selected');
  }

  onCheckResult() {
    this.isCompleting.set(true);
    const payload: any = {
      shortCourseId: this.orderPayload?.shortCourseId || null,
      courseCertificateId: this.orderPayload?.courseCertificateId || null,
      answers: this.questions().map(data => {
        return {
          questionId: data?.id,
          selectedAnswer: data?.selectedOption
        }
      })
    };

    // Career path excludes professionalCertificateId
    if (this.orderPayload?.careerPathLevelMapId) {
      payload.careerPathLevelMapId = this.orderPayload.careerPathLevelMapId;
      payload.professionalCertificateId = null;
    } else {
      payload.professionalCertificateId = this.orderPayload?.professionalCertificateId || null;
      payload.careerPathLevelMapId = null;
    }
    const token = this.authService.getToken();
    this.assessmentService.submitQuizAssessment(payload, token).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isCompleting.set(false);
          this.mapCorrectAnswers(response?.data?.questionResults || []);
          this._fetchQuizesResult();
        },
        error: (err: any) => {
          this.isCompleting.set(false);
          console.error('Submit Assessment Error:', err);
        }
      });
  }

  _fetchQuizesResult() {
    const token = this.authService.getToken();
    const payload = {
      courseId: this.orderPayload?.shortCourseId || null,
      courseCertificateId: this.orderPayload?.courseCertificateId || null,
      professionalCertificateId: this.orderPayload?.professionalCertificateId || null,
      assessmentTypeId: 1
    };
    this.assessmentService.getQuizesResult(payload, token).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details: any) => {
          if (details?.isSuccess) {
            this.quizResult.set(details.data);
            this.isSubmitted.set(true);
            this.refreshTree.emit();
            this.showCompletionScreen.set(true);
            // Drive mascot mood from the actual score
            const correct = Number(details.data?.correctAnswers) || 0;
            const total = Number(details.data?.totalQuestions) || this.questions().length;
            this.moodService.reactToScore(correct, total, false);
          }
        },
        error: (err: any) => {
          console.error('Fetch Quiz Result Error:', err);
        }
      });
  }

  getQuestionResult(questionId: number): any {
    const result = this.quizResult();
    if (!result?.questionResults) return null;
    return result.questionResults.find((qr: any) => qr.questionId === questionId);
  }

  onCheckAnswers() {
    if (this.isLectureCompleted && !this.isSubmitted()) {
      // Lecture already completed - fetch results from API before showing answers
      const token = this.authService.getToken();
      const payload = {
        courseId: this.orderPayload?.shortCourseId || null,
        courseCertificateId: this.orderPayload?.courseCertificateId || null,
        professionalCertificateId: this.orderPayload?.professionalCertificateId || null,
        assessmentTypeId: 1
      };
      this.assessmentService.getQuizesResult(payload, token).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (details: any) => {
            if (details?.isSuccess) {
              this.quizResult.set(details.data);
              this.isSubmitted.set(true);
              // Map correct answers to questions
              this.mapCorrectAnswers(details.data?.questionResults || []);
              // Merge selected options from API results into questions
              const results = details.data?.questionResults || [];
              const updated = this.questions().map((q: any) => {
                const match = results.find((r: any) => r.questionId === q.id);
                return match ? { ...q, selectedOption: match.selectedAnswer } : q;
              });
              this.questions.set(updated);
            }
            this.showCompletionScreen.set(false);
            this.showAnswers.set(true);
          },
          error: () => {
            this.showCompletionScreen.set(false);
            this.showAnswers.set(true);
          }
        });
    } else {
      this.showCompletionScreen.set(false);
      this.showAnswers.set(true);
    }
  }

  onMoveToNextTopic() {
    // Set loading state
    this.isMovingToNext.set(true);

    // This will refresh tree and select next incomplete shortCourse
    // Parent component will reset isMovingToNext after tree loads
    this.selectIncomplete.emit();
  }

  resetMovingState() {
    this.isMovingToNext.set(false);
  }

  onStartAssessment() {
    this.isStartingAssessment.set(true);
    this.startAssessment.emit();
    return;
  }

  onBack() {
    this.showAnswers.set(false);
    this.showCompletionScreen.set(true);
  }

  isSomeQuestionAnswered(): boolean {
    const result = this.questions().some((q: any) => q.isSelect);
    return result;
  };

  mapCorrectAnswers(questionResults: any[]) {
    const resultMap = new Map(
      questionResults.map(r => [r.questionId, r.correctAnswer])
    );

    this.questions.update(questions =>
      questions.map(q => ({
        ...q,
        correctAnswer: resultMap.get(q.id) || ''
      }))
    );
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
