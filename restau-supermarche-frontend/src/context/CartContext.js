import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

const PLATEFORMES = ['restaurant', 'supermarche'];
const paniersVides = () => ({ restaurant: [], supermarche: [] });

// Un panier distinct par plateforme : les produits du restaurant et du supermarché ne se mélangent jamais
export const CartProvider = ({ children }) => {
  const [paniers, setPaniers] = useState(paniersVides);
  const [table, setTable] = useState('');

  const majPanier = useCallback((plateforme, fn) => {
    setPaniers((prev) => ({ ...prev, [plateforme]: fn(prev[plateforme]) }));
  }, []);

  return (
    <CartContext.Provider value={{ paniers, majPanier, table, setTable }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (plateforme = 'restaurant') => {
  if (!PLATEFORMES.includes(plateforme)) throw new Error(`Plateforme inconnue : ${plateforme}`);
  const { paniers, majPanier, table, setTable } = useContext(CartContext);
  const items = paniers[plateforme];
  const maj = (fn) => majPanier(plateforme, fn);

  const addItem = (produit) => {
    if (produit.typePlateforme && produit.typePlateforme !== plateforme) return;
    maj((prev) => {
      const exist = prev.find((i) => i.produitId === produit._id);
      if (exist) return prev.map((i) => i.produitId === produit._id ? { ...i, quantite: i.quantite + 1 } : i);
      return [...prev, { produitId: produit._id, nom: produit.nom, prixUnitaire: produit.prix, quantite: 1, image: produit.image, note: '' }];
    });
  };

  const removeItem = (id) => maj((prev) => prev.filter((i) => i.produitId !== id));

  const updateQty = (id, qty) => {
    if (qty < 1) return removeItem(id);
    maj((prev) => prev.map((i) => i.produitId === id ? { ...i, quantite: qty } : i));
  };

  const updateNote = (id, note) => {
    maj((prev) => prev.map((i) => i.produitId === id ? { ...i, note } : i));
  };

  const clearCart = () => maj(() => []);

  const total = items.reduce((sum, i) => sum + i.prixUnitaire * i.quantite, 0);
  const count = items.reduce((sum, i) => sum + i.quantite, 0);

  return { items, addItem, removeItem, updateQty, updateNote, clearCart, total, count, plateforme, table, setTable };
};
