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

const Header: React.FC<HeaderProps> = ({ onSearch, onLogoClick, onViewDealsClick }) => {
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
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
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

  // Calculate and set header height as CSS custom property
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [categories, loading]); // Recalculate when categories load or layout changes

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideDesktop = !profileMenuRef.current?.contains(event.target as Node);
      const isOutsideMobile = !mobileProfileMenuRef.current?.contains(event.target as Node);
      
      if (isOutsideDesktop && isOutsideMobile) {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery, selectedCategoryId);
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Mobile always searches all products (no category filter)
    onSearch(searchQuery, null);
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
      <header ref={headerRef} className="bg-slate-900 text-white shadow-lg" style={{ '--header-height': 'auto' } as React.CSSProperties}>
        {/* Top banner */}
        <div className="bg-blue-600 py-2 px-4 sm:px-6 lg:px-8 xl:px-12 text-center text-xs sm:text-sm">
          <p>+254 740 000 000 | info@techmart.com</p>
        </div>

        {/* Main header */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-3 sm:py-4">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={onLogoClick}
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                TechMart
              </button>
            </div>

            {/* Desktop Search bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8">
              <div className="flex w-full">
                <select 
                  className="bg-gray-100 text-gray-900 px-3 py-2 rounded-l-md border-r text-sm"
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
                  className="flex-1 px-4 py-2 text-gray-900 focus:outline-none text-sm"
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
                className="flex flex-col items-center text-sm hover:text-blue-400 transition-colors relative"
              >
                <div className="relative">
                  <Heart className={`w-7 h-7 ${wishlistState.items.length > 0 ? 'text-red-500 fill-current' : ''}`} />
                  {wishlistState.items.length > 0 && (
                    <span className="absolute -top-4 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {wishlistState.items.length}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={toggleCart}
                className="flex flex-col items-center text-sm hover:text-blue-400 transition-colors relative"
              >
                <div className="relative">
                  <ShoppingCart className={`w-7 h-7 ${getTotalItems() > 0 ? 'text-yellow-500 fill-current' : ''}`} />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-4 -right-4 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </div>
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
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-[9999] border border-gray-200">
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
                <Link to="/auth" className="flex flex-col text-sm hover:text-blue-400 transition-colors ml-4">
                  <span className="text-gray-300">Hello, </span>
                  <span className="font-semibold">Sign in/ Register</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* First Row: Logo and Icons */}
            <div className="flex items-center justify-between mb-3">
              <button 
                onClick={onLogoClick}
                className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                TechMart
              </button>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={toggleWishlist}
                  className="relative"
                >
                  <Heart className={`w-6 h-6 ${wishlistState.items.length > 0 ? 'text-red-500 fill-current' : 'text-white'}`} />
                  {wishlistState.items.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {wishlistState.items.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={toggleCart}
                  className="relative"
                >
                  <ShoppingCart className={`w-6 h-6 ${getTotalItems() > 0 ? 'text-yellow-500 fill-current' : 'text-white'}`} />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </button>
                
                {user ? (
                  <div className="relative" ref={mobileProfileMenuRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center"
                    >
                      <User className="w-6 h-6 text-white" />
                    </button>

                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-2 z-[9999] border border-gray-200">
                        <Link
                          to="/profile"
                          className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <Settings className="w-4 h-4" />
                          <span>Edit Profile</span>
                        </Link>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            handleSignOut();
                            setShowProfileMenu(false);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link to="/auth" className="flex items-center">
                    <User className="w-6 h-6 text-white" />
                  </Link>
                )}
              </div>
            </div>

            {/* Second Row: Search Bar with Category Selector */}
            <form onSubmit={handleMobileSearch} className="flex w-full">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-gray-900 focus:outline-none text-sm rounded-l-md"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 px-3 py-2 rounded-r-md transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
            </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:block bg-slate-800 border-t border-slate-700">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="flex items-center justify-between py-2 sm:py-3">
              <div className="flex items-center space-x-4 sm:space-x-8">
                {/* All Categories - Only show on desktop */}
                <div
                  onMouseEnter={() => setShowCategories(true)}
                  onMouseLeave={() => setShowCategories(false)}
                  className="hidden md:flex items-center space-x-1 hover:text-blue-400 transition-colors relative text-sm sm:text-base cursor-pointer"
                >
                  <Menu className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>All Categories</span>
                  {showCategories && (
                    <div className="absolute top-full left-0 bg-white text-gray-900 shadow-lg border rounded-md w-56 sm:w-64 z-50">
                      {loading ? (
                        <div className="p-3 sm:p-4 text-center">
                          <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : (
                        categories.map(category => (
                          <div
                            key={category.id}
                            onClick={() => handleCategoryClick(category.slug)}
                            className="block w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-100 transition-colors border-b last:border-b-0 text-sm sm:text-base cursor-pointer"
                          >
                            <div className="font-semibold">{category.name}</div>
                            {category.description && (
                              <div className="text-xs sm:text-sm text-gray-600">
                                {category.description}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* Desktop category quick links */}
                <div className="hidden md:flex space-x-6 sm:space-x-8">
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-blue-400"></div>
                  ) : (
                    categories.slice(0, 6).map(category => (
                      <button 
                        key={category.id}
                        onClick={() => handleCategoryClick(category.slug)}
                        className="hover:text-blue-400 transition-colors text-sm sm:text-base"
                      >
                        {category.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4 sm:space-x-6">
                {/* Today's Deals - Only show on desktop */}
                <div className="hidden md:flex space-x-6 sm:space-x-8">
                  <span 
                    onClick={onViewDealsClick}
                    className="text-orange-400 font-semibold cursor-pointer hover:text-orange-300 transition-colors text-sm sm:text-base"
                  >
                    Today's Deals
                  </span>
                  <span 
                    onClick={() => setShowCustomerService(true)}
                    className="text-green-400 cursor-pointer hover:text-green-300 transition-colors text-sm sm:text-base"
                  >
                    Customer Service
                  </span>
                </div>
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