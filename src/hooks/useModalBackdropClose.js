import { useCallback, useEffect, useRef } from 'react';

/** Grace period after file picker / tab switch — ignore stray backdrop clicks. */
const GUARD_MS = 2500;

/**
 * Safer modal backdrop close: ignores ghost clicks after file inputs and app switches.
 * Also requires mousedown + click on the backdrop (not drag-out from inside the panel).
 */
export function useModalBackdropClose(onClose, { allowBackdropClose = true } = {}) {
  const pointerOnBackdrop = useRef(false);
  const suppressUntil = useRef(0);

  const suppressBackdropClose = useCallback(() => {
    suppressUntil.current = Date.now() + GUARD_MS;
  }, []);

  useEffect(() => {
    if (!allowBackdropClose || !onClose) return undefined;

    const bump = () => {
      suppressUntil.current = Date.now() + GUARD_MS;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') bump();
    };

    window.addEventListener('blur', bump);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', bump);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [allowBackdropClose, onClose]);

  const backdropProps =
    allowBackdropClose && onClose
      ? {
          onMouseDown: (e) => {
            pointerOnBackdrop.current = e.target === e.currentTarget;
          },
          onClick: (e) => {
            if (e.target !== e.currentTarget) return;
            if (Date.now() < suppressUntil.current) return;
            if (!pointerOnBackdrop.current) return;
            onClose();
          },
        }
      : {
          onClick: (e) => {
            if (e.target === e.currentTarget && allowBackdropClose) onClose?.();
          },
        };

  const fileInputGuardProps = {
    onClick: suppressBackdropClose,
    onFocus: suppressBackdropClose,
  };

  return { backdropProps, fileInputGuardProps, suppressBackdropClose };
}
