/**
 * Script à exécuter UNE SEULE FOIS : node fix-codebarre-vide.js
 * Convertit les codeBarre="" en undefined (champ absent) pour tous les produits.
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.collection('produits');

  // Supprimer le champ codeBarre quand il est une chaîne vide
  const result = await col.updateMany(
    { codeBarre: '' },
    { $unset: { codeBarre: '' } }
  );

  console.log(`✅ ${result.modifiedCount} produit(s) corrigé(s) (codeBarre vide supprimé).`);
  await mongoose.disconnect();
  process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });
