const Produit = require('../models/produits');

// @desc    Ajouter un nouveau produit (Resto ou Supermarché)
// @route   POST /api/produits
const ajouterProduit = async (req, res) => {
  try {
    const data = { ...req.body };
    // Supprimer codeBarre vide pour que l'index sparse fonctionne (null/undefined = ignoré)
    if (!data.codeBarre) delete data.codeBarre;
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    const nouveauProduit = await Produit.create(data);
    res.status(201).json({ success: true, data: nouveauProduit });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Récupérer tous les produits (filtré par typePlateforme si fourni)
// @route   GET /api/produits
const getProduits = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.typePlateforme) filtre.typePlateforme = req.query.typePlateforme;
    const produits = await Produit.find(filtre);
    res.status(200).json({ success: true, count: produits.length, data: produits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Rechercher un produit par son code-barres (Scan & Go) avec contrôle de stock
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

    // 🔒 VERROU DE SÉCURITÉ : Bloquer le scan si le produit est en rupture de stock
    if (produit.stock <= 0) {
      return res.status(400).json({
        success: false,
        error: `Désolé, le produit "${produit.nom}" est actuellement en rupture de stock.`
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