import React, { useRef, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface CartProps {}

const Cart: React.FC<CartProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateQuantity, removeFromCart, closeCart, getTotalPrice } = useCart();
  const cartRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        closeCart();
      }
    };

    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.isOpen, closeCart]);

  if (!state.isOpen) return null;

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleCheckout = () => {
    closeCart();
    if (!user) {
      navigate('/auth', { state: { redirectTo: '/checkout', from: location.pathname } });
    } else {
      navigate('/checkout', { state: { from: location.pathname } });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60]">
      <div ref={cartRef} className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 text-white shadow-xl md:max-w-md overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header - Fixed */}
          <div className="relative py-4 md:py-8 px-6 border-b border-slate-700 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
            <div className="relative flex flex-col items-center">
              <h2 className="text-xl md:text-2xl font-bold text-center mb-1 md:mb-2">Shopping Cart</h2>
              <p className="text-slate-400 text-sm">{state.items.length} {state.items.length === 1 ? 'item' : 'items'}</p>
            </div>
            <button
              onClick={closeCart}
              className="absolute top-4 md:top-6 right-6 p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items - Scrollable */}
          <div className="flex-1 min-h-0 p-6">
            {state.items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-300 text-lg">Your cart is empty</p>
                <p className="text-slate-500 text-sm mt-2">Add some products to get started</p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto space-y-4 pr-2">
                {state.items.map((item) => (
                  <div key={item.product.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <div className="flex gap-4">
                      <img
                        src={item.product.image_url || 'https://via.placeholder.com/100'}
                        alt={item.product.name}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100';
                        }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">
                          {item.product.name}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          KES {item.product.price.toLocaleString()}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1">
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className={`p-1 rounded-md transition-colors ${
                                item.quantity <= 1 
                                  ? 'text-slate-500 cursor-not-allowed' 
                                  : 'hover:bg-slate-600 text-white'
                              }`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium text-white">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1 hover:bg-slate-600 rounded-md transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => removeFromCart(item.product.id)}
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

          {/* Footer - Fixed */}
          {state.items.length > 0 && (
            <div className="border-t border-slate-700 p-6 space-y-4 bg-slate-800/30 backdrop-blur-sm flex-shrink-0">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span className="text-slate-300">Total:</span>
                <span className="text-white">KES {getTotalPrice().toLocaleString()}</span>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02]"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;