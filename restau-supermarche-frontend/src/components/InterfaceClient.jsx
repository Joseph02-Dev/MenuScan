import React, { useState, useEffect } from 'react';
import { Scan, ShoppingBag, Utensils, Store, Plus, Minus, CreditCard } from 'lucide-react';
import api from '../api';

const InterfaceClient = () => {
  const [mode, setMode] = useState('restaurant'); // 'restaurant' ou 'supermarche'
  const [produits, setProduits] = useState([]);
  const [codeBarreSaisi, setCodeBarreSaisi] = useState('');
  const [panier, setPanier] = useState([]);
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(false);

  // 1. Charger le catalogue général depuis MongoDB
  useEffect(() => {
    const fetchProduits = async () => {
      try {
        const reponse = await api.get('/produits');
        setProduits(reponse.data.data || []);
      } catch (err) {
        console.error("Erreur de chargement des produits", err);
      }
    };
    fetchProduits();
  }, []);

  // 2. Simuler le scan d'un code-barres (Scan & Go)
  const handleSimulerScan = async (e) => {
    e.preventDefault();
    if (!codeBarreSaisi) return;
    setChargement(true);
    setMessage('');

    try {
      const reponse = await api.get(`/produits/scan/${codeBarreSaisi}`);
      const produitScanne = reponse.data.data;

      if (produitScanne) {
        ajouterAuPanier(produitScanne);
        setMessage(`✅ ${produitScanne.nom} ajouté au panier !`);
        setCodeBarreSaisi('');
      }
    } catch (err) {
      setMessage(`❌ Produit introuvable pour le code : ${codeBarreSaisi}`);
    } finally {
      setChargement(false);
    }
  };

  // 3. Gestion interne du panier
  const ajouterAuPanier = (produit) => {
    setPanier((prevPanier) => {
      const exist = prevPanier.find((item) => item._id === produit._id);
      if (exist) {
        return prevPanier.map((item) =>
          item._id === produit._id ? { ...item, quantite: item.quantite + 1 } : item
        );
      }
      return [...prevPanier, { ...produit, quantite: 1 }];
    });
  };

  const modifierQuantite = (id, delta) => {
    setPanier((prevPanier) =>
      prevPanier
        .map((item) => (item._id === id ? { ...item, quantite: item.quantite + delta } : item))
        .filter((item) => item.quantite > 0)
    );
  };

  const calculerTotal = () => {
    return panier.reduce((total, item) => total + item.prix * item.quantite, 0);
  };

  // 4. Validation finale et envoi de la commande au Backend
  const handleValiderEtPayer = async () => {
    if (panier.length === 0) return;

    try {
      // Préparation du format attendu par ton modèle de données Commande
      const articlesCommande = panier.map(item => ({
        produitId: item._id,
        quantite: item.quantite
      }));

      const payload = {
        typePlateforme: mode,
        articles: articlesCommande,
        table: mode === 'restaurant' ? 'Table Virtuelle N°3' : undefined,
      };

      // Envoi au backend Node.js
      const reponseCommande = await api.post('/commandes', payload);

      if (reponseCommande.data.success) {
        const commandeId = reponseCommande.data.data._id;
        
        // On enchaîne directement avec l'initiation du paiement simulé Mobile Money
        const reponsePaiement = await api.post('/paiements/initier', {
          commandeId,
          telephonePaiement: '+224622000000',
          operateur: 'Orange Money'
        });

        if (reponsePaiement.data.success) {
          alert(`🎉 Succès !\nCommande payée !\n\nRéférence: ${reponsePaiement.data.data.reference}\n${mode === 'supermarche' ? `🎫 Code de sortie : ${reponsePaiement.data.data.qrCodeSortie}` : ''}`);
          setPanier([]); // Vider le panier après achat complet
        }
      }
    } catch (err) {
      alert("Erreur lors de la validation de la commande ou du paiement.");
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '15px', fontFamily: 'sans-serif', backgroundColor: '#fff', minHeight: '90vh', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      
      {/* Sélecteur de mode (Restaurant vs Supermarché) */}
      <div style={{ display: 'flex', background: '#f1f2f6', borderRadius: '8px', padding: '5px', marginBottom: '20px' }}>
        <button 
          onClick={() => { setMode('restaurant'); setPanier([]); setMessage(''); }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', border: 'none', borderRadius: '6px', background: mode === 'restaurant' ? '#2c3e50' : 'transparent', color: mode === 'restaurant' ? 'white' : '#7f8c8d', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <Utensils size={18} /> Restaurant
        </button>
        <button 
          onClick={() => { setMode('supermarche'); setPanier([]); setMessage(''); }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', border: 'none', borderRadius: '6px', background: mode === 'supermarche' ? '#2c3e50' : 'transparent', color: mode === 'supermarche' ? 'white' : '#7f8c8d', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <Store size={18} /> Supermarché
        </button>
      </div>

      {/* --- PARCOURS SUPERMARCHÉ : CASIER DE SCAN --- */}
      {mode === 'supermarche' && (
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed #3498db' }}>
          <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px' }}><Scan size={16} /> Simulateur de Douchette / Scan</h4>
          <form onSubmit={handleSimulerScan} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Entrer un code-barres (ex: 1234567890123)"
              value={codeBarreSaisi}
              onChange={(e) => setCodeBarreSaisi(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" disabled={chargement} style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {chargement ? 'Vérification...' : 'Scanner'}
            </button>
          </form>
          {message && <p style={{ fontSize: '13px', marginTop: '8px', fontWeight: 'bold', color: message.startsWith('❌') ? '#e74c3c' : '#2ecc71' }}>{message}</p>}
        </div>
      )}

      {/* --- PARCOURS RESTAURANT : AFFICHAGE DU CATALOGUE --- */}
      {mode === 'restaurant' && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>🍽️ Notre Carte</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {produits.filter(p => p.categorie !== 'supermarche').map(prod => (
              <div key={prod._id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '10px', border: '1px solid #eee', borderRadius: '6px' }}>
                <div>
                  <strong style={{ display: 'block' }}>{prod.nom}</strong>
                  <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{prod.prix} F CFA</span>
                </div>
                <button 
                  onClick={() => ajouterAuPanier(prod)}
                  style={{ background: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Plus size={16} /> Ajouter
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SECTION FIXE COMMUNE : LE PANIER DU CLIENT --- */}
      <div style={{ marginTop: '30px', borderTop: '2px solid #2c3e50', paddingTop: '15px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2c3e50' }}>
          <ShoppingBag /> Votre Panier ({panier.reduce((sum, i) => sum + i.quantite, 0)})
        </h3>
        
        {panier.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#95a5a6', margin: '20px 0' }}>Votre panier est vide pour le moment.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '15px 0' }}>
              {panier.map(item => (
                <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '5px' }}>{item.nom}</span>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{item.prix} F CFA / unité</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f2f6', borderRadius: '4px', padding: '2px' }}>
                    <button onClick={() => modifierQuantite(item._id, -1)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Minus size={14} /></button>
                    <strong style={{ fontSize: '14px' }}>{item.quantite}</strong>
                    <button onClick={() => modifierQuantite(item._id, 1)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Plus size={14} /></button>
                  </div>
                  <span style={{ minWidth: '80px', textAlign: 'right', fontWeight: 'bold' }}>{item.prix * item.quantite} F CFA</span>
                </div>
              ))}
            </div>

            {/* Total global */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '15px', marginBottom: '20px' }}>
              <span>Total :</span>
              <span style={{ color: '#2ecc71' }}>{calculerTotal()} F CFA</span>
            </div>

            {/* Bouton de validation unifié (Commande HTTP -> Paiement Mobile Money simulé) */}
            <button 
              onClick={handleValiderEtPayer}
              style={{ width: '100%', padding: '14px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <CreditCard size={18} /> Valider & Payer (Mobile Money)
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default InterfaceClient;