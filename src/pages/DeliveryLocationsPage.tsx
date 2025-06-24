import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Trash2, Search } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

interface Location {
  id: string;
  name: string;
  type: 'county' | 'region';
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  delivery_status: 'paid' | 'free' | null;
}

interface FormData {
  name: string;
  type: 'county' | 'region';
  parent_id: string | null;
  regions: string[];
  delivery_status: 'paid' | 'free' | null;
}

const DeliveryLocationsPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'county',
    parent_id: null,
    regions: [''],
    delivery_status: null
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRegionField = () => {
    setFormData(prev => ({
      ...prev,
      regions: [...prev.regions, '']
    }));
  };

  const handleRemoveRegionField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.filter((_, i) => i !== index)
    }));
  };

  const handleRegionChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.map((region, i) => i === index ? value : region)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingLocation) {
        // Handle editing existing location
        if (editingLocation.type === 'county') {
          // Update county name
          const { error: countyError } = await supabase
            .from('locations')
            .update({ 
              name: formData.name,
              delivery_status: null // Ensure county has no delivery status
            })
            .eq('id', editingLocation.id);

          if (countyError) throw countyError;

          // Get existing regions for this county
          const existingRegions = locations
            .filter(loc => loc.parent_id === editingLocation.id)
            .map(loc => loc.name);

          // Filter out empty region names and find new regions to add
          const newRegions = formData.regions
            .filter(region => region.trim() !== '' && !existingRegions.includes(region));

          if (newRegions.length > 0) {
            // Add only new regions
            const regionsToAdd = newRegions.map(region => ({
              name: region,
              type: 'region' as const,
              parent_id: editingLocation.id,
              delivery_status: 'paid' as const // Default to paid delivery for new regions
            }));

            const { error: regionsError } = await supabase
              .from('locations')
              .insert(regionsToAdd);

            if (regionsError) throw regionsError;
          }
        } else {
          // Update single region
          const { error } = await supabase
            .from('locations')
            .update({
              name: formData.name,
              parent_id: formData.parent_id,
              delivery_status: formData.delivery_status || 'paid'
            })
            .eq('id', editingLocation.id);

          if (error) throw error;
        }
      } else {
        // Handle adding new location
        if (formData.type === 'county') {
          // Add county
          const { data: county, error: countyError } = await supabase
            .from('locations')
            .insert([{
              name: formData.name,
              type: 'county',
              parent_id: null,
              delivery_status: null
            }])
            .select()
            .single();

          if (countyError) throw countyError;

          // Add all regions for this county
          const regionsToAdd = formData.regions
            .filter(region => region.trim() !== '')
            .map(region => ({
              name: region,
              type: 'region' as const,
              parent_id: county.id,
              delivery_status: 'paid' as const // Default to paid delivery for new regions
            }));

          if (regionsToAdd.length > 0) {
            const { error: regionsError } = await supabase
              .from('locations')
              .insert(regionsToAdd);

            if (regionsError) throw regionsError;
          }
        } else {
          // Add single region
          const { error } = await supabase
            .from('locations')
            .insert([{
              name: formData.name,
              type: 'region',
              parent_id: formData.parent_id,
              delivery_status: formData.delivery_status || 'paid'
            }]);

          if (error) throw error;
        }
      }

      await fetchLocations();
      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'county',
        parent_id: null,
        regions: [''],
        delivery_status: null
      });
      setEditingLocation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    if (location.type === 'county') {
      // For counties, get existing regions
      const existingRegions = locations
        .filter(loc => loc.parent_id === location.id)
        .map(loc => loc.name);
      
      setFormData({
        name: location.name,
        type: location.type,
        parent_id: null,
        regions: [...existingRegions, ''],
        delivery_status: null
      });
    } else {
      // For regions, just set the basic info
      setFormData({
        name: location.name,
        type: location.type,
        parent_id: location.parent_id,
        regions: [''],
        delivery_status: location.delivery_status as 'paid' | 'free' || 'paid'
      });
    }
    setIsModalOpen(true);
  };

  const handleDeleteClick = (location: Location) => {
    setLocationToDelete(location);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return;

    try {
      if (locationToDelete.type === 'county') {
        // First delete all regions associated with this county
        const { error: regionsError } = await supabase
          .from('locations')
          .delete()
          .eq('parent_id', locationToDelete.id);

        if (regionsError) throw regionsError;

        // Then delete the county
        const { error: countyError } = await supabase
          .from('locations')
          .delete()
          .eq('id', locationToDelete.id);

        if (countyError) throw countyError;
      } else {
        // Delete single region
        const { error } = await supabase
          .from('locations')
          .delete()
          .eq('id', locationToDelete.id);

        if (error) throw error;
      }

      await fetchLocations();
      setDeleteModalOpen(false);
      setLocationToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={() => {
            setEditingLocation(null);
            setFormData({
              name: '',
              type: 'county',
              parent_id: null,
              regions: [''],
              delivery_status: null
            });
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Location
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Locations List */}
      <div className="grid gap-6">
        {/* Counties */}
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white">Counties</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Regions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredLocations
                  .filter(loc => loc.type === 'county')
                  .map(county => (
                    <tr key={county.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{county.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {locations.filter(loc => loc.parent_id === county.id).length} regions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(county)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(county)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regions */}
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white">Regions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">County</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Delivery Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredLocations
                  .filter(loc => loc.type === 'region')
                  .map(region => {
                    const county = locations.find(loc => loc.id === region.parent_id);
                    return (
                      <tr key={region.id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{region.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {county?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            region.delivery_status === 'free' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {region.delivery_status === 'free' ? 'Free Delivery' : 'Paid Delivery'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(region)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(region)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Location Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsModalOpen(false)} />
            
            <div className="relative w-full max-w-2xl rounded-lg bg-slate-800 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
                <h3 className="text-xl font-semibold text-white">
                  {editingLocation ? `Edit ${editingLocation.type === 'county' ? 'County' : 'Region'}` : 'Add New Location'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingLocation(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                  {!editingLocation && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Location Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'county' | 'region' }))}
                        className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="county">County</option>
                        <option value="region">Region</option>
                      </select>
                    </div>
                  )}

                  {formData.type === 'county' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          County Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter county name"
                          required
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-slate-300">
                            {editingLocation ? 'Add New Regions' : 'Regions'}
                          </label>
                          <button
                            type="button"
                            onClick={handleAddRegionField}
                            className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Region
                          </button>
                        </div>
                        
                        {formData.regions.map((region, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={region}
                              onChange={(e) => handleRegionChange(index, e.target.value)}
                              className="flex-1 px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder={`Enter region ${index + 1} name`}
                            />
                            {formData.regions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRegionField(index)}
                                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Region Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter region name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Delivery Status *
                        </label>
                        <select
                          value={formData.delivery_status || 'paid'}
                          onChange={(e) => setFormData(prev => ({ ...prev, delivery_status: e.target.value as 'paid' | 'free' }))}
                          className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="paid">Paid Delivery</option>
                          <option value="free">Free Delivery</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Parent County
                        </label>
                        <select
                          value={formData.parent_id || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value || null }))}
                          className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select a county</option>
                          {locations
                            .filter(loc => loc.type === 'county')
                            .map(county => (
                              <option key={county.id} value={county.id}>
                                {county.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                  >
                    {editingLocation ? 'Save Changes' : 'Add Location'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DeleteConfirmationModal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setLocationToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={locationToDelete?.name || ''}
        itemType={locationToDelete?.type || 'region'}
      />
    </div>
  );
};

export default DeliveryLocationsPage; 