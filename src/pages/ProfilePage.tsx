import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import { User, Shield, Star, CheckCircle2, Package, History, Clock, Truck, CheckCircle, XCircle, Eye, Headphones, Smartphone, Lock, AlertCircle, Key, QrCode, Copy, Download } from 'lucide-react';
import QRCode from 'qrcode';

interface Profile {
  id: string;
  role: 'customer' | 'admin' | 'super_admin';
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface TwoFactorAuth {
  enabled: boolean;
  secret?: string;
  backup_codes?: string[];
  created_at?: string;
}

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  created_at: string;
  product?: {
    name: string;
    image_url: string;
  };
}

interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_address_id: string | null;
  payment_status: 'pending' | 'paid' | 'failed';
  created_at: string;
  updated_at: string;
  order_number: string;
  payment_method: 'card' | 'mpesa';
  payment_details: any;
  shipping_cost: number;
  tax_amount: number;
  subtotal: number;
  shipping_type: string;
  shipping_info: any;
  email: string | null;
  phone: string | null;
  order_items?: OrderItem[];
}

interface ProfileHeaderProps {
  user: {
    name: string;
    email: string;
    memberSince: string;
    verified: boolean;
    totalOrders: number;
    securityLevel: 'high' | 'medium';
  };
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600" />
            </div>
            {user.verified && (
              <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{user.name}</h1>
            <p className="text-sm sm:text-base text-gray-600 truncate">{user.email}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Member since {user.memberSince}</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm text-gray-500">Security Level</p>
            <div className="flex items-center space-x-1">
              <Shield className={`w-3 h-3 sm:w-4 sm:h-4 ${user.securityLevel === 'high' ? 'text-green-600' : 'text-yellow-600'}`} />
              <span className={`text-xs sm:text-sm font-medium ${user.securityLevel === 'high' ? 'text-green-600' : 'text-yellow-600'}`}>
                {user.securityLevel === 'high' ? 'High' : 'Medium'}
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm text-gray-500">Total Orders</p>
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              <span className="text-xs sm:text-sm font-medium text-gray-900">{user.totalOrders}</span>
            </div>
          </div>
        </div>
      </div>
      
      {user.verified && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-medium text-blue-900">Verified Buyer</span>
              <span className="text-xs sm:text-sm text-blue-700 ml-2 hidden sm:inline">• Trusted reviews and ratings</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Package },
    { id: 'orders', label: 'Orders', icon: History },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'support', label: 'Support', icon: Headphones },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto px-4 sm:px-6 scrollbar-hide">
          <div className="flex space-x-6 sm:space-x-8 min-w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

// Tab Content Components
const Dashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              product:products (name, image_url)
            )
          `)
          .eq('user_id', userId)
          .neq('status', 'delivered')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setActiveOrders(data || []);
      } catch (error) {
        console.error('Error fetching active orders:', error);
        toast.error('Failed to load active orders');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveOrders();
  }, [userId]);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-purple-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        
        {/* Active Orders Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Orders</h3>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : activeOrders.length > 0 ? (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">Order #{order.order_number}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                  
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="space-y-2">
                      {order.order_items.slice(0, 2).map((item) => {
                      const productImage = item.product?.image_url || '';
                      const productName = item.product?.name || 'Product';
                      
                      return (
                        <div key={item.id} className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {productImage ? (
                              <img 
                                src={productImage} 
                                alt={productName} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to package icon if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.style.display = 'none';
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full flex items-center justify-center';
                                  fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
                                  target.parentNode?.insertBefore(fallback, target.nextSibling);
                                }}
                              />
                            ) : (
                              <Package className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            )}
                          </div>
                          <span className="flex-1 text-gray-700 truncate">{productName}</span>
                          <span className="text-gray-500 flex-shrink-0">x{item.quantity}</span>
                          <span className="font-medium flex-shrink-0">{formatCurrency(item.price_at_time)}</span>
                        </div>
                      );
                    })}
                      {order.order_items.length > 2 && (
                        <p className="text-xs sm:text-sm text-gray-500">+{order.order_items.length - 2} more items</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No active orders</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Orders: React.FC<{ userId: string }> = ({ userId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              product:products (name, image_url)
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-purple-600" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: Order['payment_status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order History</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Order History</h2>
        
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(order.status)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">Order #{order.order_number}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                      {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
                
                {order.order_items && order.order_items.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Items:</h4>
                    {order.order_items.map((item) => {
                      const productImage = item.product?.image_url || '';
                      const productName = item.product?.name || 'Product';
                      
                      return (
                        <div key={item.id} className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {productImage ? (
                              <img 
                                src={productImage} 
                                alt={productName} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to package icon if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.style.display = 'none';
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full flex items-center justify-center';
                                  fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
                                  target.parentNode?.insertBefore(fallback, target.nextSibling);
                                }}
                              />
                            ) : (
                              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                            )}
                          </div>
                          <span className="flex-1 text-gray-700 truncate">{productName}</span>
                          <span className="text-gray-500 flex-shrink-0">x{item.quantity}</span>
                          <span className="font-medium flex-shrink-0">{formatCurrency(item.price_at_time)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
                  <div className="text-xs sm:text-sm text-gray-500">
                    <p>Payment: {order.payment_method.toUpperCase()}</p>
                    <p>Shipping: {order.shipping_type}</p>
                  </div>
                  <button
                    onClick={() => handleViewOrderDetails(order)}
                    className="flex items-center justify-center sm:justify-start space-x-2 px-3 py-2 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors w-full sm:w-auto"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No orders found</p>
            <p className="text-sm text-gray-400">Your order history will appear here</p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Order Number</label>
                    <p className="text-xs sm:text-sm text-gray-900">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Order Date</label>
                    <p className="text-xs sm:text-sm text-gray-900">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Payment Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                      {selectedOrder.payment_status.charAt(0).toUpperCase() + selectedOrder.payment_status.slice(1)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-2">Order Items</label>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.product?.image_url ? (
                            <img 
                              src={item.product.image_url} 
                              alt={item.product.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to package icon if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'w-full h-full flex items-center justify-center';
                                fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
                                target.parentNode?.insertBefore(fallback, target.nextSibling);
                              }}
                            />
                          ) : (
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">{item.product?.name || 'Product'}</p>
                          <p className="text-xs sm:text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-medium text-gray-900 text-xs sm:text-sm">{formatCurrency(item.price_at_time)}</p>
                          <p className="text-xs sm:text-sm text-gray-500">Total: {formatCurrency(item.price_at_time * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Shipping:</span>
                      <span className="font-medium">{formatCurrency(selectedOrder.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{formatCurrency(selectedOrder.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-lg font-semibold border-t border-gray-200 pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Security: React.FC<{ userId: string }> = ({ userId }) => {
  const [securityData, setSecurityData] = useState({
    lastPasswordChange: null as string | null,
    twoFactorEnabled: false,
    trustedDevices: [] as any[],
    recentActivity: [] as any[],
    sslCertificate: true
  });
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorAuth | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isConfiguring2FA, setIsConfiguring2FA] = useState(false);

  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile for password change info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('updated_at')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        // Fetch 2FA status
        try {
          const { data } = await supabase
            .from('two_factor_auth')
            .select('*')
            .eq('user_id', userId)
            .single();
          setTwoFactorData(data || { enabled: false });
        } catch (error) {
          // Table might not exist yet, ignore the error
          console.log('2FA table not found, using default settings');
          setTwoFactorData({ enabled: false });
        }

        // Fetch recent login activity (you might need to create this table)
        // const { data: activityData, error: activityError } = await supabase
        //   .from('user_activity')
        //   .select('*')
        //   .eq('user_id', userId)
        //   .order('created_at', { ascending: false })
        //   .limit(5);

        // For now, we'll simulate some data since the tables might not exist
        const mockTrustedDevices = [
          {
            id: '1',
            name: 'Current Device',
            location: 'Nairobi, Kenya',
            lastAccess: 'Just now',
            current: true,
            device_type: 'desktop'
          }
        ];

        const mockRecentActivity = [
          {
            id: '1',
            action: 'Profile updated',
            timestamp: profileData?.updated_at ? new Date(profileData.updated_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Unknown',
            location: 'Nairobi, Kenya'
          }
        ];

        setSecurityData({
          lastPasswordChange: profileData?.updated_at || null,
          twoFactorEnabled: twoFactorData?.enabled || false,
          trustedDevices: mockTrustedDevices,
          recentActivity: mockRecentActivity,
          sslCertificate: true
        });

      } catch (error) {
        console.error('Error fetching security data:', error);
        toast.error('Failed to load security information');
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();
  }, [userId]);

  // Generate 2FA setup
  const generateTwoFactorSetup = async () => {
    try {
      setIsConfiguring2FA(true);
      
      // Generate a random secret (in production, use a proper TOTP library)
      const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Generate QR code data with proper TOTP format
      const qrData = `otpauth://totp/TechMart:${userId}@techmart.com?secret=${secret}&issuer=TechMart&algorithm=SHA1&digits=6&period=30`;
      
