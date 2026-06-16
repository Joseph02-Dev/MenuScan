import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsQR from 'jsqr';
import { QrCode, ShieldCheck, ShieldAlert, ScanLine, Camera, X } from 'lucide-react';
import { paiementsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Btn, PageHeader, Spinner } from '../../components/ui';

/* ══════════════════════════════════════════════════════
   Décode un QR code depuis un fichier image
   Trois stratégies : jsQR brut → jsQR contrasté → BarcodeDetector
══════════════════════════════════════════════════════ */
async function decodeImageFile(file) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  URL.revokeObjectURL(url);

  const MAX = 1400;
  const scale = Math.min(MAX / (img.naturalWidth || 1), MAX / (img.naturalHeight || 1), 1);
  const W = Math.round((img.naturalWidth  || 640) * scale);
  const H = Math.round((img.naturalHeight || 480) * scale);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  const raw = ctx.getImageData(0, 0, W, H);

  const r1 = jsQR(raw.data, W, H, { inversionAttempts: 'attemptBoth' });
  if (r1?.data) return r1.data;

  const enhanced = new Uint8ClampedArray(raw.data.length);
  for (let i = 0; i < raw.data.length; i += 4) {
    const gray = 0.299 * raw.data[i] + 0.587 * raw.data[i + 1] + 0.114 * raw.data[i + 2];
    const v = gray > 127 ? 255 : 0;
    enhanced[i] = enhanced[i + 1] = enhanced[i + 2] = v;
    enhanced[i + 3] = 255;
  }
  const r2 = jsQR(enhanced, W, H, { inversionAttempts: 'attemptBoth' });
  if (r2?.data) return r2.data;

  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      const bm  = await createImageBitmap(file);
      const res = await det.detect(bm);
      if (res.length) return res[0].rawValue;
    } catch (_) {}
  }

  throw new Error('QR Code non reconnu');
}

