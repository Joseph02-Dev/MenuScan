import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ms_token');
    const role = localStorage.getItem('ms_role');
    const nom = localStorage.getItem('ms_nom');
    if (token && role) setUser({ token, role, nom });
    setLoading(false);
  }, []);

  const login = ({ token, role, nom }) => {
    localStorage.setItem('ms_token', token);
    localStorage.setItem('ms_role', role);
    localStorage.setItem('ms_nom', nom);
    setUser({ token, role, nom });
  };

  const logout = () => {
    localStorage.removeItem('ms_token');
    localStorage.removeItem('ms_role');
    localStorage.removeItem('ms_nom');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
