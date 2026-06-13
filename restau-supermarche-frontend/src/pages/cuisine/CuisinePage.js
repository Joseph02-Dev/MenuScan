import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, CheckCircle, Archive, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { io } from 'socket.io-client';
import { commandesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Btn, Badge, Spinner, EmptyState, PageHeader } from '../../components/ui';

const STATUTS = ['En attente', 'Préparation', 'Prêt', 'Archive'];
const STATUT_META = {
  'En attente': { color: 'var(--sky)', bg: 'var(--sky-dim)', border: 'rgba(56,189,248,0.3)', badge: 'blue', icon: Clock },
  'Préparation': { color: 'var(--gold)', bg: 'var(--gold-dim)', border: 'rgba(245,166,35,0.3)', badge: 'gold', icon: ChefHat },
  'Prêt': { color: 'var(--emerald)', bg: 'var(--emerald-dim)', border: 'rgba(16,185,129,0.3)', badge: 'green', icon: CheckCircle },
  'Archive': { color: 'var(--text-muted)', bg: 'rgba(71,85,105,0.1)', border: 'var(--border)', badge: 'default', icon: Archive },
};

export default function CuisinePage() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tous');
  const [connected, setConnected] = useState(false);
  const [updating, setUpdating] = useState({});
  const { show } = useToast();

  const loadCommandes = useCallback(async () => {
    try {
      const res = await commandesAPI.getAll({ typePlateforme: 'restaurant' });
      setCommandes(res.data.data || []);
    } catch { show('Erreur lors du chargement des commandes', 'error'); }
    finally { setLoading(false); }
  }, [show]);

  useEffect(() => {
    loadCommandes();
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('rejoindre_chambre', 'cuisine');
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('nouvelle_commande_cuisine', (cmd) => {
      setCommandes(prev => [cmd, ...prev]);
      show(`🆕 Nouvelle commande — ${cmd.table || 'Scan & Go'}`, 'info');
    });
    socket.on('statut_commande_change', ({ id, statutPreparation }) => {
      setCommandes(prev => prev.map(c => c._id === id ? { ...c, statutPreparation } : c));
    });
    socket.on('commande_payee', ({ commandeId }) => {
      setCommandes(prev => prev.map(c => c._id === commandeId ? { ...c, statutCommande: 'PAYE' } : c));
    });

    return () => socket.disconnect();
  }, [loadCommandes, show]);

  const changeStatut = async (id, statutPreparation) => {
    setUpdating(u => ({ ...u, [id]: true }));
    try {
      await commandesAPI.updateStatut(id, { statutPreparation });
      setCommandes(prev => prev.map(c => c._id === id ? { ...c, statutPreparation } : c));
      show(`Statut mis à jour : ${statutPreparation}`, 'success');
    } catch (err) {
      show(err.response?.data?.error || 'Impossible de mettre à jour', 'error');
    } finally { setUpdating(u => ({ ...u, [id]: false })); }
  };

  const filtered = commandes.filter(c =>
    filter === 'Tous' || (c.statutPreparation || 'En attente') === filter
  );

  const counts = STATUTS.reduce((acc, s) => {
    acc[s] = commandes.filter(c => (c.statutPreparation || 'En attente') === s).length;
    return acc;
  }, {});

  if (loading) return <div style={{ padding: '2rem' }}><Spinner /></div>;

  return (
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="Écran Cuisine"
        subtitle="Suivi des commandes en temps réel"
        action={
          <div className="cuisine-action" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: connected ? 'var(--emerald)' : 'var(--crimson)' }}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? 'Temps réel actif' : 'Hors ligne'}
            </div>
            <Btn onClick={loadCommandes} variant="secondary" icon={RefreshCw} size="sm">Actualiser</Btn>
          </div>
        }
      />

      {/* Kanban filter tabs */}
      <div className="cat-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['Tous', ...STATUTS].map(s => {
          const meta = STATUT_META[s];
          const isActive = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: '100px', border: `1px solid ${isActive ? (meta?.border || 'var(--gold)') : 'var(--border-strong)'}`, background: isActive ? (meta?.bg || 'var(--gold-dim)') : 'transparent', color: isActive ? (meta?.color || 'var(--gold)') : 'var(--text-secondary)', fontSize: '0.83rem', fontWeight: isActive ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)' }}>
              {s}
              <span style={{ background: isActive ? (meta?.color || 'var(--gold)') : 'var(--surface-raised)', color: isActive ? (s === 'Tous' ? 'var(--night)' : '#0A0F1E') : 'var(--text-muted)', borderRadius: '100px', padding: '0.05rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                {s === 'Tous' ? commandes.length : counts[s]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ChefHat} title="Aucune commande" desc="Les nouvelles commandes apparaîtront ici automatiquement." />
      ) : (
        <div className="kitchen-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(cmd => {
            const statutPrep = cmd.statutPreparation || 'En attente';
            const meta = STATUT_META[statutPrep] || STATUT_META['En attente'];
            const StatIcon = meta.icon;
            const isPaid = cmd.statutCommande === 'PAYE';
            const nextStatut = STATUTS[STATUTS.indexOf(statutPrep) + 1];
            const isLoading = updating[cmd._id];

            return (
              <div key={cmd._id} style={{ background: 'var(--surface-raised)', border: `1px solid ${meta.border}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'all var(--transition)' }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', background: meta.bg, borderBottom: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <StatIcon size={16} color={meta.color} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: meta.color }}>
                      {cmd.table || 'Scan & Go'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <Badge variant={meta.badge}>{statutPrep}</Badge>
                    {isPaid && <Badge variant="green">Payé</Badge>}
                  </div>
                </div>

                {/* Articles */}
                <div style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {cmd.articles?.map((art, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: meta.color, fontWeight: 600, marginRight: '0.5rem' }}>×{art.quantite}</span>
                          {art.nom}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {(art.prixUnitaire * art.quantite).toLocaleString()} GNF
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{cmd.montantTotal?.toLocaleString()} GNF</span>
                  </div>

                  {/* Timestamp */}
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
                    {new Date(cmd.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Actions */}
                  {nextStatut && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!isPaid && statutPrep === 'En attente' && (
                        <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--crimson)', background: 'var(--crimson-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          🔒 En attente de paiement
                        </div>
                      )}
                      {(isPaid || statutPrep !== 'En attente') && (
                        <Btn
                          onClick={() => changeStatut(cmd._id, nextStatut)}
                          loading={isLoading}
                          variant="success"
                          size="sm"
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          → {nextStatut}
                        </Btn>
                      )}
                    </div>
                  )}
                  {!nextStatut && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>Commande archivée</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
