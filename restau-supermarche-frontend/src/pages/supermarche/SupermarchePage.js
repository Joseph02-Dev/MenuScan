import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Barcode, Plus, Minus, Trash2, CreditCard, ShoppingBag, X, ScanLine, QrCode, Search, ShoppingCart, Camera } from 'lucide-react';
import { produitsAPI, commandesAPI, paiementsAPI } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { Btn, Badge, Spinner, EmptyState, Modal, PageHeader, StatCard, CameraScanner } from '../../components/ui';

const API_BASE = (process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`).replace('/api', '');

const GROCERY_IMAGES = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
  'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&q=80',
  'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80',
  'https://images.unsplash.com/photo-1564303005-f90b0fbab4c2?w=400&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
  'https://images.unsplash.com/photo-1585621386284-b648a92f27de?w=400&q=80',
];

const getProductImage = (p, i) => p.image ? `${API_BASE}${p.image}` : GROCERY_IMAGES[i % GROCERY_IMAGES.length];

export default function SupermarchePage() {
  const [produits, setProduits] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Tous');

  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ telephonePaiement: '', operateur: 'Orange Money' });
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const inputRef = useRef(null);

  const { items, addItem, removeItem, updateQty, clearCart, total, count, setPlateforme } = useCart();
  const { show } = useToast();

  useEffect(() => { setPlateforme('supermarche'); }, [setPlateforme]);

  const loadProduits = useCallback(async () => {
    try {
      const res = await produitsAPI.getAll({ typePlateforme: 'supermarche' });
      setProduits(res.data.data || []);
    } catch { show('Impossible de charger les articles', 'error'); }
    finally { setLoadingProduits(false); }
  }, [show]);

  useEffect(() => { loadProduits(); }, [loadProduits]);

  const categories = ['Tous', ...new Set(produits.map(p => p.categorie).filter(Boolean))];

  const filtered = produits.filter(p =>
    (cat === 'Tous' || p.categorie === cat) &&
    p.nom.toLowerCase().includes(search.toLowerCase()) &&
    p.estDisponible !== false
  );

  const scanBarcode = async (code) => {
    setScanning(true);
    try {
      const res = await produitsAPI.scan(code.trim());
      addItem(res.data.data);
      show(`✓ ${res.data.data.nom} ajouté au panier`, 'success');
      setBarcode('');
      inputRef.current?.focus();
    } catch (err) {
      show(err.response?.data?.error || 'Produit introuvable', 'error');
    } finally { setScanning(false); }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    await scanBarcode(barcode);
  };

  const handleCameraScan = async (decoded) => {
    await scanBarcode(decoded);
  };

  const handlePay = async () => {
    if (!payForm.telephonePaiement) return show('Entrez votre numéro de téléphone', 'error');
    setPaying(true);
    try {
      const orderRes = await commandesAPI.create({
        typePlateforme: 'supermarche',
        items: items.map(i => ({ produitId: i.produitId, quantite: i.quantite })),
        modePaiement: 'Mobile Money',
      });
      const payRes = await paiementsAPI.initier({ commandeId: orderRes.data.data._id, ...payForm });
      setReceipt(payRes.data.data);
      clearCart();
      setPayModal(false);
      show('Paiement réussi ! Conservez votre QR Code de sortie.', 'success');
    } catch (err) {
      show(err.response?.data?.error || 'Erreur lors du paiement', 'error');
    } finally { setPaying(false); }
  };

  return (
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="Supermarché"
        subtitle="Parcourez les articles ou scannez un code-barres"
        action={count > 0 && (
          <Btn onClick={() => setPayModal(true)} icon={CreditCard}>
            Payer {total.toLocaleString()} GNF ({count})
          </Btn>
        )}
      />

      {/* Stats */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard label="Articles dans le panier" value={count} icon={ShoppingBag} color="var(--sky)" sub="articles sélectionnés" />
        <StatCard label="Total à payer" value={`${total.toLocaleString()} GNF`} icon={CreditCard} color="var(--gold)" sub="Mobile Money" />
      </div>

      {/* Scanner zone */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--sky-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ScanLine size={18} color="var(--sky)" />
          </div>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Scanner un code-barres</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ou parcourez le catalogue ci-dessous</p>
          </div>
        </div>
        <form className="scan-form" onSubmit={handleScan} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Barcode size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Ex: 3017620422003"
              style={{ paddingLeft: '2.4rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
            />
          </div>
          <Btn type="button" onClick={() => setCameraOpen(true)} variant="secondary" icon={ScanLine}>Caméra</Btn>
          <Btn type="submit" loading={scanning} icon={Plus}>Ajouter</Btn>
        </form>
      </div>

      {/* Catalogue */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
          Catalogue — {produits.length} article(s)
        </h2>

        {/* Search + categories */}
        <div className="filter-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              placeholder="Rechercher un article…"
              style={{ paddingLeft: '2.4rem', maxWidth: 280 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="cat-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding: '0.45rem 1rem', borderRadius: '100px', border: `1px solid ${cat === c ? 'var(--sky)' : 'var(--border-strong)'}`, background: cat === c ? 'var(--sky-dim)' : 'transparent', color: cat === c ? 'var(--sky)' : 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: cat === c ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)', whiteSpace: 'nowrap' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loadingProduits ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Aucun article" desc="Aucun article ne correspond à votre recherche." />
        ) : (
          <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((p, i) => {
              const inCart = items.find(it => it.produitId === p._id);
              return (
                <div key={p._id}
                  style={{ background: 'var(--surface-raised)', border: `1.5px solid ${inCart ? 'rgba(56,189,248,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', boxShadow: inCart ? '0 0 24px rgba(56,189,248,0.14)' : '0 2px 12px rgba(0,0,0,0.18)', animation: `springIn 0.5s var(--spring) ${i * 0.05}s both` }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = inCart ? '0 12px 32px rgba(56,189,248,0.22)' : '0 12px 28px rgba(0,0,0,0.32)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = inCart ? '0 0 24px rgba(56,189,248,0.14)' : '0 2px 12px rgba(0,0,0,0.18)'; }}
                >
                  <div className="product-card-img" style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={getProductImage(p, i)}
                      alt={p.nom}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                      onError={e => { e.target.src = GROCERY_IMAGES[i % GROCERY_IMAGES.length]; }}
                      onMouseEnter={e => { e.target.style.transform = 'scale(1.07)'; }}
                      onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,30,0.75) 0%, transparent 55%)' }} />
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                      <span style={{ background: 'rgba(10,15,30,0.75)', backdropFilter: 'blur(8px)', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '100px', border: '1px solid var(--border-strong)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {p.categorie}
                      </span>
                    </div>
                    {p.codeBarre && (
                      <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Barcode size={11} color="rgba(255,255,255,0.55)" />
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>{p.codeBarre}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <h3 className="product-name" style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.4rem', lineHeight: 1.3 }}>{p.nom}</h3>
                    <div className="product-price" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--sky)', fontFamily: 'var(--font-display)', marginBottom: '0.875rem' }}>
                      {p.prix.toLocaleString()} <span style={{ fontSize: '0.7em', fontWeight: 600, opacity: 0.8 }}>GNF</span>
                    </div>
                    {inCart ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button onClick={() => updateQty(p._id, inCart.quantite - 1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-raised)', border: '1.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0, transition: 'all 0.15s var(--spring)' }}><Minus size={15} /></button>
                        <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{inCart.quantite}</span>
                        <button onClick={() => updateQty(p._id, inCart.quantite + 1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sky)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0F1E', flexShrink: 0, transition: 'all 0.15s var(--spring)' }}><Plus size={15} /></button>
                        <button onClick={() => removeItem(p._id)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--crimson-dim)', border: '1.5px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crimson)', flexShrink: 0 }}><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { addItem(p); show(`${p.nom} ajouté !`, 'success'); }}
                        style={{
                          width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                          background: 'var(--sky-dim)', border: '1.5px solid rgba(56,189,248,0.4)',
                          color: 'var(--sky)', fontWeight: 700, fontSize: '0.92rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          cursor: 'pointer', transition: 'all 0.18s ease', fontFamily: 'var(--font-body)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--sky)'; e.currentTarget.style.color = '#0A0F1E'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--sky-dim)'; e.currentTarget.style.color = 'var(--sky)'; }}
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
      </div>

      {/* Cart */}
      {items.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Panier ({count})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
            {items.map((item, i) => (
              <div key={item.produitId} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--sky-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sky)', fontFamily: 'var(--font-mono)' }}>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.prixUnitaire.toLocaleString()} GNF / unité</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button onClick={() => updateQty(item.produitId, item.quantite - 1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-raised)', border: '1.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.15s var(--spring)', flexShrink: 0 }}><Minus size={14} /></button>
                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', minWidth: 28, textAlign: 'center', fontSize: '1rem' }}>{item.quantite}</span>
                  <button onClick={() => updateQty(item.produitId, item.quantite + 1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sky)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0F1E', transition: 'all 0.15s var(--spring)', flexShrink: 0 }}><Plus size={14} /></button>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sky)', minWidth: 90, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {(item.prixUnitaire * item.quantite).toLocaleString()} GNF
                </div>
                <button onClick={() => removeItem(item.produitId)} style={{ color: 'var(--crimson)', lineHeight: 0, flexShrink: 0 }}><X size={15} /></button>
              </div>
            ))}
          </div>

          <div className="total-cta" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Total</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>{total.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 600 }}>GNF</span></div>
            </div>
            <div className="total-cta-btns" style={{ display: 'flex', gap: '0.75rem' }}>
              <Btn onClick={clearCart} variant="danger" icon={Trash2}>Vider</Btn>
              <Btn onClick={() => setPayModal(true)} icon={CreditCard} size="lg">Payer par Mobile Money</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Paiement Mobile Money" width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--gold-dim)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,166,35,0.3)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Montant total</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{total.toLocaleString()} GNF</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{count} article(s)</div>
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
                  style={{ flex: 1, padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-md)', border: `1px solid ${payForm.operateur === op ? 'var(--gold)' : 'var(--border-strong)'}`, background: payForm.operateur === op ? 'var(--gold-dim)' : 'var(--surface)', color: payForm.operateur === op ? 'var(--gold)' : 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: payForm.operateur === op ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)' }}>
                  {op === 'Orange Money' ? '🟠' : op === 'MTN Mobile Money' ? '🟡' : '🔵'} {op.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={handlePay} loading={paying} size="lg" style={{ width: '100%', marginTop: '0.5rem' }}>
            {paying ? 'Traitement…' : 'Confirmer et payer'}
          </Btn>
        </div>
      </Modal>

      {/* Camera barcode scanner */}
      <CameraScanner
        open={cameraOpen}
        onScan={handleCameraScan}
        onClose={() => setCameraOpen(false)}
        mode="barcode"
      />

      {/* QR Code receipt */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Votre ticket de sortie" width={420}>
        {receipt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <div style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--emerald)', fontSize: '1rem', marginBottom: '0.25rem' }}>Paiement validé !</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>Présentez ce code au vigile pour sortir</div>
            </div>
            {receipt.qrCodeSortie && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <QrCode size={64} color="var(--text-primary)" />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', wordBreak: 'break-all', textAlign: 'center' }}>{receipt.qrCodeSortie}</div>
                <Badge variant="green">QR Code de sortie valide</Badge>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Référence', value: receipt.reference },
                { label: 'Montant', value: `${receipt.montant?.toLocaleString()} GNF` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.875rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{value}</span>
                </div>
              ))}
            </div>
            <Btn onClick={() => setReceipt(null)} style={{ width: '100%' }}>Fermer</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
