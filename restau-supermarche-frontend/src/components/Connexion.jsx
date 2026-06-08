import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Connexion = () => {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    try {
      // Envoi de la requête à la route que nous avons testée sur Postman
      const reponse = await api.post('/auth/login', { email, motDePasse });
      
      if (reponse.data.success) {
        // Sauvegarde des données de session dans le localStorage
        localStorage.setItem('token', reponse.data.token);
        localStorage.setItem('role', reponse.data.role);
        localStorage.setItem('nom', reponse.data.nom);

        // Redirection automatique selon le rôle de l'utilisateur connecté
        const role = reponse.data.role;
        if (role === 'admin') {
          navigate('/controle'); // Le gérant/admin va sur l'interface de contrôle pour l'instant
        } else if (role === 'cuisine') {
          navigate('/cuisine');
        } else {
          navigate('/client'); // Le client standard va sur le menu / scan & go
        }
      }
    } catch (err) {
      // Récupération du message d'erreur précis renvoyé par ton backend Node.js
      setErreur(err.response?.data?.error || "Une erreur est survenue lors de la connexion");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      minHeight: '80vh', backgroundColor: '#f5f6fa'
    }}>
      <div style={{
        backgroundColor: 'white', padding: '40px', borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#2c3e50' }}>🌐 Plateforme Unifiée</h2>
        <p style={{ textAlign: 'center', color: '#7f8c8d', marginTop: '-15px', marginBottom: '25px' }}>Connexion à votre espace</p>
        
        {erreur && (
          <div style={{
            backgroundColor: '#fab1a0', color: '#d63031', padding: '10px', 
            borderRadius: '5px', marginBottom: '15px', fontSize: '14px', textAlign: 'center'
          }}>
            {erreur}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' }}>Adresse Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@gmail.com"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid  #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' }}>Mot de passe</label>
            <input 
              type="password" 
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={chargement}
            style={{
              width: '100%', padding: '12px', backgroundColor: '#3498db', color: 'white',
              border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer',
              fontSize: '16px', transition: 'background 0.3s'
            }}
          >
            {chargement ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Connexion;