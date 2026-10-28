import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getSocket } from '../services/socket';
import api from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAlert, setLatestAlert] = useState(null);

  useEffect(() => {
    if (user && (user.role === 'mentor' || user.role === 'admin')) {
      // Fetch initial unread count
      api.get('/alerts?limit=1')
        .then((res) => {
          if (res.data.success) {
            setUnreadCount(res.data.unreadCount || 0);
          }
        })
        .catch(() => {});

      const socket = getSocket();
      if (socket) {
        const handleNewAlert = (data) => {
          setUnreadCount((prev) => prev + 1);
          setLatestAlert(data.alert);
        };

        socket.on('new-alert', handleNewAlert);
        return () => {
          socket.off('new-alert', handleNewAlert);
        };
      }
    }
  }, [user]);

  const clearLatestAlert = () => setLatestAlert(null);
  const decrementUnread = (count = 1) => setUnreadCount((prev) => Math.max(0, prev - count));
  const resetUnread = () => setUnreadCount(0);

  return (
    <SocketContext.Provider
      value={{
        unreadCount,
        latestAlert,
        clearLatestAlert,
        decrementUnread,
        resetUnread,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketAlerts = () => useContext(SocketContext);
