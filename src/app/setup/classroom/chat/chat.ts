import { Component, Input, inject, signal, effect, ViewChild, ElementRef, PLATFORM_ID, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import { CourseService } from '../../../services/course.service';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { SpeechService } from '../../../services/speech.service';
import jsPDF from 'jspdf';

// Declare global window interface for chattrik API
declare global {
  interface Window {
    Chattrak?: {
      openChat: () => void;
      closeChat: () => void;
      onChatMinimized?: (callback: () => void) => void;
    };
  }
}

@Component({
  selector: 'app-chat',
  imports: [CommonModule],
  templateUrl: './chat.html',
  styleUrl: './chat.sass',
})
export class Chat implements OnInit {
  courseService = inject(CourseService);
  private sanitizer = inject(DomSanitizer);
  private toastr = inject(ToastrService);
  private speechService = inject(SpeechService);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>();
  private platformId = inject(PLATFORM_ID);

  // Voice recording state
  isRecording = signal<boolean>(false);
  private recognition: any = null;
  isSendingVoice = signal<boolean>(false);
  speakingMessageIndex = signal<number>(-1);
  private lastQueryWasVoice = false;
  private silenceTimer: any = null;
  private ttsCheckInterval: any = null;

  @ViewChild('chatBody') chatBody!: ElementRef<HTMLDivElement>;

  constructor() {
    // Auto-scroll to bottom when messages change or sending state changes
    effect(() => {
      this.chatMessages();
      this.isChatSending();
      this.isRecording();
      this.scrollToBottom();
      this.checkAllTruncations();
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatBody?.nativeElement) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    });
  }

  @Input() assessmentStep: 'none' | 'start' | 'final' | 'failed' | 'cleared' | 'maxattempts' = 'none';
  @Input() courseTree: any = null;
  @Input() courseTypeName: string = ''
  @Input() courseDetailId: number | null = null;
  isLiveChatActive = signal<boolean>(false);
  isLiveChatLoading = signal<boolean>(false);

  isChatMenuOpen = signal<boolean>(false);
  isDownloadingChat = signal<boolean>(false);
  private menuCloseHandler: (() => void) | null = null;
  chatInput = signal<string>('');
  chatThreadId = signal<string>('');
  isChatSending = signal<boolean>(false);
  private msgIdCounter = 0;
  private readonly WELCOME_MESSAGE_ID = -1;
  chatMessages = signal<Array<{ id: number; role: 'bot' | 'user'; text: string | SafeHtml }>>([]);
  expandedMessages = signal<Set<number>>(new Set());
  truncatedMessages = signal<Set<number>>(new Set());

  toggleMessageExpand(msgId: number): void {
    const expanded = new Set(this.expandedMessages());
    if (expanded.has(msgId)) {
      expanded.delete(msgId);
    } else {
      expanded.add(msgId);
    }
    this.expandedMessages.set(expanded);
  }

  isMessageExpanded(msgId: number): boolean {
    return this.expandedMessages().has(msgId);
  }

  isMessageTruncated(msgId: number): boolean {
    return this.truncatedMessages().has(msgId);
  }

  checkAllTruncations(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Check truncation for all bot messages after render
    setTimeout(() => {
      const messages = document.querySelectorAll('[data-msg-id]');
      const truncated = new Set<number>();
      messages.forEach((el) => {
        const msgId = parseInt(el.getAttribute('data-msg-id') || '', 10);
        if (!isNaN(msgId) && el.scrollHeight > el.clientHeight) {
          truncated.add(msgId);
        }
      });
      if (truncated.size > 0) {
        this.truncatedMessages.set(truncated);
      }
    }, 100);
  }

  private buildWelcomeMessage() {
    return {
      id: this.WELCOME_MESSAGE_ID,
      role: 'bot' as const,
      text: this.sanitizer.bypassSecurityTrustHtml(`
          Hi! 👋<br>
          I'm Lumi, your AI learning assistant. How can I help you with this lecture?
          <div style="margin: 12px 0; display: flex; flex-direction: column; gap: 4px;">
            <button data-suggestion="Summarize this lecture" style="background: white; border: 1px solid #E0E0E0; border-radius: 8px; padding: 4px; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 11px; color: #1a1a1a; font-weight: 500;">
              <span style="font-size: 16px;"><img src="/assets/icons/Layer_3.png" class="h-3 w-3" /></span> Summarize this lecture
            </button>
            <button data-suggestion="Explain this topic" style="background: white; border: 1px solid #E0E0E0; border-radius: 8px; padding: 4px; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 11px; color: #1a1a1a; font-weight: 500;">
              <span style="font-size: 16px;"><img src="/assets/icons/Layer_2.png" class="h-3 w-3" /></span> Explain this topic
            </button>
            <button style="background: white; border: 1px solid #E0E0E0; border-radius: 8px; padding: 4px; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 11px; color: #1a1a1a; font-weight: 500;">
              <span style="font-size: 16px;"><img src="/assets/icons/Layer_1.png" class="h-3 w-3" /></span><a href='javascript:void(0)' class='no-underline live-chat-link ' data-live-chat='true'
          (click)="handleChatMessageClick($event)">Connect to live chat</a>
            </button>
          </div>
        `)
    };
  }

  ngOnInit(): void {
    // Add welcome message only on browser (skip SSR to prevent duplicate on hydration)
    if (isPlatformBrowser(this.platformId) && this.chatMessages().length === 0) {
      this.chatMessages.set([this.buildWelcomeMessage()]);
    }
  }

  toggleChatMenu(event: Event) {
    event.stopPropagation();
    const newState = !this.isChatMenuOpen();
    this.isChatMenuOpen.set(newState);
    if (newState && isPlatformBrowser(this.platformId)) {
      const handler = () => {
        this.isChatMenuOpen.set(false);
        document.removeEventListener('click', handler);
        this.menuCloseHandler = null;
      };
      this.menuCloseHandler = handler;
      document.addEventListener('click', handler);
    } else {
      this.closeMenuListener();
    }
  }

  private closeMenuListener() {
    if (this.menuCloseHandler && isPlatformBrowser(this.platformId)) {
      document.removeEventListener('click', this.menuCloseHandler);
      this.menuCloseHandler = null;
    }
  }

  clearChat() {
    this.isChatMenuOpen.set(false);
    this.closeMenuListener();
    this.chatMessages.set([this.buildWelcomeMessage()]);
    this.chatThreadId.set('');
    this.expandedMessages.set(new Set());
    this.truncatedMessages.set(new Set());
    this.msgIdCounter = 0;
  }

  downloadChat() {
    const messages = this.chatMessages();
    const nonWelcome = messages.filter(m => m.id !== this.WELCOME_MESSAGE_ID);
    if (nonWelcome.length === 0) {
      this.isChatMenuOpen.set(false);
      return
    };
    this.isDownloadingChat.set(true);
    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Chat Transcript', 10, 15);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleString()}`, 10, 22);
      doc.setLineWidth(0.5);
      doc.line(10, 25, 200, 25);

      let yPosition = 35;
      const pageHeight = 280;
      const margin = 10;

      nonWelcome.forEach(msg => {
        const role = msg.role === 'bot' ? 'Lumi AI' : 'You';
        const raw = typeof msg.text === 'string'
          ? msg.text
          : (msg.text as any)?.changingThisBreaksApplicationSecurity || '';
        const cleanText = raw.replace(/<[^>]*>/g, '').trim();

        if (cleanText) {
          if (yPosition > pageHeight) {
            doc.addPage();
            yPosition = 15;
          }
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${role}:`, margin, yPosition);
          yPosition += 6;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(cleanText, 180);
          lines.forEach((line: string) => {
            if (yPosition > pageHeight) {
              doc.addPage();
              yPosition = 15;
            }
            doc.text(line, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 5;
        }
      });

      const blob = doc.output('blob');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Chat_Transcript_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.isDownloadingChat.set(false);
      this.isChatMenuOpen.set(false);
      this.closeMenuListener();
    }, 800);
  }

  closeChat() {
    this.isChatMenuOpen.set(false);
    this.closeMenuListener();
    this.courseService.toggleChat();
  }

  // Toggle voice recording
  toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  private async startRecording() {
    if (!isPlatformBrowser(this.platformId)) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.toastr.error('Speech recognition is not supported in this browser.', 'Error');
      return;
    }

    // Mobile detection — continuous mode is unreliable on mobile Chrome
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Request microphone permission explicitly before starting recognition.
    // On mobile browsers, SpeechRecognition does NOT always trigger the
    // permission prompt by itself, so we proactively request mic access.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop the tracks — we only needed the permission grant.
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err: any) {
      console.error('Microphone permission denied:', err);
      this.toastr.error(
        'Microphone permission is required. Please allow microphone access in your browser settings.',
        'Permission Required'
      );
      return;
    }

    this.recognition = new SpeechRecognition();
    // On mobile, continuous mode often fails silently — use single-shot mode.
    this.recognition.continuous = !isMobile;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      this.ngZone.run(() => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.chatInput.set(transcript);

        // Scroll input to show latest text
        setTimeout(() => {
          const inputEl = document.querySelector('app-chat input[type="text"]') as HTMLInputElement;
          if (inputEl) {
            inputEl.scrollLeft = inputEl.scrollWidth;
          }
        });

        // Reset 2-second silence timer on each result
        this.resetSilenceTimer();
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.clearSilenceTimer();
        if (this.isRecording()) {
          // Recognition ended unexpectedly while still recording
          this.isRecording.set(false);
          this.lastQueryWasVoice = true;
          const text = (this.chatInput() || '').trim();
          if (text) {
            this.sendChatMessage();
          }
        }
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        console.error('Speech recognition error:', event.error);
        this.clearSilenceTimer();
        this.isRecording.set(false);

        // Surface a more useful message based on the actual error code
        let msg = 'Voice recognition error. Please try again.';
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            msg = 'Microphone access was blocked. Please allow microphone permission.';
            break;
          case 'audio-capture':
            msg = 'No microphone detected. Please check your device.';
            break;
          case 'network':
            msg = 'Network error during voice recognition. Check your internet connection.';
            break;
          case 'no-speech':
            // Common on mobile — don't toast spam
            return;
          case 'aborted':
            return;
        }
        this.toastr.error(msg, 'Error');
      });
    };

    try {
      this.recognition.start();
      this.isRecording.set(true);
    } catch (err) {
      console.error('Failed to start recognition:', err);
      this.toastr.error('Could not start voice recording. Please try again.', 'Error');
    }
  }

  private stopRecording() {
    this.clearSilenceTimer();
    if (this.recognition) {
      this.lastQueryWasVoice = true;
      this.isRecording.set(false);
      this.recognition.stop();
      this.recognition = null;

      // Auto-send if there's text
      const text = (this.chatInput() || '').trim();
      if (text) {
        this.ngZone.run(() => {
          this.sendChatMessage();
        });
      }
    }
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.isRecording()) {
        this.stopRecording();
      }
    }, 2000);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  // Toggle speech for a specific bot message (called from template)
  toggleSpeakMessage(messageIndex: number) {
    if (this.speakingMessageIndex() === messageIndex) {
      // Currently speaking this message — stop it
      this.speechService.stop();
      this.speakingMessageIndex.set(-1);
      this.clearTtsCheck();
      return;
    }
    // Get the message text
    const msg = this.chatMessages()[messageIndex];
    if (!msg || msg.role !== 'bot') return;
    const text = typeof msg.text === 'string' ? msg.text : (msg.text as any)?.changingThisBreaksApplicationSecurity || '';
    this.speakResponse(text, messageIndex);
  }

  private speakResponse(text: string, messageIndex: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    // Strip HTML tags for clean TTS
    const cleanText = text.replace(/<[^>]*>/g, '');
    this.speakingMessageIndex.set(messageIndex);
    this.speechService.speak(cleanText);

    // Poll speechSynthesis.speaking to detect when TTS finishes
    this.clearTtsCheck();
    this.ttsCheckInterval = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        this.ngZone.run(() => {
          this.speakingMessageIndex.set(-1);
        });
        this.clearTtsCheck();
      }
    }, 300);
  }

  private clearTtsCheck() {
    if (this.ttsCheckInterval) {
      clearInterval(this.ttsCheckInterval);
      this.ttsCheckInterval = null;
    }
  }

  sendChatMessage(hideUserMessage = false) {
    const question = (this.chatInput() || '').trim();
    if (!question || this.isChatSending()) return;

    const tree = this.courseTree;
    const cpCourseDetailId = this.courseDetailId ?? tree?.courseId;
    if (!cpCourseDetailId) {
      this.toastr.error('Course is not loaded yet. Please try again in a moment.', 'Error');
      return;
    }

    // Capture whether this message was voice-initiated before resetting
    const wasVoice = this.lastQueryWasVoice;
    this.lastQueryWasVoice = false;
    this.isSendingVoice.set(wasVoice);

    // Calculate noOfCourseModules and noOfCourses based on courseTypeId
    const courseTypeId = this.courseTree?.courseTypeId;
    let noOfCourseModules = 0;
    let noOfCourses = 0;

    if (courseTypeId === 1) {
      // Professional course: noOfCourseModules = length of courseCertificates array
      noOfCourseModules = this.courseTree?.professionalCourse?.courseCertificates?.length || 0;
      // noOfCourses = total shortCourses across all certificates
      const certs = this.courseTree?.professionalCourse?.courseCertificates || [];
      noOfCourses = certs.reduce((total: number, cert: any) => total + (cert.shortCourses?.length || 0), 0);
    } else if (courseTypeId === 2) {
      // Certificate course: noOfCourseModules = 1
      noOfCourseModules = 1;
      // noOfCourses = length of shortCourses array
      noOfCourses = this.courseTree?.certificateCourse?.shortCourses?.length || 0;
    } else if (courseTypeId === 3) {
      // Short course: noOfCourseModules = 0
      noOfCourseModules = 0;
      // noOfCourses = 0 (single course, no shortCourses)
      noOfCourses = 0;
    }

    const payload = {
      customerId: 1,
      question: question,
      cpCourseDetailId: cpCourseDetailId,
      threadId: this.chatThreadId(),
      courseInfo: {
        courseName: this.courseTree?.courseTitle,
        courseType: this.courseTypeName,
        noOfCourseModules,
        noOfCourses
      }
    };

    if (!hideUserMessage) {
      this.chatMessages.set([...this.chatMessages(), { id: ++this.msgIdCounter, role: 'user', text: this.sanitizer.bypassSecurityTrustHtml(question) }]);
    }
    this.isChatSending.set(true);
    this.chatInput.set('');

    this.courseService.askCourseQuestion(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const threadId = res?.data?.threadId ?? res?.threadId;
        if (typeof threadId === 'string' && threadId.length > 0) {
          this.chatThreadId.set(threadId);
        }

        const answer = res?.data?.answer ?? res?.answer ?? res?.data?.response ?? res?.response ?? res?.message;
        const text = typeof answer === 'string' && answer.trim().length > 0 ? answer : 'I could not find an answer for that.';
        this.chatMessages.set([...this.chatMessages(), { id: ++this.msgIdCounter, role: 'bot', text }]);
        this.isChatSending.set(false);
        this.isSendingVoice.set(false);

        // If the query was voice-initiated, speak the response
        if (wasVoice) {
          const msgIndex = this.chatMessages().length - 1;
          this.speakResponse(text, msgIndex);
        }
      },
      error: (err: any) => {
        this.isChatSending.set(false);
        this.isSendingVoice.set(false);
        this.toastr.error('Failed to send your question. Please try again.', 'Error');
        console.error('Ask Course Question Error:', err);
      }
    });
  }

  handleChatMessageClick(event: Event) {
    const target = event.target as HTMLElement;

    // Check if the clicked element or its parent is a suggestion button
    const suggestionButton = target.closest('[data-suggestion]') as HTMLElement;
    if (suggestionButton) {
      event.preventDefault();
      event.stopPropagation();
      const suggestion = suggestionButton.getAttribute('data-suggestion');
      if (suggestion) {
        this.chatInput.set(suggestion);
        this.sendChatMessage(true); // Hide user message for suggestion buttons
      }
      return;
    }

    // Check if the clicked element or its parent is the live chat link
    if (target.classList.contains('live-chat-link') ||
      target.closest('.live-chat-link') ||
      target.getAttribute('data-live-chat') === 'true' ||
      target.closest('[data-live-chat]')) {
      event.preventDefault();
      event.stopPropagation();
      this.activateLiveChat();
    } else {
    }
  }

  activateLiveChat() {

    if (isPlatformBrowser(this.platformId)) {

      // Check if script already exists to avoid duplicate loading
      const existingScript = document.getElementById('cd360-snippet');
      if (existingScript) {
        if (window.Chattrak?.openChat) {
          window.Chattrak.openChat();
        }
        // Close local chat sidebar since widget is already loaded
        if (this.courseService.isChatOpen()) {
          this.courseService.toggleChat();
        }
        return;
      }

      // Show loading indicator inside local chat
      this.isLiveChatLoading.set(true);

      // Dynamically load the chattrik script
      const script = document.createElement('script');
      script.id = 'cd360-snippet';
      script.src = 'https://app.chattrik.com/assets/scripts/snippet.js?key=69dd2f99b2f813411fe1e011&position=left';
      script.async = true;
      script.setAttribute('data-position', 'left');


      script.onload = () => {

        // Add CSS to hide launcher button
        this.addLauncherButtonHidingCSS();

        // Wait for widget to render, then attach event listener to minimize button
        setTimeout(() => {
          // Check if on assessment screen
          const isAssessmentScreen = this.assessmentStep === 'start' ||
            this.assessmentStep === 'final' ||
            this.assessmentStep === 'cleared' ||
            this.assessmentStep === 'failed' ||
            this.assessmentStep === 'maxattempts';

          // Directly modify the launcher iframe position
          const launcherIframe = document.querySelector('iframe#launcher') as HTMLElement;
          if (launcherIframe) {
            launcherIframe.style.left = '0px';
            launcherIframe.style.right = 'auto';
            // Hide on assessment screens
            if (isAssessmentScreen) {
              launcherIframe.style.display = 'none';
            }
          }

          // Directly modify the webWidget iframe position
          const webWidgetIframe = document.querySelector('iframe#webWidget') as HTMLElement;
          if (webWidgetIframe) {
            webWidgetIframe.style.left = '0px';
            webWidgetIframe.style.right = 'auto';
            webWidgetIframe.style.display = 'block';
            // Hide on assessment screens
            if (isAssessmentScreen) {
              webWidgetIframe.style.display = 'none';
            }
          }

          const badgeIframe = document.querySelector('iframe#badge') as HTMLElement;
          if (badgeIframe) {
            badgeIframe.style.left = '0px';
            badgeIframe.style.right = 'auto';
            badgeIframe.style.display = 'block';
            // Hide on assessment screens
            if (isAssessmentScreen) {
              badgeIframe.style.display = 'none';
            }
          }

          this.attachMinimizeButtonListener();

          // Open live chat
          if (window.Chattrak?.openChat) {
            window.Chattrak.openChat();
          } else {
          }

          // Hide loader and close local chat sidebar now that widget is rendered
          this.ngZone.run(() => {
            this.isLiveChatLoading.set(false);
            if (this.courseService.isChatOpen()) {
              this.courseService.toggleChat();
            }
          });
        }, 2000); // Wait 2 seconds for widget to render
      };

      script.onerror = () => {
        console.error('[Live Chat Debug] Failed to load chattrik script');
        // Reset if script fails to load
        this.isLiveChatActive.set(false);
        this.ngZone.run(() => {
          this.isLiveChatLoading.set(false);
        });
      };

      document.body.appendChild(script);
    } else {
    }
  }

  private addLauncherButtonHidingCSS() {
    if (isPlatformBrowser(this.platformId)) {
      // Add CSS rule to hide launcher button and position widget on left
      const style = document.createElement('style');
      style.id = 'launcher-button-hider';
      style.textContent = `
        #launcher_btn {
          display: none !important;
        }
        /* Position Chattrik launcher button on left side */
        iframe#launcher {
          left: 0px !important;
          right: auto !important;
        }
        /* Position Chattrik webWidget on left side */
        iframe#webWidget {
          left: 0px !important;
          right: auto !important;
        }
        iframe#badge {
          left: 0px !important;
          right: auto !important;
        }
        /* Position Chattrik widget on left side */
        app-root div.content_body {
          left: 20px !important;
          right: auto !important;
        }
        app-root {
          left: 20px !important;
          right: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private removeLauncherButtonHidingCSS() {
    if (isPlatformBrowser(this.platformId)) {
      const style = document.getElementById('launcher-button-hider');
      if (style) {
        style.remove();
      }
    }
  }

  private attachMinimizeButtonListener() {

    // Remove any existing listener to avoid duplicates
    if ((window as any).liveChatMinimizeHandler) {
      document.removeEventListener('click', (window as any).liveChatMinimizeHandler);
    }

    // Use polling to check if widget is visible
    let widgetWasVisible = false;
    let pollCount = 0;
    const maxPolls = 30; // Poll for 30 seconds

    const pollInterval = setInterval(() => {
      pollCount++;
      const chatWidget = document.querySelector('app-root div.content_body');
      const isVisible = chatWidget && (chatWidget as HTMLElement).offsetParent !== null;


      if (isVisible) {
        widgetWasVisible = true;
      }

      // If widget was visible and now is not, it was minimized
      if (widgetWasVisible && !isVisible) {
        clearInterval(pollInterval);
        this.deactivateLiveChat();
      }

      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
      }
    }, 1000); // Check every second
  }

  deactivateLiveChat() {
    if (isPlatformBrowser(this.platformId)) {

      // Remove CSS hiding rule so launcher button can show again
      this.removeLauncherButtonHidingCSS();

      // Remove the chattrik script
      const script = document.getElementById('cd360-snippet');
      if (script) {
        script.remove();
      } else {
      }

      // Remove the chattrik widget HTML (app-root with content_body)
      const chatWidget = document.querySelector('app-root div.content_body');
      if (chatWidget) {
        const appRoot = chatWidget.closest('app-root');
        if (appRoot) {
          appRoot.remove();
        }
      } else {
        // Try alternative selectors
        const allAppRoots = document.querySelectorAll('app-root');
        allAppRoots.forEach((root, index) => {
          if (root.querySelector('.content_body')) {
            root.remove();
          }
        });
      }

      // Remove the launcher button if it exists
      const launcherBtn = document.getElementById('launcher_btn');
      if (launcherBtn) {
        launcherBtn.remove();
      }

    }
  }

  ngOnDestroy() {
    this.closeMenuListener();
    this.clearSilenceTimer();
    this.clearTtsCheck();
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    this.speechService.stop();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
