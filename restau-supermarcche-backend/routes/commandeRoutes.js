const express = require('express');
const router = express.Router();
const { 
  creerCommande, 
  getCommandes, 
  modifierStatutCommande 
} = require('../controllers/commandeController');

router.route('/')
  .post(creerCommande)
  .get(getCommandes);

router.route('/:id')
  .put(modifierStatutCommande);

module.exports = router;