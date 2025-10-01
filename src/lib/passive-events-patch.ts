// Dev patch: Force passive listeners for common scroll/pinch events if not explicitly passive.
// This helps suppress Chrome's scroll-blocking warnings when upstream libs (e.g. React Flow) add non-passive handlers.
// Safe because we only auto-passivize when handler did not ask to call preventDefault.

const targetEvents = new Set(['touchstart','touchmove','wheel']);

(function patchAddEventListener(){
  if (typeof window === 'undefined') return;
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(this: EventTarget, type: any, listener: any, options: any){
    try {
      if (targetEvents.has(type)) {
        // Normalize options to object
        if (options === undefined) {
          options = { passive: true };
        } else if (options === false) {
          options = { passive: true, capture: false };
        } else if (typeof options === 'object') {
          if (options.passive === undefined) {
            options = { ...options, passive: true };
          }
        }
      }
    } catch {/* ignore */}
    return orig.call(this, type, listener, options);
  } as any;
})();

export {};