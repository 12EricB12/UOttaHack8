import { Server } from "socket.io";
import { Queue } from "./match/queue.js";
import { MatchManager } from "./match/matchManager.js";
import { EVENTS } from "../../shared/protocol.js";

export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } });
  const queue = new Queue();
  const matchManager = new MatchManager(io);

  io.on("connection", (socket) => {
    // Prototype auth: use handshake auth playerId if provided.
    const playerId = socket.handshake.auth?.playerId || socket.id;
    socket.data.playerId = playerId;

    socket.emit(EVENTS.CONNECTED, { playerId });

    socket.on(EVENTS.QUEUE_JOIN, (payload = {}) => {
      const exerciseId = payload.exerciseId || "squat";

      if (queue.isQueued(playerId)) return;

      const waiting = queue.popWaiting();
      if (!waiting) {
        queue.addWaiting({ playerId, socketId: socket.id, exerciseId });
        socket.emit(EVENTS.QUEUE_WAITING, { position: queue.size() });
        return;
      }

      const oppSocket = io.sockets.sockets.get(waiting.socketId);
      if (!oppSocket) {
        queue.addWaiting({ playerId, socketId: socket.id, exerciseId });
        socket.emit(EVENTS.QUEUE_WAITING, { position: queue.size() });
        return;
      }

      const match = matchManager.createMatch({
        playerA: waiting.playerId,
        playerB: playerId,
        exerciseId
      });

      oppSocket.join(match.matchId);
      socket.join(match.matchId);

      io.to(match.matchId).emit(EVENTS.MATCH_FOUND, {
        matchId: match.matchId,
        players: match.players,
        exerciseId: match.exerciseId,
        rules: match.rules
      });

      matchManager.startMatch(match.matchId);
    });

    socket.on(EVENTS.QUEUE_LEAVE, () => {
      queue.remove(playerId);
      socket.emit(EVENTS.QUEUE_LEFT, {});
    });

    socket.on(EVENTS.MATCH_REP_SCORED, (payload) => {
      const res = matchManager.applyRepScore(playerId, payload);
      if (!res.ok) socket.emit(EVENTS.MATCH_ERROR, { message: res.message });
    });

    socket.on("disconnect", () => {
      queue.remove(playerId);
      matchManager.handleDisconnect(playerId);
    });
  });

  return io;
}
