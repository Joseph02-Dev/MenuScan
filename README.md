# MenuScan — Documentation Complète

Plateforme de gestion de restaurant et supermarché avec menu digital, scan de codes-barres, caisse, cuisine en temps réel, et contrôle de sortie par QR code. Le tout packagé en application Android native.

---

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Prérequis](#2-prérequis)
3. [Backend — Node.js / Express / MongoDB](#3-backend)
4. [Frontend — React](#4-frontend)
5. [Application Android (Capacitor)](#5-application-android)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Comptes de test](#7-comptes-de-test)
8. [Rôles et interfaces](#8-rôles-et-interfaces)
9. [API REST — Référence](#9-api-rest)
10. [WebSockets (Socket.IO)](#10-websockets)
11. [Structure des dossiers](#11-structure-des-dossiers)

---

## 1. Architecture globale

```
┌─────────────────────────────────────────────────┐
│                  CLIENT (Android / Navigateur)   │
│   React 19  +  React Router v7  +  Socket.IO    │
│            packagé via Capacitor v8              │
└───────────────────┬─────────────────────────────┘
                    │  HTTP REST  +  WebSocket
                    ▼
┌─────────────────────────────────────────────────┐
│      BACKEND  (Node.js + Express 5 + Socket.IO) │
│         http://10.65.237.42:5000/api            │
└───────────────────┬─────────────────────────────┘
                    │  Mongoose ODM
                    ▼
┌─────────────────────────────────────────────────┐
│                  MongoDB (Atlas ou local)        │
└─────────────────────────────────────────────────┘
```

**Flux en temps réel :**  
- Nouvelle commande → serveur émet `nouvelle_commande` → room `cuisine` + room `caissier`
- Mise à jour statut → serveur émet `commande_mise_a_jour` → room `cuisine` + room `caissier`
- Paiement validé → serveur émet `paiement_effectue` → room `client_{utilisateurId}`

---

## 2. Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 18.x |
| npm | 9.x |
| MongoDB | 6.x (ou MongoDB Atlas) |
| Android Studio | Hedgehog 2023.1+ |
| Java JDK | 17 |
| Git | toute version récente |

---

## 3. Backend

### Dossier : `restau-supermarcche-backend/`

### Installation

```bash
cd restau-supermarcche-backend
npm install
```

### Configuration

Créer un fichier `.env` à la racine du dossier backend :

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/menuscan
JWT_SECRET=votre_secret_jwt_tres_long
PORT=5000
```

### Démarrage

```bash
# Production
npm start

# Développement (rechargement automatique)
npm run dev
```

Le serveur démarre sur `http://localhost:5000` (ou le port défini dans `.env`).

### Modèles de données

#### Utilisateur
| Champ | Type | Détail |
|-------|------|--------|
| `nom` | String | requis |
| `email` | String | unique, requis |
| `motDePasse` | String | hashé bcrypt (salt 10), non renvoyé en GET |
| `role` | String | `client` \| `cuisine` \| `caissier` \| `admin` |
| `createdAt` | Date | auto |

#### Produit
| Champ | Type | Détail |
|-------|------|--------|
| `nom` | String | requis |
| `prix` | Number | requis |
| `categorie` | String | ex : `Entrées`, `Boissons`, `Épicerie` |
| `typePlateforme` | String | `restaurant` \| `supermarche` |
| `codeBarre` | String | unique + sparse (supermarché) |
| `estDisponible` | Boolean | true par défaut (restaurant) |
| `stock` | Number | quantité en stock |
| `image` | String | chemin relatif vers `/uploads/` |

#### Commande
| Champ | Type | Détail |
|-------|------|--------|
| `utilisateurId` | ObjectId | référence Utilisateur |
| `typePlateforme` | String | `restaurant` \| `supermarche` |
| `table` | String | obligatoire si restaurant |
| `articles[]` | Array | `{ produitId, nom, image, note, quantite, prixUnitaire }` |
| `montantTotal` | Number | requis |
| `statutCommande` | String | `EN_ATTENTE` › `PREPARATION` › `PRET` › `PAYE` \| `ANNULE` |
| `statutPreparation` | String | `En attente` › `Préparation` › `Prêt` › `Archive` |
| `modePaiement` | String | `Mobile Money` \| `Carte Bancaire` \| `Comptoir` |
| `estSortie` | Boolean | `true` après validation du QR code de sortie |

#### Transaction
Enregistre chaque paiement initié (référence, montant, commandes associées).

### Middleware

- **`authMiddleware.js`** — vérifie le JWT Bearer dans `Authorization` + `autoriserRoles(...roles)`
- **`uploadMiddleware.js`** — Multer, stockage dans `uploads/`, champ `image`
- **`errorMiddleware.js`** — gestionnaire d'erreurs Express centralisé

---

## 4. Frontend

### Dossier : `restau-supermarche-frontend/`

### Installation

```bash
cd restau-supermarche-frontend
npm install
```

### Démarrage (développement)

```bash
npm start
# Application disponible sur http://localhost:3000
```

### Build production

```bash
npm run build
# Génère le dossier /build prêt pour le déploiement ou Capacitor
```

### Configuration de l'API

Modifier l'URL de base dans `src/services/api.js` :

```js
const BASE_URL = 'http://10.65.237.42:5000/api';
```

Remplacer `10.65.237.42` par l'adresse IP de votre serveur backend.

### Stack technique

| Librairie | Usage |
|-----------|-------|
| React 19 | UI, composants, hooks |
| React Router v7 | Navigation SPA, routes protégées |
| Axios | Requêtes HTTP vers l'API |
| Socket.IO Client v4 | Temps réel (cuisine, caissier, client) |
| jsQR v1 | Décodage QR code frame-by-frame (caméra) |
| html5-qrcode v2 | Lecture QR/codes-barres alternatif |
| qrcode.react v4 | Génération QR code (ticket de caisse) |
| lucide-react | Icônes |
| Capacitor v8 | Build Android / iOS natif |

### Contextes React

| Contexte | Rôle |
|----------|------|
| `AuthContext` | Utilisateur connecté, token JWT, rôle |
| `CartContext` | Panier du client (articles, quantités, note) |
| `ToastContext` | Notifications toast globales |

### Design system

Toutes les variables CSS sont définies dans `src/index.css` :

```css
--gold, --sky, --emerald, --violet     /* couleurs accent */
--surface, --surface-raised            /* fonds de cartes */
--border, --border-strong              /* bordures */
--text-primary, --text-secondary, --text-muted
--font-display, --font-mono            /* typographies */
--radius-sm, --radius-md, --radius-xl  /* arrondis */
```

---

## 5. Application Android

### Technologie

Capacitor v8 encapsule le build React dans une WebView Android native.

**`capacitor.config.ts` :**

```ts
{
  appId: 'com.menuscan.app',
  appName: 'MenuScan',
  webDir: 'build',
  server: {
    cleartext: true,       // autorise HTTP (non-HTTPS)
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0A0F1E',
  }
}
```

### Build de l'APK — étape par étape

**1. Préparer le build React**

```bash
cd restau-supermarche-frontend
npm run build
```

**2. Synchroniser avec Capacitor**

```bash
npx cap sync android
```

**3. Ouvrir dans Android Studio**

```bash
npx cap open android
# ou
npm run open:android
```

**4. Générer l'APK**

Dans Android Studio :
- Menu → `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
- L'APK se trouve dans `android/app/build/outputs/apk/debug/app-debug.apk`

**Commande combinée (build + sync) :**

```bash
npm run build:android
```

### Configuration réseau Android

Le fichier `android/app/src/main/res/xml/network_security_config.xml` autorise le trafic HTTP en clair vers le serveur local :

```xml
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">10.65.237.42</domain>
  </domain-config>
</network-security-config>
```

### Navigation mobile

- **Topbar fixe** (56 px) : logo + badge de rôle + bouton déconnexion
- **Bottom navigation** (64 px) : max 5 onglets, visible uniquement sur mobile
- **Sidebar** : masquée sur mobile, visible sur desktop (>768 px)
- Défilement vertical toujours actif (`overscroll-behavior-x: none` au lieu de `overflow-x: hidden`)

---

## 6. Variables d'environnement

### Backend `.env`

```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/menuscan
JWT_SECRET=un_secret_long_et_aleatoire_min_32_chars
PORT=5000
```

### Frontend

Modifier directement `src/services/api.js` pour changer l'URL de l'API :

```js
// src/services/api.js
const BASE_URL = 'http://<IP_SERVEUR>:5000/api';
```

---

## 7. Comptes de test

Insérer ces documents dans la collection `utilisateurs` de MongoDB (le mot de passe sera hashé automatiquement si vous utilisez le endpoint `/api/auth/register`) :

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@test.com` | `admin123` |
| Cuisine | `cuisine@test.com` | `cuisine123` |
| Caissier | `caissier@test.com` | `caissier123` |
| Client | `client@test.com` | `client123` |

**Créer via l'API :**

```bash
curl -X POST http://10.65.237.42:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nom":"Admin","email":"admin@test.com","motDePasse":"admin123","role":"admin"}'
```

---

## 8. Rôles et interfaces

### Client

Accède aux deux plateformes depuis le même compte.

**Restaurant (`/restaurant`) :**
- Menu digital avec photos et prix
- Filtrage par catégorie
- Ajout au panier avec note individuelle par article
- Saisie du numéro de table
- Passage de commande → reçoit un QR code de confirmation

**Supermarché (`/supermarche`) :**
- Scanner de code-barres en temps réel (caméra)
- Ajout automatique au panier à la lecture
- Finalisation et paiement

---

### Admin (`/admin/*`)

| Page | URL | Fonctionnalité |
|------|-----|----------------|
| Dashboard | `/admin` | Stats (commandes, CA, restaurant/supermarché) + liste commandes |
| Produits | `/admin/produits` | CRUD produits avec upload image |
| Cuisine | `/admin/cuisine` | Vue en lecture seule des commandes en cours |
| Caissier | `/admin/caissier` | Vue caisse en lecture seule |
| Sortie | `/admin/sortie` | Scanner QR code → valider la sortie d'un client |

---

### Cuisine (`/cuisine`)

- Affichage temps réel des commandes (Socket.IO, room `cuisine`)
- Changement de statut : `En attente` → `Préparation` → `Prêt`
- Header sticky avec compteur de commandes actives
- Notification sonore/visuelle à chaque nouvelle commande

---

### Caissier (`/caissier`)

- Affichage des commandes prêtes à encaisser
- Scanner QR code du ticket client (jsQR, live + fallback photo)
- Validation du paiement → statut `PAYE`
- Génération QR code de sortie pour le client
- Notification en temps réel (Socket.IO, room `caissier`)

---

## 9. API REST

Base URL : `http://<IP_SERVEUR>:5000/api`

Toutes les routes protégées nécessitent l'en-tête :
```
Authorization: Bearer <token_jwt>
```

### Authentification `/api/auth`

| Méthode | Route | Corps | Réponse | Auth |
|---------|-------|-------|---------|------|
| POST | `/register` | `{ nom, email, motDePasse, role? }` | `{ token, utilisateur }` | Non |
| POST | `/login` | `{ email, motDePasse }` | `{ token, utilisateur }` | Non |

---

### Produits `/api/produits`

| Méthode | Route | Corps / Paramètre | Réponse | Auth / Rôle |
|---------|-------|--------------------|---------|-------------|
| GET | `/` | — | `{ data: [Produit] }` | Tous |
| POST | `/` | `multipart/form-data` : `nom, prix, categorie, typePlateforme, codeBarre?, stock?, image?` | `{ data: Produit }` | Admin |
| GET | `/scan/:codeBarre` | `:codeBarre` dans l'URL | `{ data: Produit }` | Tous |

---

### Commandes `/api/commandes`

| Méthode | Route | Corps | Réponse | Auth / Rôle |
|---------|-------|-------|---------|-------------|
| GET | `/` | — | `{ data: [Commande] }` | Tous |
| POST | `/` | `{ typePlateforme, table?, articles[], montantTotal, modePaiement? }` | `{ data: Commande }` | Tous |
| PUT | `/:id` | `{ statutCommande?, statutPreparation? }` | `{ data: Commande }` | Cuisine / Admin |

---

### Paiements `/api/paiements`

| Méthode | Route | Corps | Réponse | Auth / Rôle |
|---------|-------|-------|---------|-------------|
| POST | `/initier` | `{ commandeIds[], montant, modePaiement }` | `{ data: Transaction }` | Tous |
| POST | `/valider-sortie` | `{ commandeId }` | `{ message, commande }` | Admin / Caissier |
| GET | `/sorties-en-attente` | — | `{ data: [Commande] }` | Admin / Caissier |

---

### Uploads

Les images sont accessibles à l'URL :
```
http://<IP_SERVEUR>:5000/uploads/<nom_fichier>
```

---

## 10. WebSockets

Le serveur Socket.IO partage le même port que l'API REST.

### Connexion côté client

```js
import { io } from 'socket.io-client';
const socket = io('http://10.65.237.42:5000');

// Rejoindre une room
socket.emit('rejoindre_chambre', 'cuisine');
socket.emit('rejoindre_chambre', 'caissier');
socket.emit('rejoindre_chambre', `client_${utilisateurId}`);
```

### Événements émis par le serveur

| Événement | Room cible | Déclencheur |
|-----------|------------|-------------|
| `nouvelle_commande` | `cuisine`, `caissier` | Création d'une commande |
| `commande_mise_a_jour` | `cuisine`, `caissier` | Changement de statut |
| `paiement_effectue` | `client_{id}` | Validation du paiement |

### Événements émis par le client

| Événement | Payload | But |
|-----------|---------|-----|
| `rejoindre_chambre` | `String` (nom de room) | S'abonner aux notifications |

---

## 11. Structure des dossiers

```
superResto/
├── README.md
│
├── restau-supermarcche-backend/
│   ├── server.js               # Point d'entrée, Express + Socket.IO
│   ├── package.json
│   ├── .env                    # (non versionné)
│   ├── config/
│   │   └── db.js               # Connexion MongoDB
│   ├── models/
│   │   ├── Utilisateur.js
│   │   ├── produits.js
│   │   ├── commande.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── produitRoutes.js
│   │   ├── commandeRoutes.js
│   │   └── paiementRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── produitController.js
│   │   ├── commandeController.js
│   │   └── paiementController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   └── errorMiddleware.js
│   └── uploads/                # Images produits (généré automatiquement)
│
└── restau-supermarche-frontend/
    ├── package.json
    ├── capacitor.config.ts
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── index.css           # Design system global + responsive mobile
    │   ├── App.js              # Routes React Router
    │   ├── context/
    │   │   ├── AuthContext.js
    │   │   ├── CartContext.js
    │   │   └── ToastContext.js
    │   ├── services/
    │   │   └── api.js          # Axios + tous les appels API
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── Layout.js   # Sidebar desktop + topbar mobile + bottom nav
    │   │   └── ui/
    │   │       └── index.js    # Composants réutilisables (Btn, Badge, StatCard…)
    │   └── pages/
    │       ├── auth/
    │       │   └── LoginPage.js
    │       ├── admin/
    │       │   ├── AdminDashboard.js
    │       │   ├── ProduitsPage.js
    │       │   ├── SortiePage.js
    │       │   └── (cuisine/caissier vues admin)
    │       ├── cuisine/
    │       │   └── CuisinePage.js
    │       ├── caissier/
    │       │   └── CaissierPage.js
    │       ├── restaurant/
    │       │   └── RestaurantPage.js
    │       └── supermarche/
    │           └── SupermarchePage.js
    └── android/                # Projet Android Studio (généré par Capacitor)
```

---

## Lancer le projet complet

```bash
# Terminal 1 — Backend
cd restau-supermarcche-backend
npm run dev

# Terminal 2 — Frontend
cd restau-supermarche-frontend
npm start

# Pour l'APK Android
cd restau-supermarche-frontend
npm run build:android   # build React + sync Capacitor
npm run open:android    # ouvre Android Studio
```
