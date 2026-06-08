const Produit = require('../models/produits');

// @desc    Ajouter un nouveau produit (Resto ou Supermarché)
// @route   POST /api/produits
const ajouterProduit = async (req, res) => {
  try {
    const nouveauProduit = await Produit.create(req.body);
    res.status(201).json({ success: true, data: nouveauProduit });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer tous les produits
// @route   GET /api/produits
const getProduits = async (req, res) => {
  try {
    const produits = await Produit.find();
    res.status(200).json({ success: true, count: produits.length, data: produits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Rechercher un produit par son code-barres (Scan & Go)
// @route   GET /api/produits/scan/:codeBarre
const scannerProduit = async (req, res) => {
  try {
    const produit = await Produit.findOne({ 
      codeBarre: req.params.codeBarre,
      typePlateforme: 'supermarche' // Sécurité : on s'assure que c'est un produit de magasin
    });

    if (!produit) {
      return res.status(404).json({ 
        success: false, 
        error: "Produit non référencé dans ce magasin." 
      });
    }

    res.status(200).json({ success: true, data: produit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  ajouterProduit,
  getProduits,
  scannerProduit
};