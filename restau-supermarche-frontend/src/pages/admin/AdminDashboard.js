import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, ShoppingBag, CreditCard, TrendingUp, RefreshCw, UtensilsCrossed, ShoppingCart, Clock } from 'lucide-react';
import { commandesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, Badge, PageHeader, StatCard } from '../../components/ui';

const STATUT_CMD = {
  EN_ATTENTE: { label: 'En attente', badge: 'blue' },
  PREPARATION: { label: 'Préparation', badge: 'gold' },
  PRET: { label: 'Prêt', badge: 'green' },
  PAYE: { label: 'Payé', badge: 'green' },
  ANNULE: { label: 'Annulé', badge: 'red' },
};

export default function AdminDashboard() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await commandesAPI.getAll();
      setCommandes(res.data.data || []);
    } catch { show('Erreur de chargement', 'error'); }
    finally { setLoading(false); }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total: commandes.length,
    paye: commandes.filter(c => c.statutCommande === 'PAYE').length,
    resto: commandes.filter(c => c.typePlateforme === 'restaurant').length,
    super: commandes.filter(c => c.typePlateforme === 'supermarche').length,
    ca: commandes.filter(c => c.statutCommande === 'PAYE').reduce((s, c) => s + (c.montantTotal || 0), 0),
  };

  if (loading) return <div style={{ padding: '2rem' }}><Spinner /></div>;

  return (
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="Dashboard Admin"
        subtitle={`Vue d'ensemble — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        action={
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.1rem', background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
            <RefreshCw size={15} />Actualiser
          </button>
        }
      />

      {/* Stats */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <StatCard label="Commandes totales" value={stats.total} icon={ShoppingBag} color="var(--sky)" />
        <StatCard label="Commandes payées" value={stats.paye} icon={CreditCard} color="var(--emerald)" sub={`${stats.total > 0 ? Math.round(stats.paye / stats.total * 100) : 0}% du total`} />
        <StatCard label="CA encaissé" value={`${stats.ca.toLocaleString()} GNF`} icon={TrendingUp} color="var(--gold)" />
        <StatCard label="Restaurant / Supermarché" value={`${stats.resto} / ${stats.super}`} icon={LayoutDashboard} color="var(--violet)" />
      </div>

      {/* Recent orders */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Commandes récentes</h2>
          <Badge variant="default">{commandes.length} total</Badge>
        </div>

        {commandes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune commande pour l'instant.</div>
        ) : (
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  {['ID', 'Plateforme', 'Table/Type', 'Articles', 'Montant', 'Statut', 'Date'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commandes.map((cmd, i) => {
                  const meta = STATUT_CMD[cmd.statutCommande] || STATUT_CMD.EN_ATTENTE;
                  return (
                    <tr key={cmd._id} style={{ borderBottom: i < commandes.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background var(--transition)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '0.875rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cmd._id.slice(-8).toUpperCase()}</td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: cmd.typePlateforme === 'restaurant' ? 'var(--gold)' : 'var(--sky)' }}>
                          {cmd.typePlateforme === 'restaurant' ? <UtensilsCrossed size={13} /> : <ShoppingCart size={13} />}
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, textTransform: 'capitalize' }}>{cmd.typePlateforme}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{cmd.table || '—'}</td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{cmd.articles?.length || 0}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{cmd.montantTotal?.toLocaleString()} GNF</td>
                      <td style={{ padding: '0.875rem 1.25rem' }}><Badge variant={meta.badge}>{meta.label}</Badge></td>
                      <td style={{ padding: '0.875rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={11} />
                          {new Date(cmd.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
