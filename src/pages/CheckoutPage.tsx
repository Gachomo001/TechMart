import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';
import { CartItem } from '../../types';
import { Check, Download } from 'lucide-react';
import BackButton from '@/components/BackButton';
import CustomDropdown from '@/components/CustomDropdown';
import UnifiedPaymentForm from '@/components/Payment/UnifiedPaymentForm';
import OrderSummaryCard from '@/components/checkout/OrderSummaryCard';
import CustomLocationModal from '@/components/CustomLocationModal';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
    autoTable: (options: UserOptions) => jsPDF;
  }
}

interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  county: string;
  region: string;
  country: string;
  shippingType: string;
  notes?: string;
  // Custom location support
  customCounty?: string;
  customRegion?: string;
  isCustomLocation?: boolean;
  customCountyDeliveryCosts?: any;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  county?: string;
  region?: string;
  shippingType?: string;
}

interface RegionDetails {
  delivery_status: 'paid' | 'free' | null;
  delivery_costs: {
    standard_delivery_cost: number;
    express_delivery_cost: number;
    heavy_items_cost: number;
    bulky_items_cost: number;
  } | null;
}

const CheckoutPage: React.FC = () => {
  const { state, getTotalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [orderComplete] = useState(false);
  const [orderNumber] = useState('');
  const [orderItems] = useState<CartItem[]>([]);

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    firstName: user?.user_metadata.full_name?.split(' ')[0] || '',
    lastName: user?.user_metadata.full_name?.split(' ')[1] || '',
    email: user?.email || '',
    phone: user?.phone || '',
    county: '',
    region: '',
    country: 'Kenya',
    shippingType: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const [paymentState] = useState({
    processing: false,
    error: null as string | null,
  });

  // Auth guard: require authentication before accessing checkout
  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to continue to checkout.');
      navigate('/auth', { replace: true, state: { from: '/checkout' } });
    }
  }, [user, navigate]);

  // Store cleanup functions
  const cleanupFunctions = React.useRef<Array<() => void>>([]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (e) {
          console.error('Error during cleanup:', e);
        }
      });
      cleanupFunctions.current = [];
    };
  }, []);

  const [counties, setCounties] = useState<{ value: string; label: string }[]>([]);
  const [regions, setRegions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [selectedRegionDetails, setSelectedRegionDetails] = useState<RegionDetails | null>(null);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [isCustomLocationModalOpen, setIsCustomLocationModalOpen] = useState(false);

  const shippingCost = useMemo(() => {
    if (selectedRegionDetails?.delivery_status === 'free') return 0;
    const selectedOption = shippingOptions.find(opt => opt.id === shippingInfo.shippingType);
    return selectedOption?.price || 0;
  }, [shippingOptions, shippingInfo.shippingType, selectedRegionDetails]);

  const orderTotals = useMemo(() => {
    const subtotal = getTotalPrice();
    const tax = subtotal * 0.16; // Tax is 16% of subtotal
    const total = subtotal + shippingCost;
    return { subtotal, tax, shippingCost, total };
  }, [getTotalPrice, shippingCost]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, orderComplete]);

  useEffect(() => {
    if (state.items.length === 0 && !orderComplete) {
      toast.error('Your cart is empty. Redirecting to home page.');
      navigate('/');
    }
  }, [state.items.length, orderComplete, navigate]);

  useEffect(() => {
    const fetchCounties = async () => {
      setIsLoadingLocations(true);
      try {
        const { data, error } = await supabase.from('locations').select('id, name').eq('type', 'county');
        if (error) throw error;
        setCounties(data.map(loc => ({ value: loc.id, label: loc.name })));
      } catch (error) {
        console.error('Error fetching counties:', error);
        toast.error('Could not load counties.');
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchCounties();
  }, []);

  useEffect(() => {
    if (shippingInfo.county) {
      const fetchRegions = async () => {
        setIsLoadingLocations(true);
        try {
          const { data, error } = await supabase
            .from('locations')
            .select('id, name')
            .eq('parent_id', shippingInfo.county)
            .eq('type', 'region');

          if (error) throw error;

          setRegions(
            data.map((region) => ({
              value: region.id,
              label: region.name,
            }))
          );
        } catch (error) {
          console.error('Error fetching regions:', error);
          toast.error('Failed to load regions');
        } finally {
          setIsLoadingLocations(false);
        }
      };

      fetchRegions();
    } else {
      setRegions([]);
      setShippingInfo((prev) => ({ ...prev, region: '' }));
    }
  }, [shippingInfo.county]);

  const handleCustomLocationSave = (customCounty: string, customRegion: string, countyDeliveryCosts?: any) => {
    // Find the county ID for the selected custom county
    const selectedCounty = counties.find(c => c.label === customCounty);
    const countyId = selectedCounty ? selectedCounty.value : 'custom';
    
    setShippingInfo(prev => ({ 
      ...prev, 
      customCounty, 
      customRegion, 
      isCustomLocation: true,
      customCountyDeliveryCosts: countyDeliveryCosts,
      // Populate the County and Region fields with actual county ID and custom region
      county: countyId,
      region: 'custom'
    }));
    setIsCustomLocationModalOpen(false);
    
    // Set shipping options based on county delivery costs
    if (countyDeliveryCosts) {
      const costs = countyDeliveryCosts;
      const options = [
        { 
          id: 'collect', 
          name: 'Collect at the Shop', 
          description: 'Pick up your order from our store.', 
          price: 0,
          icon: '🏪' 
        },
        { 
          id: 'standard', 
          name: 'Standard Delivery', 
          description: 'For items under 5kg (electronics, small accessories)', 
          price: costs.standard_delivery_cost,
          icon: '🚚' 
        },
        { 
          id: 'express', 
          name: 'Express Delivery', 
          description: 'For items 5-15kg (medium electronics, small appliances)', 
          price: costs.express_delivery_cost,
          icon: '⚡' 
        },
        { 
          id: 'heavy', 
          name: 'Heavy Items', 
          description: 'For items 15-30kg (large appliances, Standard PC Builds)', 
          price: costs.heavy_items_cost,
          icon: '🏋️' 
        },
        { 
          id: 'bulky', 
          name: 'Bulky Items', 
          description: 'For items over 30kg (large PC Builds, multiple items)', 
          price: costs.bulky_items_cost,
          icon: '📦' 
        },
      ].filter(option => option.price > 0 || option.id === 'collect');
      
      setShippingOptions(options);
      setShippingInfo(prev => ({ 
        ...prev, 
        shippingType: options.length > 0 ? options[0].id : '' 
      }));
      
      // Set region details for custom location
      setSelectedRegionDetails({
        delivery_status: 'paid',
        delivery_costs: costs
      });
    } else {
      // Use standard rates if no county delivery costs found
      const standardOptions = [
        { id: 'collect', name: 'Collect at the Shop', description: 'Pick up your order from our store - FREE', price: 0, icon: '🏪' },
        { id: 'standard', name: 'Standard Delivery', description: 'For items under 5kg (electronics, small accessories)', price: 200, icon: '🚚' },
        { id: 'express', name: 'Express Delivery', description: 'For items 5-15kg (medium electronics, small appliances)', price: 350, icon: '⚡' },
        { id: 'heavy', name: 'Heavy Items', description: 'For items 15-30kg (large appliances, Standard PC Builds)', price: 500, icon: '🏋️' },
        { id: 'bulky', name: 'Bulky Items', description: 'For items over 30kg (large PC Builds, multiple items)', price: 750, icon: '📦' },
      ];
      
      setShippingOptions(standardOptions);
      setShippingInfo(prev => ({ 
        ...prev, 
        shippingType: standardOptions[0].id 
      }));
      
      setSelectedRegionDetails({
        delivery_status: 'paid',
        delivery_costs: {
          standard_delivery_cost: 200,
          express_delivery_cost: 350,
          heavy_items_cost: 500,
          bulky_items_cost: 750
        }
      });
    }
  };

  useEffect(() => {
    let isActive = true; // Cleanup flag to prevent race conditions

    const fetchShippingCosts = async () => {
      if (!shippingInfo.region) {
        if (isActive) {
          setShippingOptions([]);
          setSelectedRegionDetails(null);
          setShippingInfo(prev => ({ ...prev, shippingType: '' }));
        }
        return;
      }

      // If custom region, use county delivery costs - no database queries needed
      if (shippingInfo.region === 'custom') {
        // Use county delivery costs if available, otherwise use standard rates
        const costs = shippingInfo.customCountyDeliveryCosts || {
          standard_delivery_cost: 200,
          express_delivery_cost: 350,
          heavy_items_cost: 500,
          bulky_items_cost: 750
        };
        
        const options = [
          { 
            id: 'collect', 
            name: 'Collect at the Shop', 
            description: 'Pick up your order from our store - FREE', 
            price: 0,
            icon: '🏪' 
          },
          { 
            id: 'standard', 
            name: 'Standard Delivery', 
            description: 'For items under 5kg (electronics, small accessories)', 
            price: costs.standard_delivery_cost,
            icon: '🚚' 
          },
          { 
            id: 'express', 
            name: 'Express Delivery', 
            description: 'For items 5-15kg (medium electronics, small appliances)', 
            price: costs.express_delivery_cost,
            icon: '⚡' 
          },
          { 
            id: 'heavy', 
            name: 'Heavy Items', 
            description: 'For items 15-30kg (large appliances, Standard PC Builds)', 
            price: costs.heavy_items_cost,
            icon: '🏋️' 
          },
          { 
            id: 'bulky', 
            name: 'Bulky Items', 
            description: 'For items over 30kg (large PC Builds, multiple items)', 
            price: costs.bulky_items_cost,
            icon: '📦' 
          },
        ].filter(option => option.price > 0 || option.id === 'collect');
        
        if (isActive) {
          setShippingOptions(options);
          setShippingInfo(prev => ({ 
            ...prev, 
            shippingType: options.length > 0 ? options[0].id : '' 
          }));
          
          setSelectedRegionDetails({
            delivery_status: 'paid',
            delivery_costs: costs
          });
        }
        return;
      }

      const toastId = toast.loading('Fetching shipping options...');
      try {
        const {
          data: deliveryCostsData,
          error: deliveryCostsError,
        } = await supabase
          .from('delivery_costs')
          .select('standard_delivery_cost, express_delivery_cost, heavy_items_cost, bulky_items_cost')
          .eq('location_id', shippingInfo.region)
          .single();

        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('delivery_status')
          .eq('id', shippingInfo.region)
          .single()


        // Check if component is still active before updating state
        if (!isActive) return;

        // If region delivery costs not found, try to use county delivery costs
        if (deliveryCostsError && shippingInfo.customCountyDeliveryCosts) {
          const costs = shippingInfo.customCountyDeliveryCosts;
          const options = [
            { 
              id: 'collect', 
              name: 'Collect at the Shop', 
              description: 'Pick up your order from our store - FREE', 
              price: 0,
              icon: '🏪' 
            },
            { 
              id: 'standard', 
              name: 'Standard Delivery', 
              description: 'For items under 5kg (electronics, small accessories)', 
              price: costs.standard_delivery_cost,
              icon: '🚚' 
            },
            { 
              id: 'express', 
              name: 'Express Delivery', 
              description: 'For items 5-15kg (medium electronics, small appliances)', 
              price: costs.express_delivery_cost,
              icon: '⚡' 
            },
            { 
              id: 'heavy', 
              name: 'Heavy Items', 
              description: 'For items 15-30kg (large appliances, Standard PC Builds)', 
              price: costs.heavy_items_cost,
              icon: '🏋️' 
            },
            { 
              id: 'bulky', 
              name: 'Bulky Items', 
              description: 'For items over 30kg (large PC Builds, multiple items)', 
              price: costs.bulky_items_cost,
              icon: '📦' 
            },
          ].filter(option => option.price > 0 || option.id === 'collect');
          
          setShippingOptions(options);
          setShippingInfo(prev => ({ 
            ...prev, 
            shippingType: options.length > 0 ? options[0].id : '' 
          }));
          
          setSelectedRegionDetails({
            delivery_status: 'paid',
            delivery_costs: costs
          });
          toast.success('Using county delivery rates for this region.', { id: toastId });
          return;
        }

        if (deliveryCostsError || locationError) {
          throw new Error(deliveryCostsError?.message || locationError?.message);
        }

        const correctedDetails: RegionDetails = {
          delivery_status: locationData?.delivery_status || null,
          delivery_costs: deliveryCostsData,
        };

        setSelectedRegionDetails(correctedDetails);

        if (correctedDetails.delivery_status === 'free') {
          setShippingOptions([]);
          setShippingInfo(prev => ({ ...prev, shippingType: 'free' }));
          toast.success('Free shipping available!', { id: toastId });
        } else if (correctedDetails.delivery_costs) {
          const costs = correctedDetails.delivery_costs;
          const options = [
            { 
              id: 'collect', 
              name: 'Collect at the Shop', 
              description: 'Pick up your order from our store - FREE', 
              price: 0,
              icon: '🏪' 
            },
            { 
              id: 'standard', 
              name: 'Standard Delivery', 
              description: 'For items under 5kg (electronics, small accessories)', 
              price: costs.standard_delivery_cost,
              icon: '🚚' 
            },
            { 
              id: 'express', 
              name: 'Express Delivery', 
              description: 'For items 5-15kg (medium electronics, small appliances)', 
              price: costs.express_delivery_cost,
              icon: '⚡' 
            },
            { 
              id: 'heavy', 
              name: 'Heavy Items', 
              description: 'For items 15-30kg (large appliances, Standard PC Builds)', 
              price: costs.heavy_items_cost,
              icon: '🏋️' 
            },
            { 
              id: 'bulky', 
              name: 'Bulky Items', 
              description: 'For items over 30kg (large PC Builds, multiple items)', 
              price: costs.bulky_items_cost,
              icon: '📦' 
            },
          ].filter(option => option.price > 0 || option.id === 'collect');
          
          setShippingOptions(options);
          const newShippingType = options.length > 0 ? options[0].id : '';
          setShippingInfo(prev => ({ 
            ...prev, 
            shippingType: newShippingType 
          }));
          
          if (options.length > 0) {
            toast.success('Shipping options updated.', { id: toastId });
          } else {
            toast.error('No valid shipping options found for this location.', { id: toastId });
          }
        } else {
          setShippingOptions([]);
          toast.error('No shipping options found.', { id: toastId });
        }
      } catch (err) {
        console.error('Error fetching shipping costs:', err);
        if (isActive) {
          toast.error('Could not load shipping options.', { id: toastId });
        }
      }
    };

    fetchShippingCosts();

    // Cleanup function to prevent race conditions
    return () => {
      isActive = false;
    };
  }, [shippingInfo.region, shippingInfo.customCountyDeliveryCosts]);

  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 9)}`;
  };

  // Normalize phone number from various formats to Kenyan mobile format
  const normalizePhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    let numbers = value.replace(/[^\d]/g, '');
    
    // Handle different formats:
    // +254745676546 or 254745676546 -> 745676546
    if (numbers.startsWith('254') && numbers.length === 12) {
      numbers = numbers.substring(3);
    }
    // 0745676546 -> 745676546
    else if (numbers.startsWith('0') && numbers.length === 10) {
      numbers = numbers.substring(1);
    }
    
    // Ensure we only keep 9 digits max (Kenyan mobile format)
    return numbers.substring(0, 9);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalizedNumber = normalizePhoneNumber(e.target.value);
    if (normalizedNumber.length <= 9) {
      setShippingInfo(prev => ({
        ...prev,
        phone: normalizedNumber
      }));
    }
  };

  // Handle browser autofill and paste events
  const handlePhoneInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const normalizedNumber = normalizePhoneNumber(target.value);
    if (normalizedNumber !== shippingInfo.phone && normalizedNumber.length <= 9) {
      setShippingInfo(prev => ({
        ...prev,
        phone: normalizedNumber
      }));
    }
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const normalizedNumber = normalizePhoneNumber(e.target.value);
    if (normalizedNumber.length > 0) {
      const formatted = formatPhoneNumber(normalizedNumber);
      setShippingInfo(prev => ({
        ...prev,
        phone: formatted
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchShippingCosts = async (regionId: string) => {
    if (!regionId) {
      setShippingOptions([]);
      setSelectedRegionDetails(null);
      setShippingInfo(prev => ({ ...prev, shippingType: '' }));
      return;
    }

    const toastId = toast.loading('Fetching shipping options...');
    try {
      const { data, error } = await supabase
        .from('delivery_costs')
        .select('standard_delivery_cost, express_delivery_cost, heavy_items_cost, bulky_items_cost')
        .eq('location_id', regionId)
        .single();

      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('delivery_status')
        .eq('id', regionId)
        .single()


      if (error || locationError) {
        throw new Error(error?.message || locationError?.message);
      }

      const correctedDetails: RegionDetails = {
        delivery_status: locationData?.delivery_status || null,
        delivery_costs: data,
      };

      setSelectedRegionDetails(correctedDetails);

      if (correctedDetails.delivery_status === 'free') {
        setShippingOptions([]);
        setShippingInfo(prev => ({ ...prev, shippingType: 'free' }));
        toast.success('Free shipping available!', { id: toastId });
      } else if (correctedDetails.delivery_costs) {
        const costs = correctedDetails.delivery_costs;
        const options = [
          { 
            id: 'collect', 
            name: 'Collect at the Shop', 
            description: 'Pick up your order from our store - FREE', 
            price: 0,
            icon: '🏪' 
          },
          { 
            id: 'standard', 
            name: 'Standard Delivery', 
            description: 'For items under 5kg (electronics, small accessories)', 
            price: costs.standard_delivery_cost,
            icon: '🚚' 
          },
          { 
            id: 'express', 
            name: 'Express Delivery', 
            description: 'For items 5-15kg (medium electronics, small appliances)', 
            price: costs.express_delivery_cost,
            icon: '⚡' 
          },
          { 
            id: 'heavy', 
            name: 'Heavy Items', 
            description: 'For items 15-30kg (large appliances, Standard PC Builds)', 
            price: costs.heavy_items_cost,
            icon: '🏋️' 
          },
          { 
            id: 'bulky', 
            name: 'Bulky Items', 
            description: 'For items over 30kg (large PC Builds, multiple items)', 
            price: costs.bulky_items_cost,
            icon: '📦' 
          },
        ].filter(option => option.price > 0 || option.id === 'collect');
        
        setShippingOptions(options);
        const newShippingType = options.length > 0 ? options[0].id : '';
        setShippingInfo(prev => ({ 
          ...prev, 
          shippingType: newShippingType 
        }));
        
        if (options.length > 0) {
          toast.success('Shipping options updated.', { id: toastId });
        } else {
          toast.error('No shipping options available for this region.', { id: toastId });
        }
      }
    } catch (err: any) {
      console.error('Error fetching shipping costs:', err);
      toast.error(err.message || 'Failed to load shipping options', { id: toastId });
      setShippingOptions([]);
      setSelectedRegionDetails(null);
      setShippingInfo(prev => ({ ...prev, shippingType: '' }));
    }
  };

  const handleDropdownChange = async (name: string, value: string) => {
    const updatedInfo = { ...shippingInfo, [name]: value };
    setShippingInfo(updatedInfo);
    
    // If region is being changed, trigger shipping cost fetch
    // But skip database queries for custom regions - let useEffect handle it
    if (name === 'region' && value && value !== 'custom') {
      // Check if this is a custom region (not in database regions list)
      const isCustomRegion = shippingInfo.isCustomLocation && 
                            !regions.find(r => r.value === value);
      
      // Only fetch from database if it's not a custom region
      if (!isCustomRegion) {
        await fetchShippingCosts(value);
      }
    }
  };

  const validateShippingInfo = () => {
    const errors: ValidationErrors = {};
    
    if (!shippingInfo.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!shippingInfo.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!shippingInfo.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(shippingInfo.email)) {
      errors.email = 'Invalid email address';
    }
    
    if (!shippingInfo.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{3}-\d{3}-\d{3}$/.test(shippingInfo.phone)) {
      errors.phone = 'Invalid phone number format (use XXX-XXX-XXX)';
    }
    
    if (!shippingInfo.county) {
      errors.county = 'County is required';
    }
    
    if (!shippingInfo.region) {
      errors.region = 'Region is required';
    }
    
    if (selectedRegionDetails?.delivery_status !== 'free' && !shippingInfo.shippingType) {
      errors.shippingType = 'Shipping type is required';
    }
    
    return errors;
  };

  const isShippingInfoValid = () => {
    const errors = validateShippingInfo();
    return Object.keys(errors).length === 0;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateShippingInfo();
    setValidationErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      setCurrentStep(2);
    } else {
      toast.error('Please fix the validation errors before continuing.');
    }
  };

  const handleUnifiedPaymentComplete = async (response: any) => {
    console.log('[CheckoutPage] Unified payment completed:', response);
    
    try {
      console.log('[CheckoutPage] Payment completion handled by UnifiedPaymentForm');
    } catch (error) {
      console.error('[CheckoutPage] Error in payment completion:', error);
    }
  };

  const handleDownloadReceipt = () => {
    const toastId = toast.loading('Generating receipt...');
    try {
      const doc = new jsPDF();
      doc.text('TechMart Receipt', 20, 20);
      doc.text(`Order Number: ${orderNumber}`, 20, 30);
      doc.autoTable({
        startY: 40,
        head: [['Item', 'Quantity', 'Price', 'Total']],
        body: orderItems.map(item => [
          item.product.name,
          item.quantity,
          `KES ${item.product.price.toFixed(2)}`,
          `KES ${(item.product.price * item.quantity).toFixed(2)}`,
        ]),
      });
      const finalY = doc.lastAutoTable.finalY;
      doc.text(`Subtotal: KES ${orderTotals.subtotal.toFixed(2)}`, 20, finalY + 10);
      doc.text(`Shipping: KES ${orderTotals.shippingCost.toFixed(2)}`, 20, finalY + 20);
      doc.text(`Total: KES ${orderTotals.total.toFixed(2)}`, 20, finalY + 30);
      doc.save(`TechMart_Receipt_${orderNumber}.pdf`);
      toast.success('Receipt downloaded!', { id: toastId });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to download receipt.', { id: toastId });
    }
  };

  // Create hybrid regions list that includes custom region + database regions
  const hybridRegions = useMemo(() => {
    const dbRegions = regions.map(region => ({ value: region.value, label: region.label }));
    
    // If custom location is set, add custom region as first option
    if (shippingInfo.isCustomLocation && shippingInfo.customRegion) {
      return [
        { value: 'custom', label: shippingInfo.customRegion },
        ...dbRegions
      ];
    }
    
    return dbRegions;
  }, [regions, shippingInfo.isCustomLocation, shippingInfo.customRegion]);

  // Create hybrid counties list that includes custom county + database counties
  const hybridCounties = useMemo(() => {
    // Don't add custom county to the list since we're using actual county ID
    return counties.map(county => ({ value: county.value, label: county.label }));
  }, [counties]);

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <Check className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">Order Confirmed!</h1>
        <p className="mt-4 text-lg text-gray-600">Thank you for your purchase.</p>
        <p className="mt-2 text-md text-gray-500">Your order number is <span className="font-bold text-gray-800">{orderNumber}</span>.</p>
        <p className="mt-1 text-sm text-gray-500">A confirmation email has been sent to {shippingInfo.email}.</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={handleDownloadReceipt} className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            <Download className="-ml-1 mr-3 h-5 w-5" />
            Download Receipt
          </button>
          <button onClick={() => navigate('/')} className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="relative py-8 px-6 border-b border-slate-700">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative flex flex-col items-center">
          <h1 className="text-2xl font-bold text-center mb-2">Checkout</h1>
          <div className="flex items-center justify-center space-x-8 mt-2">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center ${currentStep >= 1 ? 'text-blue-400' : 'text-slate-400'} transition-colors`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Shipping</span>
            </button>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`} />
            <button
              onClick={() => currentStep > 1 && setCurrentStep(2)}
              className={`flex items-center ${currentStep >= 2 ? 'text-blue-400' : 'text-slate-400'} transition-colors`}
              disabled={!isShippingInfoValid()}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Payment</span>
            </button>
          </div>
        </div>
        <div className="absolute top-6 right-6 hidden md:block">
          <BackButton text="Back to Store" onClick={() => navigate(-1)} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {currentStep === 1 ? (
              <form onSubmit={handleShippingSubmit} className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                  <h2 className="text-xl font-semibold mb-6">Shipping Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={shippingInfo.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 ${validationErrors.firstName ? 'border-red-500' : ''}`}
                        placeholder="Enter your first name"
                        required
                      />
                      {validationErrors.firstName && <p className="text-xs text-red-500">{validationErrors.firstName}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={shippingInfo.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 ${validationErrors.lastName ? 'border-red-500' : ''}`}
                        placeholder="Enter your last name"
                        required
                      />
                      {validationErrors.lastName && <p className="text-xs text-red-500">{validationErrors.lastName}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={shippingInfo.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 ${validationErrors.email ? 'border-red-500' : ''}`}
                        placeholder="your.email@example.com"
                      />
                      {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400 text-sm font-medium">🇰🇪 +254</span>
                            <div className="w-px h-5 bg-slate-600"></div>
                          </div>
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          value={shippingInfo.phone}
                          onChange={handlePhoneChange}
                          onInput={handlePhoneInput}
                          onBlur={handlePhoneBlur}
                          className={`w-full pl-20 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-400 transition-all duration-200 ${validationErrors.phone ? 'border-red-500' : ''}`}
                          placeholder="712 345 678"
                          maxLength={11}
                          required
                        />
                        {validationErrors.phone && <p className="text-xs text-red-500">{validationErrors.phone}</p>}
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Enter your phone number without the country code</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        County <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={hybridCounties}
                        value={shippingInfo.county}
                        onChange={(value) => handleDropdownChange('county', value)}
                        isLoading={isLoadingLocations}
                        placeholder={isLoadingLocations ? "Loading counties..." : "Select a county"}
                        required
                      />
                      {validationErrors.county && <p className="text-xs text-red-500">{validationErrors.county}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Region <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={hybridRegions}
                        value={shippingInfo.region}
                        onChange={(value) => handleDropdownChange('region', value)}
                        isLoading={isLoadingLocations}
                        placeholder={isLoadingLocations ? "Loading regions..." : "Select a region"}
                        disabled={!shippingInfo.county || isLoadingLocations}
                        tooltipText={!shippingInfo.county ? "Please select a county first" : undefined}
                        required
                      />
                      {validationErrors.region && <p className="text-xs text-red-500">{validationErrors.region}</p>}
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setIsCustomLocationModalOpen(true)}
                          className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
                        >
                          Can't find your location? Customize Your Own
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Notes Section */}
                  {!selectedRegionDetails && (
                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                      <h3 className="text-lg font-medium mb-4">Delivery Notes</h3>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Additional delivery instructions (optional)
                        </label>
                        <textarea
                          name="notes"
                          value={shippingInfo.notes || ''}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 resize-none"
                          placeholder="e.g., Leave at the gate, Call before delivery, Apartment number, etc."
                          rows={3}
                          maxLength={500}
                        />
                        <p className="text-xs text-slate-500">
                          {shippingInfo.notes?.length || 0}/500 characters
                        </p>
                      </div>
                    </div>
                  )}

                  {shippingInfo.region && selectedRegionDetails && (
                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                      <h3 className="text-lg font-medium mb-4">Shipping Method</h3>
                      {selectedRegionDetails.delivery_status === 'free' ? (
                        <p className="text-green-500 font-medium">Free shipping is available for your location.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {shippingOptions.map(option => (
                          <div key={option.id} className="relative">
                            <input
                              type="radio"
                              name="shippingType"
                              id={`shipping-${option.id}`}
                              value={option.id}
                              checked={shippingInfo.shippingType === option.id}
                              onChange={(e) => setShippingInfo(prev => ({ ...prev, shippingType: e.target.value }))}
                              className="peer hidden"
                              required={selectedRegionDetails.delivery_status !== 'free'}
                            />
                            <label 
                              htmlFor={`shipping-${option.id}`}
                              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 h-full
                                ${shippingInfo.shippingType === option.id 
                                  ? 'border-blue-500 bg-blue-500/10' 
                                  : 'border-slate-700 hover:border-slate-600'}`}
                            >
                              <div className="flex items-start">
                                <div className="text-2xl mr-4 mt-0.5">
                                  {option.icon}
                                </div>
                                <div className="flex-grow">
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-white">{option.name}</h4>
                                    <span className={`font-bold ${shippingInfo.shippingType === option.id ? 'text-blue-400' : 'text-white'}`}>
                                      {option.price === 0 ? 'FREE' : `KES ${option.price.toFixed(2)}`}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-300 mt-1">{option.description}</p>
                                </div>
                              </div>
                            </label>
                            <div className={`absolute -inset-0.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 peer-checked:opacity-100 -z-10 transition-opacity duration-200 ${shippingInfo.shippingType === option.id ? 'opacity-100' : ''}`}></div>
                          </div>
                          ))}
                        </div>
                      </div>
                      )}

                      {/* Delivery Notes Section - Below Shipping Method */}
                      <div className="mt-6 pt-6 border-t border-slate-700/50">
                        <h3 className="text-lg font-medium mb-4">Delivery Notes</h3>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-300">
                            Additional delivery instructions (optional)
                          </label>
                          <textarea
                            name="notes"
                            value={shippingInfo.notes || ''}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 resize-none"
                            placeholder="e.g., Leave at the gate, Call before delivery, Apartment number, etc."
                            rows={3}
                            maxLength={500}
                          />
                          <p className="text-xs text-slate-500">
                            {shippingInfo.notes?.length || 0}/500 characters
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex justify-end">
                    <button
                      type="submit"
                      disabled={!isShippingInfoValid()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold mb-6">Complete Your Payment</h2>
                
                <UnifiedPaymentForm
                  onPaymentComplete={handleUnifiedPaymentComplete}
                  amount={Math.ceil(orderTotals.total)}
                  email={shippingInfo.email}
                  firstName={shippingInfo.firstName}
                  lastName={shippingInfo.lastName}
                  phone={shippingInfo.phone}
                  disabled={paymentState.processing}
                  shippingInfo={shippingInfo}
                  shippingCost={shippingCost}
                />
                
                {paymentState.error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{paymentState.error}</p>
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <button 
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                  >
                    Back to Shipping
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <OrderSummaryCard items={state.items} totals={orderTotals} />
          </div>
        </div>
      </main>
      {isCustomLocationModalOpen && (
        <CustomLocationModal
          isOpen={isCustomLocationModalOpen}
          onClose={() => setIsCustomLocationModalOpen(false)}
          onSave={handleCustomLocationSave}
          initialCounty={shippingInfo.customCounty}
          initialRegion={shippingInfo.customRegion}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
