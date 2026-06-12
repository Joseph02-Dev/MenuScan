const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http'); // 1. Importer le module HTTP natif
const { Server } = require('socket.io'); // 2. Importer Socket.io
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

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log(`Un utilisateur s'est connecté via WebSocket : ${socket.id}`);

  // Permet à un écran (comme la cuisine) de rejoindre une "chambre" spécifique
  socket.on('rejoindre_chambre', (chambre) => {
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