import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(serverUrl: string) {
  if (socket && socket.connected) return socket;

  socket = io(serverUrl, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: true,
    timeout: 10000,
  });

  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not connected. Call connectSocket() first.");
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
