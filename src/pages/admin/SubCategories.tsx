import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import AddSubCategoryModal from '../../components/admin/AddSubCategoryModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string;
  created_at: string;
  category: {
    name: string;
  };
}

const SubCategories: React.FC = () => {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [subCategoryToDelete, setSubCategoryToDelete] = useState<SubCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubCategories();
  }, []);

  const fetchSubCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          *,
          category:categories(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubCategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (subCategory: SubCategory) => {
    setSubCategoryToDelete(subCategory);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!subCategoryToDelete) return;
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subCategoryToDelete.id);
      if (error) {
        if (error.code === '23503' || (error.message && error.message.toLowerCase().includes('foreign key')) ) {
          setError('Cannot delete this subcategory because it is referenced by other records (e.g., products).');
        } else {
          setError(error.message || 'Failed to delete subcategory');
        }
        return;
      }
      await fetchSubCategories();
      setDeleteModalOpen(false);
      setSubCategoryToDelete(null);
    } catch (error: any) {
      setError(error.message || 'Failed to delete subcategory');
    }
  };

  const filteredSubCategories = subCategories.filter(subCategory =>
    subCategory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subCategory.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subCategory.category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Subcategories Management</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Subcategory
        </button>
      </div>

      {/* Search */}
      <div className="flex-1">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md leading-5 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search subcategories..."
          />
        </div>
      </div>

      {/* SubCategories Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredSubCategories.length === 0 ? (
          <div className="col-span-full text-center text-slate-400">
            No subcategories found
          </div>
        ) : (
          filteredSubCategories.map((subCategory) => (
            <div
              key={subCategory.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-white">{subCategory.name}</h3>
                    <p className="text-sm text-slate-400">Parent: {subCategory.category.name}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {/* TODO: Implement edit */}}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(subCategory)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {subCategory.description && (
                  <p className="mt-2 text-sm text-slate-400">{subCategory.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add SubCategory Modal */}
      <AddSubCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubCategoryAdded={fetchSubCategories}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSubCategoryToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={subCategoryToDelete?.name || ''}
        itemType="subcategory"
      />
    </div>
  );
};

export default SubCategories; 