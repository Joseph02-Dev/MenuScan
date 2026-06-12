const gestionnaireErreurs = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur dans la console Windows pour le développeur
  console.error("❌ Erreur interceptée :", err.stack);

  // Cas 1 : Mauvais format d'ID Mongoose (CastError)
  if (err.name === 'CastError') {
    const message = `Ressource introuvable. Identifiant incorrect.`;
    error = { message, statusCode: 404 };
  }

  // Cas 2 : Duplication d'un champ unique (ex: créer un compte avec un e-mail existant)
  if (err.code === 11000) {
    const message = `Valeur dupliquée : Ce champ existe déjà.`;
    error = { message, statusCode: 400 };
  }

  // Cas 3 : Erreur de validation Mongoose (champs obligatoires manquants)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erreur interne du serveur'
  });
};

module.exports = gestionnaireErreurs;