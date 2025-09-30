/**
 * Accessibility helpers: manage focus outlines and aria utilities.
 */
let keyboardMode = true;

export function enableFocusVisible() {
  function handleMousedown() { keyboardMode = false; }
  function handleKeydown(e: KeyboardEvent) { if (e.key === 'Tab') keyboardMode = true; }
  window.addEventListener('mousedown', handleMousedown);
  window.addEventListener('keydown', handleKeydown);
}

export function focusClass(): string {
  return keyboardMode ? 'focus-ring' : '';
}

export function ariaNodeLabel(text: string, id: string) {
  const trimmed = text.trim();
  const display = trimmed.length ? trimmed.slice(0, 40) : 'New Thought';
  return `Thought node ${display}`;
}
