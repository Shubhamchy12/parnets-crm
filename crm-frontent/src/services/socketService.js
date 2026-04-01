import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://parnetscrm.onrender.com';

let socket = null;

export const socketService = {
  connect: (token) => {
    socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    return socket;
  },
  disconnect: () => {
    if (socket) { socket.disconnect(); socket = null; }
  },
  on: (event, cb) => socket?.on(event, cb),
  off: (event, cb) => socket?.off(event, cb),
  emit: (event, data) => socket?.emit(event, data),
  getSocket: () => socket,
};
