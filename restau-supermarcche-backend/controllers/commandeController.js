const Commande = require('../models/commande');
const Produit = require('../models/produits');

// @desc    Créer une nouvelle commande (Resto ou Supermarché)
// @route   POST /api/commandes
const creerCommande = async (req, res) => {
  try {
    const { typePlateforme, table, items, modePaiement } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: "Le panier ne peut pas être vide" });
    }

    let montantTotal = 0;
    const articlesFormates = [];

    // Boucle sur les articles envoyés pour vérifier les prix réels en BDD (Sécurité)
    for (const item of items) {
      const produit = await Produit.findById(item.produitId);
      if (!produit) {
        return res.status(404).json({ success: false, error: `Produit introuvable avec l'ID : ${item.produitId}` });
      }

      const prixUnitaire = produit.prix;
      montantTotal += prixUnitaire * item.quantite;

      articlesFormates.push({
        produitId: produit._id,
        nom: produit.nom,
        quantite: item.quantite,
        prixUnitaire: prixUnitaire
      });
    }

    // Création de la commande finale
  const nouvelleCommande = await Commande.create({
    typePlateforme,
    table,
    articles: articlesFormates,
    montantTotal,
    modePaiement
    });

  // --- AJOUT DE LA BRIQUE TEMPS RÉEL ---
  // Si c'est une commande de restaurant, on l'envoie instantanément à la cuisine
   if (typePlateforme === 'restaurant') {
      req.io.to('cuisine').emit('nouvelle_commande_cuisine', nouvelleCommande);
   }
// -------------------------------------


    res.status(201).json({ success: true, data: nouvelleCommande });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer les commandes (Optionnel : filtrer par plateforme ou statut)
// @route   GET /api/commandes
const getCommandes = async (req, res) => {
  try {
    const query = {};
    
    // Permet de filtrer dans Postman via /api/commandes?typePlateforme=restaurant
    if (req.query.typePlateforme) {
      query.typePlateforme = req.query.typePlateforme;
    }
    if (req.query.statutCommande) {
      query.statutCommande = req.query.statutCommande;
    }

    const commandes = await Commande.find(query).sort({ createdAt: -1 }); // Plus récentes en premier
    res.status(200).json({ success: true, count: commandes.length, data: commandes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Mettre à jour le statut d'une commande (ex: pour l'écran cuisine)
// @route   PUT /api/commandes/:id
const modifierStatutCommande = async (req, res) => {
  try {
    const { statutCommande } = req.body;

    const commande = await Commande.findByIdAndUpdate(
      req.params.id,
      { statutCommande },
      { new: true, runValidators: true }
    );

    if (!commande) {
      return res.status(404).json({ success: false, error: "Commande introuvable" });
    }

    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Mettre à jour le statut de préparation d'une commande (Cuisine) avec verrou de paiement
// @route   PUT /api/commandes/:id
const modifierStatutPreparation = async (req, res) => {
  try {
    const { statutPreparation } = req.body;

    // 1. Validation des statuts autorisés
    const statutsValides = ['En attente', 'Préparation', 'Prêt', 'Archive'];
    if (!statutsValides.includes(statutPreparation)) {
      return res.status(400).json({ success: false, error: "Statut de préparation invalide" });
    }

    // 2. Trouver la commande actuelle en base de données
    const commandeActuelle = await Commande.findById(req.params.id);

    if (!commandeActuelle) {
      return res.status(404).json({ success: false, error: "Commande introuvable" });
    }

    // 3. 🚨 LE VERROU : Si le cuisinier veut passer de 'En attente' à 'Préparation'
    if (statutPreparation === 'Préparation' && commandeActuelle.statutCommande !== 'PAYE') {
      return res.status(400).json({ 
        success: false, 
        error: "🔒 Action impossible : La cuisine ne peut pas préparer une commande non payée !" 
      });
    }

    // 4. Tout est OK (le client a payé ou c'est une étape suivante), on met à jour
    const commandeMiseAJour = await Commande.findByIdAndUpdate(
      req.params.id,
      { statutPreparation },
      { new: true, runValidators: true }
    );

    // Émettre l'événement Socket.io pour que tous les écrans connectés se mettent à jour
    req.io.emit('statut_commande_change', { 
      id: commandeMiseAJour._id, 
      statutPreparation: commandeMiseAJour.statutPreparation 
    });

    res.status(200).json({ success: true, data: commandeMiseAJour });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  creerCommande,
  getCommandes,
  modifierStatutCommande,
  modifierStatutPreparation   
};
