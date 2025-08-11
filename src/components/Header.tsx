import React, { useState, useEffect, } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TopBar from './TopBar';
import MainHeader from './MainHeader';
import CategoryNavigation from './CategoryNavigation';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url: string | null;
}

interface HeaderProps {
  onSearch: (query: string, categoryId: string | null) => void;
  onLogoClick?: () => void;
  onViewDealsClick: () => void;
  onCategorySelect?: (category: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch, onViewDealsClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        // 1. Get all unique category_ids from products table
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('category_id')
          .not('category_id', 'is', null);

        if (productsError) throw productsError;

        const categoryIds = [...new Set(productsData.map(p => p.category_id))];

        // 2. Fetch only the categories that have products
        if (categoryIds.length > 0) {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .in('id', categoryIds)
            .order('name');
          
          if (error) throw error;
          setCategories(data || []);
        } else {
          setCategories([]);
        }

      } catch (error) {
        console.error('Error fetching non-empty categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Set header height as CSS custom property
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      const updateHeaderHeight = () => {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      };
      
      updateHeaderHeight();
      const resizeObserver = new ResizeObserver(updateHeaderHeight);
      resizeObserver.observe(header);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [categories, loading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery, selectedCategory ? selectedCategory.id : null);
  };

  const handleCategoryClick = (categorySlug: string) => {
    navigate(`/category/${categorySlug}`);
    setIsMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <TopBar />
      <MainHeader 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory as (category: Category | null) => void}
        categories={categories}
        onSearch={handleSearch}
        onMobileMenuToggle={toggleMobileMenu}
        isMenuOpen={isMenuOpen}
      />
      <CategoryNavigation 
        categories={categories}
        onViewDealsClick={onViewDealsClick}
        onCategoryClick={handleCategoryClick}
        isMenuOpen={isMenuOpen}
      />
    </header>
  );
};

export default Header;
