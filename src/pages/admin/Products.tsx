import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
} from 'lucide-react';
import AddProductModal from '../../components/admin/AddProductModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const LAPTOP_CATEGORY_ID = 'd387a180-23f0-4427-8b22-b076320fdfc6';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  buying_price: number;
  original_price: number | null;
  brand: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  image_url: string | null;
  stock_quantity: number;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_bestseller: boolean;
  specifications: any;
  created_at: string;
  updated_at: string;
  product_images?: {
    image_url: string;
    is_primary: boolean;
  }[];
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch products with their images
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            image_url,
            is_primary
          )
        `)
        .order('name');

      if (productsError) throw productsError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch subcategories
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (subcategoriesError) throw subcategoriesError;

      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      const { error } = await supabase.functions.invoke('delete-product', {
        body: { productId: productToDelete.id },
      });

      if (error) {
        // Check for foreign key violation (Postgres error code 23503)
        if (error.message && (error.message.includes('23503') || error.message.toLowerCase().includes('foreign key'))) {
          setError('Cannot delete this product because it is referenced in one or more orders.');
        } else {
          setError(error.message || 'Failed to delete product');
        }
        return;
      }

      await fetchData();
      setDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error: any) {
      setError(error.message || 'Failed to delete product');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity > 10) {
      return {
        text: 'In Stock',
        color: 'bg-green-100 text-green-800'
      };
    } else if (quantity > 0) {
      return {
        text: 'Limited',
        color: 'bg-yellow-100 text-yellow-800'
      };
    } else {
      return {
        text: 'Out of Stock',
        color: 'bg-red-100 text-red-800'
      };
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    categories.find(c => c.id === product.category_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Products</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 pl-10 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
          <button
            onClick={handleAddProduct}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {error && (
          <div className="p-4 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}

        {/* Mobile Card View */}
        <div className="lg:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const primaryImage = product.product_images?.find(img => img.is_primary)?.image_url || product.image_url;
              const stockStatus = getStockStatus(product.stock_quantity);
              
              return (
                <div key={product.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-start space-x-3">
                    {primaryImage && (
                      <img
                        src={primaryImage}
                        alt={product.name}
                        className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{product.name}</h3>
                      <p className="text-sm text-slate-300 mt-1">KES {product.price.toLocaleString()}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full
                          ${stockStatus.text === 'In Stock' ? 'bg-green-500/20 text-green-400' :
                            stockStatus.text === 'Limited' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'}`}>
                          {stockStatus.text}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Stock: {product.stock_quantity} • {categories.find(c => c.id === product.category_id)?.name || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block w-full bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-700/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredProducts.map((product) => {
                const primaryImage = product.product_images?.find(img => img.is_primary)?.image_url || product.image_url;
                const stockStatus = getStockStatus(product.stock_quantity);
                
                return (
                  <tr key={product.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {primaryImage && (
                        <img
                          src={primaryImage}
                          alt={product.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      KES {product.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {product.stock_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${stockStatus.text === 'In Stock' ? 'bg-green-500/20 text-green-400' :
                          stockStatus.text === 'Limited' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'}`}>
                        {stockStatus.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {categories.find(c => c.id === product.category_id)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-400 hover:text-blue-300 mr-4 transition-colors"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onProductAdded={fetchData}
        productToEdit={editingProduct}
      />
      </div>
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={productToDelete?.name || ''}
        itemType="product"
      />
    </div>
  );
};

export default Products;
