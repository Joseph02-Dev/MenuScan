const express = require('express');
const router = express.Router();
const { inscription, connexion } = require('../controllers/authController');

router.post('/register', inscription);
router.post('/login', connexion);

module.exports = router;