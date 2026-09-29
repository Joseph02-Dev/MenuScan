const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http'); // 1. Importer le module HTTP natif
const { Server } = require('socket.io'); // 2. Importer Socket.io
const jwt = require('jsonwebtoken');
const Utilisateur = require('./models/Utilisateur');
const connectDB = require('./config/db.js');
const produitRoutes = require('./routes/produitRoutes.js');
const commandeRoutes = require('./routes/commandeRoutes.js');
const authRoutes = require('./routes/authRoutes.js');
const paiementRoutes = require('./routes/paiementRoutes.js'); //
const gestionnaireErreurs = require('./middleware/errorMiddleware');

dotenv.config();
connectDB();

const app = express();

// Création du serveur HTTP en y liant Express
const server = http.createServer(app);

// Initialisation de Socket.io avec configuration CORS pour le futur Front-end
const io = new Server(server, {
  cors: {
    origin: "*", // En développement local, on accepte toutes les origines
    methods: ["GET", "POST", "PUT"]
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rendre l'instance 'io' accessible dans nos contrôleurs Express via l'objet 'req'
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Liaison des routes HTTP
app.use('/api/produits', produitRoutes);
app.use('/api/commandes', commandeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/paiements', paiementRoutes); // 2. Lier la route de paiement

app.get('/', (req, res) => {
  res.send("L'API et le serveur WebSocket de la plateforme fonctionnent.");
});

// Authentification WebSocket : le client doit fournir son JWT via `auth: { token }`
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Accès refusé, aucun jeton fourni'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const utilisateur = await Utilisateur.findById(decoded.id);
    if (!utilisateur) return next(new Error('Utilisateur introuvable'));
    socket.data.utilisateur = utilisateur;
    next();
  } catch (error) {
    next(new Error('Accès refusé, jeton invalide ou expiré'));
  }
});

// Vérifie qu'un utilisateur a le droit de rejoindre une chambre
const peutRejoindre = (utilisateur, chambre) => {
  if (chambre === 'cuisine') return ['cuisine', 'admin'].includes(utilisateur.role);
  if (chambre === 'caissier') return ['caissier', 'admin'].includes(utilisateur.role);
  if (chambre === `client_${utilisateur._id}`) return true;
  return false;
};

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log(`Un utilisateur s'est connecté via WebSocket : ${socket.id}`);

  // Permet à un écran (comme la cuisine) de rejoindre une "chambre" spécifique
  socket.on('rejoindre_chambre', (chambre) => {
    if (typeof chambre !== 'string' || !peutRejoindre(socket.data.utilisateur, chambre)) {
      console.warn(`Accès refusé à la chambre "${chambre}" pour ${socket.id}`);
      return;
    }
    socket.join(chambre);
    console.log(`L'appareil ${socket.id} a rejoint la chambre : ${chambre}`);
  });

  socket.on('disconnect', () => {
    console.log(`Un utilisateur s'est déconnecté : ${socket.id}`);
  });
});

app.use(gestionnaireErreurs);
const PORT = process.env.PORT || 5000;
// 3. IMPORTANT : On lance 'server.listen' et non plus 'app.listen'
server.listen(PORT, () => {
  console.log(`Serveur unifié (HTTP + WebSockets) sur le port ${PORT}`);
});