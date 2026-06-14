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
        image: produit.image || null,
        note: item.note || '',
        quantite: item.quantite,
        prixUnitaire: prixUnitaire
      });
    }

    // Création de la commande finale
  const nouvelleCommande = await Commande.create({
    utilisateurId: req.utilisateur?._id || null,
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


// @desc    Mettre à jour le statut de préparation (Cuisine)
// @route   PUT /api/commandes/:id
const modifierStatutPreparation = async (req, res) => {
  try {
    const { statutPreparation } = req.body;
    const commandeId = req.params.id;

    if (!statutPreparation) {
      return res.status(400).json({ success: false, error: "Le champ 'statutPreparation' est obligatoire." });
    }

    const commandeActuelle = await Commande.findById(commandeId);
    if (!commandeActuelle) {
      return res.status(404).json({ success: false, error: "Commande introuvable" });
    }

    // Verrou paiement : la cuisine ne peut passer en Préparation que si le client a payé
    if (statutPreparation === 'Préparation') {
      const estMarquePaye = commandeActuelle.statutCommande === 'PAYE';
      const transactionValide = await Transaction.findOne({
        commandeId: commandeId,
        statutPaiement: 'SUCCESS'
      });

      if (!estMarquePaye && !transactionValide) {
        return res.status(400).json({
          success: false,
          error: "🔒 Action refusée : cette commande n'a pas encore été payée par le client !"
        });
      }
    }

    commandeActuelle.statutPreparation = statutPreparation;
    await commandeActuelle.save();

    if (req.io) {
      req.io.emit('statut_commande_change', {
        id: commandeActuelle._id,
        statutPreparation: commandeActuelle.statutPreparation
      });

      // Notifier le client quand sa commande est prête
      if (statutPreparation === 'Prêt' && commandeActuelle.utilisateurId) {
        req.io.to(`client_${commandeActuelle.utilisateurId}`).emit('commande_prete', {
          commandeId: commandeActuelle._id,
          table: commandeActuelle.table,
          message: 'Votre commande est prête !'
        });
      }
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
