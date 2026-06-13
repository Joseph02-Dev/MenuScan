# MenuScan Frontend — React App

Application web complète pour la plateforme MenuScan (Restaurant + Supermarché Scan & Go).

## Prérequis

- Node.js v18+ : https://nodejs.org/fr/download
- npm (inclus avec Node.js)
- Le backend `restau-supermarche-backend` doit tourner sur le port 5000

## Démarrage rapide sur Windows 11

### Option 1 — Double-clic (le plus simple)
Double-cliquez sur le fichier `demarrer.bat`

### Option 2 — Terminal (PowerShell ou CMD)
```
cd menuscan-frontend
npm install
npm start
```

L'application s'ouvre automatiquement sur http://localhost:3000

## Configuration

Éditez le fichier `.env` pour pointer vers votre backend :
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Pages disponibles

| Route | Rôle requis | Description |
|-------|-------------|-------------|
| `/login` | Public | Connexion |
| `/register` | Public | Inscription |
| `/restaurant` | client, admin | Menu & commande restaurant |
| `/supermarche` | client, admin | Scan & Go supermarché |
| `/cuisine` | cuisine, admin | Écran cuisine temps réel |
| `/admin` | admin | Dashboard chiffres clés |
| `/admin/produits` | admin | Gestion catalogue produits |
| `/admin/sortie` | admin | Contrôle QR Code de sortie |

## Stack technique

- React 18 + React Router v6
- Axios (appels API REST)
- Socket.io-client (WebSocket temps réel)
- Lucide React (icônes)
- Google Fonts : Syne + Inter + JetBrains Mono
