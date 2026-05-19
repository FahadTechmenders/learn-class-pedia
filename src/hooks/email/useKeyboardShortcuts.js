import { useEffect } from 'react';
import { KEYBOARD_SHORTCUTS } from '../../constants/emailConstants';

export const useKeyboardShortcuts = (handlers = {}) => {
  useEffect(() => {
    const handleKeyPress = (event) => {
      const { key, ctrlKey, metaKey, target } = event;
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const isModifierPressed = ctrlKey || metaKey;

      switch (key.toLowerCase()) {
        case KEYBOARD_SHORTCUTS.COMPOSE:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onCompose?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.REPLY:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onReply?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.REPLY_ALL:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onReplyAll?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.FORWARD:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onForward?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.ARCHIVE:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onArchive?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.STAR:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onStar?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.MARK_READ:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onMarkRead?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.SEARCH:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onSearch?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.NEXT_EMAIL:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onNextEmail?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.PREV_EMAIL:
          if (!isModifierPressed) {
            event.preventDefault();
            handlers.onPrevEmail?.();
          }
          break;

        case KEYBOARD_SHORTCUTS.ESCAPE:
          event.preventDefault();
          handlers.onEscape?.();
          break;

        case 'a':
          if (isModifierPressed) {
            event.preventDefault();
            handlers.onSelectAll?.();
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (!isModifierPressed && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            handlers.onDelete?.();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handlers]);
};

export const getShortcutsList = () => {
  return [
    { key: 'c', description: 'Compose new email' },
    { key: 'r', description: 'Reply to email' },
    { key: 'a', description: 'Reply all' },
    { key: 'f', description: 'Forward email' },
    { key: 'e', description: 'Archive email' },
    { key: 's', description: 'Star/unstar email' },
    { key: 'i', description: 'Mark as read/unread' },
    { key: '/', description: 'Focus search' },
    { key: 'j', description: 'Next email' },
    { key: 'k', description: 'Previous email' },
    { key: 'Delete', description: 'Delete email' },
    { key: 'Ctrl+A', description: 'Select all' },
    { key: 'Esc', description: 'Close/cancel' }
  ];
};
