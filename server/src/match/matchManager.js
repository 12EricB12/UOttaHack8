import { makeId } from "../utils/ids.js";
import { EVENTS, DEFAULT_RULES } from "../../../shared/protocol.js";

export class MatchManager {
  constructor(io) {
    this.io = io;
    this.matches = new Map();        // matchId -> match
    this.playerToMatch = new Map();  // playerId -> matchId
  }

  createMatch({ playerA, playerB, exerciseId }) {
    const matchId = makeId("match");

    const match = {
      matchId,
      exerciseId,
      players: [playerA, playerB],
      status: "found", // found | live | ended
      rules: { ...DEFAULT_RULES },
      totalScores: { [playerA]: 0, [playerB]: 0 },
      repCounts: { [playerA]: 0, [playerB]: 0 },
      lastRepIndex: { [playerA]: -1, [playerB]: -1 },
      lastClientTs: { [playerA]: 0, [playerB]: 0 }
    };

    this.matches.set(matchId, match);
    this.playerToMatch.set(playerA, matchId);
    this.playerToMatch.set(playerB, matchId);
    return match;
  }

  startMatch(matchId) {
    const m = this.matches.get(matchId);
    if (!m) return;
    m.status = "live";
    this.broadcastScoreboard(m);
  }

  applyRepScore(playerId, payload) {
    const { matchId, repIndex, repScore, repCount, clientTs } = payload || {};
    if (!matchId) return { ok: false, message: "Missing matchId" };

    const m = this.matches.get(matchId);
    if (!m) return { ok: false, message: "Match not found" };
    if (m.status !== "live") return { ok: false, message: "Match not live" };
    if (!m.players.includes(playerId)) return { ok: false, message: "Not in match" };

    if (typeof repIndex !== "number" || repIndex < 0) return { ok: false, message: "Invalid repIndex" };
    if (repIndex <= m.lastRepIndex[playerId]) return { ok: false, message: "Out of order repIndex" };

    const score = Number(repScore);
    if (!Number.isFinite(score) || score < 0 || score > m.rules.maxRepScore) {
      return { ok: false, message: "Invalid repScore" };
    }

    const ts = typeof clientTs === "number" ? clientTs : Date.now();
    const dt = ts - m.lastClientTs[playerId];
    if (dt > 0 && dt < m.rules.minRepIntervalMs) {
      return { ok: false, message: "Too frequent rep scoring" };
    }
    m.lastClientTs[playerId] = ts;

    m.lastRepIndex[playerId] = repIndex;
    m.totalScores[playerId] += score;

    if (typeof repCount === "number" && repCount >= m.repCounts[playerId]) {
      m.repCounts[playerId] = repCount;
    } else {
      m.repCounts[playerId] = Math.max(m.repCounts[playerId], repIndex + 1);
    }

    this.broadcastScoreboard(m);

    const allReached = m.players.every((p) => m.repCounts[p] >= m.rules.targetReps);
    if (allReached) this.endMatch(matchId, "target_reps_reached");

    return { ok: true };
  }

  broadcastScoreboard(m) {
    this.io.to(m.matchId).emit(EVENTS.MATCH_SCOREBOARD, {
      matchId: m.matchId,
      status: m.status,
      scores: m.totalScores,
      repCounts: m.repCounts,
      serverTs: Date.now()
    });
  }

  endMatch(matchId, reason) {
    const m = this.matches.get(matchId);
    if (!m || m.status === "ended") return;
    m.status = "ended";

    const [a, b] = m.players;
    const aScore = m.totalScores[a];
    const bScore = m.totalScores[b];

    let winnerId = null;
    if (aScore > bScore) winnerId = a;
    else if (bScore > aScore) winnerId = b;

    this.io.to(matchId).emit(EVENTS.MATCH_ENDED, {
      matchId,
      reason,
      winnerId,
      finalScores: m.totalScores,
      finalRepCounts: m.repCounts
    });

    m.players.forEach((p) => this.playerToMatch.delete(p));
  }

  handleDisconnect(playerId) {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return;
    const m = this.matches.get(matchId);
    if (!m || m.status === "ended") return;

    const opponent = m.players.find((p) => p !== playerId) ?? null;
    m.status = "ended";

    this.io.to(matchId).emit(EVENTS.MATCH_ENDED, {
      matchId,
      reason: "disconnect",
      winnerId: opponent,
      finalScores: m.totalScores,
      finalRepCounts: m.repCounts
    });

    m.players.forEach((p) => this.playerToMatch.delete(p));
  }
}
