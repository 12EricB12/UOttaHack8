// SLOT: Replace with real knee-angle / hip-height logic.
// This demo completes a rep every ~2 seconds.

export function createSquatRepDetector() {
  let last = Date.now();
  let repIndex = -1;

  return {
    update(_pose) {
      const now = Date.now();
      if (now - last > 2000) {
        last = now;
        repIndex += 1;
        return { type: "REP_COMPLETE", repIndex };
      }
      return null;
    }
  };
}
