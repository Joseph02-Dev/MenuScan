import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, UtensilsCrossed, Search, X, CheckCircle } from 'lucide-react';
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

/* Bouton quantité avec bonne taille pour le tactile */
function QtyBtn({ onClick, children, variant = 'default' }) {
  const styles = {
    default: { background: 'var(--surface-raised)', border: '1.5px solid var(--border-strong)', color: 'var(--text-secondary)' },
    add:     { background: 'var(--gold)', border: 'none', color: '#0A0F1E' },
    remove:  { background: 'var(--crimson-dim)', border: '1.5px solid rgba(239,68,68,0.3)', color: 'var(--crimson)' },
  };
  return (
    <button
      onClick={onClick}
      style={{
        width: 40, height: 40, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.15s var(--spring)',
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

export default function RestaurantPage() {
  const [produits, setProduits]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [cat, setCat]               = useState('Tous');
  const [search, setSearch]         = useState('');
  const [cartOpen, setCartOpen]     = useState(false);
  const [payModal, setPayModal]     = useState(false);
  const [payForm, setPayForm]       = useState({ telephonePaiement: '', operateur: 'Orange Money' });
  const [paying, setPaying]         = useState(false);
  const [receipt, setReceipt]       = useState(null);
  const [tableInput, setTableInput] = useState('');
  const [tableSet, setTableSet]     = useState(false);
  const [fabBounce, setFabBounce]   = useState(false);
  const prevCount                   = useRef(0);

  const { items, addItem, removeItem, updateQty, updateNote, clearCart, total, count, table, setTable, setPlateforme } = useCart();
  const { show } = useToast();

  useEffect(() => { setPlateforme('restaurant'); }, [setPlateforme]);

  // Animate FAB badge when cart count changes
  useEffect(() => {
    if (count > prevCount.current) {
      setFabBounce(true);
      setTimeout(() => setFabBounce(false), 500);
    }
    prevCount.current = count;
  }, [count]);

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

  if (loading) return <div style={{ padding: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={40} /></div>;

  return (
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>

      {/* ── En-tête ── */}
      <PageHeader
        title="Menu Restaurant"
        subtitle="Commandez directement depuis votre table"
        action={
          <Btn onClick={() => setCartOpen(true)} variant={count > 0 ? 'primary' : 'secondary'} icon={ShoppingCart} size="lg">
            Panier {count > 0 && <span style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '100px', padding: '0.05rem 0.5rem', fontSize: '0.8rem', marginLeft: '0.25rem' }}>{count}</span>}
          </Btn>
        }
      />

      {/* ── Saisie de table ── */}
      {!tableSet ? (
        <div style={{
          background: 'var(--surface-raised)', border: '1.5px solid var(--gold)',
          borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
          marginBottom: '2rem', animation: 'springIn 0.45s var(--spring)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <UtensilsCrossed size={20} color="var(--gold)" />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
              Quel est votre numéro de table ?
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              placeholder="Ex: Table 5"
              value={tableInput}
              onChange={e => setTableInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && tableInput) { setTable(tableInput); setTableSet(true); show(`Table "${tableInput}" sélectionnée`, 'success'); } }}
              style={{ flex: 1 }}
            />
            <Btn
              onClick={() => { if (tableInput) { setTable(tableInput); setTableSet(true); show(`Table "${tableInput}" sélectionnée`, 'success'); } }}
              disabled={!tableInput}
              size="lg"
            >
              Confirmer
            </Btn>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', animation: 'fadeUp 0.3s ease' }}>
          <Badge variant="gold">📍 {table}</Badge>
          <button
            onClick={() => { setTableSet(false); setTable(''); }}
            style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'underline', minHeight: 'auto' }}
          >
            Changer
          </button>
        </div>
      )}

      {/* ── Recherche ── */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={17} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          placeholder="Rechercher un plat…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.85rem', paddingRight: search ? '2.75rem' : undefined }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', minHeight: 'auto', lineHeight: 0 }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Catégories ── */}
      <div className="cat-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '100px',
              border: `1.5px solid ${cat === c ? 'var(--gold)' : 'var(--border-strong)'}`,
              background: cat === c ? 'var(--gold-dim)' : 'transparent',
              color: cat === c ? 'var(--gold)' : 'var(--text-secondary)',
              fontSize: '0.88rem', fontWeight: cat === c ? 700 : 400,
              cursor: 'pointer', transition: 'all 0.18s ease',
              letterSpacing: cat === c ? '-0.01em' : 'normal',
            }}
          >
            {CATEGORY_EMOJIS[c]} {c}
          </button>
        ))}
      </div>

      {/* ── Grille produits ── */}
      {filtered.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Aucun plat trouvé" desc="Essayez une autre catégorie ou modifiez votre recherche." />
      ) : (
        <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {filtered.map((p, i) => {
            const inCart = items.find(it => it.produitId === p._id);
            return (
              <div
                key={p._id}
                style={{
                  background: 'var(--surface-raised)',
                  border: `1.5px solid ${inCart ? 'rgba(245,166,35,0.4)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  boxShadow: inCart ? '0 0 24px rgba(245,166,35,0.14)' : '0 2px 12px rgba(0,0,0,0.18)',
                  animation: `springIn 0.5s var(--spring) ${i * 0.05}s both`,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = inCart ? '0 12px 32px rgba(245,166,35,0.22)' : '0 12px 28px rgba(0,0,0,0.32)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = inCart ? '0 0 24px rgba(245,166,35,0.14)' : '0 2px 12px rgba(0,0,0,0.18)'; }}
              >
                {/* Image */}
                <div className="product-card-img" style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={getProductImage(p, i)}
                    alt={p.nom}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    onError={e => { e.target.src = FOOD_IMAGES[i % FOOD_IMAGES.length]; }}
                    onMouseEnter={e => { e.target.style.transform = 'scale(1.07)'; }}
                    onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,30,0.75) 0%, transparent 55%)' }} />
                  {/* Catégorie */}
                  <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                    <span style={{ background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(8px)', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '100px', border: '1px solid var(--border-strong)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {p.categorie}
                    </span>
                  </div>
                  {/* Indicateur "dans le panier" */}
                  {inCart && (
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', animation: 'bounceIn 0.4s var(--spring)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={16} color="#0A0F1E" strokeWidth={2.5} />
                      </div>
                    </div>
                  )}
                  {/* Prix en overlay */}
                  <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.875rem' }}>
                    <div className="product-price" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                      {p.prix.toLocaleString()} <span style={{ fontSize: '0.7em', opacity: 0.8 }}>GNF</span>
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div style={{ padding: '1rem' }}>
                  <h3 className="product-name" style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.875rem', lineHeight: 1.3 }}>
                    {p.nom}
                  </h3>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <QtyBtn onClick={() => updateQty(p._id, inCart.quantite - 1)} variant="default">
                        <Minus size={15} />
                      </QtyBtn>
                      <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
                        {inCart.quantite}
                      </span>
                      <QtyBtn onClick={() => updateQty(p._id, inCart.quantite + 1)} variant="add">
                        <Plus size={15} />
                      </QtyBtn>
                      <QtyBtn onClick={() => removeItem(p._id)} variant="remove">
                        <Trash2 size={14} />
                      </QtyBtn>
                    </div>
                  ) : (
                    <button
                      onClick={() => { addItem(p); show(`${p.nom} ajouté !`, 'success'); }}
                      style={{
                        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                        background: 'var(--gold-dim)', border: '1.5px solid rgba(245,166,35,0.45)',
                        color: 'var(--gold)', fontWeight: 700, fontSize: '0.92rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        cursor: 'pointer', transition: 'all 0.18s ease',
                        fontFamily: 'var(--font-body)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#0A0F1E'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold-dim)'; e.currentTarget.style.color = 'var(--gold)'; }}
                    >
                      <Plus size={17} strokeWidth={2.5} />
                      Ajouter au panier
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAB Panier (mobile uniquement) ── */}
      {count > 0 && (
        <button
          className="fab"
          onClick={() => setCartOpen(true)}
          style={{
            position: 'fixed', bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
            right: '1.25rem', zIndex: 500,
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--gold)',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(245,166,35,0.5), 0 2px 8px rgba(0,0,0,0.3)',
            animation: 'fabPop 0.45s var(--spring)',
            border: 'none', cursor: 'pointer',
          }}
        >
          <ShoppingCart size={26} color="#0A0F1E" strokeWidth={2.5} />
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--crimson)', color: 'white',
            fontSize: '0.75rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: fabBounce ? 'badgePulse 0.4s ease' : undefined,
            boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
          }}>
            {count}
          </span>
        </button>
      )}

      {/* ── Modal Panier ── */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="🛒 Mon panier" width={500}>
        {items.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Panier vide" desc="Ajoutez des plats depuis le menu." />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '2px' }}>
              {items.map(item => (
                <div key={item.produitId} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'fadeUp 0.25s ease' }}>
                  {/* Ligne article */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gold)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>{item.prixUnitaire.toLocaleString()} GNF</div>
                    </div>
                    {/* Quantité */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      <QtyBtn onClick={() => updateQty(item.produitId, item.quantite - 1)} variant="default">
                        <Minus size={13} />
                      </QtyBtn>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', minWidth: 24, textAlign: 'center', fontSize: '1rem' }}>{item.quantite}</span>
                      <QtyBtn onClick={() => updateQty(item.produitId, item.quantite + 1)} variant="add">
                        <Plus size={13} />
                      </QtyBtn>
                    </div>
                    {/* Sous-total + supprimer */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{(item.prixUnitaire * item.quantite).toLocaleString()} GNF</span>
                      <button onClick={() => removeItem(item.produitId)} style={{ color: 'var(--crimson)', lineHeight: 0, minHeight: 'auto' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Note cuisinier */}
                  <div style={{ padding: '0 0.875rem 0.875rem' }}>
                    <textarea
                      placeholder="✏️ Note pour le cuisinier — ex: sans piment, bien cuit, sans oignon…"
                      value={item.note || ''}
                      onChange={e => updateNote(item.produitId, e.target.value)}
                      rows={2}
                      style={{
                        width: '100%', resize: 'none', padding: '0.6rem 0.75rem',
                        background: 'var(--gold-dim)', border: '1px dashed rgba(245,166,35,0.5)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                        fontSize: '0.83rem', fontFamily: 'var(--font-body)', lineHeight: 1.55,
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.borderStyle = 'solid'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(245,166,35,0.5)'; e.target.style.borderStyle = 'dashed'; }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total ({count} article{count > 1 ? 's' : ''})</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{total.toLocaleString()} GNF</span>
              </div>
            </div>

            <Btn onClick={() => { setCartOpen(false); setPayModal(true); }} icon={CreditCard} size="lg" style={{ width: '100%', fontSize: '1rem' }}>
              Payer par Mobile Money
            </Btn>
          </>
        )}
      </Modal>

      {/* ── Modal Paiement ── */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="💳 Paiement Mobile Money" width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ padding: '1.25rem', background: 'var(--gold-dim)', borderRadius: 'var(--radius-md)', border: '1.5px solid rgba(245,166,35,0.35)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Montant à payer</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{total.toLocaleString()} <span style={{ fontSize: '0.7em' }}>GNF</span></div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Numéro Mobile Money</label>
            <input type="tel" placeholder="Ex: 622 00 00 00" value={payForm.telephonePaiement} onChange={e => setPayForm(f => ({ ...f, telephonePaiement: e.target.value }))} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Opérateur</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { v: 'Orange Money',      emoji: '🟠', short: 'Orange' },
                { v: 'MTN Mobile Money',  emoji: '🟡', short: 'MTN'    },
                { v: 'Moov Money',        emoji: '🔵', short: 'Moov'   },
              ].map(({ v, emoji, short }) => (
                <button
                  key={v}
                  onClick={() => setPayForm(f => ({ ...f, operateur: v }))}
                  style={{
                    flex: 1, padding: '0.75rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${payForm.operateur === v ? 'var(--gold)' : 'var(--border-strong)'}`,
                    background: payForm.operateur === v ? 'var(--gold-dim)' : 'var(--surface)',
                    color: payForm.operateur === v ? 'var(--gold)' : 'var(--text-secondary)',
                    fontSize: '0.85rem', fontWeight: payForm.operateur === v ? 700 : 400,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{emoji}</span>
                  <span>{short}</span>
                </button>
              ))}
            </div>
          </div>

          <Btn onClick={handlePay} loading={paying} size="lg" style={{ width: '100%', marginTop: '0.25rem', fontSize: '1rem' }}>
            {paying ? 'Traitement…' : `Confirmer — ${total.toLocaleString()} GNF`}
          </Btn>
        </div>
      </Modal>

      {/* ── Modal Reçu ── */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Commande confirmée" width={420}>
        {receipt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--emerald-dim)', border: '1.5px solid rgba(16,185,129,0.35)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', textAlign: 'center', animation: 'bounceIn 0.5s var(--spring)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <div style={{ fontWeight: 800, color: 'var(--emerald)', fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '0.35rem' }}>Commande envoyée en cuisine !</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vous recevrez une notification quand votre plat est prêt</div>
            </div>
            {[
              { label: 'Référence',    value: receipt.reference,                    mono: true  },
              { label: 'Montant payé', value: `${receipt.montant?.toLocaleString()} GNF`, mono: true },
              { label: 'Statut',       value: receipt.statutCommande,               mono: false },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: mono ? 'var(--font-mono)' : 'inherit', color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
            <Btn onClick={() => setReceipt(null)} size="lg" style={{ width: '100%' }}>Fermer</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
