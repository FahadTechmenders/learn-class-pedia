import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseService } from '../../../services/course.service';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './download.html',
  styleUrl: './download.sass',
})
export class Download implements OnInit {
  private courseService = inject(CourseService);

  ngOnInit(): void {
  }

  get activeSection() {
    return this.courseService.activeSection();
  }

  get pdfFiles() {
    const section = this.activeSection;

    if (!section?.pdfPath) return [];
    
    // pdfPath can be a single path or comma-separated paths
    const paths = section.pdfPath.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
    
    return paths.map((path: string, index: number) => {
      return {
        name: section.title,
        path: path,
        index
      };
    });
  }

  downloadPdf(path: string, fileName: string) {
    const link = document.createElement('a');
    link.href = path;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
