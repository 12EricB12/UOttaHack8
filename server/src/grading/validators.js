export function validateGradeRepRequest(body) {
  if (!body) return { ok: false, message: "Missing body" };
  const { matchId, playerId, exerciseId, repIndex, repKeyframes } = body;

  if (!matchId || !playerId || !exerciseId) {
    return { ok: false, message: "matchId/playerId/exerciseId required" };
  }
  if (typeof repIndex !== "number" || repIndex < 0) {
    return { ok: false, message: "repIndex must be >= 0" };
  }
  if (!Array.isArray(repKeyframes) || repKeyframes.length < 3) {
    return { ok: false, message: "repKeyframes must be array length >= 3" };
  }
  return { ok: true };
}
