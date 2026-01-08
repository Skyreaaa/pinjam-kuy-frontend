// src/services/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(userId: number, role: string) {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit('join', { userId, role });
  }
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}
