const Utilisateur = require('../models/Utilisateur');
const jwt = require('jsonwebtoken');

// Fonction utilitaire pour générer le Token JWT
const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Inscription d'un utilisateur
// @route   POST /api/auth/register
const inscription = async (req, res) => {
  try {
    const { nom, email, motDePasse, role } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const utilisateurExiste = await Utilisateur.findOne({ email });
    if (utilisateurExiste) {
      return res.status(400).json({ success: false, error: "Cet email est déjà utilisé" });
    }

    // Création de l'utilisateur
    const utilisateur = await Utilisateur.create({ nom, email, motDePasse, role });

    // Génération du token
    const token = genererToken(utilisateur._id);

    res.status(201).json({
      success: true,
      token,
      data: { id: utilisateur._id, nom: utilisateur.nom, email: utilisateur.email, role: utilisateur.role }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Connexion de l'utilisateur
// @route   POST /api/auth/login
const connexion = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Vérifier si l'email et le mot de passe sont fournis
    if (!email || !motDePasse) {
      return res.status(400).json({ success: false, error: "Veuillez fournir un email et un mot de passe" });
    }

    // Trouver l'utilisateur et forcer la récupération du mot de passe (select: true)
    const utilisateur = await Utilisateur.findOne({ email }).select('+motDePasse');
    if (!utilisateur) {
      return res.status(401).json({ success: false, error: "Identifiants invalides" });
    }

    // Vérifier le mot de passe haché
    const motDePasseCorrect = await utilisateur.verifierMotDePasse(motDePasse);
    if (!motDePasseCorrect) {
      return res.status(401).json({ success: false, error: "Identifiants invalides" });
    }

    // Génération du token
    const token = genererToken(utilisateur._id);

    res.status(200).json({
      success: true,
      token,
      role: utilisateur.role,
      nom: utilisateur.nom
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { inscription, connexion };