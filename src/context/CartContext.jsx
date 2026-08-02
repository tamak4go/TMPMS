import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/api';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '' });
  
  // Keep a ref of cart items to avoid dependency cycle in useEffect
  const guestCartRef = useRef([]);

  const loadCart = useCallback(async (authUser) => {
    const currentUser = authUser || user;
    if (currentUser) {
      try {
        // Always fetch active cart from DB using user.id to avoid stale cached IDs
        const carts = await api.fetchCarts(currentUser.id);
        let cartId;
        if (carts && carts.length > 0) {
          cartId = carts[0].id;
        } else {
          // Create a new cart
          const newCart = await api.createCart(currentUser.id);
          cartId = newCart.id;
        }

        // Update user object to persist resolved cartId.
        // Merge into the LATEST stored user (do not clobber a just-refreshed token).
        const storedRaw = localStorage.getItem('user');
        const stored = storedRaw ? JSON.parse(storedRaw) : currentUser;
        stored.cart_id = cartId;
        localStorage.setItem('user', JSON.stringify(stored));

        // If we had guest items, sync them to database first
        const guestItems = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        if (guestItems.length > 0) {
          await api.syncCart(currentUser.id, guestItems);
          localStorage.removeItem('guest_cart');
        }

        // Fetch items from DB
        const dbItems = await api.fetchCartItems(cartId);
        // Map DB items to standard format (id, name, price, quantity, etc.)
        const mappedItems = dbItems.map(item => ({
          db_item_id: item.id, // Keep reference to cart_items.id for updates/deletes
          id: item.medicine.id,
          name: item.medicine.name,
          price: item.medicine.price,
          imageUrl: item.medicine.image_url || item.medicine.imageUrl,
          quantity: item.quantity,
          requiresPrescription: item.medicine.requiresPrescription !== undefined ? item.medicine.requiresPrescription : item.medicine.requires_prescription,
          allowedQuantity: item.allowedQuantity !== undefined ? item.allowedQuantity : null,
        }));
        setCartItems(mappedItems);
      } catch (e) {
        console.error('Không thể tải giỏ hàng từ cơ sở dữ liệu', e);
      }
    } else {
      // Load guest cart
      const guestItems = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      setCartItems(guestItems);
    }
  }, [user]);

  // Load cart from DB when user logs in, or from localStorage when guest
  useEffect(() => {
    loadCart(user);
  }, [user, loadCart]);

  // Refresh cart data from DB (used after adding prescription items)
  const refreshCart = useCallback(async () => {
    await loadCart(user);
  }, [loadCart, user]);

  // Keep track of guest cart items in localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('guest_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  const addToCart = useCallback(async (product) => {
    let showToastMessage = `Đã thêm ${product.name} vào giỏ hàng`;
    const cartId = user ? (user.cart_id || user.cartId) : null;
    
    if (user && cartId) {
      try {
        // BE cộng dồn số lượng cho dòng đã tồn tại (cart_id + medicine_id), nên chỉ cần gửi 1 đơn vị
        await api.addCartItem(cartId, product.id, 1);
        
        // Re-fetch cart items to get updated state and database item IDs
        const dbItems = await api.fetchCartItems(cartId);
        const mappedItems = dbItems.map(item => ({
          db_item_id: item.id,
          id: item.medicine.id,
          name: item.medicine.name,
          price: item.medicine.price,
          imageUrl: item.medicine.image_url || item.medicine.imageUrl,
          quantity: item.quantity,
          requiresPrescription: item.medicine.requiresPrescription !== undefined ? item.medicine.requiresPrescription : item.medicine.requires_prescription,
          allowedQuantity: item.allowedQuantity !== undefined ? item.allowedQuantity : null,
        }));
        setCartItems(mappedItems);
      } catch (e) {
        console.error(e);
        showToastMessage = e.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng';
      }
    } else {
      // Guest behavior
      setCartItems(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { ...product, quantity: 1 }];
      });
    }

    setToast({ visible: true, message: showToastMessage });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  }, [user]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    
    const cartId = user ? (user.cart_id || user.cartId) : null;
    
    if (user && cartId) {
      try {
        const item = cartItems.find(x => x.id === productId);
        if (item && item.db_item_id) {
          await api.updateCartItem(item.db_item_id, quantity);
          setCartItems(prev => prev.map(x => x.id === productId ? { ...x, quantity } : x));
        }
      } catch (e) {
        console.error(e);
        // Dòng giỏ hàng đã bị xóa ở server (đơn hàng vừa được tạo/đã checkout) → loại bỏ khỏi state
        if (e.responseStatus === 404) {
          setCartItems(prev => prev.filter(x => x.id !== productId));
        }
      }
    } else {
      setCartItems(prev => prev.map(x => x.id === productId ? { ...x, quantity } : x));
    }
  }, [user, cartItems]);

  const removeFromCart = useCallback(async (productId) => {
    const cartId = user ? (user.cart_id || user.cartId) : null;
    
    if (user && cartId) {
      try {
        const item = cartItems.find(x => x.id === productId);
        if (item && item.db_item_id) {
          await api.deleteCartItem(item.db_item_id);
        }
        setCartItems(prev => prev.filter(x => x.id !== productId));
      } catch (e) {
        console.error(e);
        // 404 = dòng đã không còn tồn tại trên server (đã bị xóa khi tạo đơn) → vẫn bỏ khỏi giỏ
        if (e.responseStatus !== 404) return;
        setCartItems(prev => prev.filter(x => x.id !== productId));
      }
    } else {
      setCartItems(prev => prev.filter(x => x.id !== productId));
    }
  }, [user, cartItems]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    if (!user) {
      localStorage.removeItem('guest_cart');
    }
  }, [user]);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, updateQuantity, removeFromCart, clearCart, refreshCart, cartCount }}>
      {children}
      {toast.visible && (
        <div className="toast-notification fade-in">
          {toast.message}
        </div>
      )}
    </CartContext.Provider>
  );
};

