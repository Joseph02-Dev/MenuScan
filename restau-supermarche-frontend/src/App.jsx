import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Connexion from './components/Connexion'; // Importation de notre nouvel écran
import EcranCuisine from './components/EcranCuisine'; // 1. Ajoute cet import en haut

const ClientMenu = () => <div style={{ padding: '20px' }}><h2>🛒 Menu Restaurant & Scan & Go</h2><p>Interface client pour commander et scanner</p></div>;
const EcranCuisine = () => <div style={{ padding: '20px' }}><h2>🍳 Tableau de bord Cuisine</h2><p>Commandes temps réel Socket.io</p></div>;
const VigilControle = () => <div style={{ padding: '20px' }}><h2>🛡️ Contrôle de Sortie Vigile</h2><p>Validation des QR Codes</p></div>;

function App() {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <Router>
      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
        {/* Barre de navigation de développement */}
        <nav style={{ padding: '15px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Connexion</Link>
          <Link to="/client" style={{ color: 'white', textDecoration: 'none' }}>Interface Client</Link>
          <Link to="/cuisine" style={{ color: 'white', textDecoration: 'none' }}>Cuisine</Link>
          <Link to="/controle" style={{ color: 'white', textDecoration: 'none' }}>Contrôle Sortie</Link>
          <button onClick={handleLogout} style={{ marginLeft: 'auto', backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>Déconnexion</button>
        </nav>

        <Routes>
          <Route path="/" element={<Connexion />} />
          <Route path="/client" element={<ClientMenu />} />
          <Route path="/cuisine" element={<EcranCuisine />} />
          <Route path="/controle" element={<VigilControle />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;