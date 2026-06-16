const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Commande = require('../models/commande');
const Produit = require('../models/produits');

// @desc    Initier et simuler un paiement Mobile Money
// @route   POST /api/paiements/initier
const initierPaiement = async (req, res) => {
  try {
    const { commandeId, telephonePaiement, operateur } = req.body;

    // 1. Vérifier si la commande existe
    const commande = await Commande.findById(commandeId);
    if (!commande) {
      return res.status(404).json({ success: false, error: "Commande introuvable" });
    }

    // 2. Générer une fausse référence opérateur (ex: TXN-171819...)
    const referenceTransaction = `TXN-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;

    // 3. Créer la transaction à l'état 'PENDING'
    const transaction = await Transaction.create({
      commandeId,
      utilisateurId: req.utilisateur._id, // Récupéré grâce au middleware de protection JWT
      telephonePaiement,
      operateur,
      montant: commande.montantTotal,
      referenceTransaction
    });

    // 4. SIMULATION DE LA SÉCURITÉ OPÉRATEUR (Validation automatique)
    transaction.statutPaiement = 'SUCCESS';
    
    // Si c'est du Scan & Go (Supermarché), on génère un code court facile à scanner
    if (commande.typePlateforme === 'supermarche') {
      transaction.qrCodeSortie = `SO-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    }
    
    await transaction.save();

    // 🚨 2. MISE À JOUR DES STOCKS AUTOMATIQUE APRÈS PAIEMENT RÉUSSI
    for (const item of commande.articles) {
      const produit = await Produit.findById(item.produitId);
      if (produit) {
        // Soustraction de la quantité achetée
        produit.stock = produit.stock - item.quantite;

        // Éviter les stocks négatifs par sécurité
        if (produit.stock < 0) produit.stock = 0;

        await produit.save();
        console.log(`📉 Stock mis à jour : ${produit.nom} | Nouveau stock : ${produit.stock}`);
      }
    }

    // 5. Mettre à jour le statut de la commande associée
    commande.statutCommande = 'PAYE';
    await commande.save();

    // 6. Alerte temps réel via WebSockets si nécessaire
    if (commande.typePlateforme === 'restaurant') {
      req.io.to('cuisine').emit('commande_payee', { commandeId: commande._id, table: commande.table });
    } else if (commande.typePlateforme === 'supermarche') {
      req.io.to('caissier').emit('nouvelle_commande_caissier', {
        _id: commande._id,
        articles: commande.articles,
        montantTotal: commande.montantTotal,
        qrCodeSortie: transaction.qrCodeSortie,
        reference: referenceTransaction,
        clientNom: req.utilisateur?.nom || 'Client',
        createdAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: "Paiement Mobile Money effectué avec succès !",
      data: {
        transactionId: transaction._id,
        reference: transaction.referenceTransaction,
        montant: transaction.montant,
        statutCommande: commande.statutCommande,
        qrCodeSortie: transaction.qrCodeSortie || null
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Vérifier le QR Code de sortie par le vigile / portique
// @route   POST /api/paiements/valider-sortie
const validerSortie = async (req, res) => {
  try {
    const { qrCodeScanne } = req.body;

    if (!qrCodeScanne) {
      return res.status(400).json({ success: false, error: "Le QR Code scanné est obligatoire" });
    }

    // 1. Rechercher la transaction qui possède ce QR Code
    const transaction = await Transaction.findOne({ qrCodeSortie: qrCodeScanne }).populate('commandeId');

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        action: "REMAIN", 
        error: "QR Code invalide ou inconnu. Alerte fraude possible." 
      });
    }

    const commande = transaction.commandeId;

    // 2. Vérification de sécurité : La commande est-elle bien payée ?
    if (commande.statutCommande !== 'PAYE' || transaction.statutPaiement !== 'SUCCESS') {
      return res.status(400).json({ 
        success: false, 
        action: "REMAIN",
        error: "Attention ! Cette commande n'a pas été réglée." 
      });
    }

    // 3. Vérification de sécurité : Le client est-il déjà sorti avec ce ticket ?
    if (commande.estSortie) {
      return res.status(400).json({ 
        success: false, 
        action: "REMAIN",
        error: "Alerte ! Ce ticket a déjà été utilisé pour sortir." 
      });
    }

    // 4. Tout est OK : On valide la sortie définitive de la marchandise
    commande.estSortie = true;
    await commande.save();

    res.status(200).json({
      success: true,
      action: "ALLOW_OUT", 
      message: "Sortie autorisée. Merci de votre visite !",
      data: {
        Client: req.utilisateur?.nom || "Client Scan & Go",
        Montant: commande.montantTotal,
        Articles: commande.articles.length
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer les commandes supermarché payées en attente de validation de sortie
// @route   GET /api/paiements/sorties-en-attente
const getSortiesEnAttente = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      qrCodeSortie: { $exists: true, $ne: null },
      statutPaiement: 'SUCCESS'
    })
    .populate({ path: 'commandeId', match: { estSortie: false, typePlateforme: 'supermarche' } })
    .populate('utilisateurId', 'nom')
    .sort({ createdAt: -1 });

    const pending = transactions
      .filter(t => t.commandeId !== null)
      .map(t => ({
        _id: t.commandeId._id,
        articles: t.commandeId.articles,
        montantTotal: t.commandeId.montantTotal,
        qrCodeSortie: t.qrCodeSortie,
        reference: t.referenceTransaction,
        clientNom: t.utilisateurId?.nom || 'Client',
        createdAt: t.createdAt
      }));

    res.status(200).json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { initierPaiement, validerSortie, getSortiesEnAttente };