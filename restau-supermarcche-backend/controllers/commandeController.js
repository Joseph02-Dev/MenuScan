const Commande = require('../models/commande');
const Produit = require('../models/produits');
const Transaction = require('../models/Transaction');

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


// @desc    Mettre à jour le statut de la commande (Cuisine) avec double verrou de paiement
// @route   PUT /api/commandes/:id
const modifierStatutPreparation = async (req, res) => {
  try {
    // 1. On récupère TOUT le body proprement
    const { statutCommande } = req.body; // On attend 'PREPARATION', 'PRET' ou 'ANNULE'
    const commandeId = req.params.id;

    // Petite sécurité au cas où le body arrive totalement vide
    if (!statutCommande) {
      return res.status(400).json({ success: false, error: "Le champ 'statutCommande' est obligatoire dans la requête." });
    }

    // 2. Trouver la commande actuelle en base de données
    const commandeActuelle = await Commande.findById(commandeId);

    if (!commandeActuelle) {
      return res.status(404).json({ success: false, error: "Commande introuvable" });
    }

    // 3. 🚨 LE VERROU STRICT : Si la cuisine veut commencer à préparer ('PREPARATION')
    if (statutCommande === 'PREPARATION') {
      
      // Vérification A : Est-ce que le statut actuel en BDD est déjà marqué PAYE ?
      const estMarquePaye = commandeActuelle.statutCommande === 'PAYE';

      // Vérification B : Recherche d'une transaction Mobile Money réussie en BDD pour cette commande
      const transactionValide = await Transaction.findOne({
        commandeId: commandeId,
        statutPaiement: 'SUCCESS'
      });

      // Si le client n'a pas payé et qu'aucune transaction n'est valide, on bloque !
      if (!estMarquePaye && !transactionValide) {
        return res.status(400).json({ 
          success: false, 
          error: "🔒 Action refusée : Impossible d'envoyer en préparation. Cette commande n'a pas été payée par le client !" 
        });
      }
    }

    // 4. Tout est OK, on applique le nouveau statut (PREPARATION, PRET, etc.)
    commandeActuelle.statutCommande = statutCommande;
    await commandeActuelle.save();

    // Émettre le signal Socket.io en temps réel
    if (req.io) {
      req.io.emit('statut_commande_change', { 
        id: commandeActuelle._id, 
        statutCommande: commandeActuelle.statutCommande 
      });
    }

    res.status(200).json({ success: true, data: commandeActuelle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer toutes les commandes
// @route   GET /api/commandes
const getCommandes = async (req, res) => {
  try {
    const commandes = await Commande.find({});
    res.status(200).json({ success: true, data: commandes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  creerCommande,
  getCommandes,
  modifierStatutPreparation   
};
