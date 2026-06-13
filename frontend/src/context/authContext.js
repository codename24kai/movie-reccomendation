import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: false,
  login: () => {},
  logout: () => {},
});

export { AuthProvider } from './AuthContext.jsx';
