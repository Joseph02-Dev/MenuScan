/**
 * Script de seed — crée des comptes de test directement en MongoDB
 * Usage : node seed.js
 */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

const URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dataMenuScan';

const schema = new mongoose.Schema({
  nom:        String,
  email:      { type: String, unique: true, lowercase: true },
  motDePasse: String,
  role:       { type: String, default: 'client' },
  createdAt:  { type: Date, default: Date.now }
});
const User = mongoose.model('Utilisateur', schema);

const COMPTES = [
  { nom: 'Admin',       email: 'admin@test.com',    motDePasse: 'admin123',    role: 'admin'    },
  { nom: 'Cuisine',     email: 'cuisine@test.com',  motDePasse: 'cuisine123',  role: 'cuisine'  },
  { nom: 'Caissier',    email: 'caissier@test.com', motDePasse: 'caissier123', role: 'caissier' },
  { nom: 'Client Test', email: 'client@test.com',   motDePasse: 'client123',   role: 'client'   },
];

async function main() {
  console.log('Connexion à MongoDB :', URI);
  await mongoose.connect(URI);
  console.log('✅ Connecté\n');

  for (const c of COMPTES) {
    const existe = await User.findOne({ email: c.email });
    if (existe) {
      console.log(`⏭  ${c.email} — existe déjà`);
      continue;
    }
    const hash = await bcrypt.hash(c.motDePasse, 10);
    await User.create({ ...c, motDePasse: hash });
    console.log(`✅ Créé  : ${c.email}  |  mdp : ${c.motDePasse}  |  rôle : ${c.role}`);
  }

  console.log('\n--- Comptes disponibles ---');
  console.log('admin@test.com      / admin123    (admin)');
  console.log('cuisine@test.com    / cuisine123  (cuisine)');
  console.log('caissier@test.com   / caissier123 (caissier)');
  console.log('client@test.com     / client123   (client)');

  await mongoose.disconnect();
  console.log('\nTerminé.');
}

main().catch(err => { console.error('ERREUR :', err.message); process.exit(1); });
