import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api';

const EcranCuisine = () => {
  const [commandes, setCommandes] = useState([]);
  const [statutSocket, setStatutSocket] = useState('Déconnecté');

  useEffect(() => {
    // 1. Récupérer les commandes existantes dans MongoDB lors du chargement de la page
    const chargerCommandes = async () => {
      try {
        const reponse = await api.get('/commandes'); // Ta route GET globale
        // On filtre pour ne garder que les commandes de type restaurant qui ne sont pas encore terminées/archivées
        const commandesResto = reponse.data.data.filter(cmd => cmd.typePlateforme === 'restaurant');
        setCommandes(commandesResto);
      } catch (err) {
        console.error("Erreur lors du chargement des commandes:", err);
      }
    };

    chargerCommandes();

    // 2. Connexion au serveur Socket.io (Node.js port 5000)
    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      setStatutSocket('Connecté au flux Temps Réel');
      // Rejoindre la chambre spécifique à la cuisine
      socket.emit('rejoindre_chambre', 'cuisine');
    });

    // Écouter l'événement qu'on a configuré dans le backend
    socket.on('nouvelle_commande_cuisine', (nouvelleCommande) => {
      setCommandes((prevCommandes) => [nouvelleCommande, ...prevCommandes]);
    });

    // Écouter si une commande a été payée (optionnel, pour mettre une alerte visuelle)
    socket.on('commande_payee', ({ commandeId }) => {
      setCommandes((prevCommandes) => 
        prevCommandes.map(cmd => cmd._id === commandeId ? { ...cmd, statutCommande: 'PAYE' } : cmd)
      );
    });

    socket.on('disconnect', () => {
      setStatutSocket('Déconnecté');
    });

    // Nettoyage de la connexion socket lorsque l'utilisateur quitte la page
    return () => {
      socket.disconnect();
    };
  }, []);

  // 3. Fonction pour changer le statut d'une commande (ex: passer de En attente -> Préparation)
  const changerStatutPreparation = async (id, nouveauStatut) => {
    try {
      // Dans ton API, tu peux créer une route PUT /api/commandes/:id pour mettre à jour le statut
      await api.put(`/commandes/${id}`, { statutPreparation: nouveauStatut });
      
      // Mise à jour de l'état local React pour déplacer la carte visuellement
      setCommandes(prev => prev.map(cmd => cmd._id === id ? { ...cmd, statutPreparation: nouveauStatut } : cmd));
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
    }
  };

  // Filtrer les commandes pour chaque colonne
  const commandesEnAttente = commandes.filter(c => c.statutPreparation === 'En attente' || !c.statutPreparation);
  const commandesEnPreparation = commandes.filter(c => c.statutPreparation === 'Préparation');
  const commandesPretes = commandes.filter(c => c.statutPreparation === 'Prêt');

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f6fa', minHeight: '90vh' }}>
      {/* Barre d'état du serveur en haut de la tablette */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🍳 Écran Tableau de Bord Cuisine</h2>
        <span style={{ 
          padding: '5px 10px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold',
          backgroundColor: statutSocket.includes('Connecté') ? '#2ecc71' : '#e74c3c', color: 'white', marginLeft: 'auto'
        }}>
          {statutSocket}
        </span>
      </div>

      {/* Grille principale à 3 colonnes (Tablette Paysage) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        
        {/* COLONNE 1 : EN ATTENTE */}
        <div style={{ backgroundColor: '#dfe6e9', padding: '15px', borderRadius: '8px', minHeight: '60vh' }}>
          <h3 style={{ borderBottom: '3px solid #e67e22', paddingBottom: '10px', color: '#d35400' }}>
            📥 En attente ({commandesEnAttente.length})
          </h3>
          {commandesEnAttente.map(cmd => (
            <CarteCommande key={cmd._id} cmd={cmd} onSuivant={() => changerStatutPreparation(cmd._id, 'Préparation')} boutonTexte="Préparer 👨‍🍳" />
          ))}
        </div>

        {/* COLONNE 2 : EN PRÉPARATION */}
        <div style={{ backgroundColor: '#dfe6e9', padding: '15px', borderRadius: '8px', minHeight: '60vh' }}>
          <h3 style={{ borderBottom: '3px solid #3498db', paddingBottom: '10px', color: '#2980b9' }}>
            ⏳ En cours ({commandesEnPreparation.length})
          </h3>
          {commandesEnPreparation.map(cmd => (
            <CarteCommande key={cmd._id} cmd={cmd} onSuivant={() => changerStatutPreparation(cmd._id, 'Prêt')} boutonTexte="Prêt ! ✅" />
          ))}
        </div>

        {/* COLONNE 3 : PRÊT / À SERVIR */}
        <div style={{ backgroundColor: '#dfe6e9', padding: '15px', borderRadius: '8px', minHeight: '60vh' }}>
          <h3 style={{ borderBottom: '3px solid #2ecc71', paddingBottom: '10px', color: '#27ae60' }}>
            🍽️ Prêt à servir ({commandesPretes.length})
          </h3>
          {commandesPretes.map(cmd => (
            <CarteCommande key={cmd._id} cmd={cmd} onSuivant={() => changerStatutPreparation(cmd._id, 'Archive')} boutonTexte="Servi ✔️" />
          ))}
        </div>

      </div>
    </div>
  );
};

// Sous-composant pour la carte d'affichage de chaque commande individuelle
const CarteCommande = ({ cmd, onSuivant, boutonTexte }) => {
  return (
    <div style={{ 
      backgroundColor: 'white', padding: '15px', borderRadius: '6px', 
      marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: cmd.statutCommande === 'PAYE' ? '5px solid #2ecc71' : '5px solid #f1c40f'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong>Table {cmd.table || 'N/A'}</strong>
        <span style={{ fontSize: '12px', color: '#7f8c8d' }}>#{cmd._id.slice(-4)}</span>
      </div>

      {/* Statut du paiement */}
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: cmd.statutCommande === 'PAYE' ? '#27ae60' : '#f39c12', marginBottom: '10px' }}>
        {cmd.statutCommande === 'PAYE' ? '💰 PAYÉ' : '⏳ En attente paiement'}
      </div>
      
      {/* Liste des plats à préparer */}
      <ul style={{ paddingLeft: '20px', margin: '0 0 15px 0', color: '#2c3e50' }}>
        {cmd.articles?.map((item, idx) => (
          <li key={idx}>
            {item.quantite}x <strong>{item.produitId?.nom || "Plat"}</strong>
          </li>
        ))}
      </ul>

      {/* Bouton d'action pour faire avancer la commande dans le flux de la cuisine */}
      <button 
        onClick={onSuivant}
        style={{
          width: '100%', padding: '8px', backgroundColor: '#2c3e50', color: 'white',
          border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
        }}
      >
        {boutonTexte}
      </button>
    </div>
  );
};

export default EcranCuisine;