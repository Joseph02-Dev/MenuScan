const express = require('express');
const router = express.Router();
const { ajouterProduit, getProduits, scannerProduit } = require('../controllers/produitController');

// Importation des barrières de sécurité
const { proteger, autoriserRoles } = require('../middleware/authMiddleware');

router.route('/')
  .post(proteger, autoriserRoles('admin'), ajouterProduit)
  .get(getProduits);

router.route('/scan/:codeBarre')
  .get(scannerProduit);

module.exports = router;