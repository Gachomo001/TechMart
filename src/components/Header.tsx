import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingCart, Menu, Heart, User, Settings, LayoutDashboard, LogOut, ChevronDown, Monitor } from 'lucide-react';
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

const Header: React.FC<HeaderProps> = ({ onSearch, onViewDealsClick }) => {
  const navigate = useNavigate();
  const { getTotalItems, toggleCart } = useCart();
  const { state: wishlistState, toggleWishlist } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showCustomerService, setShowCustomerService] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | 'info'>('success');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
  }, [categories, loading]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const profileContainer = profileMenuRef.current?.parentElement;
      const isOutsideProfile = !profileContainer?.contains(target);
      
      if (isOutsideProfile && showProfileMenu) {
        console.log('Click outside detected, closing profile menu');
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
  }, [showProfileMenu]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery, selectedCategory ? selectedCategory.id : null);
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery, selectedCategory ? selectedCategory.id : null);
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
    setIsMenuOpen(false);
  };

  return (
    <>
      <header ref={headerRef} className="bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link to="/" className="flex items-center text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 cursor-pointer">
                  <Monitor className="hidden md:block h-9 w-9 text-blue-600 mr-4" />
                  TechMart
                </Link>
              </div>
            </div>

            {/* Search Bar with Category Selector - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
              <form onSubmit={handleSearch} className="relative flex w-full">
                {/* Category Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="flex items-center px-3 lg:px-4 h-10 bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 min-w-[120px] lg:min-w-[140px]"
                  >
                    <span className="truncate text-xs lg:text-sm">{selectedCategory ? selectedCategory.name : 'All Categories'}</span>
                    <ChevronDown className="ml-1 lg:ml-2 h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                  </button>
                  {isCategoryOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-72 overflow-y-auto">
                      <button
                        onClick={() => { setSelectedCategory(null); setIsCategoryOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        All Categories
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => { setSelectedCategory(category); setIsCategoryOpen(false); }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Search Input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search for computers, accessories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-4 pr-4 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {/* Search Button */}
                <button type="submit" className="px-4 lg:px-6 h-10 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                  <Search className="h-4 w-4 lg:h-5 lg:w-5" />
                </button>
              </form>
            </div>

            {/* Navigation Icons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative">
                <button 
                  onClick={() => {
                    console.log('Profile icon clicked, current state:', showProfileMenu);
                    console.log('Current user:', user);
                    console.log('isAdmin value:', isAdmin);
                    setShowProfileMenu(!showProfileMenu);
                    console.log('New state will be:', !showProfileMenu);
                  }} 
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <User className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                {showProfileMenu && (
                  <div 
                    ref={profileMenuRef}
                    className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-[9999] border border-gray-200"
                  >
                    {user ? (
                      <>
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
                      </>
                    ) : (
                      <Link to="/auth" className="flex flex-col text-sm hover:text-blue-400 transition-colors ml-4">
                        <span className="text-gray-300">Hello, </span>
                        <span className="font-semibold">Sign in/ Register</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <button onClick={toggleWishlist} className="p-2 text-gray-600 hover:text-red-600 transition-colors relative">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
                {wishlistState.items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {wishlistState.items.length}
                  </span>
                )}
              </button>
              <button onClick={toggleCart} className="p-2 text-gray-600 hover:text-blue-600 transition-colors relative">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {getTotalItems()}
                  </span>
                )}
              </button>
              <button 
                className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-4">
            <form onSubmit={handleMobileSearch} className="relative flex w-full">
              {/* Category Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  className="flex items-center px-3 h-10 bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 min-w-[100px]"
                >
                  <span className="truncate text-xs">{selectedCategory ? selectedCategory.name : 'All'}</span>
                  <ChevronDown className="ml-1 h-3 w-3 flex-shrink-0" />
                </button>
                {isCategoryOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-72 overflow-y-auto">
                    <button
                      onClick={() => { setSelectedCategory(null); setIsCategoryOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      All
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => { setSelectedCategory(category); setIsCategoryOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                      {category.name}
                      </button>
                  ))}
                  </div>
                )}
              </div>
              {/* Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-4 pr-4 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {/* Search Button */}
              <button type="submit" className="px-4 h-10 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Navigation Menu - Centered */}
          <nav className="hidden md:block pb-4">
            <div className="flex justify-center space-x-6 lg:space-x-10">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              ) : (
                categories.map((category) => (
                  <button 
                    key={category.id}
                    onClick={() => handleCategoryClick(category.slug)}
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm lg:text-base"
                  >
                    {category.name}
                  </button>
                ))
              )}
              <button 
                onClick={onViewDealsClick}
                className="text-orange-600 hover:text-orange-700 font-medium transition-colors text-sm lg:text-base"
              >
                Deals
              </button>
            </div>
          </nav>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <nav className="md:hidden pb-4 border-t border-gray-200 pt-4">
              <div className="flex flex-col space-y-2">
                {categories.map((category) => (
              <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.slug)}
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors py-2 text-left"
                  >
                    {category.name}
              </button>
                ))}
                    <button
                  onClick={onViewDealsClick}
                  className="text-orange-600 hover:text-orange-700 font-medium transition-colors py-2 text-left"
                    >
                  Deals
                    </button>
              </div>
            </nav>
          )}
        </div>
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