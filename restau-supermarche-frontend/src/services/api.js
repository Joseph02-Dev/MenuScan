import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ms_token');
      localStorage.removeItem('ms_role');
      localStorage.removeItem('ms_nom');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
};

export const produitsAPI = {
  getAll: (params) => API.get('/produits', { params }),
  add: (data) => {
    if (data instanceof FormData) {
      return API.post('/produits', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return API.post('/produits', data);
  },
  scan: (codeBarre) => API.get(`/produits/scan/${codeBarre}`),
};

export const commandesAPI = {
  create: (data) => API.post('/commandes', data),
  getAll: (params) => API.get('/commandes', { params }),
  updateStatut: (id, data) => API.put(`/commandes/${id}`, data),
};

export const paiementsAPI = {
  initier: (data) => API.post('/paiements/initier', data),
  validerSortie: (data) => API.post('/paiements/valider-sortie', data),
};

export default API;
