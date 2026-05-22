import  { useState, useEffect, useRef } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
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
  AlignCenter,
  AlignRight,
  GripVertical,
  Tag,
  Eraser
} from 'lucide-react';
import emailService from '../../services/emailService';

const ComposeEmailDrawer = ({
  isOpen = false,
  onClose,
  onSend,
  onSaveDraft,
  initialData = null,
  mode = 'compose'
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState({
    from: 'noreply@classpedia.ai',
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
  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('success'); // 'success' or 'error'
  
  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const drawerRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        from: initialData.from || 'noreply@classpedia.ai',
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

  // Sync initial body to contenteditable when drawer opens or initialData changes
  useEffect(() => {
    if (bodyRef.current && initialData) {
      bodyRef.current.innerHTML = initialData.body || '';
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const result = await emailService.getLabels();
        const isSuccess = result.success || result.isSuccess;
        if (isSuccess) {
          setLabels(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch labels:', error);
      }
    };

    if (isOpen) {
      fetchLabels();
    }
  }, [isOpen]);

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
        attachments,
        labelTypeId: selectedLabel?.id
      });
      setStatusMessage('Email sent successfully!');
      setStatusType('success');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to send email:', error);
      setStatusMessage('Failed to send email. Please try again.');
      setStatusType('error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await onSaveDraft?.({
        ...formData,
        attachments,
        labelTypeId: selectedLabel?.id
      });
      setStatusMessage('Draft saved successfully!');
      setStatusType('success');
      setTimeout(() => {
        setStatusMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setStatusMessage('Failed to save draft. Please try again.');
      setStatusType('error');
    }
  };

  const handleClose = () => {
    setFormData({
      from: 'noreply@classpedia.ai',
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
    setSelectedLabel(null);
    setShowLabelDropdown(false);
    setStatusMessage(null);
    onClose?.();
  };

  const handleAttachment = () => {
    console.log('Attach file');
  };

  const applyFormatting = (format) => {
    const editor = bodyRef.current;
    if (!editor) return;

    editor.focus();

    // Check if there's a selection
    const selection = window.getSelection();
    const hasSelection = selection.rangeCount > 0 && !selection.isCollapsed;

    switch (format) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'highlight':
        document.execCommand('backColor', false, 'yellow');
        break;
      case 'bulletList':
        document.execCommand('insertUnorderedList', false, null);
        break;
      case 'numberedList':
        document.execCommand('insertOrderedList', false, null);
        break;
      case 'indent':
        document.execCommand('indent', false, null);
        break;
      case 'outdent':
        document.execCommand('outdent', false, null);
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
      case 'alignLeft':
        document.execCommand('justifyLeft', false, null);
        break;
      case 'alignCenter':
        document.execCommand('justifyCenter', false, null);
        break;
      case 'alignRight':
        document.execCommand('justifyRight', false, null);
        break;
      case 'clearFormatting':
        document.execCommand('removeFormat', false, null);
        break;
      default:
        return;
    }

    // If no selection was made, ensure cursor is inside the formatted element
    if (!hasSelection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Update formData.body after formatting
    handleChange('body', editor.innerHTML);
  };

  const handleTextStyle = (e) => {
    const editor = bodyRef.current;
    if (!editor) return;

    editor.focus();
    const style = e.target.value;

    switch (style) {
      case 'Normal':
        document.execCommand('formatBlock', false, 'p');
        break;
      case 'Heading 1':
        document.execCommand('formatBlock', false, 'h1');
        break;
      case 'Heading 2':
        document.execCommand('formatBlock', false, 'h2');
        break;
      case 'Heading 3':
        document.execCommand('formatBlock', false, 'h3');
        break;
      default:
        break;
    }

    // Reset select to Normal after applying
    e.target.value = 'Normal';
    handleChange('body', editor.innerHTML);
  };

  const handleFontColor = () => {
    const editor = bodyRef.current;
    if (!editor) return;

    editor.focus();
    const color = prompt('Enter color (e.g., red, #ff0000):');
    if (color) {
      document.execCommand('foreColor', false, color);
      handleChange('body', editor.innerHTML);
    }
  };

  const handleBodyInput = (e) => {
    handleChange('body', e.target.innerHTML);
  };

  const insertEmoji = () => {
    const emojis = ['😊', '👍', '❤️', '🎉', '✨', '🔥', '💯', '👏', '🙏', '💪'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const editor = bodyRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand('insertText', false, emoji);
    handleChange('body', editor.innerHTML);
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
  }, [isDragging, dragStart, position, handleMouseMove]);

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
      case 'editDraft':
        return 'Edit Draft';
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
            {/* Status Message */}
            {statusMessage && (
              <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
                statusType === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {statusType === 'success' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="text-sm font-medium">{statusMessage}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                    From
                  </label>
                  <input
                    type="text"
                    value={formData.from}
                    onChange={(e) => handleChange('from', e.target.value)}
                    placeholder="From"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
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

                {/* Label Selector */}
                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Tag className="w-4 h-4" />
                    <span>
                      {selectedLabel ? selectedLabel.name : 'Add Label'}
                    </span>
                  </button>

                  {selectedLabel && (
                    <button
                      onClick={() => setSelectedLabel(null)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}

                  {showLabelDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-[100]" 
                        onClick={() => setShowLabelDropdown(false)}
                      />
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[101]">
                        {labels.length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            No labels available
                          </div>
                        )}
                        {labels.map((label) => (
                          <button
                            key={label.id}
                            onClick={() => {
                              setSelectedLabel(label);
                              setShowLabelDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left first:rounded-t-lg last:rounded-b-lg"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: label.color || '#3B82F6' }}
                            />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {label.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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
                    onChange={handleTextStyle}
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
                    onClick={handleFontColor}
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

                  {/* Alignment */}
                  <button
                    onClick={() => applyFormatting('alignLeft')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyFormatting('alignCenter')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyFormatting('alignRight')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  {/* Clear Formatting */}
                  <button
                    onClick={() => applyFormatting('clearFormatting')}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    title="Clear Formatting"
                  >
                    <Eraser className="w-4 h-4" />
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
                <div
                  ref={bodyRef}
                  contentEditable
                  onInput={handleBodyInput}
                  placeholder="Write your message..."
                  className="w-full h-64 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none overflow-y-auto text-sm"
                  style={{ minHeight: '256px', direction: 'ltr' }}
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