/* ══════════════════════════════════════════════════════
   Scanner caméra — identique à l'écran caissier
   • Live : getUserMedia + jsQR frame par frame
   • Photo : input[capture] + decodeImageFile (fallback)
══════════════════════════════════════════════════════ */
function LiveScanner({ onDetected, onClose }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const fileRef   = useRef(null);
  const divId     = useRef('qr-s-' + Math.random().toString(36).slice(2, 8)).current;

  const [phase, setPhase]       = useState('init');
  const [photoErr, setPhotoErr] = useState('');

  useEffect(() => {
    let alive = true;

    async function tryLive() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return true; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!alive) return true;
        setPhase('live');

        const video  = videoRef.current;
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');

        const tick = async () => {
          if (!alive) return;
          if (video.readyState >= 2 && video.videoWidth > 0) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
            if (code?.data) { onDetected(code.data); return; }

            if ('BarcodeDetector' in window) {
              try {
                const det = new window.BarcodeDetector({ formats: ['qr_code'] });
                const res = await det.detect(video);
                if (res.length) { onDetected(res[0].rawValue); return; }
              } catch (_) {}
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return true;
      } catch (_) { return false; }
    }

    tryLive().then(ok => { if (!ok && alive) setPhase('photo'); });

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onDetected]);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoErr('');
    setPhase('decoding');
    try {
      const val = await decodeImageFile(file);
      onDetected(val);
    } catch {
      setPhotoErr('QR Code non reconnu. Cadrez bien le code sur fond blanc, bonne lumière, et réessayez.');
      setPhase('photo');
    }
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

      {/* ── Vue live ── */}
      {(phase === 'init' || phase === 'live') && (
        <div style={{ position: 'relative', width: '100%', maxWidth: 300, height: 300, borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#000', border: '2px solid rgba(245,166,35,0.4)' }}>
          <video ref={videoRef} muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: phase === 'live' ? 1 : 0 }} />
          <div id={divId} style={{ position: 'absolute', inset: 0 }} />

          {phase === 'live' && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
              <div style={{ position: 'relative', width: '62%', height: '62%', zIndex: 1 }}>
                <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', background: 'transparent' }} />
                <div className="sortie-lv-line" />
                {[
                  { top:-2,    left:-2,   borderTop:    '3px solid var(--gold)', borderLeft:   '3px solid var(--gold)' },
                  { top:-2,    right:-2,  borderTop:    '3px solid var(--gold)', borderRight:  '3px solid var(--gold)' },
                  { bottom:-2, left:-2,   borderBottom: '3px solid var(--gold)', borderLeft:   '3px solid var(--gold)' },
                  { bottom:-2, right:-2,  borderBottom: '3px solid var(--gold)', borderRight:  '3px solid var(--gold)' },
                ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />)}
              </div>
            </div>
          )}
          {phase === 'init' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: '#fff' }}>
              <Spinner size={28} /><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Ouverture caméra…</span>
            </div>
          )}
        </div>
      )}
      {phase === 'live' && (
        <p style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 600, margin: 0, textAlign: 'center' }}>
          Pointez le QR Code du client vers la caméra
        </p>
      )}

      {/* ── Mode photo fallback ── */}
      {(phase === 'photo' || phase === 'decoding') && (
        <>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'var(--gold-dim)', border: '2px solid rgba(245,166,35,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {phase === 'decoding' ? <Spinner size={30} /> : <Camera size={36} color="var(--gold)" />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem' }}>
              {phase === 'decoding' ? 'Décodage en cours…' : 'Photographier le QR Code'}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Appuyez, cadrez bien le QR Code sur fond blanc, bonne lumière
            </p>
          </div>
          {photoErr && (
            <div style={{ padding: '0.625rem 0.875rem', background: 'var(--crimson-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--crimson)', width: '100%', textAlign: 'center', lineHeight: 1.5 }}>
              {photoErr}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhoto} style={{ display: 'none' }} />
          <Btn onClick={() => fileRef.current?.click()} icon={Camera}
            disabled={phase === 'decoding'} style={{ width: '100%', justifyContent: 'center' }}>
            {phase === 'decoding' ? 'Décodage…' : 'Prendre en photo le QR Code'}
          </Btn>
        </>
      )}

      <Btn onClick={onClose} variant="secondary" size="sm" icon={X}>
        Annuler — saisir manuellement
      </Btn>

      <style>{`
        .sortie-lv-line {
          position:absolute; left:0; right:0; height:2px;
          background:linear-gradient(90deg,transparent,var(--gold),transparent);
          animation:sortieLvScan 1.8s ease-in-out infinite;
        }
        @keyframes sortieLvScan { 0%{top:4%} 50%{top:92%} 100%{top:4%} }
        #${divId} video { object-fit:cover !important; width:100% !important; height:100% !important; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Page principale — Contrôle de Sortie (Admin)
══════════════════════════════════════════════════════ */
export default function SortiePage() {
  const [qrCode, setQrCode]       = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { show } = useToast();

  const validate = useCallback(async (code) => {
    const c = (code || qrCode).trim();
    if (!c) return;
    setLoading(true);
    setResult(null);
    setScannerOpen(false);
    try {
      const res = await paiementsAPI.validerSortie({ qrCodeScanne: c });
      setResult({ ok: true, ...res.data });
      show('Sortie autorisée !', 'success');
    } catch (err) {
      const data = err.response?.data;
      setResult({ ok: false, error: data?.error || 'QR Code invalide', action: data?.action });
      show('Accès refusé', 'error');
    } finally { setLoading(false); }
  }, [qrCode, show]);

  const handleDetected = useCallback((decoded) => {
    setQrCode(decoded);
    validate(decoded);
  }, [validate]);

  const handleSubmit = (e) => { e.preventDefault(); validate(); };

  return (
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 680, margin: '0 auto' }}>
      <PageHeader
        title="Contrôle de Sortie"
        subtitle="Scannez le QR Code du client pour valider la sortie."
      />

      {!scannerOpen ? (
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScanLine size={22} color="var(--gold)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Scanner le QR Code</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Caméra automatique ou saisie manuelle</p>
            </div>
          </div>

          {/* Bouton scan principal */}
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            style={{
              width: '100%', marginBottom: '1.25rem', padding: '1.25rem',
              borderRadius: 'var(--radius-md)', border: '2px solid var(--gold)',
              background: 'var(--gold-dim)', color: 'var(--gold)',
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--gold-dim)'}
          >
            <Camera size={20} />
            Scanner avec la caméra
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ou saisir manuellement</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Code QR de sortie</label>
              <div style={{ position: 'relative' }}>
                <QrCode size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Ex: SO-XXXXXXXXXX"
                  style={{ paddingLeft: '2.4rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  value={qrCode}
                  onChange={e => setQrCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <Btn type="submit" loading={loading} size="lg" icon={ShieldCheck} style={{ width: '100%' }} disabled={!qrCode.trim()}>
              {loading ? 'Vérification…' : 'Valider la sortie'}
            </Btn>
          </form>
        </div>
      ) : (
        /* ── Scanner ouvert ── */
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Scan en cours</h2>
            <button onClick={() => setScannerOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
              <X size={16} color="var(--text-muted)" />
            </button>
          </div>
          <LiveScanner
            onDetected={handleDetected}
            onClose={() => setScannerOpen(false)}
          />
        </div>
      )}

      {/* ── Résultat ── */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 300, margin: '0 auto 1.25rem' }}>
              {[
                { label: 'Client',      value: result.data.Client },
                { label: 'Montant payé', value: `${result.data.Montant?.toLocaleString()} GNF` },
                { label: 'Articles',    value: result.data.Articles },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.875rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { setResult(null); setQrCode(''); setScannerOpen(false); }}
            style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Scanner un autre code
          </button>
        </div>
      )}
    </div>
  );
}
