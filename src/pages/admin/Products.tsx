import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus,
  Search,
  Trash2,
  X,
  Upload,
  Pencil,
} from 'lucide-react';

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
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    buying_price: '',
    original_price: '',
    brand: '',
    category_id: '',
    subcategory_id: '',
    stock_quantity: '0',
    is_featured: false,
    is_bestseller: false,
    specifications: {},
    image_url: ''
  });
  // For dynamic specifications UI
  const [specArray, setSpecArray] = useState<{ key: string; value: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      setSubcategories(subcategoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = formData.image_url;

      if (selectedImage) {
        try {
          imageUrl = await uploadImage(selectedImage);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to upload image');
          return;
        }
      }

      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        price: parseFloat(formData.price),
        buying_price: parseFloat(formData.buying_price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        brand: formData.brand || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        image_url: imageUrl,
        stock_quantity: parseInt(formData.stock_quantity),
        is_featured: formData.is_featured,
        is_bestseller: formData.is_bestseller,
        specifications: specArray.length > 0 ? Object.fromEntries(specArray.map(({ key, value }) => [key, value])) : {},
      };

      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (updateError) throw updateError;

        // If this is a new image upload, also create a product_image record
        if (selectedImage && imageUrl) {
          // First, set all existing images to non-primary
          await supabase
            .from('product_images')
            .update({ is_primary: false })
            .eq('product_id', editingProduct.id);

          // Then insert the new primary image
          const { error: imageError } = await supabase
            .from('product_images')
            .insert([{
              product_id: editingProduct.id,
              image_url: imageUrl,
              is_primary: true
            }]);

          if (imageError) throw imageError;
        }
      } else {
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (insertError) throw insertError;

        // If there's an image, create a product_image record
        if (imageUrl && newProduct) {
          const { error: imageError } = await supabase
            .from('product_images')
            .insert([{
              product_id: newProduct.id,
              image_url: imageUrl,
              is_primary: true
            }]);

          if (imageError) throw imageError;
        }
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error instanceof Error ? error.message : 'Failed to save product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Get the primary image URL or fallback to the product's image_url
    const primaryImage = product.product_images?.find(img => img.is_primary)?.image_url || product.image_url;
    // Convert specifications object to array for UI
    const specs = product.specifications && typeof product.specifications === 'object'
      ? Object.entries(product.specifications).map(([key, value]) => ({ key, value: String(value) }))
      : [];
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: product.price.toString(),
      buying_price: product.buying_price.toString(),
      original_price: product.original_price?.toString() || '',
      brand: product.brand || '',
      category_id: product.category_id || '',
      subcategory_id: product.subcategory_id || '',
      stock_quantity: product.stock_quantity.toString(),
      is_featured: product.is_featured,
      is_bestseller: product.is_bestseller,
      specifications: product.specifications || {},
      image_url: primaryImage || ''
    });
    setSpecArray(specs);
    // Set the image preview to the primary image URL
    setImagePreview(primaryImage);
    setIsModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: '',
      buying_price: '',
      original_price: '',
      brand: '',
      category_id: '',
      subcategory_id: '',
      stock_quantity: '0',
      is_featured: false,
      is_bestseller: false,
      specifications: {},
      image_url: ''
    });
    setSpecArray([]);
    setSelectedImage(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: '',
      buying_price: '',
      original_price: '',
      brand: '',
      category_id: '',
      subcategory_id: '',
      stock_quantity: '0',
      is_featured: false,
      is_bestseller: false,
      specifications: {},
      image_url: ''
    });
    setSelectedImage(null);
    setImagePreview(null);
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
                            onClick={() => handleDelete(product.id)}
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
                        onClick={() => handleDelete(product.id)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-700/50">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
                {/* Specifications UI */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Specifications</label>
                  <div className="space-y-2">
                    {specArray.map((spec, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Key"
                          value={spec.key}
                          onChange={e => {
                            const newSpecs = [...specArray];
                            newSpecs[idx].key = e.target.value;
                            setSpecArray(newSpecs);
                          }}
                          className="w-1/3 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={spec.value}
                          onChange={e => {
                            const newSpecs = [...specArray];
                            newSpecs[idx].value = e.target.value;
                            setSpecArray(newSpecs);
                          }}
                          className="w-2/3 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => setSpecArray(specArray.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 px-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSpecArray([...specArray, { key: '', value: '' }])}
                      className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Add Specification
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Buying Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.buying_price}
                      onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Original Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Samsung, Apple"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Subcategory
                    </label>
                    <select
                      value={formData.subcategory_id}
                      onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select Subcategory</option>
                      {subcategories
                        .filter(sub => !formData.category_id || sub.category_id === formData.category_id)
                        .map(subcategory => (
                          <option key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Featured</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_bestseller}
                      onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Bestseller</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Product Image
                  </label>
                  <div className="mt-1 flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {selectedImage ? 'Change Image' : 'Upload Image'}
                      </label>
                      {selectedImage && (
                        <p className="mt-1 text-sm text-gray-500">
                          {selectedImage.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-slate-700/50">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                onClick={(e) => handleSubmit(e)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : editingProduct ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Products; 