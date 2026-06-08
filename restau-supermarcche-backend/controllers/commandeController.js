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

module.exports = {
  creerCommande,
  getCommandes,
  modifierStatutCommande
};