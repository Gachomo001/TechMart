import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';

interface Location {
  id: string;
  name: string;
  type: 'county' | 'region';
  parent_id: string | null;
  delivery_status: 'paid' | 'free' | null;
  county: {
    name: string;
  } | null;
  delivery_costs: DeliveryCosts | null;
}

interface DeliveryCosts {
  id: string;
  location_id: string;
  standard_delivery_cost: number;
  express_delivery_cost: number;
  heavy_items_cost: number;
  bulky_items_cost: number;
}

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location;
  onSave: (costs: Omit<DeliveryCosts, 'id' | 'location_id'>) => Promise<void>;
  currentCosts?: Omit<DeliveryCosts, 'id' | 'location_id'>;
}

const PriceModal: React.FC<PriceModalProps> = ({ isOpen, onClose, location, onSave, currentCosts }) => {
  const [costs, setCosts] = useState({
    standard_delivery_cost: currentCosts?.standard_delivery_cost || 0,
    express_delivery_cost: currentCosts?.express_delivery_cost || 0,
    heavy_items_cost: currentCosts?.heavy_items_cost || 0,
    bulky_items_cost: currentCosts?.bulky_items_cost || 0
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave(costs);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-lg bg-slate-800 shadow-xl">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Set Delivery Prices for {location.name}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Standard Delivery */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Standard Delivery (KES)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costs.standard_delivery_cost}
                  onChange={(e) => setCosts(prev => ({ ...prev, standard_delivery_cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Express Delivery */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Express Delivery (KES)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costs.express_delivery_cost}
                  onChange={(e) => setCosts(prev => ({ ...prev, express_delivery_cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Heavy Items */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Heavy Items Delivery (KES)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costs.heavy_items_cost}
                  onChange={(e) => setCosts(prev => ({ ...prev, heavy_items_cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Bulky Items */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bulky Items Delivery (KES)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costs.bulky_items_cost}
                  onChange={(e) => setCosts(prev => ({ ...prev, bulky_items_cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeliveryCosts: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select(`
          id,
          name,
          type,
          parent_id,
          delivery_status,
          county:locations!parent_id(name),
          delivery_costs(
            id,
            location_id,
            standard_delivery_cost,
            express_delivery_cost,
            heavy_items_cost,
            bulky_items_cost
          )
        `)
        .eq('type', 'region')
        .eq('delivery_status', 'paid')
        .order('name');

      console.log('[Supabase] Raw locations data:', data);
      if (error) throw error;
      
      // Transform the data to match our Location interface
      const transformedData = (data as any[] || []).map(item => ({
        ...item,
        county: item.county?.[0] || null,
        delivery_costs: Array.isArray(item.delivery_costs) ? item.delivery_costs[0] || null : item.delivery_costs || null
      }));
      console.log('[Transformed] Locations with delivery_costs:', transformedData);
      setLocations(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCosts = async (costs: Omit<DeliveryCosts, 'id' | 'location_id'>) => {
    if (!selectedLocation) return;

    const { error } = await supabase
      .from('delivery_costs')
      .upsert({
        location_id: selectedLocation.id,
        ...costs
      }, { onConflict: 'location_id' });

    if (error) throw error;
    await fetchLocations();
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.county?.name.toLowerCase().includes(searchQuery.toLowerCase())
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
              placeholder="Search regions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Regions Table */}
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white">Delivery Costs by Region</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Standard</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Express</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Heavy Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Bulky Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredLocations.map(location => {
                const costs = location.delivery_costs;
                console.log('[Render] Region:', location.name, 'Costs:', costs);
                return (
                  <tr key={location.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {location.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      KES {costs?.standard_delivery_cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      KES {costs?.express_delivery_cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      KES {costs?.heavy_items_cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      KES {costs?.bulky_items_cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedLocation(location)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Set Prices
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Setting Modal */}
      {selectedLocation && (
        <PriceModal
          isOpen={!!selectedLocation}
          onClose={() => setSelectedLocation(null)}
          location={selectedLocation}
          onSave={handleSaveCosts}
          currentCosts={selectedLocation.delivery_costs ? selectedLocation.delivery_costs : undefined}
        />
      )}
    </div>
  );
};

export default DeliveryCosts; 