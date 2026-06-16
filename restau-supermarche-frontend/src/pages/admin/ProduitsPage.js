import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Plus, Search, Barcode, UtensilsCrossed, ShoppingCart, CheckCircle, XCircle, ImageIcon, Upload, X } from 'lucide-react';
import { produitsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Btn, Badge, Spinner, EmptyState, Modal, PageHeader } from '../../components/ui';

const API_BASE = (process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`).replace('/api', '');

const defaultForm = { nom: '', prix: '', categorie: '', typePlateforme: 'restaurant', codeBarre: '', estDisponible: true };

function ImageUploadZone({ preview, onFile, onClear }) {
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>
        Photo du produit
      </label>
      {preview ? (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--gold)', animation: 'scaleIn 0.2s ease' }}>
          <img src={preview} alt="Prévisualisation" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,30,0.6) 0%, transparent 60%)' }} />
          <button
            type="button"
            onClick={onClear}
            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: 28, height: 28, borderRadius: '50%', background: 'rgba(10,15,30,0.7)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
          <div style={{ position: 'absolute', bottom: '0.6rem', left: '0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
            Cliquez pour changer
          </div>
          <div
            style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
            onClick={() => inputRef.current?.click()}
          />
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          style={{ border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all var(--transition)', background: 'var(--surface)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-dim)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--surface)'; }}
        >
          <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Glissez une image ou cliquez</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PNG, JPG, WEBP — max 5 Mo</div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

export default function ProduitsPage() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('tous');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = (file) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const resetModal = () => {
    setModalOpen(false);
    setForm(defaultForm);
    clearImage();
  };

  const load = useCallback(async () => {
    try {
      const res = await produitsAPI.getAll();
      setProduits(res.data.data || []);
    } catch { show('Erreur de chargement', 'error'); }
    finally { setLoading(false); }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Ne pas envoyer codeBarre vide — l'index sparse n'ignore que null/undefined, pas ""
      const formClean = { ...form, prix: parseFloat(form.prix) };
      if (!formClean.codeBarre) delete formClean.codeBarre;

      let payload;
      if (imageFile) {
        payload = new FormData();
        Object.entries(formClean).forEach(([k, v]) => payload.append(k, v));
        payload.append('image', imageFile);
      } else {
        payload = formClean;
      }
      await produitsAPI.add(payload);
      show('Produit ajouté avec succès !', 'success');
      resetModal();
      load();
    } catch (err) {
      show(err.response?.data?.error || "Erreur lors de l'ajout", 'error');
    } finally { setSaving(false); }
  };

  const filtered = produits.filter(p =>
    (filter === 'tous' || p.typePlateforme === filter) &&
    p.nom.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: '2rem' }}><Spinner /></div>;

  return (
    <div className="page-wrap" style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>
      <PageHeader
        title="Gestion des Produits"
        subtitle={`${produits.length} produit(s) enregistré(s)`}
      />

      {/* ── Barre actions : Ajouter à gauche | Recherche à droite ── */}
      <div className="produits-action-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <Btn onClick={() => setModalOpen(true)} icon={Plus}>Ajouter un produit</Btn>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            placeholder="Rechercher un produit…"
            style={{ paddingLeft: '2.4rem', width: '100%' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Filtres plateforme ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { key: 'tous', label: 'Tous', icon: Package },
          { key: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
          { key: 'supermarche', label: 'Supermarché', icon: ShoppingCart },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '100px', border: `1px solid ${filter === key ? 'var(--gold)' : 'var(--border-strong)'}`, background: filter === key ? 'var(--gold-dim)' : 'transparent', color: filter === key ? 'var(--gold)' : 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: filter === key ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)' }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Aucun produit" desc="Ajoutez votre premier produit." action={<Btn onClick={() => setModalOpen(true)} icon={Plus}>Ajouter</Btn>} />
      ) : (
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', animation: 'fadeUp 0.35s ease' }}>
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  {['', 'Produit', 'Catégorie', 'Prix', 'Plateforme', 'Code-barre', 'Disponible'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p._id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', animation: `fadeUp 0.3s ease ${i * 0.04}s both`, transition: 'background var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Thumbnail */}
                    <td style={{ padding: '0.6rem 0.75rem 0.6rem 1.25rem', width: 52 }}>
                      {p.image ? (
                        <img
                          src={`${API_BASE}${p.image}`}
                          alt={p.nom}
                          style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border-strong)' }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={16} color="var(--text-muted)" />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>{p.nom}</td>
                    <td style={{ padding: '0.875rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{p.categorie}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--gold)' }}>{p.prix?.toLocaleString()} GNF</td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <Badge variant={p.typePlateforme === 'restaurant' ? 'gold' : 'blue'}>
                        {p.typePlateforme === 'restaurant' ? '🍽️ Restaurant' : '📦 Supermarché'}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.codeBarre || '—'}</td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      {p.estDisponible !== false
                        ? <CheckCircle size={16} color="var(--emerald)" />
                        : <XCircle size={16} color="var(--crimson)" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add product modal */}
      <Modal open={modalOpen} onClose={resetModal} title="Ajouter un produit" width={520}>
        <form onSubmit={handleAdd}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <ImageUploadZone preview={imagePreview} onFile={handleFile} onClear={clearImage} />

            {[
              { label: 'Nom du produit', key: 'nom', type: 'text', placeholder: 'Ex: Poulet Yassa', required: true },
              { label: 'Prix (GNF)', key: 'prix', type: 'number', placeholder: 'Ex: 45000', required: true },
              { label: 'Catégorie', key: 'categorie', type: 'text', placeholder: 'Ex: Plats principaux', required: true },
            ].map(({ label, key, type, placeholder, required }) => (
              <div key={key} style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>{label}</label>
                <input type={type} placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)} required={required} />
              </div>
            ))}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Plateforme</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { v: 'restaurant', label: '🍽️ Restaurant' },
                  { v: 'supermarche', label: '📦 Supermarché' },
                ].map(({ v, label }) => (
                  <button type="button" key={v} onClick={() => set('typePlateforme', v)}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: `1px solid ${form.typePlateforme === v ? 'var(--gold)' : 'var(--border-strong)'}`, background: form.typePlateforme === v ? 'var(--gold-dim)' : 'var(--surface)', color: form.typePlateforme === v ? 'var(--gold)' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: form.typePlateforme === v ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.typePlateforme === 'supermarche' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 500 }}>Code-barres</label>
                <div style={{ position: 'relative' }}>
                  <Barcode size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type="text" placeholder="Ex: 3017620422003" style={{ paddingLeft: '2.4rem', fontFamily: 'var(--font-mono)' }} value={form.codeBarre} onChange={e => set('codeBarre', e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Btn type="button" variant="secondary" onClick={resetModal} style={{ flex: 1 }}>Annuler</Btn>
              <Btn type="submit" loading={saving} icon={Plus} style={{ flex: 1 }}>{saving ? 'Ajout…' : 'Ajouter'}</Btn>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
