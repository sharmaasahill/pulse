import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/ws', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function joinProject(projectId: string, userId?: string) {
  const socket = getSocket();
  
  // Ensure socket is connected before joining
  if (socket.connected) {
    socket.emit('join', { projectId, userId });
  } else {
    socket.on('connect', () => {
      socket.emit('join', { projectId, userId });
    });
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}


