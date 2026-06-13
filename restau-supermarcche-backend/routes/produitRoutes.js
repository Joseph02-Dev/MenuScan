const express = require('express');
const router = express.Router();
const { ajouterProduit, getProduits, scannerProduit } = require('../controllers/produitController');
const { proteger, autoriserRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .post(proteger, autoriserRoles('admin'), upload.single('image'), ajouterProduit)
  .get(proteger, getProduits);

router.route('/scan/:codeBarre')
  .get(proteger, scannerProduit);

module.exports = router;