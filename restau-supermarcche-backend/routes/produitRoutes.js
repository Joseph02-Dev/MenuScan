const express = require('express');
const router = express.Router();
const { ajouterProduit, getProduits, scannerProduit } = require('../controllers/produitController');
const { proteger, autoriserRoles } = require('../middleware/authMiddleware');


router.route('/')
  .post(proteger, autoriserRoles('admin'), ajouterProduit)
  .get(proteger,getProduits);

router.route('/scan/:codeBarre')
  .get(proteger, scannerProduit);

module.exports = router;