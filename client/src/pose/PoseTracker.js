// SLOT: Replace with real camera + pose model.
// This demo tracker just emits fake poses at ~30 FPS.

export function createPoseTracker() {
  let cb = null;
  let timer = null;

  return {
    onPose(fn) {
      cb = fn;
    },
    async start() {
      timer = setInterval(() => {
        cb?.({ points: [{ x: Math.random(), y: Math.random() }] });
      }, 33);
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}
