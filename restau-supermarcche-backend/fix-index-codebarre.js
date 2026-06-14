/**
 * Script à exécuter UNE SEULE FOIS pour corriger l'index codeBarre.
 * Commande : node fix-index-codebarre.js
 *
 * Problème : l'index unique sur codeBarre a été créé sans l'option "sparse",
 * ce qui bloque l'ajout de plusieurs plats de restaurant sans code-barres (null).
 * Ce script supprime l'ancien index. Le serveur le recréera correctement au prochain démarrage.
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.collection('produits');

  const indexes = await col.indexes();
  console.log('Index existants :', indexes.map(i => i.name));

  // Tente les deux variantes du nom (casse différente selon la version Mongo)
  const toTry = ['codeBarre_1', 'codebarre_1'];
  let dropped = false;

  for (const name of toTry) {
    try {
      await col.dropIndex(name);
      console.log(`✅ Index "${name}" supprimé.`);
      dropped = true;
    } catch {
      // index introuvable sous ce nom — on essaie l'autre
    }
  }

  if (!dropped) {
    console.log('ℹ️  Aucun index à supprimer (déjà corrigé ou inexistant).');
  }

  console.log('👉 Redémarrez le backend : le nouvel index sparse sera recréé automatiquement.');
  await mongoose.disconnect();
  process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });
