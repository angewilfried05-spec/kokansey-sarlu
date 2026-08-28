import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Navigation Shortcuts (Alt + Key)
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd': navigate('/dashboard'); break;
          case 'o': navigate('/dashboard/operations'); break;
          case 's': navigate('/dashboard/speculations'); break;
          case 'i': navigate('/dashboard/stock'); break;
          case 'e': navigate('/dashboard/employees'); break;
          case 't': navigate('/dashboard/trucks'); break;
          case 'a': navigate('/dashboard/accounts'); break;
          case 'r': navigate('/dashboard/reports'); break;
        }
      }

      // Quick Action Shortcuts (G then Key) - like Gmail
      // For now, just Alt + N for New Sale (shortcut to dashboard redirect)
      if (e.altKey && e.key.toLowerCase() === 'n') {
        navigate('/dashboard/speculations?view=sales');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
