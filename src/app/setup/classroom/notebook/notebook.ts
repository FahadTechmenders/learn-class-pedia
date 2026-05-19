import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CourseService } from '../../../services/course.service';
import { AuthService } from '../../../services/auth.service';
import { SpeechService } from '../../../services/speech.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-notebook',
  imports: [],
  templateUrl: './notebook.html',
  styleUrl: './notebook.sass',
})
export class Notebook implements OnInit, OnChanges {
  @Input() orderPayload: any = null;
  @Input() videoTimeSeconds: number = 0;
  @Input() isPlaying: boolean = false;
  @Input() courseTitle: string = '';
  @Input() courseTree: any = null;
  @Input() currentShortCourse: any = null;
  @Output() notePlaying = new EventEmitter<void>();
  @Output() pauseVideo = new EventEmitter<void>();
  @Output() resumeVideo = new EventEmitter<void>();
  deletingNoteId = signal<number | null>(null);
  wasPlayingBeforeNote = false;

  private courseService = inject(CourseService);
  private authService = inject(AuthService);
  private speechService = inject(SpeechService);
  private toastr = inject(ToastrService);

  isAddingNote = signal(false);
  isSaving = signal(false);
  isDownloadingPdf = signal(false);
  noteText = signal('');
  savedNotes = signal<any[]>([]);
  editingNoteId = signal<number | null>(null);
  editNoteText = signal('');

  private lastShortCourseId: number | null = null;

  ngOnInit() {
    this.fetchNotes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['orderPayload'] && !changes['orderPayload'].firstChange) {
      const newId = this.orderPayload?.shortCourseId;
      if (newId && newId !== this.lastShortCourseId) {
        this.lastShortCourseId = newId;
        this.isAddingNote.set(false);
        this.noteText.set('');
        this.fetchNotes();
      }
    }
  }

  fetchNotes() {
    const p = this.orderPayload;
    if (!p?.shortCourseId) return;
    const token = this.authService.getToken();
    this.courseService.getNotebooks(p.shortCourseId, p.courseCertificateId, p.professionalCertificateId, p.careerPathLevelMapId, token).subscribe({
      next: (res: any) => {
        const data = res?.isSuccess !== undefined ? res.data : res;
        this.savedNotes.set(Array.isArray(data?.notes) ? data.notes : []);
      },
      error: (err: any) => console.error('Fetch Notes Error:', err)
    });
  }

  onSaveNote() {
    // Pause video if playing
    if (this.isPlaying) {
      this.wasPlayingBeforeNote = true;
      this.pauseVideo.emit();
    } else {
      this.wasPlayingBeforeNote = false;
    }
    this.isAddingNote.set(true);
  }

  onCancelNote() {
    this.isAddingNote.set(false);
    this.noteText.set('');
    // Resume video if it was playing before
    if (this.wasPlayingBeforeNote) {
      this.resumeVideo.emit();
      this.wasPlayingBeforeNote = false;
    }
  }

  onSaveNoteConfirm() {
    if (!this.noteText() || !this.orderPayload?.shortCourseId) return;
    this.isSaving.set(true);
    const token = this.authService.getToken();
    
    // Build payload based on hierarchy
    const payload: any = {
      shortCourseId: this.orderPayload.shortCourseId,
      courseCertificateId: this.orderPayload.courseCertificateId || null,
      videoTimeSeconds: Math.floor(this.videoTimeSeconds),
      noteText: this.noteText()
    };

    // Career path excludes professionalCertificateId
    if (this.orderPayload.careerPathLevelMapId) {
      payload.careerPathLevelMapId = this.orderPayload.careerPathLevelMapId;
      payload.professionalCertificateId = null;
    } else {
      // Regular course includes professionalCertificateId
      payload.professionalCertificateId = this.orderPayload.professionalCertificateId || null;
      payload.careerPathLevelMapId = null;
    }

    this.courseService.saveNotebook(payload, token).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        this.isAddingNote.set(false);
        this.noteText.set('');
        this.fetchNotes();
        // Resume video if it was playing before
        if (this.wasPlayingBeforeNote) {
          this.resumeVideo.emit();
          this.wasPlayingBeforeNote = false;
        }
      },
      error: (err: any) => {
        console.error('Save Note Error:', err);
        this.isSaving.set(false);
      }
    });
  }

  onNoteClick(seconds: number) {
    if (this.speechService.totalDuration() > 0) {
      this.speechService.seekToTime(seconds);
      this.notePlaying.emit();
    }
  }

  onEditNote(note: any) {
    this.editingNoteId.set(note.id);
    this.editNoteText.set(note.noteText);
  }

  onCancelEdit() {
    this.editingNoteId.set(null);
    this.editNoteText.set('');
  }

  onUpdateNote(note: any) {
    if (!this.editNoteText()) return;
    this.isSaving.set(true);
    const token = this.authService.getToken();
    const payload = {
      videoTimeSeconds: note.videoTimeSeconds,
      noteText: this.editNoteText()
    };
    this.courseService.updateNotebook(note.id, payload, token).subscribe({
      next: () => {
        this.savedNotes.update(notes => notes.map(n => n.id === note.id ? { ...n, noteText: this.editNoteText() } : n));
        this.editingNoteId.set(null);
        this.editNoteText.set('');
        this.isSaving.set(false);
      },
      error: (err: any) => {
        console.error('Update Note Error:', err);
        this.isSaving.set(false);
      }
    });
  }

  onDeleteNote(id: number) {
    const token = this.authService.getToken();
    this.deletingNoteId.set(id);
    this.courseService.deleteNotebook(id, token).subscribe({
      next: () => {
        this.savedNotes.update(notes => notes.filter(n => n.id !== id));
        this.deletingNoteId.set(null);
      },
      error: (err: any) => {
        console.error('Delete Note Error:', err);
        this.deletingNoteId.set(null);
      }
    });
  }

  exportNotesPdf() {
    const notes = this.savedNotes();
    if (notes.length === 0) return;

    const p = this.orderPayload;
    if (!p?.shortCourseId) return;

    const token = this.authService.getToken();
    
    
    this.isDownloadingPdf.set(true);
    
    this.courseService.downloadNotebookPdf(
      p.shortCourseId, 
      p.courseCertificateId, 
      p.professionalCertificateId,
      p.careerPathLevelMapId,
      token
    ).subscribe({
      next: (blob: Blob) => {
        // Create a download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Course_Notes_${p.shortCourseId}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.isDownloadingPdf.set(false);
      },
      error: (err: any) => {
        console.error('Download PDF Error:', err);
        this.isDownloadingPdf.set(false);
        console.error('Failed to download PDF. Please try again.');
      }
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
