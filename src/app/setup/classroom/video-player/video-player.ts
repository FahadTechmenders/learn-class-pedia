// simple-video-player.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-simple-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-player.html',
  styleUrls: ['./video-player.sass']
})
export class VideoPlayerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoWrapper') videoWrapper!: ElementRef<HTMLDivElement>;

  @Input() videoUrl: string | null = null;
  @Input() isPlaying: boolean = false;
  @Input() currentTime: number = 0;
  @Input() duration: number = 0;
  @Input() autoPlay: boolean = false;
  @Input() showControls: boolean = true;
  @Output() durationChange = new EventEmitter<number>();
  @Input() posterImage: string = '';
  @Input() playbackRate: number = 1;

  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() timeupdate = new EventEmitter<number>();
  @Output() ended = new EventEmitter<void>();
  @Output() goToPrevious = new EventEmitter<void>();
  @Output() goToNext = new EventEmitter<void>();
  @Output() seekTo = new EventEmitter<number>();
  @Output() volumeChange = new EventEmitter<number>();
  @Output() fullscreenChange = new EventEmitter<boolean>();
  @Output() videoError = new EventEmitter<Error>();

  // Player state
  isVideoPlaying = false;
  videoLoaded = false;
  hasVideoError = false;
  isLoading = false;
  isMuted = false;
  volume = 1;
  isFullscreen = false;
  previousVolume = 1;

  // UI state
  controlsVisible = true;
  controlsTimeout: any;
  isDragging = false;
  bufferedProgress = 0;
  videoTitle = '';

  // Quality settings
  videoQualities: { label: string; height: number }[] = [];
  currentQuality = 'auto';

  // Keyboard shortcuts
  keyboardShortcutsEnabled = true;

  // YouTube API
  private youtubePlayer: any = null;
  private youtubeApiLoaded = false;
  private youtubeApiReady = false;

  constructor() {
    this.loadYouTubeApi();
  }

  ngAfterViewInit() {
    if (!this.isYouTubeVideo()) {
      this.setupVideoListeners();
      if (this.autoPlay) {
        setTimeout(() => this.onPlay(), 100);
      }
    }
    this.setupKeyboardShortcuts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['videoUrl'] && this.videoUrl) {
      this.resetPlayer();
      if (!this.isYouTubeVideo() && this.videoElement) {
        this.loadVideo();
      } else if (this.isYouTubeVideo()) {
        this.loadYouTubeVideo();
      }
    }

    if (changes['playbackRate'] && this.videoElement) {
      this.setPlaybackRate(this.playbackRate);
    }
  }

  ngOnDestroy() {
    this.removeKeyboardShortcuts();
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (!this.keyboardShortcutsEnabled || this.hasVideoError) return;

    // Don't trigger shortcuts if user is typing in an input field
    const target = event.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;
    
    if (isTyping) return;

    // Prevent default behavior for video controls
    const videoKeys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'f', 'm', 'k', 'j', 'l', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (videoKeys.includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case ' ':
      case 'k':
        this.isVideoPlaying ? this.onPause() : this.onPlay();
        break;
      case 'ArrowLeft':
        this.skipBackward(5);
        break;
      case 'ArrowRight':
        this.skipForward(5);
        break;
      case 'ArrowUp':
        this.adjustVolume(0.1);
        break;
      case 'ArrowDown':
        this.adjustVolume(-0.1);
        break;
      case 'f':
        this.toggleFullscreen();
        break;
      case 'm':
        this.toggleMute();
        break;
      case 'j':
        this.skipBackward(10);
        break;
      case 'l':
        this.skipForward(10);
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        const num = parseInt(event.key);
        if (!isNaN(num) && this.duration) {
          this.seekToTime((this.duration / 10) * num);
        }
        break;
    }
  }

  private setupKeyboardShortcuts() {
    this.keyboardShortcutsEnabled = true;
  }

  private removeKeyboardShortcuts() {
    this.keyboardShortcutsEnabled = false;
  }

  private resetPlayer() {
    this.isVideoPlaying = false;
    this.videoLoaded = false;
    this.hasVideoError = false;
    this.isLoading = true;
    this.currentTime = 0;
    this.duration = 0;
    this.bufferedProgress = 0;
  }

  private setupVideoListeners() {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;

    video.addEventListener('loadedmetadata', () => {
      this.duration = video.duration;
      this.videoLoaded = true;
      this.isLoading = false;
      this.setupQualityOptions();
      this.durationChange.emit(this.duration);
    });

    video.addEventListener('timeupdate', () => {
      if (!this.isDragging) {
        this.currentTime = video.currentTime;
        this.timeupdate.emit(this.currentTime);
      }
      this.updateBufferedProgress();
    });

    video.addEventListener('progress', () => {
      this.updateBufferedProgress();
    });

    video.addEventListener('ended', () => {
      this.isVideoPlaying = false;
      this.ended.emit();
    });

    video.addEventListener('error', (e) => {
      this.handleVideoError(e);
    });

    video.addEventListener('canplay', () => {
      this.videoLoaded = true;
      this.isLoading = false;
    });

    video.addEventListener('waiting', () => {
      this.isLoading = true;
    });

    video.addEventListener('playing', () => {
      this.isLoading = false;
    });

    video.addEventListener('volumechange', () => {
      this.volume = video.volume;
      this.isMuted = video.muted;
    });

    // Set initial volume
    video.volume = this.volume;
  }

  private updateBufferedProgress() {
    const video = this.videoElement?.nativeElement;
    if (video && video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      this.bufferedProgress = (bufferedEnd / video.duration) * 100;
    }
  }

  private setupQualityOptions() {
    const video = this.videoElement?.nativeElement;
    if (video && video.videoHeight) {
      this.videoQualities = [
        { label: 'Auto', height: 0 },
        { label: '1080p', height: 1080 },
        { label: '720p', height: 720 },
        { label: '480p', height: 480 },
        { label: '360p', height: 360 }
      ].filter(quality => quality.height === 0 || quality.height <= video.videoHeight);
    }
  }

  setQuality(quality: string) {
    this.currentQuality = quality;
    // Implement quality switching logic here
    // Note: This requires HLS or adaptive streaming support
  }

  setPlaybackRate(rate: number) {
    if (this.videoElement) {
      this.videoElement.nativeElement.playbackRate = rate;
      this.playbackRate = rate;
    }
  }

  private handleVideoError(event: Event) {
    const video = this.videoElement?.nativeElement;
    let errorMessage = 'Video could not be loaded';

    if (video?.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred while loading the video';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video format is not supported or file is corrupted';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format is not supported by your browser';
          break;
      }
    }

    this.hasVideoError = true;
    this.videoLoaded = false;
    this.isLoading = false;
    this.videoError.emit(new Error(errorMessage));
  }

  private loadVideo() {
    if (this.videoElement && this.videoUrl) {
      const video = this.videoElement.nativeElement;
      this.hasVideoError = false;
      this.isLoading = true;
      video.load();
    }
  }

  private loadYouTubeApi() {
    if (!document.querySelector('#youtube-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      (window as any).onYouTubeIframeAPIReady = () => {
        this.youtubeApiLoaded = true;
        if (this.isYouTubeVideo()) {
          this.loadYouTubeVideo();
        }
      };
    }
  }

  private loadYouTubeVideo() {
    if (!this.youtubeApiLoaded || !this.isYouTubeVideo()) return;

    const videoId = this.getYouTubeVideoId();
    if (!videoId) return;

    if (this.youtubePlayer) {
      this.youtubePlayer.loadVideoById(videoId);
    } else if (this.videoWrapper) {
      this.youtubePlayer = new (window as any).YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: this.autoPlay ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 1
        },
    events: {
          onReady: (event: any) => {
            this.youtubeApiReady = true;
            this.videoLoaded = true;
            this.isLoading = false;
            this.duration = event.target.getDuration();
            this.durationChange.emit(this.duration);
            if (this.autoPlay) {
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            switch (event.data) {
              case 1: // playing
                this.isVideoPlaying = true;
                this.isLoading = false;
                break;
              case 2: // paused
                this.isVideoPlaying = false;
                break;
              case 0: // ended
                this.ended.emit();
                break;
              case 3: // buffering
                this.isLoading = true;
                break;
            }
          },
          onError: (event: any) => {
            this.hasVideoError = true;
            this.videoError.emit(new Error('YouTube video error'));
          }
        }
      });
    }
  }

  private getYouTubeVideoId(): string | null {
    if (!this.videoUrl) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = this.videoUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  isYouTubeVideo(): boolean {
    if (!this.videoUrl) return false;
    return this.videoUrl.includes('youtube.com/') || this.videoUrl.includes('youtu.be/');
  }

  getYouTubeEmbedUrl(): string {
    const videoId = this.getYouTubeVideoId();
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  }

  onPlay() {
    if (this.isYouTubeVideo() && this.youtubePlayer) {
      this.youtubePlayer.playVideo();
      this.isVideoPlaying = true;
    } else if (this.videoElement && this.videoLoaded) {
      this.videoElement.nativeElement.play()
        .then(() => {
          this.isVideoPlaying = true;
          this.play.emit();
        })
        .catch(error => {
          console.error('Play failed:', error);
          this.videoError.emit(error);
        });
    }
  }

  onPause() {
    if (this.isYouTubeVideo() && this.youtubePlayer) {
      this.youtubePlayer.pauseVideo();
      this.isVideoPlaying = false;
    } else if (this.videoElement) {
      this.videoElement.nativeElement.pause();
      this.isVideoPlaying = false;
      this.pause.emit();
    }
  }

  onPrevious() {
    this.skipBackward(120);
    this.goToPrevious.emit();
  }

  onNext() {
    this.skipForward(120);
    this.goToNext.emit();
  }

  skipForward(seconds: number) {
    if (this.isYouTubeVideo() && this.youtubePlayer) {
      const currentTime = this.youtubePlayer.getCurrentTime();
      this.youtubePlayer.seekTo(currentTime + seconds, true);
    } else if (this.videoElement) {
      const video = this.videoElement.nativeElement;
      const newTime = Math.min(video.duration, video.currentTime + seconds);
      video.currentTime = newTime;
      this.seekTo.emit(newTime);
    }
  }

  skipBackward(seconds: number) {
    if (this.isYouTubeVideo() && this.youtubePlayer) {
      const currentTime = this.youtubePlayer.getCurrentTime();
      this.youtubePlayer.seekTo(Math.max(0, currentTime - seconds), true);
    } else if (this.videoElement) {
      const video = this.videoElement.nativeElement;
      const newTime = Math.max(0, video.currentTime - seconds);
      video.currentTime = newTime;
      this.seekTo.emit(newTime);
    }
  }

  seekToTime(time: number) {
    if (this.isYouTubeVideo() && this.youtubePlayer) {
      this.youtubePlayer.seekTo(time, true);
    } else if (this.videoElement) {
      this.videoElement.nativeElement.currentTime = time;
      this.seekTo.emit(time);
    }
  }

  onSeekSlider(event: Event) {
    const input = event.target as HTMLInputElement;
    const newTime = parseFloat(input.value);
    this.seekToTime(newTime);
  }

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newVolume = parseFloat(input.value) / 100;
    this.setVolume(newVolume);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.isYouTubeVideo() && this.youtubePlayer) {
      this.youtubePlayer.setVolume(this.volume * 100);
    } else if (this.videoElement) {
      this.videoElement.nativeElement.volume = this.volume;
    }
    this.isMuted = this.volume === 0;
    this.volumeChange.emit(this.volume);
  }

  adjustVolume(delta: number) {
    this.setVolume(this.volume + delta);
  }

  toggleMute() {
    if (this.isMuted) {
      this.setVolume(this.previousVolume);
    } else {
      this.previousVolume = this.volume;
      this.setVolume(0);
    }
  }

  toggleFullscreen() {
    const element = this.videoWrapper?.nativeElement || this.videoElement?.nativeElement;
    if (!element) return;

    if (!this.isFullscreen) {
      element.requestFullscreen()
        .then(() => {
          this.isFullscreen = true;
          this.fullscreenChange.emit(true);
        })
        .catch(err => {
          console.error('Fullscreen error:', err);
        });
    } else {
      document.exitFullscreen()
        .then(() => {
          this.isFullscreen = false;
          this.fullscreenChange.emit(false);
        });
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  showControlsTemporarily() {
    this.controlsVisible = true;
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    if (this.isVideoPlaying) {
      this.controlsTimeout = setTimeout(() => {
        this.controlsVisible = false;
      }, 3000);
    }
  }

  onMouseMove() {
    this.showControlsTemporarily();
  }

  retryVideo() {
    this.hasVideoError = false;
    if (this.isYouTubeVideo()) {
      this.loadYouTubeVideo();
    } else if (this.videoElement) {
      this.loadVideo();
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || seconds < 0 || !isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getProgressPercentage(): number {
    return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
  }

  getValidVideoUrl(): string {
    return this.videoUrl || '';
  }

  onVideoError(event: Event) {
    this.handleVideoError(event);
  }

  onLoadedMetadata(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.duration = video.duration;
    this.videoLoaded = true;
    this.isLoading = false;
    this.setupQualityOptions();
  }

  onCanPlay(event: Event) {
    this.videoLoaded = true;
    this.isLoading = false;
  }

  onWaiting(event: Event) {
    this.isLoading = true;
  }

  onPlaying(event: Event) {
    this.isLoading = false;
  }

  onTimeUpdate(event: Event) {
    const video = event.target as HTMLVideoElement;
    if (!this.isDragging) {
      this.currentTime = video.currentTime;
      this.timeupdate.emit(this.currentTime);
    }
    this.updateBufferedProgress();
  }

  onSeek(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.currentTime = video.currentTime;
    this.seekTo.emit(this.currentTime);
  }

  onEnded() {
    this.isVideoPlaying = false;
    this.ended.emit();
  }
}