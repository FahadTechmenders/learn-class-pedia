import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { CourseService } from '../../../services/course.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-enrolled-courses',
  imports: [
    CommonModule,
    // DecimalPipe
  ],
  templateUrl: './enrolled-courses.html',
  styleUrl: './enrolled-courses.sass',
})
export class EnrolledCourses implements OnInit {
  enrolledCourses = signal<any>(null);
  @Input() courseId: number | null = null;
  private courseService = inject(CourseService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this._fetchEnrolledCourses();
  };

  _fetchEnrolledCourses() {
    const token = this.authService.getToken();
    this.courseService.getEnrolledCourse(token).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses: any) => {
          const enrolledList = courses['data']['enrolledCourses'] || [];

          // Filter out the current courseId
          const filteredCourses = enrolledList.filter((item: any) => item.resourceId !== this.courseId);

          this.enrolledCourses.set(filteredCourses);
        },
        error: (err: any) => {
          console.error('Get Enrolled Courses Error:', err);
        }
      });
  };

  getClassroomUrl(resourceId: number, resourcesTypeId: number): string {
    const token = this.authService.getToken();
    if (resourcesTypeId == 2) {
      return `https://learning.classpedia.ai/classroom?t=${token}&careerPathLevelDetailId=${resourceId}`;
    }
    return `https://learning.classpedia.ai/classroom?t=${token}&courseId=${resourceId}`;

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
