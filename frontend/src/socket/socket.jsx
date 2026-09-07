import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { TOKEN_KEY } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SocketContext = createContext({ socket: null, connected: false });

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }
    const s = io('/', { auth: { token: localStorage.getItem(TOKEN_KEY) } });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const joinConversation = (conversationId) => socket?.emit('conversation:join', conversationId);
  const leaveConversation = (conversationId) => socket?.emit('conversation:leave', conversationId);
  const typing = (conversationId, isTyping) =>
    socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });

  return (
    <SocketContext.Provider value={{ socket, connected, joinConversation, leaveConversation, typing }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

/** Subscribe to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (payload) => saved.current(payload);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
