import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/api";

let socketInstance: Socket | null = null;
let currentToken: string | null = null;

export function getOrCreateSocket(token: string): Socket {
  if (socketInstance && currentToken === token) {
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  currentToken = token;
  socketInstance = io(API_BASE_URL, {
    transports: ["websocket"],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}

export function getSocket(): Socket | null {
  return socketInstance;
}

export type ChatSocket = Socket;
