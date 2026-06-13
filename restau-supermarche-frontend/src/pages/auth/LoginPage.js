import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authAPI } from '../../services/api';
import { Btn } from '../../components/ui';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', motDePasse: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      login(res.data);
      show('Connexion réussie. Bienvenue !', 'success');
      const { role } = res.data;
      navigate(role === 'cuisine' ? '/cuisine' : role === 'admin' ? '/admin' : '/restaurant');
    } catch (err) {
      show(err.response?.data?.error || 'Identifiants invalides', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--night)' }}>
      {/* Left branding — hidden on mobile */}
      <div className="auth-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3.5rem', background: 'var(--surface)', borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: 480, height: 480, borderRadius: '50%', background: 'var(--gold-dim)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: 320, height: 320, borderRadius: '50%', background: 'var(--emerald-dim)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '3.5rem' }}>
            <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="#0A0F1E" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem' }}>MenuScan</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Plateforme F&B Guinée</div>
            </div>
          </div>

          <h1 style={{ fontSize: '2.6rem', lineHeight: 1.12, marginBottom: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            Restaurant &<br />
            <span style={{ color: 'var(--gold)' }}>Supermarché</span><br />
            intelligents.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 360, marginBottom: '2.5rem' }}>
            Commandez, payez par Mobile Money, suivez votre commande en temps réel.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
            {[
              { emoji: '🍽️', label: 'Menu Digital', sub: 'Restaurant smart' },
              { emoji: '📦', label: 'Scan & Go', sub: 'Supermarché rapide' },
              { emoji: '📱', label: 'Mobile Money', sub: 'Orange · MTN · Moov' },
            ].map(({ emoji, label, sub }) => (
              <div key={label} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem 0.875rem' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{emoji}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-right" style={{ width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem' }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp .5s ease' }}>

          {/* Logo mobile uniquement */}
          <div className="auth-logo-mobile" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={26} color="#0A0F1E" strokeWidth={2.5} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>MenuScan</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Plateforme F&B Guinée</div>
          </div>

          <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.4rem', textAlign: 'center' }}>Connexion</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem', textAlign: 'center' }}>
            Pas de compte ?{' '}
            <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Créer un compte</Link>
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Adresse e-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="email" placeholder="vous@exemple.com" style={{ paddingLeft: '2.4rem' }} value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" style={{ paddingLeft: '2.4rem', paddingRight: '3rem' }} value={form.motDePasse} onChange={e => set('motDePasse', e.target.value)} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', lineHeight: 0 }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Btn type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Btn>
          </form>

          {/* Demo creds */}
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, textAlign: 'center' }}>Comptes de démonstration</p>
            {[
              { role: 'Admin', email: 'admin@menuscan.com', color: 'var(--emerald)' },
              { role: 'Cuisine', email: 'cuisine@menuscan.com', color: 'var(--gold)' },
              { role: 'Client', email: 'client@menuscan.com', color: 'var(--sky)' },
            ].map(({ role, email, color }) => (
              <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.76rem', color, fontWeight: 700, flexShrink: 0 }}>{role}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', textAlign: 'center' }}>
              Mot de passe : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>password123</span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-right { width: 100% !important; padding: 1.5rem 1.25rem !important; align-items: flex-start !important; padding-top: 2.5rem !important; }
          .auth-logo-mobile { display: flex !important; }
        }
        @media (max-width: 480px) {
          .auth-right { padding: 1.25rem 1rem 2rem !important; }
        }
      `}</style>
    </div>
  );
}
