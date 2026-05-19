import { Component, inject, Input, OnInit, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CourseService } from '../../../services/course.service';
import { AuthService } from '../../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-key-points',
  imports: [],
  templateUrl: './key-points.html',
  styleUrl: './key-points.sass',
})
export class KeyPoints implements OnInit, OnChanges {
  @Input() courseTypeId: any = null;
  @Input() slug: string = '';
  @Input() courseTree: any = null;
  @Input() activeShortCourseId: number | null = null;
  @Input() activeCertificateId: number | null = null;
  courseService = inject(CourseService);
  private authService = inject(AuthService);
  overView = signal<any>(null);
  keyPoints = signal<string[]>([]);
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Extract keyPoints from courseTree based on courseTypeId
    this.extractKeyPointsFromTree();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Re-extract keyPoints when relevant inputs change
    if (changes['courseTree'] || changes['activeShortCourseId'] || changes['activeCertificateId']) {
      this.extractKeyPointsFromTree();
    }
  }

  extractKeyPointsFromTree() {
    if (!this.courseTree) return;

    switch (this.courseTypeId) {
      case 1: // Professional Certificate
        if (this.courseTree?.professionalCourse?.courseCertificates) {
          const cert = this.courseTree.professionalCourse.courseCertificates.find(
            (c: any) => c.courseCertificateId === this.activeCertificateId
          );
          if (cert?.shortCourses) {
            const sc = cert.shortCourses.find(
              (s: any) => s.shortCourseId === this.activeShortCourseId
            );
            if (sc?.keyPoints) {
              this.keyPoints.set(sc.keyPoints);
              return;
            }
          }
        }
        break;

      case 2: // Certificate Course
        if (this.courseTree?.certificateCourse?.shortCourses) {
          const sc = this.courseTree.certificateCourse.shortCourses.find(
            (s: any) => s.shortCourseId === this.activeShortCourseId
          );
          if (sc?.keyPoints) {
            this.keyPoints.set(sc.keyPoints);
            return;
          }
        }
        break;

      case 3: // Short Course - always fetch from ShortCourseDetail API
        this._fetchShortCourse();
        return;
    }

    // Fallback to API calls if no keyPoints found in tree
    this.fetchKeyPointsFromAPI();
  }

  fetchKeyPointsFromAPI() {
    switch (this.courseTypeId) {
      case 1:
        this._fetchProfessionalCertificate();
        break;
      case 2:
        this._fetcCourseCertificate();
        break;
      case 3:
        this._fetchShortCourse();
        break;
    }
  }

  _fetchShortCourse() {
    const token = this.authService.getToken();
    this.courseService.getShortCourseDetails(this.slug, token).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details: any) => {
          this.overView.set(details['data'] || null);
          if (details['data']?.keyPoints) {
            this.keyPoints.set(details['data'].keyPoints);
          }
        },
        error: (err: any) => {
          console.error('Refresh Course Tree Error:', err);
        }
      });
  };

  _fetcCourseCertificate() {
    const token = this.authService.getToken();
    this.courseService.getCourseCertificateDetails(this.slug, token).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details: any) => {
          this.overView.set(details['data'] || null);
          this.overView().releaseDate = new Date();
        },
        error: (err: any) => {
          console.error('Refresh Course Tree Error:', err);
        }
      });
  }

  _fetchProfessionalCertificate() {
    const token = this.authService.getToken();
    this.courseService.getProfessionalCertificateDetails(this.slug, token).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details: any) => {
          this.overView.set(details['data'] || null);
          this.overView().releaseDate = new Date();
        },
        error: (err: any) => {
          console.error('Refresh Course Tree Error:', err);
        }
      });
  };
}
