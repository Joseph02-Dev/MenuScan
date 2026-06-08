const express = require('express');
const router = express.Router();
const { initierPaiement, validerSortie} = require('../controllers/paiementController');
const { proteger, autoriserRoles } = require('../middleware/authMiddleware'); // Sécurisé : il faut être connecté pour payer

router.post('/initier', proteger, initierPaiement);
// Route pour le contrôle de sortie (Sécurisée : Admin uniquement pour le moment)
router.post('/valider-sortie', proteger, autoriserRoles('admin'), validerSortie);

module.exports = router;