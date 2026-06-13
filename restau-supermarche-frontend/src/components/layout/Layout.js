import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, ShoppingCart, LayoutDashboard, Package,
  ChefHat, LogOut, Menu, X, QrCode, User, Shield, Zap, ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const NAV = {
  client: [
    { to: '/restaurant', icon: UtensilsCrossed, label: 'Menu Restaurant' },
    { to: '/supermarche', icon: ShoppingCart, label: 'Scan & Go' },
  ],
  cuisine: [
    { to: '/cuisine', icon: ChefHat, label: 'Écran Cuisine' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/restaurant', icon: UtensilsCrossed, label: 'Restaurant' },
    { to: '/supermarche', icon: ShoppingCart, label: 'Scan & Go' },
    { to: '/cuisine', icon: ChefHat, label: 'Cuisine' },
    { to: '/admin/produits', icon: Package, label: 'Produits' },
    { to: '/admin/sortie', icon: QrCode, label: 'Contrôle Sortie' },
  ],
};

const ROLE_META = {
  client: { icon: User, color: 'var(--sky)', label: 'Client' },
  cuisine: { icon: ChefHat, color: 'var(--gold)', label: 'Cuisine' },
  admin: { icon: Shield, color: 'var(--emerald)', label: 'Admin' },
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV[user?.role] || NAV.client;
  const meta = ROLE_META[user?.role] || ROLE_META.client;
  const RoleIcon = meta.icon;

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={20} color="#0A0F1E" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>MenuScan</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Plateforme F&B</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 0.875rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
              transition: 'all var(--transition)', color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
              background: isActive ? 'var(--gold-dim)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
            })}>
            <Icon size={17} />
            <span style={{ flex: 1 }}>{label}</span>
            {(label === 'Menu Restaurant' || label === 'Restaurant') && count > 0 && (
              <span style={{ background: 'var(--gold)', color: '#0A0F1E', borderRadius: '100px', padding: '0.1rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{count}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--surface)', marginBottom: '0.4rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: meta.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RoleIcon size={14} color={meta.color} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nom || 'Utilisateur'}</div>
            <div style={{ fontSize: '0.68rem', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{meta.label}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', padding: '0.65rem 0.875rem', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.83rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'all var(--transition)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--crimson)'; e.currentTarget.style.background = 'var(--crimson-dim)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}>
          <LogOut size={15} />Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <aside style={{ width: 232, background: 'var(--surface)', borderRight: '1px solid var(--border)', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 }} className="desktop-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setOpen(false)} />
          <aside style={{ width: 232, background: 'var(--surface)', borderRight: '1px solid var(--border)', position: 'absolute', top: 0, left: 0, height: '100%', zIndex: 1 }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="mobile-topbar" style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Zap size={18} color="var(--gold)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>MenuScan</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {count > 0 && <div style={{ position: 'relative' }}><ShoppingBag size={20} color="var(--text-secondary)" /><span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--gold)', color: '#0A0F1E', borderRadius: '50%', width: 16, height: 16, fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span></div>}
          <button onClick={() => setOpen(!open)} style={{ color: 'var(--text-secondary)', lineHeight: 0 }}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>

      {/* Main */}
      <main style={{ flex: 1, marginLeft: 232, minHeight: '100vh' }} className="main-content">
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .main-content { margin-left: 0 !important; padding-top: 64px; }
        }
        @media (max-width: 480px) {
          .mobile-topbar { padding: 0.75rem 1rem !important; }
        }
      `}</style>
    </div>
  );
}
