import { io } from "socket.io-client";
import { EVENTS } from "../../../shared/protocol.js";

export function createMatchSocket({ serverUrl, playerId, handlers }) {
  const socket = io(serverUrl, { transports: ["websocket"], auth: { playerId } });

  socket.on(EVENTS.CONNECTED, (d) => handlers?.connected?.(d));
  socket.on(EVENTS.QUEUE_WAITING, (d) => handlers?.queueWaiting?.(d));
  socket.on(EVENTS.MATCH_FOUND, (d) => handlers?.matchFound?.(d));
  socket.on(EVENTS.MATCH_SCOREBOARD, (d) => handlers?.scoreboard?.(d));
  socket.on(EVENTS.MATCH_ENDED, (d) => handlers?.matchEnded?.(d));
  socket.on(EVENTS.MATCH_ERROR, (d) => handlers?.matchError?.(d));

  return {
    socket,
    queueJoin: (exerciseId = "squat") => socket.emit(EVENTS.QUEUE_JOIN, { mode: "1v1", exerciseId }),
    queueLeave: () => socket.emit(EVENTS.QUEUE_LEAVE),
    sendRepScore: ({ matchId, repIndex, repScore, repCount }) =>
      socket.emit(EVENTS.MATCH_REP_SCORED, { matchId, repIndex, repScore, repCount, clientTs: Date.now() })
  };
}
