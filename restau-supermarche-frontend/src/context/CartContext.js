import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [plateforme, setPlateforme] = useState('restaurant');
  const [table, setTable] = useState('');

  const addItem = (produit) => {
    setItems((prev) => {
      const exist = prev.find((i) => i.produitId === produit._id);
      if (exist) return prev.map((i) => i.produitId === produit._id ? { ...i, quantite: i.quantite + 1 } : i);
      return [...prev, { produitId: produit._id, nom: produit.nom, prixUnitaire: produit.prix, quantite: 1, image: produit.image, note: '' }];
    });
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.produitId !== id));

  const updateQty = (id, qty) => {
    if (qty < 1) return removeItem(id);
    setItems((prev) => prev.map((i) => i.produitId === id ? { ...i, quantite: qty } : i));
  };

  const updateNote = (id, note) => {
    setItems((prev) => prev.map((i) => i.produitId === id ? { ...i, note } : i));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.prixUnitaire * i.quantite, 0);
  const count = items.reduce((sum, i) => sum + i.quantite, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, updateNote, clearCart, total, count, plateforme, setPlateforme, table, setTable }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
