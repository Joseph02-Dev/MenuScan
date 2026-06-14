import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, UtensilsCrossed, Search, X } from 'lucide-react';
import { produitsAPI, commandesAPI, paiementsAPI } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { Btn, Badge, Spinner, EmptyState, Modal, PageHeader } from '../../components/ui';

const CATEGORIES = ['Tous', 'Entrées', 'Plats principaux', 'Desserts', 'Boissons'];

const CATEGORY_EMOJIS = {
  'Entrées': '🥗', 'Plats principaux': '🍛', 'Desserts': '🍮', 'Boissons': '🥤', 'Tous': '🍽️',
};

const API_BASE = (process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`).replace('/api', '');

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
];

const getProductImage = (p, i) => p.image ? `${API_BASE}${p.image}` : FOOD_IMAGES[i % FOOD_IMAGES.length];

export default function RestaurantPage() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('Tous');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ telephonePaiement: '', operateur: 'Orange Money' });
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [tableInput, setTableInput] = useState('');
  const [tableSet, setTableSet] = useState(false);

  const { items, addItem, removeItem, updateQty, updateNote, clearCart, total, count, table, setTable, setPlateforme } = useCart();
  const { show } = useToast();

  useEffect(() => { setPlateforme('restaurant'); }, [setPlateforme]);

  const load = useCallback(async () => {
    try {
      const res = await produitsAPI.getAll({ typePlateforme: 'restaurant' });
      setProduits(res.data.data || []);
    } catch {
      show('Impossible de charger le menu', 'error');
    } finally { setLoading(false); }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const filtered = produits.filter(p =>
    (cat === 'Tous' || p.categorie === cat) &&
    p.nom.toLowerCase().includes(search.toLowerCase()) &&
    p.estDisponible !== false
  );

  const handlePay = async () => {
    if (!payForm.telephonePaiement) return show('Entrez votre numéro de téléphone', 'error');
    if (!table) return show('Numéro de table requis', 'error');
    setPaying(true);
    try {
      const orderRes = await commandesAPI.create({
        typePlateforme: 'restaurant', table,
        items: items.map(i => ({ produitId: i.produitId, quantite: i.quantite, note: i.note || '' })),
        modePaiement: 'Mobile Money',
      });
      const payRes = await paiementsAPI.initier({
        commandeId: orderRes.data.data._id,
        ...payForm,
      });
      setReceipt(payRes.data.data);
      clearCart();
      setPayModal(false);
      show('Paiement effectué avec succès !', 'success');
    } catch (err) {
      show(err.response?.data?.error || 'Erreur lors du paiement', 'error');
    } finally { setPaying(false); }
  };

  if (loading) return <div style={{ padding: '2rem' }}><Spinner /></div>;

  return (
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>
      <PageHeader
        title="Menu Restaurant"
        subtitle="Commandez directement depuis votre table"
        action={
          <Btn onClick={() => setCartOpen(true)} variant={count > 0 ? 'primary' : 'secondary'} icon={ShoppingCart}>
            Panier {count > 0 && `(${count})`}
          </Btn>
        }
      />

      {/* Table input */}
      {!tableSet ? (
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--gold)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <UtensilsCrossed size={20} color="var(--gold)" />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Entrez votre numéro de table pour commencer :</span>
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: 200 }}>
            <input placeholder="Ex: Table 5" value={tableInput} onChange={e => setTableInput(e.target.value)} style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter' && tableInput) { setTable(tableInput); setTableSet(true); } }} />
            <Btn onClick={() => { if (tableInput) { setTable(tableInput); setTableSet(true); show(`Table "${tableInput}" sélectionnée`, 'success'); } }} disabled={!tableInput}>Confirmer</Btn>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Badge variant="gold">📍 {table}</Badge>
          <button onClick={() => { setTableSet(false); setTable(''); }} style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textDecoration: 'underline' }}>Changer</button>
        </div>
      )}

      {/* Search & Categories */}
      <div className="filter-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Rechercher un plat…" style={{ paddingLeft: '2.4rem', maxWidth: 280 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="cat-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding: '0.45rem 1rem', borderRadius: '100px', border: `1px solid ${cat === c ? 'var(--gold)' : 'var(--border-strong)'}`, background: cat === c ? 'var(--gold-dim)' : 'transparent', color: cat === c ? 'var(--gold)' : 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: cat === c ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)' }}>
              {CATEGORY_EMOJIS[c] || ''} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Aucun plat trouvé" desc="Modifiez votre recherche ou la catégorie sélectionnée." />
      ) : (
        <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {filtered.map((p, i) => {
            const inCart = items.find(it => it.produitId === p._id);
            return (
              <div key={p._id}
                style={{ background: 'var(--surface-raised)', border: `1px solid ${inCart ? 'rgba(245,166,35,0.35)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease', boxShadow: inCart ? '0 0 20px rgba(245,166,35,0.12)' : '0 2px 8px rgba(0,0,0,0.2)', animation: `cardIn 0.4s ease ${i * 0.06}s both` }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = inCart ? '0 8px 28px rgba(245,166,35,0.18)' : '0 8px 24px rgba(0,0,0,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = inCart ? '0 0 20px rgba(245,166,35,0.12)' : '0 2px 8px rgba(0,0,0,0.2)'; }}
              >
                <div className="product-card-img" style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={getProductImage(p, i)}
                    alt={p.nom}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                    onError={e => { e.target.src = FOOD_IMAGES[i % FOOD_IMAGES.length]; }}
                    onMouseEnter={e => { e.target.style.transform = 'scale(1.06)'; }}
                    onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,30,0.7) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                    <Badge variant="default">{p.categorie}</Badge>
                  </div>
                </div>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: '0.3rem' }}>{p.nom}</h3>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-mono)', marginBottom: '0.875rem' }}>
                    {p.prix.toLocaleString()} GNF
                  </div>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => updateQty(p._id, inCart.quantite - 1)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Minus size={13} /></button>
                      <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{inCart.quantite}</span>
                      <button onClick={() => updateQty(p._id, inCart.quantite + 1)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gold)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0F1E' }}><Plus size={13} /></button>
                      <button onClick={() => removeItem(p._id)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--crimson-dim)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crimson)' }}><Trash2 size={12} /></button>
                    </div>
                  ) : (
                    <Btn onClick={() => { addItem(p); show(`${p.nom} ajouté au panier`, 'success'); }} variant="outline" size="sm" icon={Plus} style={{ width: '100%' }}>
                      Ajouter
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Modal */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Mon panier" width={500}>
        {items.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Panier vide" desc="Ajoutez des plats depuis le menu." />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: 420, overflowY: 'auto' }}>
              {items.map(item => (
                <div key={item.produitId} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {/* Ligne article */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.prixUnitaire.toLocaleString()} GNF</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <button onClick={() => updateQty(item.produitId, item.quantite - 1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Minus size={11} /></button>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 20, textAlign: 'center' }}>{item.quantite}</span>
                      <button onClick={() => updateQty(item.produitId, item.quantite + 1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0F1E' }}><Plus size={11} /></button>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold)', minWidth: 80, textAlign: 'right', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{(item.prixUnitaire * item.quantite).toLocaleString()} GNF</div>
                    <button onClick={() => removeItem(item.produitId)} style={{ color: 'var(--crimson)', lineHeight: 0, flexShrink: 0 }}><X size={15} /></button>
                  </div>
                  {/* Champ note */}
                  <div style={{ padding: '0 0.75rem 0.75rem' }}>
                    <textarea
                      placeholder="✏️ Instruction pour le cuisinier (optionnel) — ex: sans piment, bien cuit…"
                      value={item.note || ''}
                      onChange={e => updateNote(item.produitId, e.target.value)}
                      rows={2}
                      style={{ width: '100%', resize: 'none', padding: '0.5rem 0.65rem', background: 'var(--gold-dim)', border: '1px dashed rgba(245,166,35,0.5)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.78rem', fontFamily: 'var(--font-body)', lineHeight: 1.55, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{total.toLocaleString()} GNF</span>
              </div>
            </div>
            <Btn onClick={() => { setCartOpen(false); setPayModal(true); }} icon={CreditCard} size="lg" style={{ width: '100%' }}>
              Payer par Mobile Money
            </Btn>
          </>
        )}
      </Modal>

      {/* Pay Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Paiement Mobile Money" width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Montant à payer</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{total.toLocaleString()} GNF</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Numéro Mobile Money</label>
            <input type="tel" placeholder="Ex: 622 00 00 00" value={payForm.telephonePaiement} onChange={e => setPayForm(f => ({ ...f, telephonePaiement: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Opérateur</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['Orange Money', 'MTN Mobile Money', 'Moov Money'].map(op => (
                <button key={op} onClick={() => setPayForm(f => ({ ...f, operateur: op }))}
                  style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: 'var(--radius-md)', border: `1px solid ${payForm.operateur === op ? 'var(--gold)' : 'var(--border-strong)'}`, background: payForm.operateur === op ? 'var(--gold-dim)' : 'var(--surface)', color: payForm.operateur === op ? 'var(--gold)' : 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: payForm.operateur === op ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)' }}>
                  {op === 'Orange Money' ? '🟠' : op === 'MTN Mobile Money' ? '🟡' : '🔵'} {op.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={handlePay} loading={paying} size="lg" style={{ width: '100%', marginTop: '0.5rem' }}>
            {paying ? 'Traitement…' : `Confirmer le paiement`}
          </Btn>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="✅ Paiement confirmé" width={420}>
        {receipt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--emerald)', marginBottom: '0.25rem' }}>Commande confirmée !</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Votre commande est transmise à la cuisine</div>
            </div>
            {[
              { label: 'Référence', value: receipt.reference, mono: true },
              { label: 'Montant payé', value: `${receipt.montant?.toLocaleString()} GNF`, mono: true },
              { label: 'Statut', value: receipt.statutCommande },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value}</span>
              </div>
            ))}
            <Btn onClick={() => setReceipt(null)} style={{ width: '100%' }}>Fermer</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
