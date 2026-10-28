import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (user) => {
  if (!socket) {
    const defaultSocket = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'http://127.0.0.1:5000';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin || defaultSocket;
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to EduRetain real-time server:', socket.id);
      if (user) {
        if (user.role === 'mentor') {
          socket.emit('join-mentor', user.id);
        } else if (user.role === 'admin') {
          socket.emit('join-admin');
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
