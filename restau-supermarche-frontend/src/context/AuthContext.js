import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Extrait l'id depuis le payload JWT (base64) — pas besoin de lib externe
const idFromToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1])).id || null;
  } catch { return null; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ms_token');
    const role = localStorage.getItem('ms_role');
    const nom = localStorage.getItem('ms_nom');
    // Priorité : ms_id stocké → sinon on décode le JWT
    const id = localStorage.getItem('ms_id') || (token ? idFromToken(token) : null);
    if (token && role) setUser({ token, role, nom, id });
    setLoading(false);
  }, []);

  const login = ({ token, role, nom, id }) => {
    const resolvedId = id ? String(id) : idFromToken(token);
    localStorage.setItem('ms_token', token);
    localStorage.setItem('ms_role', role);
    localStorage.setItem('ms_nom', nom);
    if (resolvedId) localStorage.setItem('ms_id', resolvedId);
    setUser({ token, role, nom, id: resolvedId });
  };

  const logout = () => {
    localStorage.removeItem('ms_token');
    localStorage.removeItem('ms_role');
    localStorage.removeItem('ms_nom');
    localStorage.removeItem('ms_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
