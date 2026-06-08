const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

// 1. Vérifier si l'utilisateur est connecté (Token valide)
const proteger = async (req, res, next) => {
  let token;

  // On attend le token dans le header "Authorization: Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Décoder le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Récupérer l'utilisateur correspondant au token (sans son mot de passe)
      req.utilisateur = await Utilisateur.findById(decoded.id);
      
      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: "Accès refusé, jeton invalide ou expiré" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Accès refusé, aucun jeton fourni" });
  }
};

// 2. Restreindre l'accès à certains rôles spécifiques (ex: autoriser uniquement 'admin' ou 'cuisine')
const autoriserRoles = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.utilisateur || !rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Le rôle '${req.utilisateur?.role || 'Inconnu'}' n'est pas autorisé à accéder à cette ressource` 
      });
    }
    next();
  };
};

module.exports = { proteger, autoriserRoles };