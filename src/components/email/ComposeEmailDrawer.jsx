import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  AtSign,
  Save,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Link as LinkIcon,
  Type,
  Highlighter,
  AlignLeft,
  GripVertical
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ComposeEmailDrawer = ({
  isOpen = false,
  onClose,
  onSend,
  onSaveDraft,
  initialData = null,
  mode = 'compose'
}) => {
  const { theme } = useTheme();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  
  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const drawerRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        to: initialData.to || '',
        cc: initialData.cc || '',
        bcc: initialData.bcc || '',
        subject: initialData.subject || '',
        body: initialData.body || ''
      });
      if (initialData.cc) setShowCc(true);
      if (initialData.bcc) setShowBcc(true);
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    if (!formData.to || !formData.subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    setIsSending(true);
    try {
      await onSend?.({
        ...formData,
        attachments
      });
      handleClose();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await onSaveDraft?.({
        ...formData,
        attachments
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: ''
    });
    setAttachments([]);
    setShowCc(false);
    setShowBcc(false);
    setIsMinimized(false);
    setIsFullscreen(false);
    onClose?.();
  };

  const handleAttachment = () => {
    console.log('Attach file');
  };

  const applyFormatting = (format) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.body.substring(start, end);
    
    if (!selectedText && format !== 'indent' && format !== 'outdent') return;

    let formattedText = '';
    let newCursorPos = end;

    switch (format) {
      case 'bold':
        formattedText = `<b>${selectedText}</b>`;
        newCursorPos = end + 7;
        break;
      case 'italic':
        formattedText = `<i>${selectedText}</i>`;
        newCursorPos = end + 7;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        newCursorPos = end + 7;
        break;
      case 'strikethrough':
        formattedText = `<s>${selectedText}</s>`;
        newCursorPos = end + 7;
        break;
      case 'highlight':
        formattedText = `<mark>${selectedText}</mark>`;
        newCursorPos = end + 13;
        break;
      case 'bulletList':
        const bulletLines = selectedText.split('\n');
        formattedText = bulletLines.map(line => `• ${line}`).join('\n');
        newCursorPos = end + (bulletLines.length * 2);
        break;
      case 'numberedList':
        const numberedLines = selectedText.split('\n');
        formattedText = numberedLines.map((line, i) => `${i + 1}. ${line}`).join('\n');
        newCursorPos = end + numberedLines.reduce((acc, _, i) => acc + `${i + 1}. `.length, 0);
        break;
      case 'indent':
        const indentLines = selectedText.split('\n');
        formattedText = indentLines.map(line => `    ${line}`).join('\n');
        newCursorPos = end + (indentLines.length * 4);
        break;
      case 'outdent':
        const outdentLines = selectedText.split('\n');
        formattedText = outdentLines.map(line => line.replace(/^    /, '')).join('\n');
        newCursorPos = start + formattedText.length;
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          formattedText = `<a href="${url}">${selectedText}</a>`;
          newCursorPos = end + url.length + 15;
        } else {
          return;
        }
        break;
      default:
        return;
    }

    const newBody = 
      formData.body.substring(0, start) + 
      formattedText + 
      formData.body.substring(end);

    handleChange('body', newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertEmoji = () => {
    const emojis = ['😊', '👍', '❤️', '🎉', '✨', '🔥', '💯', '👏', '🙏', '💪'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newBody = 
      formData.body.substring(0, start) + 
      emoji + 
      formData.body.substring(start);

    handleChange('body', newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleMouseDown = (e) => {
    if (isFullscreen || isMinimized) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isFullscreen || isMinimized) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - (drawerRef.current?.offsetWidth || 600);
    const maxY = window.innerHeight - (drawerRef.current?.offsetHeight || 700);
    
    setPosition({
      x: Math.max(-maxX, Math.min(0, newX)),
      y: Math.max(-maxY, Math.min(0, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  // Reset position when fullscreen or minimized changes
  useEffect(() => {
    if (isFullscreen || isMinimized) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isFullscreen, isMinimized]);

  if (!isOpen) return null;

  const getModeTitle = () => {
    switch (mode) {
      case 'reply':
        return 'Reply';
      case 'replyAll':
        return 'Reply All';
      case 'forward':
        return 'Forward';
      default:
        return 'New Message';
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isMinimized || isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      <div
        ref={drawerRef}
        className={`
          fixed z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col
          ${isFullscreen
            ? 'inset-0 transition-all duration-300'
            : isMinimized
              ? 'bottom-0 right-6 w-80 h-14 transition-all duration-300'
              : 'bottom-0 right-6 w-[600px] h-[700px] rounded-t-xl'
          }
          ${isDragging ? 'cursor-grabbing' : ''}
        `}
        style={!isFullscreen && !isMinimized ? {
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        } : {}}
      >
        <div 
          className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-600 to-purple-600 ${!isFullscreen && !isMinimized ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            {!isFullscreen && !isMinimized && (
              <GripVertical className="w-4 h-4 text-white/70" />
            )}
            <h3 className="font-semibold text-white">
              {getModeTitle()}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                    To
                  </label>
                  <input
                    type="text"
                    value={formData.to}
                    onChange={(e) => handleChange('to', e.target.value)}
                    placeholder="Recipients"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                  <div className="flex items-center gap-1">
                    {!showCc && (
                      <button
                        onClick={() => setShowCc(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2"
                      >
                        Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        onClick={() => setShowBcc(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2"
                      >
                        Bcc
                      </button>
                    )}
                  </div>
                </div>

                {showCc && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                      Cc
                    </label>
                    <input
                      type="text"
                      value={formData.cc}
                      onChange={(e) => handleChange('cc', e.target.value)}
                      placeholder="Carbon copy"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                    <button
                      onClick={() => {
                        setShowCc(false);
                        handleChange('cc', '');
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}

                {showBcc && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                      Bcc
                    </label>
                    <input
                      type="text"
                      value={formData.bcc}
                      onChange={(e) => handleChange('bcc', e.target.value)}
                      placeholder="Blind carbon copy"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                    <button
                      onClick={() => {
                        setShowBcc(false);
                        handleChange('bcc', '');
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center gap-0.5 px-2 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
                  {/* Text Formatting */}
                  <button 
                    onClick={() => applyFormatting('bold')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('italic')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('underline')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('strikethrough')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  {/* Lists */}
                  <button 
                    onClick={() => applyFormatting('bulletList')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('numberedList')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  {/* Indent */}
                  <button 
                    onClick={() => applyFormatting('outdent')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Decrease Indent"
                  >
                    <IndentDecrease className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('indent')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Increase Indent"
                  >
                    <IndentIncrease className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  {/* Text Style Dropdown */}
                  <select 
                    className="px-2 py-1.5 text-sm border-0 bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Text Style"
                  >
                    <option>Normal</option>
                    <option>Heading 1</option>
                    <option>Heading 2</option>
                    <option>Heading 3</option>
                  </select>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  {/* Font Color & Highlight */}
                  <button 
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Text Color"
                  >
                    <Type className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => applyFormatting('highlight')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Highlight"
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  {/* More Options */}
                  <button 
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="More Options"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1" />

                  {/* Link & Image */}
                  <button 
                    onClick={() => applyFormatting('link')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleAttachment}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Insert Image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={insertEmoji}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Insert Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  ref={bodyRef}
                  value={formData.body}
                  onChange={(e) => handleChange('body', e.target.value)}
                  placeholder="Write your message..."
                  className="w-full h-64 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none text-sm"
                />
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {attachment.name}
                      </span>
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAttachment}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={handleAttachment}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                  title="Insert image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                  title="Discard"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || !formData.to || !formData.subject}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ComposeEmailDrawer;
