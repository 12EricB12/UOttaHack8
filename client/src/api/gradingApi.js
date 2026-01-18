export async function gradeRep({ baseUrl, matchId, playerId, exerciseId, repIndex, repKeyframes, features }) {
  const res = await fetch(`${baseUrl}/api/gradeRep`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId, playerId, exerciseId, repIndex, repKeyframes, features })
  });

  if (!res.ok) throw new Error(`gradeRep failed: ${res.status}`);
  return res.json();
}
