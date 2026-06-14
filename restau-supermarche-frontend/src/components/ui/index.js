import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X, ScanLine, Camera } from 'lucide-react';

/* ── Button ── */
export const Btn = ({ children, variant = 'primary', size = 'md', loading, icon: Icon, style: extraStyle = {}, ...props }) => {
  const sizes = {
    sm: { padding: '0.45rem 0.9rem', fontSize: '0.8rem' },
    md: { padding: '0.7rem 1.4rem', fontSize: '0.88rem' },
    lg: { padding: '0.9rem 1.9rem', fontSize: '0.95rem' },
    icon: { padding: '0.65rem', fontSize: '0.88rem' },
  };
  const variants = {
    primary: { background: 'var(--gold)', color: 'var(--night)', borderColor: 'var(--gold)', fontWeight: 600 },
    secondary: { background: 'var(--surface-raised)', color: 'var(--text-primary)', borderColor: 'var(--border-strong)', fontWeight: 500 },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', borderColor: 'transparent', fontWeight: 500 },
    danger: { background: 'var(--crimson-dim)', color: 'var(--crimson)', borderColor: 'rgba(239,68,68,0.35)', fontWeight: 500 },
    success: { background: 'var(--emerald-dim)', color: 'var(--emerald)', borderColor: 'rgba(16,185,129,0.35)', fontWeight: 500 },
    outline: { background: 'transparent', color: 'var(--gold)', borderColor: 'var(--gold)', fontWeight: 500 },
    violet: { background: 'var(--violet-dim)', color: 'var(--violet)', borderColor: 'rgba(167,139,250,0.35)', fontWeight: 500 },
  };
  return (
    <button
      disabled={loading || props.disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
        fontFamily: 'var(--font-body)', borderRadius: 'var(--radius-md)', border: '1px solid transparent',
        cursor: (loading || props.disabled) ? 'not-allowed' : 'pointer',
        opacity: (loading || props.disabled) ? 0.6 : 1,
        transition: 'all var(--transition)', whiteSpace: 'nowrap',
        ...sizes[size], ...variants[variant], ...extraStyle,
      }}
      {...props}
    >
      {loading
        ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
        : Icon && <Icon size={15} />}
      {children}
    </button>
  );
};

/* ── Badge ── */
export const Badge = ({ children, variant = 'default' }) => {
  const c = {
    default: { bg: 'var(--surface-raised)', color: 'var(--text-secondary)', border: 'var(--border)' },
    gold: { bg: 'var(--gold-dim)', color: 'var(--gold)', border: 'rgba(245,166,35,0.3)' },
    green: { bg: 'var(--emerald-dim)', color: 'var(--emerald)', border: 'rgba(16,185,129,0.3)' },
    red: { bg: 'var(--crimson-dim)', color: 'var(--crimson)', border: 'rgba(239,68,68,0.3)' },
    blue: { bg: 'var(--sky-dim)', color: 'var(--sky)', border: 'rgba(56,189,248,0.3)' },
    violet: { bg: 'var(--violet-dim)', color: 'var(--violet)', border: 'rgba(167,139,250,0.3)' },
  }[variant] || { bg: 'var(--surface-raised)', color: 'var(--text-secondary)', border: 'var(--border)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.2rem 0.65rem', fontSize: '0.7rem', fontWeight: 700,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      borderRadius: '100px', border: `1px solid ${c.border}`,
      background: c.bg, color: c.color,
    }}>
      {children}
    </span>
  );
};

