import { io } from 'socket.io-client';
import useAuthStore from '../stores/authStore.js';

let _socket = null;

export function getSocket() {
  if (_socket?.connected) return _socket;

  const token = useAuthStore.getState().token;
  const SERVER = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000';

  _socket = io(SERVER, {
    auth:              { token },
    transports:        ['websocket'],
    reconnectionDelay: 1000,
    autoConnect:       true,
  });

  return _socket;
}

export function disconnectSocket() {
  if (_socket) { _socket.disconnect(); _socket = null; }
}
