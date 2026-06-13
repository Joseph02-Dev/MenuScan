import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Zap } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { authAPI } from '../../services/api';
import { Btn } from '../../components/ui';

export default function RegisterPage() {
  const [form, setForm] = useState({ nom: '', email: '', motDePasse: '', role: 'client' });
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const navigate = useNavigate();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.register(form);
      show('Compte créé ! Connectez-vous.', 'success');
      navigate('/login');
    } catch (err) {
      show(err.response?.data?.error || 'Erreur lors de l\'inscription', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--night)', padding: '1.5rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp .5s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#0A0F1E" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem' }}>MenuScan</span>
        </div>

        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.35rem', textAlign: 'center' }}>Créer un compte</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', textAlign: 'center' }}>
            Déjà inscrit ? <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Se connecter</Link>
          </p>

          <form onSubmit={handleSubmit}>
            {[
              { label: 'Nom complet', key: 'nom', type: 'text', icon: User, placeholder: 'Mamadou Diallo' },
              { label: 'Adresse e-mail', key: 'email', type: 'email', icon: Mail, placeholder: 'vous@exemple.com' },
              { label: 'Mot de passe', key: 'motDePasse', type: 'password', icon: Lock, placeholder: '••••••••' },
            ].map(({ label, key, type, icon: Icon, placeholder }) => (
              <div key={key} style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <Icon size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type={type} placeholder={placeholder} style={{ paddingLeft: '2.4rem' }} value={form[key]} onChange={e => set(key, e.target.value)} required />
                </div>
              </div>
            ))}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Rôle</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="client">Client</option>
                <option value="cuisine">Cuisine</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <Btn type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
              {loading ? 'Création…' : 'Créer le compte'}
            </Btn>
          </form>
        </div>
      </div>
    </div>
  );
}
