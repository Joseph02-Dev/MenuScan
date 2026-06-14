import React, { useState, useCallback } from 'react';
import { QrCode, ShieldCheck, ShieldAlert, ScanLine, Camera } from 'lucide-react';
import { paiementsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Btn, PageHeader, CameraScanner } from '../../components/ui';

export default function SortiePage() {
  const [qrCode, setQrCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const { show } = useToast();

  const validate = async (code) => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await paiementsAPI.validerSortie({ qrCodeScanne: code.trim() });
      setResult({ ok: true, ...res.data });
      show('Sortie autorisée !', 'success');
    } catch (err) {
      const data = err.response?.data;
      setResult({ ok: false, error: data?.error || 'QR Code invalide', action: data?.action });
      show('Accès refusé', 'error');
    } finally { setLoading(false); }
  };

  const handleValidate = (e) => { e.preventDefault(); validate(qrCode); };

  const handleCameraScan = useCallback((decoded) => {
    setQrCode(decoded);
    validate(decoded);
  }, []);

  return (
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 680, margin: '0 auto' }}>
      <PageHeader
        title="Contrôle de Sortie"
        subtitle="Validez le QR Code de sortie du client pour autoriser le passage."
      />

      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScanLine size={22} color="var(--gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Scanner le QR Code</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Caméra ou saisie manuelle</p>
          </div>
        </div>

        {/* Bouton scan caméra */}
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          style={{ width: '100%', marginBottom: '1.25rem', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '2px dashed var(--gold)', background: 'var(--gold-dim)', color: 'var(--gold)', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'all var(--transition)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.22)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold-dim)'; }}
        >
          <Camera size={18} />
          Scanner avec la caméra du téléphone
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ou saisir manuellement</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleValidate}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Code QR de sortie</label>
            <div style={{ position: 'relative' }}>
              <QrCode size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Ex: VALID-OUT-..."
                style={{ paddingLeft: '2.4rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
                value={qrCode}
                onChange={e => setQrCode(e.target.value)}
              />
            </div>
          </div>
          <Btn type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
            {loading ? 'Vérification…' : 'Valider la sortie'}
          </Btn>
        </form>
      </div>

      <CameraScanner
        open={cameraOpen}
        onScan={handleCameraScan}
        onClose={() => setCameraOpen(false)}
        mode="qrcode"
      />

      {/* Result */}
      {result && (
        <div style={{
          borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center',
          border: `2px solid ${result.ok ? 'var(--emerald)' : 'var(--crimson)'}`,
          background: result.ok ? 'var(--emerald-dim)' : 'var(--crimson-dim)',
          animation: 'scaleIn .3s ease',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
            {result.ok ? '🟢' : '🔴'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {result.ok
              ? <ShieldCheck size={24} color="var(--emerald)" />
              : <ShieldAlert size={24} color="var(--crimson)" />}
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: result.ok ? 'var(--emerald)' : 'var(--crimson)' }}>
              {result.ok ? 'SORTIE AUTORISÉE' : 'ACCÈS REFUSÉ'}
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {result.ok ? result.message : result.error}
          </p>

          {result.ok && result.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 300, margin: '0 auto' }}>
              {[
                { label: 'Client', value: result.data.Client },
                { label: 'Montant payé', value: `${result.data.Montant?.toLocaleString()} GNF` },
                { label: 'Articles', value: result.data.Articles },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.875rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => { setResult(null); setQrCode(''); }} style={{ marginTop: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Scanner un autre code
          </button>
        </div>
      )}
    </div>
  );
}
