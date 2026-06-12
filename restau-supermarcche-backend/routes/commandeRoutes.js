const express = require('express');
const router = express.Router();
const proteger = require('../middleware/authMiddleware').proteger;
const autoriserRoles = require('../middleware/authMiddleware').autoriserRoles;
const { 
  creerCommande, 
  getCommandes, 
  modifierStatutCommande,
  modifierStatutPreparation, 
} = require('../controllers/commandeController');

router.route('/')
  .post(creerCommande)
  .get(getCommandes);

router.route('/:id')
  .put(modifierStatutCommande);
// Route pour la mise à jour par la cuisine
router.route('/:id')
  .put(proteger, autoriserRoles('cuisine', 'admin'), modifierStatutPreparation);
module.exports = router;