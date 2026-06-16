import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, ShoppingCart, LayoutDashboard, Package,
  ChefHat, LogOut, QrCode, User, Shield, Zap, ShoppingBag, ScanLine
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

/* ── Navigation desktop (sidebar) ── */
const SIDEBAR_NAV = {
  client: [
    { to: '/restaurant', icon: UtensilsCrossed, label: 'Menu Restaurant' },
    { to: '/supermarche', icon: ShoppingCart,   label: 'Scan & Go'       },
  ],
  cuisine:  [{ to: '/cuisine',  icon: ChefHat,    label: 'Écran Cuisine'   }],
  caissier: [{ to: '/caissier', icon: ShoppingBag, label: 'Écran Caissier' }],
  admin: [
    { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard'         },
    { to: '/restaurant',     icon: UtensilsCrossed, label: 'Restaurant'        },
    { to: '/supermarche',    icon: ShoppingCart,    label: 'Scan & Go'         },
    { to: '/cuisine',        icon: ChefHat,         label: 'Cuisine'           },
    { to: '/caissier',       icon: ShoppingBag,     label: 'Caissier / Sortie' },
    { to: '/admin/produits', icon: Package,         label: 'Produits'          },
    { to: '/admin/sortie',   icon: QrCode,          label: 'Contrôle Sortie'   },
  ],
};

/* ── Navigation mobile (barre du bas, max 5 onglets) ── */
const BOTTOM_NAV = {
  client: [
    { to: '/restaurant', icon: UtensilsCrossed, short: 'Menu'    },
    { to: '/supermarche', icon: ShoppingCart,   short: 'Scan'    },
  ],
  cuisine:  [],
  caissier: [],
  admin: [
    { to: '/admin',          icon: LayoutDashboard, short: 'Accueil'  },
    { to: '/admin/produits', icon: Package,          short: 'Produits' },
    { to: '/cuisine',        icon: ChefHat,          short: 'Cuisine'  },
    { to: '/caissier',       icon: ShoppingBag,      short: 'Caissier' },
    { to: '/admin/sortie',   icon: QrCode,           short: 'Sortie'   },
  ],
};

const ROLE_META = {
  client:   { icon: User,    color: 'var(--sky)',     label: 'Client'   },
  cuisine:  { icon: ChefHat, color: 'var(--gold)',    label: 'Cuisine'  },
  caissier: { icon: ScanLine, color: 'var(--sky)',    label: 'Caissier' },
  admin:    { icon: Shield,  color: 'var(--emerald)', label: 'Admin'    },
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { count }        = useCart();
  const navigate         = useNavigate();
  const [orderNotif, setOrderNotif] = useState(null);
  const notifTimer = useRef(null);

  /* Notification temps réel pour les clients */
  useEffect(() => {
    if (!user?.id || user.role !== 'client') return;
    const url = process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:5000`;
    const socket = io(url, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('rejoindre_chambre', `client_${user.id}`));
    socket.on('commande_prete', ({ table, message }) => {
      setOrderNotif({ table, message });
      if (notifTimer.current) clearTimeout(notifTimer.current);
      notifTimer.current = setTimeout(() => setOrderNotif(null), 12000);
    });
    return () => { socket.disconnect(); if (notifTimer.current) clearTimeout(notifTimer.current); };
  }, [user?.id, user?.role]);

  const sidebarItems = SIDEBAR_NAV[user?.role] || SIDEBAR_NAV.client;
  const bottomItems  = BOTTOM_NAV[user?.role]  || [];
  const meta         = ROLE_META[user?.role]   || ROLE_META.client;
  const RoleIcon     = meta.icon;
  const hasBottomNav = bottomItems.length > 0;

  const handleLogout = () => { logout(); navigate('/login'); };

  /* Contenu de la sidebar desktop */
  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={20} color="#0A0F1E" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>MenuScan</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Plateforme F&B</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {sidebarItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 0.875rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
              transition: 'all var(--transition)',
              color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
              background: isActive ? 'var(--gold-dim)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
            })}>
            <Icon size={17} />
            <span style={{ flex: 1 }}>{label}</span>
            {(label === 'Menu Restaurant' || label === 'Restaurant') && count > 0 && (
              <span style={{ background: 'var(--gold)', color: '#0A0F1E', borderRadius: '100px', padding: '0.1rem 0.5rem', fontSize: '0.68rem', fontWeight: 700 }}>{count}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--surface)', marginBottom: '0.4rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: meta.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RoleIcon size={14} color={meta.color} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.83rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nom || 'Utilisateur'}</div>
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

      {/* ── Bannière commande prête ── */}
      {orderNotif && (
        <div className="order-notif-banner" style={{
          position: 'fixed', left: 0, right: 0, zIndex: 9998,
          background: 'linear-gradient(135deg, var(--emerald) 0%, #059669 100%)',
          color: '#0A0F1E', padding: '0.875rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          boxShadow: '0 4px 24px rgba(16,185,129,0.45)',
          animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem', flexShrink: 0 }}>🍽️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{orderNotif.message}</div>
              <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: '0.15rem' }}>
                {orderNotif.table && `${orderNotif.table} — `}Merci pour votre patience, bon appétit !
              </div>
            </div>
          </div>
          <button
            onClick={() => { setOrderNotif(null); if (notifTimer.current) clearTimeout(notifTimer.current); }}
            style={{ color: '#0A0F1E', opacity: 0.6, background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0 }}
          >✕</button>
        </div>
      )}

      {/* ── Sidebar desktop ── */}
      <aside className="desktop-sidebar" style={{ width: 232, background: 'var(--surface)', borderRight: '1px solid var(--border)', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 }}>
        <SidebarContent />
      </aside>

      {/* ── Header mobile (56px) ── */}
      <header className="mobile-topbar" style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 1rem', alignItems: 'center', justifyContent: 'space-between', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={18} color="#0A0F1E" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>MenuScan</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.62rem', color: meta.color, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            padding: '0.22rem 0.7rem', borderRadius: 100,
            background: meta.color + '20', border: `1px solid ${meta.color}45`,
          }}>{meta.label}</span>
          <button
            onClick={handleLogout}
            title="Déconnexion"
            style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-raised)', border: '1px solid var(--border-strong)' }}
          >
            <LogOut size={15} color="var(--text-muted)" />
          </button>
        </div>
      </header>

      {/* ── Barre de navigation mobile (bas) ── */}
      {hasBottomNav && (
        <nav className="mobile-bottom-nav" style={{ display: 'none' }}>
          {bottomItems.map(({ to, icon: Icon, short }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `mob-nav-item${isActive ? ' mob-nav-active' : ''}`}
            >
              <span className="mob-nav-icon">
                <Icon size={22} strokeWidth={1.8} />
                {to === '/restaurant' && count > 0 && (
                  <span className="mob-nav-badge">{count > 9 ? '9+' : count}</span>
                )}
              </span>
              <span className="mob-nav-label">{short}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* ── Contenu principal ── */}
      <main
        className={`main-content${hasBottomNav ? ' with-bottom-nav' : ''}`}
        style={{ flex: 1, marginLeft: 232, minHeight: '100vh' }}
      >
        {children}
      </main>

    </div>
  );
}
