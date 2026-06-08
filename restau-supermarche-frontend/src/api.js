import axios from 'axios';

// Création de l'instance pointant vers ton serveur Node.js sous Windows 11
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Middleware Axios : Injecte automatiquement le token JWT s'il existe dans le localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;