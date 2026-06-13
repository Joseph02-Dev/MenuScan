import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const icons = { success: CheckCircle, error: XCircle, info: Info };
  const colors = {
    success: { bg: 'var(--emerald-dim)', border: 'rgba(16,185,129,0.35)', icon: 'var(--emerald)' },
    error: { bg: 'var(--crimson-dim)', border: 'rgba(239,68,68,0.35)', icon: 'var(--crimson)' },
    info: { bg: 'var(--sky-dim)', border: 'rgba(56,189,248,0.35)', icon: 'var(--sky)' },
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {toasts.map(({ id, message, type }) => {
          const c = colors[type] || colors.info;
          const Icon = icons[type] || Info;
          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              background: 'var(--surface-raised)', border: `1px solid ${c.border}`,
              borderRadius: 'var(--radius-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'slideIn .3s ease', maxWidth: 380, minWidth: 280,
            }}>
              <Icon size={18} color={c.icon} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{message}</span>
              <button onClick={() => remove(id)} style={{ color: 'var(--text-muted)', padding: 2, lineHeight: 0 }}><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
