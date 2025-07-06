import React, { useRef, useEffect } from 'react';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';

interface WishlistProps {}

const Wishlist: React.FC<WishlistProps> = () => {
  const { state, removeFromWishlist, closeWishlist } = useWishlist();
  const { addToCart } = useCart();
  const wishlistRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wishlistRef.current && !wishlistRef.current.contains(event.target as Node)) {
        closeWishlist();
      }
    };

    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.isOpen, closeWishlist]);

  if (!state.isOpen) return null;

  const handleAddToCart = (productId: string) => {
    const product = state.items.find(item => item.id === productId);
    if (product) {
      addToCart(product);
      removeFromWishlist(productId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60]">
      <div ref={wishlistRef} className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 text-white shadow-xl md:max-w-md overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header - Fixed */}
          <div className="relative py-4 md:py-8 px-6 border-b border-slate-700 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 to-purple-600/20" />
            <div className="relative flex flex-col items-center">
              <h2 className="text-xl md:text-2xl font-bold text-center mb-1 md:mb-2">Wishlist</h2>
              <p className="text-slate-400 text-sm">{state.items.length} {state.items.length === 1 ? 'item' : 'items'}</p>
            </div>
            <button
              onClick={closeWishlist}
              className="absolute top-4 md:top-6 right-6 p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Wishlist Items - Scrollable */}
          <div className="flex-1 min-h-0 p-6">
            {state.items.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-300 text-lg">Your wishlist is empty</p>
                <p className="text-slate-500 text-sm mt-2">Add some products to your wishlist</p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto space-y-4 pr-2">
                {state.items.map((item) => (
                  <div key={item.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <div className="flex gap-4">
                      <img
                        src={item.image_url || ''}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">
                          {item.name}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          KES {item.price.toLocaleString()}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <button
                            onClick={() => handleAddToCart(item.id)}
                            disabled={item.stock_quantity <= 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                              item.stock_quantity > 0
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transform hover:scale-[1.02]'
                                : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingBag className="w-4 h-4" />
                            {item.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                          </button>
                          
                          <button
                            onClick={() => removeFromWishlist(item.id)}
                            className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wishlist;