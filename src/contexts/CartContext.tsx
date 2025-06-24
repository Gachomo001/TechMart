import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { CartItem, Product } from '../types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  lastUpdated?: string;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'CLOSE_CART' };

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'techmart_cart';
const CART_TIMESTAMP_KEY = 'techmart_cart_timestamp';
const CART_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Load initial state from localStorage
const loadInitialState = (): CartState => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    const lastUpdated = localStorage.getItem(CART_TIMESTAMP_KEY);
    
    // Check if cart data is expired
    if (lastUpdated) {
      const lastUpdatedTime = new Date(lastUpdated).getTime();
      const currentTime = new Date().getTime();
      if (currentTime - lastUpdatedTime > CART_EXPIRY_TIME) {
        // Clear expired data
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(CART_TIMESTAMP_KEY);
        return { items: [], isOpen: false };
      }
    }

    if (savedCart) {
      return JSON.parse(savedCart);
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
  }
  return { items: [], isOpen: false };
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  let newState: CartState;

  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.product.id === action.payload.id);
      if (existingItem) {
        newState = {
          ...state,
          items: state.items.map(item =>
            item.product.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      } else {
        newState = {
          ...state,
          items: [...state.items, { product: action.payload, quantity: 1 }]
        };
      }
      break;
    }
    case 'REMOVE_ITEM':
      newState = {
        ...state,
        items: state.items.filter(item => item.product.id !== action.payload)
      };
      break;
    case 'UPDATE_QUANTITY':
      newState = {
        ...state,
        items: state.items.map(item =>
          item.product.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ).filter(item => item.quantity > 0)
      };
      break;
    case 'CLEAR_CART':
      newState = {
        ...state,
        items: []
      };
      break;
    case 'TOGGLE_CART':
      newState = {
        ...state,
        isOpen: !state.isOpen
      };
      break;
    case 'CLOSE_CART':
      newState = {
        ...state,
        isOpen: false
      };
      break;
    default:
      return state;
  }

  // Save to localStorage after each state change
  try {
    const stateWithTimestamp = {
      ...newState,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stateWithTimestamp));
    localStorage.setItem(CART_TIMESTAMP_KEY, stateWithTimestamp.lastUpdated);
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }

  return newState;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, loadInitialState());

  // Add effect to handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear cart data when user leaves
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_TIMESTAMP_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const addToCart = (product: Product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
  };

  const removeFromCart = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const closeCart = () => {
    dispatch({ type: 'CLOSE_CART' });
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider value={{
      state,
      dispatch,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      toggleCart,
      closeCart,
      getTotalItems,
      getTotalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};