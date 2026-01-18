//Initial Setup
/*
cd backend
npm init -y
npm i express socket.io cors nanoid
node server.js
Important LAN note: your phone must connect to the server using http://<LAN-IP>:3000 
(like http://192.168.1.25:3000). The server binds 0.0.0.0 so other devices can reach it.
*/

import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

/**
 * In-memory state (prototype)
 * waitingQueue: FIFO sockets waiting for a 1v1 match
 * matches: matchId -> match object (authoritative rep counts)
 */
const waitingQueue = []; // [{ socketId, playerId }]
const matches = new Map();

/**
 * Create a match with two players and put them in a Socket.IO room == matchId
 */
function createMatch(p1, p2, durationMs = 60000) {
  const matchId = nanoid(10);

  const startAt = Date.now() + 2000; // 2s countdown
  const endAt = startAt + durationMs;

  const match = {
    matchId,
    status: "active",
    startAt,
    endAt,
    players: {
      A: { socketId: p1.socketId, playerId: p1.playerId, repCount: 0, repIndexNext: 0 },
      B: { socketId: p2.socketId, playerId: p2.playerId, repCount: 0, repIndexNext: 0 },
    },
  };

  matches.set(matchId, match);

  // Put both sockets into the same room (the match room)
  io.sockets.sockets.get(p1.socketId)?.join(matchId);
  io.sockets.sockets.get(p2.socketId)?.join(matchId);

  // Tell both clients match was found
  io.to(matchId).emit("match:found", {
    matchId,
    startAt,
    durationSec: durationMs / 1000,
    players: {
      A: match.players.A.playerId,
      B: match.players.B.playerId,
    },
  });

  // Start event at startAt
  setTimeout(() => {
    const m = matches.get(matchId);
    if (!m || m.status !== "active") return;
    io.to(matchId).emit("match:start", { matchId, startAt: m.startAt });
  }, Math.max(0, startAt - Date.now()));

  // End event at endAt
  setTimeout(() => {
    const m = matches.get(matchId);
    if (!m || m.status !== "active") return;
    m.status = "ended";
    io.to(matchId).emit("match:end", { matchId, endAt: m.endAt });
  }, Math.max(0, endAt - Date.now()));

  return match;
}

/**
 * Remove a socket from waitingQueue
 */
function removeFromQueue(socketId) {
  const idx = waitingQueue.findIndex((x) => x.socketId === socketId);
  if (idx !== -1) waitingQueue.splice(idx, 1);
}

/**
 * Find match role by playerId
 */
function getRole(match, playerId) {
  if (match.players.A.playerId === playerId) return "A";
  if (match.players.B.playerId === playerId) return "B";
  return null;
}

io.on("connection", (socket) => {
  socket.on("queue:join", ({ playerId }) => {
    if (!playerId) return socket.emit("error", { message: "Missing playerId" });

    // Avoid duplicates if client reconnects
    removeFromQueue(socket.id);
    for (let i = waitingQueue.length - 1; i >= 0; i--) {
      if (waitingQueue[i].playerId === playerId) waitingQueue.splice(i, 1);
    }

    if (waitingQueue.length === 0) {
      waitingQueue.push({ socketId: socket.id, playerId });
      socket.emit("queue:status", { status: "waiting" });
    } else {
      const p1 = waitingQueue.shift();
      const p2 = { socketId: socket.id, playerId };
      createMatch(p1, p2);
    }
  });

  socket.on("queue:leave", () => {
    removeFromQueue(socket.id);
    socket.emit("queue:status", { status: "idle" });
  });

  /**
   * Live counter event (authoritative)
   * Client sends repIndex (0,1,2...) when a rep completes.
   */
  socket.on("rep:done", ({ matchId, playerId, repIndex }) => {
    const match = matches.get(matchId);
    if (!match || match.status !== "active") return;

    const role = getRole(match, playerId);
    if (!role) return;

    const p = match.players[role];

    // Must be the same socket that joined match
    if (p.socketId !== socket.id) return;

    // Enforce ordering to prevent spam/cheat
    if (repIndex !== p.repIndexNext) return;

    p.repCount += 1;
    p.repIndexNext += 1;

    io.to(matchId).emit("match:update", {
      matchId,
      repCountA: match.players.A.repCount,
      repCountB: match.players.B.repCount,
      players: { A: match.players.A.playerId, B: match.players.B.playerId },
    });
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket.id);

    // Prototype behavior: if someone disconnects, end their match (optional).
    // You can improve this later with reconnect logic.
    for (const [matchId, match] of matches.entries()) {
      if (match.status !== "active") continue;
      const a = match.players.A.socketId;
      const b = match.players.B.socketId;
      if (a === socket.id || b === socket.id) {
        match.status = "ended";
        io.to(matchId).emit("match:end", { matchId, endAt: Date.now(), reason: "disconnect" });
      }
    }
  });
});

// Basic health check
app.get("/", (req, res) => res.json({ ok: true }));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] listening on http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] On LAN, connect to: http://<YOUR_SERVER_LAN_IP>:${PORT}`);
});
