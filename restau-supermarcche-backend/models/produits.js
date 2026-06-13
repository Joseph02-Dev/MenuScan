const mongoose = require('mongoose');

const ProduitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, "Le nom du produit est obligatoire"],
    trim: true
  },
  prix: {
    type: Number,
    required: [true, "Le prix est obligatoire"]
  },
  categorie: {
    type: String,
    required: [true, "La catégorie est obligatoire"], // ex: 'Entrées', 'Boissons' ou 'Épicerie'
    trim: true
  },
  typePlateforme: {
    type: String,
    required: true,
    enum: ['restaurant', 'supermarche'] // Permet de filtrer l'usage du produit
  },
  // Spécifique au Supermarché (Scan & Go)
  codeBarre: {
    type: String,
    unique: true, // Évite les doublons de codes-barres
    sparse: true  // Permet aux plats du resto de ne pas avoir de code-barre sans bloquer la base
  },
  // Spécifique au Restaurant (Smart Menu)
  estDisponible: {
    type: Boolean,
    default: true // Pour que la cuisine puisse marquer un plat en rupture
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  image: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Produit', ProduitSchema);