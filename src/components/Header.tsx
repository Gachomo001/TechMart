import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingCart, Menu, Heart, User, Settings, LayoutDashboard, LogOut } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import CustomerService from './CustomerService';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Snackbar from './Snackbar';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

interface HeaderProps {
  onSearch: (query: string, categoryId: string | null) => void;
  onLogoClick: () => void;
  onViewDealsClick: () => void;
  onCategorySelect?: (category: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch, onLogoClick, onViewDealsClick, onCategorySelect }) => {
  const navigate = useNavigate();
  const { getTotalItems, toggleCart } = useCart();
  const { state: wishlistState, toggleWishlist } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showCustomerService, setShowCustomerService] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | 'info'>('success');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery, selectedCategoryId);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSnackbarMessage('Successfully signed out');
      setSnackbarType('success');
      setShowSnackbar(true);
    } catch (error) {
      setSnackbarMessage('Error signing out');
      setSnackbarType('error');
      setShowSnackbar(true);
    }
  };

  const handleCategoryClick = (categorySlug: string) => {
    navigate(`/category/${categorySlug}`);
    setShowCategories(false);
  };

  return (
    <>
      <header className="bg-slate-900 text-white shadow-lg">
        {/* Top banner */}
        <div className="bg-blue-600 py-2 px-6 sm:px-8 lg:px-12 text-center text-sm">
          <p>+254 740 000 000 | info@techmart.com | 30-day return policy</p>
        </div>

        {/* Main header */}
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={onLogoClick}
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                TechMart
              </button>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8 hidden md:flex">
              <div className="flex w-full">
                <select 
                  className="bg-gray-100 text-gray-900 px-3 py-2 rounded-l-md border-r"
                  value={selectedCategoryId || ''}
                  onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search for computers, accessories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 text-gray-900 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 px-6 py-2 rounded-r-md transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Right section */}
            <div className="flex items-center space-x-10">
              <button 
                onClick={toggleWishlist}
                className="hidden md:flex flex-col items-center text-sm hover:text-blue-400 transition-colors relative"
              >
                <div className="relative">
                  <Heart className={`w-7 h-7 ${wishlistState.items.length > 0 ? 'text-red-500 fill-current' : ''}`} />
                  {wishlistState.items.length > 0 && (
                    <span className="absolute -top-4 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {wishlistState.items.length}
                    </span>
                  )}
                </div>
                {/* <span>Wishlist</span> */}
              </button>

              <button
                onClick={toggleCart}
                className="hidden md:flex flex-col items-center text-sm hover:text-blue-400 transition-colors relative"
              >
                <div className="relative">
                  <ShoppingCart className={`w-7 h-7 ${getTotalItems() > 0 ? 'text-yellow-500 fill-current' : ''}`} />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-4 -right-4 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </div>
                {/* <span>Cart</span> */}
              </button>
              
              {user ? (
                <div className="flex items-center ml-4">
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center space-x-2 hover:text-blue-400 transition-colors"
                    >
                      <User className="w-6 h-6" />
                      <span className="text-gray-300">Welcome, {profile?.first_name || 'User'}</span>
                    </button>

                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                        <Link
                          to="/profile"
                          className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <Settings className="w-5 h-5" />
                          <span>Edit Profile</span>
                        </Link>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            <LayoutDashboard className="w-5 h-5" />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            handleSignOut();
                            setShowProfileMenu(false);
                          }}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Link to="/auth" className="hidden md:flex flex-col text-sm hover:text-blue-400 transition-colors ml-4">
                  <span className="text-gray-300">Hello, </span>
                  <span className="font-semibold">Sign in/ Register</span>
                </Link>
              )}

              <button className="md:hidden">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <form onSubmit={handleSearch} className="md:hidden mt-4">
            <div className="flex flex-col gap-2">
              <select 
                className="w-full bg-gray-100 text-gray-900 px-3 py-2 rounded-md"
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value || null)}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 text-gray-900 rounded-l-md focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-r-md transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Navigation */}
        <nav className="bg-slate-800 border-t border-slate-700">
          <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-8">
                <button
                  onMouseEnter={() => setShowCategories(true)}
                  onMouseLeave={() => setShowCategories(false)}
                  className="flex items-center space-x-1 hover:text-blue-400 transition-colors relative"
                >
                  <Menu className="w-4 h-4" />
                  <span>All Categories</span>
                  
                  {showCategories && (
                    <div className="absolute top-full left-0 bg-white text-gray-900 shadow-lg border rounded-md w-64 z-50">
                      {loading ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : (
                        categories.map(category => (
                          <button
                            key={category.id}
                            onClick={() => handleCategoryClick(category.slug)}
                            className="block w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors border-b last:border-b-0"
                          >
                            <div className="font-semibold">{category.name}</div>
                            {category.description && (
                              <div className="text-sm text-gray-600">
                                {category.description}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </button>
                
                <div className="hidden md:flex space-x-8">
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                  ) : (
                    categories.slice(0, 6).map(category => (
                      <button 
                        key={category.id}
                        onClick={() => handleCategoryClick(category.slug)}
                        className="hover:text-blue-400 transition-colors"
                      >
                        {category.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              <div className="hidden md:flex space-x-8">
                <span 
                  onClick={onViewDealsClick}
                  className="text-orange-400 font-semibold cursor-pointer hover:text-orange-300 transition-colors"
                >
                  Today's Deals
                </span>
                <span 
                  onClick={() => setShowCustomerService(true)}
                  className="text-green-400 cursor-pointer hover:text-green-300 transition-colors"
                >
                  Customer Service
                </span>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <CustomerService 
        isOpen={showCustomerService} 
        onClose={() => setShowCustomerService(false)} 
      />
      <Snackbar
        message={snackbarMessage}
        type={snackbarType}
        isVisible={showSnackbar}
        onClose={() => setShowSnackbar(false)}
      />
    </>
  );
};

export default Header;