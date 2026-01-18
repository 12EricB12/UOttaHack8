// SLOT: Replace with your real model/logic.
export async function gradeRep({ exerciseId, repKeyframes, features }) {
  let score = 7.0;

  if (features?.depthRatio != null) {
    const d = Number(features.depthRatio);
    if (d >= 0.9) score += 2.0;
    else if (d >= 0.75) score += 1.0;
    else score -= 1.0;
  }

  if (features?.tempoMs != null) {
    const t = Number(features.tempoMs);
    if (t < 400) score -= 0.5;
    if (t > 2500) score -= 0.5;
  }

  score = Math.max(0, Math.min(10, score));

  return {
    repScore: Number(score.toFixed(2)),
    confidence: 0.8,
    feedback: [
      `Exercise: ${exerciseId}`,
      `Frames: ${repKeyframes.length}`,
      "SLOT: add feedback rules"
    ]
  };
}