      // Generate QR code image
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Generate backup codes
      const codes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      setTwoFactorSetup({
        secret,
        qrCode: qrCodeDataUrl,
        backupCodes: codes
      });
      
      setBackupCodes(codes);
      setShowTwoFactorSetup(true);
      
    } catch (error) {
      console.error('Error generating 2FA setup:', error);
      toast.error('Failed to generate 2FA setup');
    } finally {
      setIsConfiguring2FA(false);
    }
  };

  // Verify and enable 2FA
  const verifyAndEnable2FA = async () => {
    try {
      if (!twoFactorSetup || !verificationCode.trim()) {
        toast.error('Please enter the verification code');
        return;
      }

      // In a real implementation, you would verify the TOTP code here
      // For now, we'll just check if the code is 6 digits
      if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
        toast.error('Please enter a valid 6-digit code');
        return;
      }

      const twoFactorData: TwoFactorAuth = {
        enabled: true,
        secret: twoFactorSetup.secret,
        backup_codes: backupCodes,
        created_at: new Date().toISOString()
      };

      // Save 2FA data to database
      const { error } = await supabase
        .from('two_factor_auth')
        .upsert({
          user_id: userId,
          ...twoFactorData
        });

      if (error) throw error;

      // Update local state
      setTwoFactorData(twoFactorData);
      setSecurityData(prev => ({ ...prev, twoFactorEnabled: true }));
      setShowTwoFactorSetup(false);
      setTwoFactorSetup(null);
      setVerificationCode('');
      
      toast.success('Two-factor authentication enabled successfully!');
      
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast.error('Failed to enable 2FA');
    }
  };

  // Disable 2FA
  const disable2FA = async () => {
    try {
      const { error } = await supabase
        .from('two_factor_auth')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setTwoFactorData({ enabled: false });
      setSecurityData(prev => ({ ...prev, twoFactorEnabled: false }));
      toast.success('Two-factor authentication disabled');
      
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error('Failed to disable 2FA');
    }
  };

  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast.success('Backup codes copied to clipboard');
  };

  // Download backup codes
  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  const getDaysSincePasswordChange = () => {
    if (!securityData.lastPasswordChange) return null;
    const lastChange = new Date(securityData.lastPasswordChange);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastChange.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPasswordStatus = () => {
    const daysSinceChange = getDaysSincePasswordChange();
    if (!daysSinceChange) return { status: 'Never changed', warning: true };
    if (daysSinceChange > 90) return { status: 'Due for update', warning: true };
    if (daysSinceChange > 60) return { status: 'Consider updating', warning: false };
    return { status: 'Recent', warning: false };
  };

  const securityFeatures = [
    {
      title: 'Two-Factor Authentication',
      description: 'Protect your account with an extra layer of security',
      enabled: securityData.twoFactorEnabled,
      icon: Smartphone,
      status: securityData.twoFactorEnabled ? 'Active' : 'Not enabled',
      warning: !securityData.twoFactorEnabled
    },
    {
      title: 'Password Protection',
      description: securityData.lastPasswordChange 
        ? `Last changed ${getDaysSincePasswordChange()} days ago`
        : 'Password never changed',
      enabled: true,
      icon: Lock,
      status: getPasswordStatus().status,
      warning: getPasswordStatus().warning
    },
    {
      title: 'SSL Encryption',
      description: 'All data transmitted securely',
      enabled: securityData.sslCertificate,
      icon: Shield,
      status: 'Active'
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Features</h2>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Features */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Features</h2>
        <div className="space-y-4">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Icon className={`w-5 h-5 ${feature.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{feature.title}</p>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {feature.warning ? (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        feature.warning ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {feature.status}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      if (feature.title === 'Two-Factor Authentication') {
                        if (securityData.twoFactorEnabled) {
                          disable2FA();
                        } else {
                          generateTwoFactorSetup();
                        }
                      }
                    }}
                    disabled={isConfiguring2FA}
                  >
                    {feature.title === 'Password Protection' ? 'Update' : 
                     feature.title === 'Two-Factor Authentication' ? 
                       (securityData.twoFactorEnabled ? 'Disable' : (isConfiguring2FA ? 'Generating...' : 'Configure')) : 'Configure'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trusted Devices */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Trusted Devices</h2>
        <div className="space-y-3">
          {securityData.trustedDevices.length > 0 ? (
            securityData.trustedDevices.map((device, index) => (
              <div key={device.id || index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{device.name}</p>
                    <p className="text-sm text-gray-500">{device.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{device.lastAccess}</p>
                    {device.current && (
                      <p className="text-xs text-green-600">Current session</p>
                    )}
                  </div>
                  {!device.current && (
                    <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No trusted devices found</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Activity</h2>
        <div className="space-y-3">
          {securityData.recentActivity.length > 0 ? (
            securityData.recentActivity.map((activity, index) => (
              <div key={activity.id || index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Key className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.location}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{activity.timestamp}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* SSL Certificate */}
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center">
          <Shield className="w-5 h-5 text-green-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-green-900">SSL Certificate Active</p>
            <p className="text-sm text-green-700">Your connection is secure and encrypted</p>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {showTwoFactorSetup && twoFactorSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Set Up Two-Factor Authentication</h3>
                <button
                  onClick={() => setShowTwoFactorSetup(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center">
                      {twoFactorSetup.qrCode ? (
                        <img 
                          src={twoFactorSetup.qrCode} 
                          alt="QR Code for 2FA setup" 
                          className="w-44 h-44"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <QrCode className="w-32 h-32 text-gray-400" />
                          <p className="text-xs text-gray-500 text-center">Loading QR Code...</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Manual entry code: <code className="bg-gray-100 px-2 py-1 rounded">{twoFactorSetup.secret}</code>
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Verification Code
            </label>
            <input
              type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={6}
            />
          </div>

                <div className="flex space-x-3">
                  <button
                    onClick={verifyAndEnable2FA}
                    disabled={verificationCode.length !== 6}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enable 2FA
                  </button>
                  <button
                    onClick={() => setShowBackupCodes(true)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                  >
                    Backup Codes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Backup Codes</h3>
                <button
                  onClick={() => setShowBackupCodes(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
                </p>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="text-center">
                        <code className="bg-white px-2 py-1 rounded text-sm font-mono">
                          {code}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
            <button
                    onClick={copyBackupCodes}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
            </button>
            <button
                    onClick={downloadBackupCodes}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setShowBackupCodes(false)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    I've saved my backup codes
            </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Support: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Support</h2>
        <p className="text-sm sm:text-base text-gray-600">Get help and support for your account and orders.</p>
      </div>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userStats, setUserStats] = useState({
    totalOrders: 0,
    totalSpent: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);

        // Fetch user stats
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('user_id', user.id);

        if (!ordersError && ordersData) {
          const totalOrders = ordersData.length;
          const totalSpent = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
          setUserStats({ totalOrders, totalSpent });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const getDisplayName = (profile: Profile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile.first_name) {
      return profile.first_name;
    } else if (profile.last_name) {
      return profile.last_name;
    } else {
      return 'User';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard userId={user?.id || ''} />;
      case 'orders':
        return <Orders userId={user?.id || ''} />;
      case 'security':
        return <Security userId={user?.id || ''} />;
      case 'support':
        return <Support />;
      default:
        return <Dashboard userId={user?.id || ''} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Profile not found</h2>
          </div>
        </div>
      </div>
    );
  }

  const profileUser = {
    name: getDisplayName(profile),
    email: user?.email || '',
    memberSince: new Date(profile.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    }),
    verified: true, // You can implement verification logic
    totalOrders: userStats.totalOrders,
    securityLevel: 'high' as const
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <ProfileHeader user={profileUser} />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProfilePage; 