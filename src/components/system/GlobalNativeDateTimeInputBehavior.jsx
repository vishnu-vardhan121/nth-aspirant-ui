import { useEffect } from 'react';

const PICKER_INPUT_TYPES = new Set(['date', 'datetime-local', 'time', 'month', 'week']);

/**
 * Resolves a native picker-backed <input> from an event target (input itself or associated <label>).
 */
function resolvePickerInput(target) {
  if (!(target instanceof Element)) return null;
  if (target instanceof HTMLInputElement && PICKER_INPUT_TYPES.has(target.type)) return target;
  if (target instanceof HTMLLabelElement) {
    const { control } = target;
    if (control instanceof HTMLInputElement && PICKER_INPUT_TYPES.has(control.type)) return control;
  }
  return null;
}

/**
 * Mount once under the app root: clicking anywhere on a date/datetime/time field (or its label)
 * opens the browser calendar/time UI via showPicker(), and works around tiny icon hit targets.
 */
export function GlobalNativeDateTimeInputBehavior() {
  useEffect(() => {
    const onPointerDown = (e) => {
      const input = resolvePickerInput(e.target);
      if (!input || typeof input.showPicker !== 'function') return;
      requestAnimationFrame(() => {
        try {
          input.showPicker();
        } catch {
          /* InvalidStateError: not user-activated or unsupported state */
        }
      });
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);
  return null;
}
