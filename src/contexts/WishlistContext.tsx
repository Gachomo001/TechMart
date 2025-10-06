import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Product } from '../types/index';

interface WishlistState {
  items: Product[];
  isOpen: boolean;
  lastUpdated?: string;
}

type WishlistAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'TOGGLE_WISHLIST' }
  | { type: 'CLOSE_WISHLIST' };

interface WishlistContextType {
  state: WishlistState;
  dispatch: React.Dispatch<WishlistAction>;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (id: string) => void;
  toggleWishlist: () => void;
  closeWishlist: () => void;
  isInWishlist: (id: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'techmart_wishlist';
const WISHLIST_TIMESTAMP_KEY = 'techmart_wishlist_timestamp';
const WISHLIST_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Load initial state from localStorage
const loadInitialState = (): WishlistState => {
  try {
    const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
    const lastUpdated = localStorage.getItem(WISHLIST_TIMESTAMP_KEY);
    
    // Check if wishlist data is expired
    if (lastUpdated) {
      const lastUpdatedTime = new Date(lastUpdated).getTime();
      const currentTime = new Date().getTime();
      if (currentTime - lastUpdatedTime > WISHLIST_EXPIRY_TIME) {
        // Clear expired data
        localStorage.removeItem(WISHLIST_STORAGE_KEY);
        localStorage.removeItem(WISHLIST_TIMESTAMP_KEY);
        return { items: [], isOpen: false };
      }
    }

    if (savedWishlist) {
      return JSON.parse(savedWishlist);
    }
  } catch (error) {
    console.error('Error loading wishlist from localStorage:', error);
  }
  return { items: [], isOpen: false };
};

const wishlistReducer = (state: WishlistState, action: WishlistAction): WishlistState => {
  let newState: WishlistState;

  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        newState = state; // Item already in wishlist
      } else {
        newState = {
          ...state,
          items: [...state.items, action.payload]
        };
      }
      break;
    }
    case 'REMOVE_ITEM':
      newState = {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
      break;
    case 'TOGGLE_WISHLIST':
      newState = {
        ...state,
        isOpen: !state.isOpen
      };
      break;
    case 'CLOSE_WISHLIST':
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
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(stateWithTimestamp));
    localStorage.setItem(WISHLIST_TIMESTAMP_KEY, stateWithTimestamp.lastUpdated);
  } catch (error) {
    console.error('Error saving wishlist to localStorage:', error);
  }

  return newState;
};

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, loadInitialState());

  // Add effect to handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear wishlist data when user leaves
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
      localStorage.removeItem(WISHLIST_TIMESTAMP_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const addToWishlist = (product: Product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
  };

  const removeFromWishlist = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const toggleWishlist = () => {
    dispatch({ type: 'TOGGLE_WISHLIST' });
  };

  const closeWishlist = () => {
    dispatch({ type: 'CLOSE_WISHLIST' });
  };

  const isInWishlist = (id: string) => {
    return state.items.some(item => item.id === id);
  };

  return (
    <WishlistContext.Provider value={{
      state,
      dispatch,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      closeWishlist,
      isInWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};