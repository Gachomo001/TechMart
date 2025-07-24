import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
  category_id: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  buying_price: number;
  original_price: number | null;
  brand: string | null;
  category_id: string;
  subcategory_id: string;
  stock_quantity: number;
  is_featured: boolean;
  is_bestseller: boolean;
  specifications: any;
  product_images: { image_url: string }[];
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  productToEdit?: Product | null;
}

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  productToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [specifications] = useState<{ key: string; value: string }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ url: string; toDelete: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    if (productToEdit) {
      setName(productToEdit.name);
      setDescription(productToEdit.description);
      setPrice(productToEdit.price.toString());
      setBuyingPrice(productToEdit.buying_price.toString());
      setOriginalPrice(productToEdit.original_price?.toString() || '');
      setBrand(productToEdit.brand || '');
      setCategoryId(productToEdit.category_id);
      setSubcategoryId(productToEdit.subcategory_id);
      setStockQuantity(productToEdit.stock_quantity.toString());
      setIsFeatured(productToEdit.is_featured);
      setIsBestseller(productToEdit.is_bestseller);
      setExistingImages(productToEdit.product_images.map(img => ({ url: img.image_url, toDelete: false })));
    } else {
      // Reset form when adding a new product
      setName('');
      setDescription('');
      setPrice('');
      setBuyingPrice('');
      setOriginalPrice('');
      setBrand('');
      setCategoryId('');
      setSubcategoryId('');
      setStockQuantity('');
      setIsFeatured(false);
      setIsBestseller(false);
      setExistingImages([]);
      setImages([]);
    }
  }, [productToEdit, isOpen]);

  useEffect(() => {
    if (categoryId) {
      fetchSubcategories(categoryId);
    } else {
      setSubcategories([]);
    }
  }, [categoryId]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    if (data) setCategories(data);
  };

  const fetchSubcategories = async (categoryId: string) => {
    const { data } = await supabase
      .from('subcategories')
      .select('id, name, category_id')
      .eq('category_id', categoryId)
      .order('name');
    if (data) setSubcategories(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleDeleteExistingImage = (index: number) => {
    setExistingImages(existingImages.map((img, i) => i === index ? { ...img, toDelete: !img.toDelete } : img));
  };

  const uploadImages = async (productId: string) => {
    const uploadedUrls: string[] = [];
    
    try {
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}-${i}-${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);

        // Save to product_images table
        const { error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            is_primary: i === 0, // First image is primary
          });

        if (dbError) {
          console.error('Error saving image to database:', dbError);
          throw dbError;
        }
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error in uploadImages:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const productData = {
        name,
        slug,
        description,
        price: parseFloat(price),
        buying_price: parseFloat(buyingPrice),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        brand: brand || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        stock_quantity: parseInt(stockQuantity),
        is_featured: isFeatured,
        is_bestseller: isBestseller,
        specifications: specifications.length > 0 ? Object.fromEntries(specifications.map(({ key, value }) => [key, value])) : null,
      };

      let productId: string;

      if (productToEdit) {
        // Update existing product
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productToEdit.id)
          .select()
          .single();
        if (error) throw error;
        productId = data.id;

        // Handle image deletions
        const imagesToDelete = existingImages.filter(img => img.toDelete).map(img => img.url);
        if (imagesToDelete.length > 0) {
          await supabase.from('product_images').delete().in('image_url', imagesToDelete);
          // Also delete from storage bucket
          const filePaths = imagesToDelete.map(url => new URL(url).pathname.split('/products/')[1]);
          await supabase.storage.from('products').remove(filePaths);
        }
      } else {
        // Insert new product
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        productId = data.id;
      }

      // Upload new images
      if (images.length > 0) {
        await uploadImages(productId);
      }

      onProductAdded();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700/50">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-700/50">
          <h2 className="text-lg sm:text-xl font-semibold text-white">{productToEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Buying Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={buyingPrice}
                  onChange={(e) => setBuyingPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Original Price (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Samsung, Apple"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
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
                <label className="block text-sm font-medium text-slate-300 mb-1">Subcategory</label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={!categoryId}
                >
                  <option value="">Select Subcategory</option>
                  {subcategories.map(subcategory => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Stock Quantity</label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700"
                />
                <span className="ml-2 text-sm text-slate-300">Featured Product</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700"
                />
                <span className="ml-2 text-sm text-slate-300">Bestseller</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Product Images</label>
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center">
                <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-400 mb-2">Click to upload images</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-600 rounded-md text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Choose Files
                </label>
              </div>
              {(existingImages.length > 0 || images.length > 0) && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {existingImages.map((image, index) => (
                    <div key={`existing-${index}`} className="relative aspect-square">
                      <img
                        src={image.url}
                        alt={`Existing Image ${index + 1}`}
                        className={`w-full h-full object-cover rounded-md ${image.toDelete ? 'opacity-50' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleDeleteExistingImage(index)}
                        className={`absolute top-1 right-1 text-white rounded-full p-1 ${image.toDelete ? 'bg-green-500' : 'bg-red-500'}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {images.map((image, index) => (
                    <div key={`new-${index}`} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`New Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-slate-700/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (productToEdit ? 'Updating...' : 'Creating...') : (productToEdit ? 'Update Product' : 'Create Product')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
