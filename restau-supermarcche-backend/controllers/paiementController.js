const Transaction = require('../models/Transaction');
const Commande = require('../models/commande');

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
    // Dans la réalité, l'opérateur envoie un webhook. Ici, on simule que le client a tapé son code secret.
    transaction.statutPaiement = 'SUCCESS';
    
    // Si c'est du Scan & Go (Supermarché), on génère le token du QR Code de sortie
    if (commande.typePlateforme === 'supermarche') {
      transaction.qrCodeSortie = `VALID-OUT-${commande._id}-${referenceTransaction}`;
    }
    
    await transaction.save();

    // 5. Mettre à jour le statut de la commande associée
    commande.statutCommande = 'PAYE';
    await commande.save();

    // 6. Alerte temps réel via WebSockets si nécessaire
    // Si c'est un resto, on peut notifier la cuisine ou le serveur que la table X a payé
    if (commande.typePlateforme === 'restaurant') {
      req.io.to('cuisine').emit('commande_payee', { commandeId: commande._id, table: commande.table });
    }

    res.status(200).json({
      success: true,
      message: "Paiement Mobile Money effectué avec succès !",
      data: {
        transactionId: transaction._id,
        reference: transaction.referenceTransaction,
        montant: transaction.montant,
        statutCommande: commande.statutCommande,
        qrCodeSortie: transaction.qrCodeSortie || null // Affiché sur le front sous forme de QR Code
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
        action: "REMAIN", // Code pour le Front (ex: afficher un écran ROUGE au vigile)
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
      action: "ALLOW_OUT", // Code pour le Front (ex: afficher un écran VERT / Ouvrir le portique)
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

module.exports = { initierPaiement, validerSortie };