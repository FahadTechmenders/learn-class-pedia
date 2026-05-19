import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-reviews.html',
  styleUrl: './course-reviews.sass',
})
export class CourseReviews {
  @Input() reviews: any[] = [];
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}
