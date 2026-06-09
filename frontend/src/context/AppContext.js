import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('wc_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // Re-fetch user from DB on load to keep is_commissioner and other fields in sync
  useEffect(() => {
    const stored = localStorage.getItem('wc_user');
    if (!stored) return;
    let parsed;
    try { parsed = JSON.parse(stored); } catch { return; }
    if (!parsed?.id) return;

    api.getUser(parsed.id).then(data => {
      if (data?.id) {
        setUser(data);
        localStorage.setItem('wc_user', JSON.stringify(data));
      } else {
        // ID no longer exists in DB (e.g. after a reset) — clear so user re-registers
        setUser(null);
        localStorage.removeItem('wc_user');
      }
    }).catch(() => {});
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('wc_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wc_user');
  };

  return (
    <AppContext.Provider value={{ user, login, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
