import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, CheckCircle, Archive, RefreshCw, Wifi, WifiOff, ImageIcon } from 'lucide-react';
import { io } from 'socket.io-client';
import { commandesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Btn, Badge, Spinner, EmptyState } from '../../components/ui';

const API_BASE = (process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`).replace('/api', '');

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

    const socketUrl = process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:5000`;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('rejoindre_chambre', 'cuisine');
    });
    socket.on('disconnect', () => setConnected(false));

    // Nouvelle commande créée par le client
    socket.on('nouvelle_commande_cuisine', (cmd) => {
      setCommandes(prev => {
        if (prev.find(c => c._id === cmd._id)) return prev;
        return [cmd, ...prev];
      });
      show(`🆕 Nouvelle commande — ${cmd.table || 'Table ?'}`, 'info');
    });

    // Statut de préparation modifié par la cuisine (multi-écran)
    socket.on('statut_commande_change', ({ id, statutPreparation }) => {
      setCommandes(prev => prev.map(c =>
        String(c._id) === String(id) ? { ...c, statutPreparation } : c
      ));
    });

    // Paiement reçu → débloquer la commande pour préparation
    socket.on('commande_payee', ({ commandeId, table }) => {
      setCommandes(prev => prev.map(c =>
        String(c._id) === String(commandeId) ? { ...c, statutCommande: 'PAYE' } : c
      ));
      show(`💰 ${table ? `Table ${table}` : 'Commande'} payée — à préparer !`, 'success');
    });

    return () => socket.disconnect();
  }, [loadCommandes, show]);

  // Auto-refresh toutes les 30s en cas de coupure socket
  useEffect(() => {
    const interval = setInterval(() => loadCommandes(), 30000);
    return () => clearInterval(interval);
  }, [loadCommandes]);

  const changeStatut = async (id, statutPreparation) => {
    setUpdating(u => ({ ...u, [id]: true }));
    try {
      await commandesAPI.updateStatut(id, { statutPreparation });
      setCommandes(prev => prev.map(c => c._id === id ? { ...c, statutPreparation } : c));
      show(`Statut : ${statutPreparation}`, 'success');
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--night)' }}>

      {/* ── En-tête fixe ── */}
      <div className="cuisine-sticky-header" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--night)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 1.5rem 0',
      }}>
        {/* Titre + indicateurs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat size={20} color="var(--gold)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>Écran Cuisine</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>{commandes.length} commande(s) au total</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: connected ? 'var(--emerald)' : 'var(--crimson)', background: connected ? 'var(--emerald-dim)' : 'var(--crimson-dim)', border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '100px', padding: '0.3rem 0.75rem' }}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'En direct' : 'Hors ligne'}
            </div>
            <button
              onClick={loadCommandes}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              <RefreshCw size={12} />Actualiser
            </button>
          </div>
        </div>

        {/* Onglets de filtre */}
        <div className="cat-tabs" style={{ display: 'flex', gap: '0.4rem', paddingBottom: '0.875rem', overflowX: 'auto' }}>
          {['Tous', ...STATUTS].map(s => {
            const meta = STATUT_META[s];
            const isActive = filter === s;
            return (
              <button key={s} onClick={() => setFilter(s)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem', borderRadius: '100px', border: `1px solid ${isActive ? (meta?.border || 'var(--gold)') : 'var(--border-strong)'}`, background: isActive ? (meta?.bg || 'var(--gold-dim)') : 'transparent', color: isActive ? (meta?.color || 'var(--gold)') : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: isActive ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {s}
                <span style={{ background: isActive ? (meta?.color || 'var(--gold)') : 'var(--surface-raised)', color: isActive ? '#0A0F1E' : 'var(--text-muted)', borderRadius: '100px', padding: '0.05rem 0.45rem', fontSize: '0.68rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                  {s === 'Tous' ? commandes.length : counts[s]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grille des commandes (scrollable) ── */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={ChefHat} title="Aucune commande" desc="Les nouvelles commandes apparaîtront ici automatiquement dès qu'un client paie." />
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
                <div key={cmd._id} style={{ background: 'var(--surface-raised)', border: `1px solid ${meta.border}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'all var(--transition)', animation: 'cardIn 0.3s ease both' }}>
                  {/* Header carte */}
                  <div style={{ padding: '0.875rem 1.25rem', background: meta.bg, borderBottom: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <StatIcon size={16} color={meta.color} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: meta.color }}>
                        {cmd.table || 'Table ?'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <Badge variant={meta.badge}>{statutPrep}</Badge>
                      {isPaid && <Badge variant="green">Payé ✓</Badge>}
                    </div>
                  </div>

                  {/* Articles */}
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                      {cmd.articles?.map((art, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: `1px solid ${meta.border}` }}>
                          {art.image ? (
                            <img
                              src={`${API_BASE}${art.image}`}
                              alt={art.nom}
                              style={{ width: 52, height: 52, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0, border: `1px solid ${meta.border}` }}
                              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-sm)', background: meta.bg, border: `1px solid ${meta.border}`, display: art.image ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ImageIcon size={20} color={meta.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art.nom}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{art.prixUnitaire?.toLocaleString()} GNF</div>
                            {art.note && (
                              <div style={{ marginTop: '0.35rem', padding: '0.3rem 0.5rem', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.4)', borderLeft: '3px solid var(--gold)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', fontSize: '0.72rem', color: 'var(--gold)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                ✏️ {art.note}
                              </div>
                            )}
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: meta.color, flexShrink: 0 }}>×{art.quantite}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginBottom: '0.875rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(cmd.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {cmd.montantTotal?.toLocaleString()} GNF
                      </span>
                    </div>

                    {/* Action */}
                    {nextStatut && (
                      <div>
                        {!isPaid && statutPrep === 'En attente' ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--crimson)', background: 'var(--crimson-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                            🔒 En attente du paiement client
                          </div>
                        ) : (
                          <Btn
                            onClick={() => changeStatut(cmd._id, nextStatut)}
                            loading={isLoading}
                            variant="success"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                          >
                            → {nextStatut}
                          </Btn>
                        )}
                      </div>
                    )}
                    {!nextStatut && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>Archivée</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .cuisine-sticky-header { top: 0; }
        @media (max-width: 768px) {
          .cuisine-sticky-header { top: 64px !important; }
          .cuisine-sticky-header { padding: 0.875rem 1rem 0 !important; }
        }
      `}</style>
    </div>
  );
}
