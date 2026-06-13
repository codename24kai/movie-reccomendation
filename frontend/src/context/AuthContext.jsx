/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    console.log("DEBUG: Mencoba membaca Local Storage...");
    console.log("Token ditemukan:", savedToken);
    return savedToken;
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    console.log("User ditemukan:", savedUser);
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch (e) {
      console.error("DEBUG: Gagal parsing user JSON", e);
      return null;
    }
  });
  const loading = false;

  const login = (userData, userToken) => {
    console.log("DEBUG: Fungsi login dipanggil");
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};