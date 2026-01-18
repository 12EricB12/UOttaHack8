export function createRepRecorder({ maxFrames = 10 } = {}) {
  let frames = [];
  let repStartTs = null;

  return {
    startRep() {
      frames = [];
      repStartTs = Date.now();
    },
    pushFrame(pose) {
      frames.push({ t: Date.now(), pose });
      if (frames.length > maxFrames) frames.shift();
    },
    endRep() {
      const tempoMs = repStartTs ? Date.now() - repStartTs : null;

      // SLOT: compute real features from frames
      const features = {
        tempoMs,
        depthRatio: 0.8 + Math.random() * 0.2 // demo only
      };

      return { repKeyframes: frames.slice(), features };
    }
  };
}
