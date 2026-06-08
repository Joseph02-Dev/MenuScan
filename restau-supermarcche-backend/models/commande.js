const mongoose = require('mongoose');

const CommandeSchema = new mongoose.Schema({
  typePlateforme: {
    type: String,
    required: true,
    enum: ['restaurant', 'supermarche']
  },
  // Pour le restaurant
  table: {
    type: String, // ex: "Table 5"
    required: function() { return this.typePlateforme === 'restaurant'; } // Requis uniquement pour le resto
  },
  // Liste des articles commandés
  articles: [
    {
      produitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produit',
        required: true
      },
      nom: String,
      quantite: {
        type: Number,
        required: true,
        default: 1
      },
      prixUnitaire: {
        type: Number,
        required: true
      }
    }
  ],
  montantTotal: {
    type: Number,
    required: true
  },
  statutCommande: {
    type: String,
    required: true,
    enum: ['EN_ATTENTE', 'PREPARATION', 'PRET', 'PAYE', 'ANNULE'],
    default: 'EN_ATTENTE'
  },
  modePaiement: {
    type: String,
    enum: ['Mobile Money', 'Carte Bancaire', 'Comptoir'],
    default: 'Mobile Money'
  },
  // --- AJOUT POUR LE CONTRÔLE DE SORTIE ---
  estSortie: {
    type: Boolean,
    default: false // Devient 'true' dès que le vigile valide le QR Code
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Commande', CommandeSchema);