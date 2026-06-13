import React, { useState, useEffect, useRef } from 'react';
import { Barcode, Plus, Minus, Trash2, CreditCard, ShoppingBag, X, ScanLine, QrCode } from 'lucide-react';
import { produitsAPI, commandesAPI, paiementsAPI } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { Btn, Badge, Spinner, EmptyState, Modal, PageHeader, StatCard } from '../../components/ui';

export default function SupermarchePage() {
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ telephonePaiement: '', operateur: 'Orange Money' });
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const inputRef = useRef(null);

  const { items, addItem, removeItem, updateQty, clearCart, total, count, setPlateforme } = useCart();
  const { show } = useToast();

  useEffect(() => { setPlateforme('supermarche'); }, [setPlateforme]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    setScanning(true);
    try {
      const res = await produitsAPI.scan(barcode.trim());
      addItem(res.data.data);
      show(`✓ ${res.data.data.nom} ajouté`, 'success');
      setBarcode('');
      inputRef.current?.focus();
    } catch (err) {
      show(err.response?.data?.error || 'Produit introuvable', 'error');
    } finally { setScanning(false); }
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
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Scan & Go"
        subtitle="Scannez les codes-barres, payez, sortez sans attendre."
        action={count > 0 && (
          <Btn onClick={() => setPayModal(true)} icon={CreditCard}>
            Payer {total.toLocaleString()} GNF
          </Btn>
        )}
      />

      {/* Stats */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard label="Articles scannés" value={count} icon={ShoppingBag} color="var(--sky)" sub="dans votre panier" />
        <StatCard label="Total à payer" value={`${total.toLocaleString()} GNF`} icon={CreditCard} color="var(--gold)" sub="Mobile Money" />
      </div>

      {/* Scanner zone */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--sky-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ScanLine size={20} color="var(--sky)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Scanner un produit</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saisissez ou scannez le code-barres</p>
          </div>
        </div>
        <form className="scan-form" onSubmit={handleScan} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Barcode size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Ex: 3017620422003"
              style={{ paddingLeft: '2.4rem', fontSize: '1rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              autoFocus
            />
          </div>
          <Btn type="submit" loading={scanning} icon={Plus}>Ajouter</Btn>
        </form>

        {scanning && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--sky)', fontSize: '0.85rem' }}>
            <ScanLine size={16} style={{ animation: 'pulse 1s ease-in-out infinite' }} />
            Recherche du produit en cours…
          </div>
        )}
      </div>

      {/* Cart */}
      {items.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Panier vide" desc="Scannez un code-barres pour ajouter des articles à votre panier." />
      ) : (
        <div>
          <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Articles ({count})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {items.map((item, i) => (
              <div key={item.produitId} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', transition: 'all var(--transition)', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--sky-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sky)', fontFamily: 'var(--font-mono)' }}>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nom}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.prixUnitaire.toLocaleString()} GNF / unité</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button onClick={() => updateQty(item.produitId, item.quantite - 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Minus size={12} /></button>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 24, textAlign: 'center' }}>{item.quantite}</span>
                  <button onClick={() => updateQty(item.produitId, item.quantite + 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sky)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0F1E' }}><Plus size={12} /></button>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sky)', minWidth: 90, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {(item.prixUnitaire * item.quantite).toLocaleString()} GNF
                </div>
                <button onClick={() => removeItem(item.produitId)} style={{ color: 'var(--crimson)', lineHeight: 0, flexShrink: 0 }}><X size={15} /></button>
              </div>
            ))}
          </div>

          {/* Total & CTA */}
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
