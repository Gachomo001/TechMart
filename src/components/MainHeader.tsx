import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingCart, Heart, Menu, ChevronDown, User, Settings, LayoutDashboard, LogOut, Monitor } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { Category } from './Header';

interface MainHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;
  categories: Category[];
  onSearch: (e: React.FormEvent) => void;
  onMobileMenuToggle: () => void;
  isMenuOpen: boolean;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  onSearch,
  onMobileMenuToggle
}) => {
  const navigate = useNavigate();
  const { getTotalItems, toggleCart } = useCart();
  const { state: wishlistState, toggleWishlist } = useWishlist();
  const { user, signOut, profile } = useAuth();
  const isAdminUser = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWishlist();
  };

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleCart();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowProfileMenu(false);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  return (
    <div className="bg-white shadow-sm">
      <div className="container mx-auto px-5 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 leading-tight pb-0.5">
              <Monitor className="h-7 w-7 md:h-9 md:w-9 text-blue-600 mr-2 md:mr-4" />
              <span className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 leading-normal">
                Raiyaaa
              </span>
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
            <form onSubmit={onSearch} className="relative flex w-full">
              {/* Category Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  className="flex items-center px-3 h-10 bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 min-w-[120px]"
                >
                  <span className="truncate text-sm">{selectedCategory ? selectedCategory.name : 'All Categories'}</span>
                  <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
                </button>
                {isCategoryOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-72 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(null); setIsCategoryOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      All Categories
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => { setSelectedCategory(category); setIsCategoryOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Search Input */}
              <input
                type="text"
                placeholder="Search for computers, accessories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-10 px-4 border-t border-b border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              
              {/* Search Button */}
              <button 
                type="submit" 
                className="px-4 h-10 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block" ref={profileMenuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <User className="h-6 w-6" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        <span>Edit Profile</span>
                      </Link>
                      {isAdminUser && (
                        <Link
                          to="/admin"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <div className="text-xs text-gray-400">Hello,</div>
                      <div className="font-medium">Sign in / Register</div>
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            <Link 
              to="#" 
              onClick={handleWishlistClick}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors relative"
            >
              <Heart 
                className={`h-6 w-6 ${wishlistState.items.length > 0 ? 'text-red-600 fill-current' : ''}`} 
              />
              {wishlistState.items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {wishlistState.items.length}
                </span>
              )}
            </Link>
            
            <Link 
              to="#" 
              onClick={handleCartClick}
              className="p-2 text-gray-600 hover:text-orange-500 transition-colors relative"
            >
              <ShoppingCart 
                className={`h-6 w-6 ${getTotalItems() > 0 ? 'text-orange-500 fill-current' : ''}`} 
              />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>
            
            <button 
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainHeader;
