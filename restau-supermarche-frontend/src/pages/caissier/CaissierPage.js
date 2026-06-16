import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsQR from 'jsqr';
import {
  ShoppingBag, CheckCircle, Clock, RefreshCw, Wifi, WifiOff,
  ShieldCheck, ShieldAlert, Camera, ScanLine, AlertTriangle, QrCode, X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import { paiementsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Btn, Badge, Spinner, EmptyState, Modal } from '../../components/ui';

const API_BASE = (process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`).replace('/api', '');
const GROCERY_IMAGES = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=60',
  'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=200&q=60',
  'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&q=60',
  'https://images.unsplash.com/photo-1585621386284-b648a92f27de?w=200&q=60',
];

/* ══════════════════════════════════════════════════════
   Décode un QR code depuis un File image
   Stratégies par ordre de fiabilité :
   1. jsQR sur pixels bruts (le plus fiable, fonctionne sur écrans)
   2. jsQR sur image contrastée (améliore les cas difficiles)
   3. BarcodeDetector natif (bonus si dispo)
══════════════════════════════════════════════════════ */
async function decodeImageFile(file) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  URL.revokeObjectURL(url);

  // Limiter la résolution pour éviter les gros blobs inutiles
  const MAX = 1400;
  const scale = Math.min(MAX / (img.naturalWidth || 1), MAX / (img.naturalHeight || 1), 1);
  const W = Math.round((img.naturalWidth  || 640) * scale);
  const H = Math.round((img.naturalHeight || 480) * scale);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);

  const raw = ctx.getImageData(0, 0, W, H);

  // ─── Stratégie 1 : jsQR brut (les deux orientations) ───
  const r1 = jsQR(raw.data, W, H, { inversionAttempts: 'attemptBoth' });
  if (r1?.data) return r1.data;

  // ─── Stratégie 2 : jsQR sur image en niveaux de gris contrastés ───
  const enhanced = new Uint8ClampedArray(raw.data.length);
  for (let i = 0; i < raw.data.length; i += 4) {
    const gray = 0.299 * raw.data[i] + 0.587 * raw.data[i + 1] + 0.114 * raw.data[i + 2];
    // Étirement du contraste : si la valeur est > seuil → blanc, sinon → noir
    const v = gray > 127 ? 255 : 0;
    enhanced[i] = enhanced[i + 1] = enhanced[i + 2] = v;
    enhanced[i + 3] = 255;
  }
  const r2 = jsQR(enhanced, W, H, { inversionAttempts: 'attemptBoth' });
  if (r2?.data) return r2.data;

  // ─── Stratégie 3 : BarcodeDetector natif ───
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
   Scanner caméra — deux modes :
   • Live : getUserMedia + BarcodeDetector ou jsQR sur canvas (APK Capacitor)
   • Photo : input[capture] + decodeImageFile (navigateur HTTP)
══════════════════════════════════════════════════════ */
function LiveScanner({ onDetected, onClose }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const canvasRef  = useRef(document.createElement('canvas'));
  const fileRef    = useRef(null);
  const divId      = useRef('qr-h5-' + Math.random().toString(36).slice(2, 8)).current;
  const html5Ref   = useRef(null);
  const startedRef = useRef(false);

  // 'init' | 'live' | 'photo' | 'decoding'
  const [phase, setPhase]     = useState('init');
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

            // jsQR en premier (disponible partout)
            const code = jsQR(imageData.data, canvas.width, canvas.height, {
              inversionAttempts: 'attemptBoth'
            });
            if (code?.data) { onDetected(code.data); return; }

            // BarcodeDetector en complément
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
      } catch (_) {
        return false;
      }
    }

    tryLive().then(ok => { if (!ok && alive) setPhase('photo'); });

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (html5Ref.current && startedRef.current) {
        try { html5Ref.current.stop().catch(() => {}); } catch (_) {}
      }
      html5Ref.current = null;
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
        <div style={{ position: 'relative', width: '100%', maxWidth: 300, height: 300, borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#000', border: '2px solid rgba(56,189,248,0.4)' }}>
          <video ref={videoRef} muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                     opacity: phase === 'live' ? 1 : 0 }} />
          <div id={divId} style={{ position: 'absolute', inset: 0 }} />

          {/* Viseur animé */}
          {phase === 'live' && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
              <div style={{ position: 'relative', width: '62%', height: '62%', zIndex: 1 }}>
                <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', background: 'transparent' }} />
                <div className="lv-line" />
                {[
                  { top:-2, left:-2,   borderTop:    '3px solid var(--sky)', borderLeft:   '3px solid var(--sky)' },
                  { top:-2, right:-2,  borderTop:    '3px solid var(--sky)', borderRight:  '3px solid var(--sky)' },
                  { bottom:-2, left:-2,  borderBottom: '3px solid var(--sky)', borderLeft:  '3px solid var(--sky)' },
                  { bottom:-2, right:-2, borderBottom: '3px solid var(--sky)', borderRight: '3px solid var(--sky)' },
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
        <p style={{ fontSize: '0.82rem', color: 'var(--sky)', fontWeight: 600, margin: 0, textAlign: 'center' }}>
          Pointez le QR Code du client vers la caméra
        </p>
      )}

      {/* ── Mode photo (fallback HTTP) ── */}
      {(phase === 'photo' || phase === 'decoding') && (
        <>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'var(--sky-dim)', border: '2px solid rgba(56,189,248,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {phase === 'decoding' ? <Spinner size={30} /> : <Camera size={36} color="var(--sky)" />}
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
        .lv-line {
          position:absolute; left:0; right:0; height:2px;
          background:linear-gradient(90deg,transparent,var(--sky),transparent);
          animation:lvScan 1.8s ease-in-out infinite;
        }
        @keyframes lvScan { 0%{top:4%} 50%{top:92%} 100%{top:4%} }
        #${divId} video { object-fit:cover !important; width:100% !important; height:100% !important; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Modal de vérification
══════════════════════════════════════════════════════ */
function VerifModal({ cmd, onClose, onSuccess }) {
  const [step, setStep]             = useState('input');
  const [codeManuel, setCodeManuel] = useState('');
  const [apiError, setApiError]     = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (step === 'input') setTimeout(() => inputRef.current?.focus(), 150);
  }, [step]);

  const handleDetected = useCallback(async (code) => {
    setStep('validating');
    if (code !== cmd.qrCodeSortie) { setCodeManuel(code); setStep('mismatch'); return; }
    try {
      await paiementsAPI.validerSortie({ qrCodeScanne: code });
      setStep('ok');
      setTimeout(() => { onSuccess(cmd._id); onClose(); }, 2000);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Erreur de validation');
      setStep('api_error');
    }
  }, [cmd, onClose, onSuccess]);

  const verifierManuel = () => { const v = codeManuel.trim(); if (v) handleDetected(v); };
  const reset = () => { setCodeManuel(''); setApiError(''); setStep('input'); };

  return (
    <Modal open onClose={step !== 'validating' ? onClose : undefined} title={`Vérification — ${cmd.clientNom}`} width={480}>

      {/* Récap */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Total attendu</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{cmd.montantTotal?.toLocaleString()} GNF</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{cmd.articles?.length} article(s)</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{cmd.reference?.slice(0, 16)}…</div>
        </div>
      </div>

      {/* ── Saisie ── */}
      {step === 'input' && (
        <>
          <div style={{ background: '#fff', border: '2px solid rgba(56,189,248,0.3)', borderRadius: 'var(--radius-md)', padding: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>QR Code de référence</div>
            <QRCodeSVG value={cmd.qrCodeSortie} size={120} bgColor="#ffffff" fgColor="#0A0F1E" level="L" />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#0A0F1E', letterSpacing: '0.1em' }}>{cmd.qrCodeSortie}</div>
          </div>

          <button onClick={() => setStep('scanning')}
            style={{ width: '100%', marginBottom: '1.1rem', padding: '1rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--sky)', background: 'var(--sky-dim)', color: 'var(--sky)', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            <Camera size={20} /> Scanner le QR Code du client
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ou saisir manuellement</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div style={{ marginBottom: '1.1rem' }}>
            <div style={{ position: 'relative' }}>
              <QrCode size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input ref={inputRef} type="text" placeholder="SO-XXXXXXXXXX"
                style={{ paddingLeft: '2.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                value={codeManuel} onChange={e => setCodeManuel(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && verifierManuel()} />
            </div>
          </div>
          <Btn onClick={verifierManuel} size="lg" icon={ShieldCheck} style={{ width: '100%' }} disabled={!codeManuel.trim()}>
            Vérifier et valider
          </Btn>
        </>
      )}

      {/* ── Scanner ── */}
      {step === 'scanning' && (
        <LiveScanner onDetected={handleDetected} onClose={() => setStep('input')} />
      )}

      {/* ── Validation ── */}
      {step === 'validating' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <Spinner size={36} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.75rem' }}>Validation en cours…</p>
        </div>
      )}

      {/* ── Mismatch ── */}
      {step === 'mismatch' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--crimson-dim)', border: '2px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <AlertTriangle size={28} color="var(--crimson)" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--crimson)', marginBottom: '0.5rem' }}>Code ne correspond pas</h3>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--crimson-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--crimson)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>⚠ Code détecté :</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{codeManuel}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Btn onClick={() => setStep('scanning')} variant="secondary" style={{ flex: 1 }} icon={ScanLine}>Rescanner</Btn>
            <Btn onClick={onClose} variant="danger" style={{ flex: 1 }} icon={ShieldAlert}>Refuser</Btn>
          </div>
        </div>
      )}

      {/* ── OK ── */}
      {step === 'ok' && (
        <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--emerald-dim)', border: '2px solid rgba(16,185,129,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <ShieldCheck size={32} color="var(--emerald)" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--emerald)', marginBottom: '0.4rem' }}>SORTIE AUTORISÉE</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Bonne journée, {cmd.clientNom} !</p>
        </div>
      )}

      {/* ── Erreur API ── */}
      {step === 'api_error' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--crimson-dim)', border: '2px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <ShieldAlert size={28} color="var(--crimson)" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--crimson)', marginBottom: '0.5rem' }}>Validation refusée</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>{apiError}</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Btn onClick={reset} variant="secondary" style={{ flex: 1 }}>Réessayer</Btn>
            <Btn onClick={onClose} variant="danger" style={{ flex: 1 }}>Fermer</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════ */
export default function CaissierPage() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('En attente');
  const [connected, setConnected] = useState(false);
  const [results, setResults]     = useState({});
  const [newAlert, setNewAlert]   = useState(null);
  const [scanModal, setScanModal] = useState(null);
  const { show } = useToast();

  const loadCommandes = useCallback(async () => {
    try {
      const res = await paiementsAPI.getSortiesEnAttente();
      setCommandes(res.data.data || []);
    } catch {
      show('Erreur chargement des commandes', 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadCommandes();
    const socketUrl = process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:5000`;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => { setConnected(true); socket.emit('rejoindre_chambre', 'caissier'); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('nouvelle_commande_caissier', (cmd) => {
      setCommandes(prev => prev.find(c => String(c._id) === String(cmd._id)) ? prev : [cmd, ...prev]);
      setNewAlert(cmd);
      setTimeout(() => setNewAlert(null), 5000);
      show(`Nouveau client — ${cmd.clientNom} — ${cmd.montantTotal?.toLocaleString()} GNF`, 'info');
    });
    return () => socket.disconnect();
  }, [loadCommandes, show]);

  useEffect(() => {
    const id = setInterval(loadCommandes, 30000);
    return () => clearInterval(id);
  }, [loadCommandes]);

  const onSuccess = (cmdId) => {
    setResults(r => ({ ...r, [cmdId]: { ok: true } }));
    show('Sortie autorisée !', 'success');
  };

  const pending   = commandes.filter(c => !results[c._id]);
  const validated = commandes.filter(c => results[c._id]?.ok);
  const refused   = commandes.filter(c => results[c._id] && !results[c._id].ok);
  const displayed = filter === 'En attente' ? pending
    : filter === 'Autorisé' ? validated : filter === 'Refusé' ? refused : commandes;

  if (loading) return <div style={{ padding: '2rem' }}><Spinner /></div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--night)' }}>

      {newAlert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'linear-gradient(135deg, var(--sky) 0%, #0284c7 100%)', color: '#0A0F1E', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 24px rgba(56,189,248,0.5)', animation: 'slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <span style={{ fontSize: '2rem' }}>🛒</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>Nouveau client à la sortie !</div>
            <div style={{ fontSize: '0.83rem', opacity: 0.85 }}>{newAlert.clientNom} — {newAlert.montantTotal?.toLocaleString()} GNF</div>
          </div>
        </div>
      )}

      <div className="caissier-sticky-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--night)', borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--sky-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={20} color="var(--sky)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>Écran Caissier — Sortie</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>{pending.length} en attente · {validated.length} autorisé(s)</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: connected ? 'var(--emerald)' : 'var(--crimson)', background: connected ? 'var(--emerald-dim)' : 'var(--crimson-dim)', border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '100px', padding: '0.3rem 0.75rem' }}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'En direct' : 'Hors ligne'}
            </div>
            <button onClick={loadCommandes} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>
              <RefreshCw size={12} />Actualiser
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', paddingBottom: '0.875rem', overflowX: 'auto' }}>
          {[
            { key: 'En attente', count: pending.length,   color: 'var(--sky)',     bg: 'var(--sky-dim)',     border: 'rgba(56,189,248,0.3)' },
            { key: 'Autorisé',   count: validated.length, color: 'var(--emerald)', bg: 'var(--emerald-dim)', border: 'rgba(16,185,129,0.3)' },
            { key: 'Refusé',     count: refused.length,   color: 'var(--crimson)', bg: 'var(--crimson-dim)', border: 'rgba(239,68,68,0.3)' },
            { key: 'Tout',       count: commandes.length, color: 'var(--gold)',    bg: 'var(--gold-dim)',    border: 'rgba(245,166,35,0.3)' },
          ].map(({ key, count, color, bg, border }) => {
            const on = filter === key;
            return (
              <button key={key} onClick={() => setFilter(key)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem', borderRadius: '100px', border: `1px solid ${on ? border : 'var(--border-strong)'}`, background: on ? bg : 'transparent', color: on ? color : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: on ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {key}
                <span style={{ background: on ? color : 'var(--surface-raised)', color: on ? '#0A0F1E' : 'var(--text-muted)', borderRadius: '100px', padding: '0.05rem 0.45rem', fontSize: '0.68rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        {displayed.length === 0 ? (
          <EmptyState icon={ShoppingBag}
            title={filter === 'En attente' ? 'Aucun client en attente' : 'Aucune entrée'}
            desc={filter === 'En attente' ? "Les commandes apparaîtront automatiquement." : 'Aucune commande dans cette catégorie.'} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {displayed.map(cmd => {
              const result = results[cmd._id];
              const bord = result?.ok ? 'rgba(16,185,129,0.5)' : result ? 'rgba(239,68,68,0.5)' : 'rgba(56,189,248,0.25)';
              const hBg  = result?.ok ? 'var(--emerald-dim)' : result ? 'var(--crimson-dim)' : 'var(--sky-dim)';
              const hCol = result?.ok ? 'var(--emerald)' : result ? 'var(--crimson)' : 'var(--sky)';
              return (
                <div key={cmd._id} style={{ background: 'var(--surface-raised)', border: `1px solid ${bord}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', animation: 'cardIn 0.35s ease both' }}>
                  <div style={{ padding: '0.875rem 1.25rem', background: hBg, borderBottom: `1px solid ${bord}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {result?.ok ? <CheckCircle size={16} color="var(--emerald)" /> : result ? <ShieldAlert size={16} color="var(--crimson)" /> : <Clock size={16} color="var(--sky)" />}
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: hCol }}>{cmd.clientNom}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(cmd.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {result?.ok && <Badge variant="green">Autorisé ✓</Badge>}
                      {result && !result.ok && <Badge variant="red">Refusé</Badge>}
                      {!result && <Badge variant="blue">En attente</Badge>}
                    </div>
                  </div>

                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                      {cmd.articles?.map((art, i) => {
                        const imgSrc = art.image ? `${API_BASE}${art.image}` : GROCERY_IMAGES[i % GROCERY_IMAGES.length];
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.625rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: `1px solid ${bord}` }}>
                            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                              <img src={imgSrc} alt={art.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = GROCERY_IMAGES[i % GROCERY_IMAGES.length]; }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art.nom}</div>
                              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>{art.prixUnitaire?.toLocaleString()} GNF × {art.quantite}</div>
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem', color: hCol, flexShrink: 0 }}>
                              {(art.prixUnitaire * art.quantite)?.toLocaleString()} GNF
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total payé</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>
                        {cmd.montantTotal?.toLocaleString()} <span style={{ fontSize: '0.75em', fontWeight: 600 }}>GNF</span>
                      </span>
                    </div>

                    {result?.ok ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.875rem', background: 'var(--emerald-dim)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)' }}>
                        <ShieldCheck size={20} color="var(--emerald)" />
                        <span style={{ fontWeight: 700, color: 'var(--emerald)', fontSize: '0.92rem', fontFamily: 'var(--font-display)' }}>SORTIE AUTORISÉE</span>
                      </div>
                    ) : result ? (
                      <div style={{ padding: '0.875rem', background: 'var(--crimson-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <ShieldAlert size={16} color="var(--crimson)" />
                          <span style={{ fontWeight: 700, color: 'var(--crimson)', fontSize: '0.88rem' }}>ACCÈS REFUSÉ</span>
                        </div>
                        <Btn onClick={() => setScanModal(cmd)} variant="secondary" size="sm">Réessayer</Btn>
                      </div>
                    ) : (
                      <Btn onClick={() => setScanModal(cmd)} variant="success" size="md" icon={ScanLine} style={{ width: '100%', justifyContent: 'center' }}>
                        Vérifier et valider la sortie
                      </Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {scanModal && <VerifModal cmd={scanModal} onClose={() => setScanModal(null)} onSuccess={onSuccess} />}

      <style>{`
        @keyframes cardIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @media(max-width:768px){ div[style*="grid-template-columns"]{grid-template-columns:1fr !important} }
      `}</style>
    </div>
  );
}