/* ── Spinner ── */
export const Spinner = ({ size = 28 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
    <Loader2 size={size} style={{ animation: 'spin 1s linear infinite', color: 'var(--gold)' }} />
  </div>
);

/* ── Card ── */
export const Card = ({ children, style = {}, onClick, glow }) => (
  <div
    onClick={onClick}
    style={{
      background: 'var(--surface-raised)',
      border: `1px solid ${glow ? 'rgba(245,166,35,0.35)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      transition: 'all var(--transition)',
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: glow ? '0 0 20px rgba(245,166,35,0.08)' : 'none',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ── Form Input ── */
export const FormInput = ({ label, error, icon: Icon, hint, ...props }) => (
  <div style={{ marginBottom: '1.1rem' }}>
    {label && (
      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>
        {label}
      </label>
    )}
    <div style={{ position: 'relative' }}>
      {Icon && <Icon size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />}
      <input style={{ paddingLeft: Icon ? '2.4rem' : '0.875rem' }} {...props} />
    </div>
    {hint && !error && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{hint}</p>}
    {error && <p style={{ fontSize: '0.75rem', color: 'var(--crimson)', marginTop: '0.3rem' }}>{error}</p>}
  </div>
);

/* ── Form Select ── */
export const FormSelect = ({ label, children, ...props }) => (
  <div style={{ marginBottom: '1.1rem' }}>
    {label && <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>{label}</label>}
    <select {...props}>{children}</select>
  </div>
);

/* ── Stat Card ── */
export const StatCard = ({ label, value, icon: Icon, color = 'var(--gold)', sub }) => (
  <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      {Icon && <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={color} /></div>}
    </div>
    <div style={{ fontSize: '1.9rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{sub}</div>}
  </div>
);

/* ── Empty State ── */
export const EmptyState = ({ icon: Icon, title, desc, action }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', textAlign: 'center', gap: '1rem' }}>
    {Icon && (
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={26} color="var(--gold)" />
      </div>
    )}
    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{title}</h3>
    {desc && <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: 300 }}>{desc}</p>}
    {action}
  </div>
);

/* ── Modal ── */
export const Modal = ({ open, onClose, title, children, width = 480 }) => {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div
        className="modal-box"
        style={{
          position: 'relative', zIndex: 1, background: 'var(--surface-raised)',
          border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xl)',
          padding: '2rem', width: '100%', maxWidth: width,
          animation: 'scaleIn .25s ease', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{title}</h3>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4, lineHeight: 0, borderRadius: 'var(--radius-sm)', transition: 'all var(--transition)' }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

/* ── Page Header ── */
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>{title}</h1>
      {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

/* ── Camera Scanner ──
   Utilise l'input fichier natif (capture="environment") au lieu du stream WebRTC.
   Fonctionne sur HTTP local sans HTTPS, sur Android et iOS. */
export const CameraScanner = ({ open, onScan, onClose, mode = 'barcode' }) => {
  const [status, setStatus] = useState('idle'); // idle | decoding | error
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);
  const divId = useRef('csd-' + Math.random().toString(36).slice(2, 9)).current;

  // Déclenche automatiquement l'ouverture de la caméra native dès que open devient true
  useEffect(() => {
    if (open) {
      setStatus('idle');
      setErrorMsg('');
      setTimeout(() => fileInputRef.current?.click(), 60);
    }
  }, [open]);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { onClose(); return; }

    setStatus('decoding');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qr = new Html5Qrcode(divId, { verbose: false });
      const decoded = await qr.scanFile(file, false);
      qr.clear();
      onScan(decoded);
      onClose();
    } catch {
      setStatus('error');
      setErrorMsg('Code non reconnu. Rapprochez-vous, assurez une bonne lumière et réessayez.');
    }
    e.target.value = '';
  };

  return (
    <>
      {/* Div caché requis par html5-qrcode pour le décodage fichier */}
      <div id={divId} style={{ display: 'none' }} />

      {/* Input fichier qui ouvre la caméra native du téléphone */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCapture}
      />

      {/* Overlay affiché pendant le traitement */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,15,30,0.97)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', animation: 'fadeUp 0.2s ease',
        }}>
          {status === 'idle' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gold-dim)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Camera size={32} color="var(--gold)" />
              </div>
              <p style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>
                {mode === 'qrcode' ? 'Ouverture de la caméra…' : 'Ouverture de la caméra…'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginBottom: '2rem' }}>
                {mode === 'qrcode' ? 'Pointez vers le QR Code et prenez la photo' : 'Pointez vers le code-barres et prenez la photo'}
              </p>
              <button
                onClick={onClose}
                style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Annuler — saisir manuellement
              </button>
            </div>
          )}

          {status === 'decoding' && (
            <div style={{ textAlign: 'center' }}>
              <Loader2 size={44} color="var(--gold)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
              <p style={{ color: '#F1F5F9', fontWeight: 600 }}>Décodage en cours…</p>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', maxWidth: 320 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
              <p style={{ color: '#FCA5A5', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
                {errorMsg}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => { setStatus('idle'); setTimeout(() => fileInputRef.current?.click(), 60); }}
                  style={{ padding: '0.9rem', background: 'var(--gold)', color: '#0A0F1E', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: 'none' }}
                >
                  Réessayer
                </button>
                <button
                  onClick={() => { setStatus('idle'); onClose(); }}
                  style={{ padding: '0.9rem', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', cursor: 'pointer', border: 'none' }}
                >
                  Saisir manuellement
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
