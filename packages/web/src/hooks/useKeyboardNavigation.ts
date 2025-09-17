import { useEffect } from 'react';

interface KeyboardNavigationOptions {
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export const useKeyboardNavigation = ({
  onNext,
  onPrevious,
  onTogglePlay,
  onEscape,
  enabled = true
}: KeyboardNavigationOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keyboard events if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'n':
        case 'N':
          event.preventDefault();
          onNext();
          break;
        
        case 'ArrowLeft':
        case 'p':
        case 'P':
          event.preventDefault();
          onPrevious();
          break;
        
        case ' ':
        case 'k':
        case 'K':
          event.preventDefault();
          onTogglePlay();
          break;
        
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrevious, onTogglePlay, onEscape, enabled]);
};