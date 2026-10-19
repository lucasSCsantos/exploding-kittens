// navigator.vibrate haptics (ticket 15). Most desktop browsers and iOS Safari have no Vibration
// API at all, so every call must degrade to a silent no-op rather than throw.

/** Vibrates `pattern` (ms on, [on, off, on, ...], etc.), degrading to a no-op where unsupported. */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate(pattern);
  } catch {
    // Vibration unsupported or blocked — the game must keep working without haptics.
  }
}
