import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { getSocket, type AppSocket } from '@/lib/socket';

interface SocketContextValue {
  socket: AppSocket;
}

const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * Owns the socket connection for the RoomPage subtree: connects on mount,
 * disconnects on unmount.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const socket = getSocket();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
