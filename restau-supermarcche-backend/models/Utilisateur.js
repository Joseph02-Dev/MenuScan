const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UtilisateurSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, "Le nom est obligatoire"],
    trim: true
  },
  email: {
    type: String,
    required: [true, "L'email est obligatoire"],
    unique: true,
    lowercase: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Veuillez entrer un email valide"]
  },
  motDePasse: {
    type: String,
    required: [true, "Le mot de passe est obligatoire"],
    minlength: 6,
    select: false // Évite de renvoyer le mot de passe haché lors des requêtes GET standard
  },
  role: {
    type: String,
    enum: ['client', 'cuisine', 'caissier', 'admin'],
    default: 'client'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware Mongoose : Hacher le mot de passe automatiquement avant de sauvegarder l'utilisateur
UtilisateurSchema.pre('save', async function() {
  if (!this.isModified('motDePasse')) return;
  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
});

// Méthode pour vérifier si le mot de passe entré correspond à celui en BDD
UtilisateurSchema.methods.verifierMotDePasse = async function(motDePasseSaisi) {
  return await bcrypt.compare(motDePasseSaisi, this.motDePasse);
};

module.exports = mongoose.model('Utilisateur', UtilisateurSchema);