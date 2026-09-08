import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSocket, type AppSocket } from '@/lib/socket';
import type { ConnectionStatus } from '@/types/chat';

interface SocketContextValue {
  socket: AppSocket;
  status: ConnectionStatus;
}

const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * Owns the socket connection for the RoomPage subtree: connects on mount,
 * disconnects on unmount, and tracks a small connection-status state machine
 * that ConnectionBanner / MessageInput use to react to drops and reconnects.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const socket = getSocket();
  const [status, setStatus] = useState<ConnectionStatus>(socket.connected ? 'online' : 'connecting');

  useEffect(() => {
    if (!socket.connected) {
      setStatus('connecting');
      socket.connect();
    } else {
      setStatus('online');
    }

    const handleConnect = () => setStatus('online');
    const handleDisconnect = () => setStatus('offline');
    const handleReconnectAttempt = () => setStatus('reconnecting');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SocketContext.Provider value={{ socket, status }}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
