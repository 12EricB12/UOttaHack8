export const EVENTS = {
  CONNECTED: "connected",

  QUEUE_JOIN: "queue:join",
  QUEUE_LEAVE: "queue:leave",
  QUEUE_WAITING: "queue:waiting",
  QUEUE_LEFT: "queue:left",

  MATCH_FOUND: "match:found",
  MATCH_SCOREBOARD: "match:scoreboard",
  MATCH_ENDED: "match:ended",
  MATCH_ERROR: "match:error",

  MATCH_REP_SCORED: "match:repScored"
};

export const DEFAULT_RULES = {
  targetReps: 10,
  maxRepScore: 10,
  minRepIntervalMs: 400 // anti-spam
};
