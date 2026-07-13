import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/api";

let socketInstance: Socket | null = null;

export function getOrCreateSocket(token: string): Socket {
  if (socketInstance?.connected) return socketInstance;

  socketInstance = io(API_BASE_URL, {
    transports: ["websocket"],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function getSocket(): Socket | null {
  return socketInstance;
}

export type ChatSocket = Socket;
