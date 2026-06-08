const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  commandeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande',
    required: true
  },
  utilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },
  telephonePaiement: {
    type: String,
    required: [true, "Le numéro de téléphone pour le Mobile Money est obligatoire"]
  },
  operateur: {
    type: String,
    required: true,
    enum: ['Orange Money', 'MTN Mobile Money', 'Moov Money']
  },
  montant: {
    type: Number,
    required: true
  },
  statutPaiement: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING'
  },
  referenceTransaction: {
    type: String,
    unique: true
  },
  qrCodeSortie: {
    type: String // Stockera une chaîne ou un token simulant le QR Code de validation de sortie
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);