import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface CustomLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (county: string, region: string, countyDeliveryCosts?: any) => void;
  initialCounty?: string;
  initialRegion?: string;
}

const CustomLocationModal: React.FC<CustomLocationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCounty = '',
  initialRegion = ''
}) => {
  const [county, setCounty] = useState(initialCounty);
  const [region, setRegion] = useState(initialRegion);
  const [errors, setErrors] = useState<{ county?: string; region?: string }>({});
  const [counties, setCounties] = useState<{ value: string; label: string; id: string }[]>([]);
  const [isLoadingCounties, setIsLoadingCounties] = useState(false);
  const [countyDeliveryCosts, setCountyDeliveryCosts] = useState<any>(null);

  // Fetch counties from database
  useEffect(() => {
    if (isOpen) {
      const fetchCounties = async () => {
        setIsLoadingCounties(true);
        try {
          const { data, error } = await supabase.from('locations').select('id, name').eq('type', 'county');
          if (error) throw error;
          setCounties(data.map(loc => ({ value: loc.name, label: loc.name, id: loc.id })));
        } catch (error) {
          console.error('Error fetching counties:', error);
          toast.error('Could not load counties.');
        } finally {
          setIsLoadingCounties(false);
        }
      };
      fetchCounties();
    }
  }, [isOpen]);

  // Fetch delivery costs when county changes
  useEffect(() => {
    const fetchCountyDeliveryCosts = async () => {
      if (!county) {
        setCountyDeliveryCosts(null);
        return;
      }

      const selectedCounty = counties.find(c => c.value === county);
      if (!selectedCounty) return;

      try {
        const { data, error } = await supabase
          .from('delivery_costs')
          .select('standard_delivery_cost, express_delivery_cost, heavy_items_cost, bulky_items_cost')
          .eq('location_id', selectedCounty.id)
          .single();

        if (error) {
          console.log('No delivery costs found for county, will use standard rates');
          setCountyDeliveryCosts(null);
        } else {
          setCountyDeliveryCosts(data);
        }
      } catch (error) {
        console.error('Error fetching county delivery costs:', error);
        setCountyDeliveryCosts(null);
      }
    };

    if (counties.length > 0 && county) {
      fetchCountyDeliveryCosts();
    }
  }, [county, counties]);

  const validateForm = () => {
    const newErrors: { county?: string; region?: string } = {};
    
    if (!county.trim()) {
      newErrors.county = 'County is required';
    }
    
    if (!region.trim()) {
      newErrors.region = 'Region is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(county.trim(), region.trim(), countyDeliveryCosts);
      onClose();
    }
  };

  const handleClose = () => {
    setCounty(initialCounty);
    setRegion(initialRegion);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Custom Location</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-slate-300 text-sm mb-6">
            Enter your custom county and region for delivery. This will be used for your shipping information.
          </p>

          {/* County Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              County <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              options={counties}
              value={county}
              onChange={(value) => setCounty(value)}
              isLoading={isLoadingCounties}
              placeholder={isLoadingCounties ? "Loading counties..." : "Select a county"}
              required
            />
            {errors.county && <p className="text-xs text-red-500">{errors.county}</p>}
          </div>

          {/* Region Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Region <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={`w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 ${
                errors.region ? 'border-red-500' : ''
              }`}
              placeholder="Enter your region"
            />
            {errors.region && <p className="text-xs text-red-500">{errors.region}</p>}
          </div>

          {/* Info Note */}
          <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-3">
            <p className="text-blue-300 text-xs">
              <strong>Note:</strong> Custom locations may have different shipping costs. Standard delivery rates will apply.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomLocationModal;
