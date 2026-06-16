const express = require('express');
const router = express.Router();
const { initierPaiement, validerSortie, getSortiesEnAttente } = require('../controllers/paiementController');
const { proteger, autoriserRoles } = require('../middleware/authMiddleware');

router.post('/initier', proteger, initierPaiement);
router.post('/valider-sortie', proteger, autoriserRoles('admin', 'caissier'), validerSortie);
router.get('/sorties-en-attente', proteger, autoriserRoles('admin', 'caissier'), getSortiesEnAttente);

module.exports = router;