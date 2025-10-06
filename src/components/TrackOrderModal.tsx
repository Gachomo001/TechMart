import React, { useState, useEffect } from 'react';
import { X, Search, Package, Download, Calendar, CreditCard, Truck, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { generateReceiptPDF } from '../utils/receiptGenerator';

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  total_amount: number;
  created_at: string;
  payment_method: 'card' | 'mpesa' | 'mobile_money';
  shipping_type: string;
  shipping_info: {
    firstName: string;
    lastName: string;
    county: string;
    region: string;
    country: string;
    email?: string;
    phone: string;
  };
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
      image_url: string;
    };
    quantity: number;
    price_at_time: number;
  }>;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
}

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalState = 'search' | 'single-order' | 'all-orders';

const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [previousModalState, setPreviousModalState] = useState<ModalState>('search');
  const [modalState, setModalState] = useState<ModalState>('search');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (isOpen) {
      setModalState('search');
      setPreviousModalState('search');
      setOrderNumber('');
      setSelectedOrder(null);
      setAllOrders([]);
    }
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setModalState('search');
      setPreviousModalState('search');
      setOrderNumber('');
      setSelectedOrder(null);
      setAllOrders([]);
    }
  }, [isOpen]);

  const handleSearchOrder = async () => {
    if (!orderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    if (!user) {
      toast.error('Please sign in to track your orders');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            product:products(
              id,
              name,
              price,
              image_url
            ),
            quantity,
            price_at_time
          )
        `)
        .eq('order_number', orderNumber.trim())
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        toast.error('Order not found or you do not have access to this order');
        return;
      }

      setSelectedOrder(data);
      setModalState('single-order');
      setPreviousModalState('search');
    } catch (error) {
      console.error('Error searching order:', error);
      toast.error('Failed to search order');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllOrders = async () => {
    if (!user) {
      toast.error('Please sign in to view your orders');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            product:products(
              id,
              name,
              price,
              image_url
            ),
            quantity,
            price_at_time
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllOrders(data || []);
      setModalState('all-orders');
      setPreviousModalState('search');
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleBackNavigation = () => {
    if (modalState === 'single-order') {
      setModalState(previousModalState);
    } else if (modalState === 'all-orders') {
      setModalState('search');
    }
  };

  const handleDownloadReceipt = async (order: Order) => {
    try {
      const toastId = toast.loading('Generating receipt...');
      
      // Use the same receipt generator as AdminOrdersPage
      const doc = await generateReceiptPDF({
        order_number: order.order_number,
        items: order.items,
        shipping_info: order.shipping_info,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        shipping_cost: order.shipping_cost,
        total_amount: order.total_amount,
        payment_method: order.payment_method as 'card' | 'mpesa' | 'whatsapp',
        payment_details: order.payment_method === 'mpesa' || order.payment_method === 'mobile_money'
          ? { phoneNumber: order.shipping_info.phone }
          : null,
        shipping_type: order.shipping_type
      });

      // Save the PDF
      doc.save(`receipt-${order.order_number}.pdf`);
      toast.success('Receipt downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'processing':
      case 'shipped':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
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

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'card':
        return 'Card Payment';
      case 'mpesa':
      case 'mobile_money':
        return 'Mobile Money';
      default:
        return method;
    }
  };

  if (!isOpen) return null;

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
          <div className="relative w-full max-w-md rounded-lg bg-slate-800 shadow-xl">
            <div className="p-6 text-center">
              <Package className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Sign In Required</h3>
              <p className="text-slate-300 mb-6">Please sign in to track your orders.</p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/auth';
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleBackNavigation}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        
        <div className="relative w-full max-w-4xl rounded-lg bg-slate-800 shadow-xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              {modalState !== 'search' && (
                <button
                  onClick={handleBackNavigation}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Truck className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">
                {modalState === 'search' && 'Track Your Order'}
                {modalState === 'single-order' && 'Order Details'}
                {modalState === 'all-orders' && 'All Orders'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto overflow-x-auto max-h-[calc(90vh-80px)]">
            {modalState === 'search' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Enter Order Number
                  </label>
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g., Order-20250827-123456"
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchOrder()}
                    />
                    <button
                      onClick={handleSearchOrder}
                      disabled={loading}
                      className="w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 mx-auto sm:mx-0"
                    >
                      <Search className="w-4 h-4" />
                      <span>{loading ? 'Searching...' : 'Search'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-slate-400 mb-4">or</div>
                  <button
                    onClick={handleViewAllOrders}
                    disabled={loading}
                    className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Package className="w-4 h-4" />
                    <span>{loading ? 'Loading...' : 'View All My Orders'}</span>
                  </button>
                </div>
              </div>
            )}

            {modalState === 'single-order' && selectedOrder && (
              <div className="space-y-6">
                {/* Order Header */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{selectedOrder.order_number}</h4>
                      <p className="text-slate-400 text-sm">
                        Ordered on {formatDate(selectedOrder.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">KES {selectedOrder.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm text-slate-400">Payment Status</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.payment_status)}`}>
                          {selectedOrder.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Package className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-sm text-slate-400">Order Status</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h5 className="text-sm text-slate-400 mb-2">Payment Method</h5>
                  <p className="text-white font-medium">{formatPaymentMethod(selectedOrder.payment_method)}</p>
                </div>

                {/* Order Items */}
                <div>
                  <h5 className="text-lg font-semibold text-white mb-3">Order Items</h5>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 bg-slate-700/50 rounded-lg p-3">
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.product.name}</p>
                          <p className="text-slate-400 text-sm">Quantity: {item.quantity}</p>
                        </div>
                        <p className="text-white font-semibold whitespace-nowrap">KES {(item.price_at_time * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h5 className="text-lg font-semibold text-white mb-3">Order Summary</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-sm text-slate-400">Subtotal (incl. VAT)</p>
                      <p className="text-sm font-medium text-white">KES {selectedOrder.subtotal.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-slate-400">VAT (16%)</p>
                      <p className="text-sm font-medium text-white">KES {selectedOrder.tax_amount.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm text-slate-400">Shipping ({selectedOrder.shipping_type})</p>
                      <p className="text-sm font-medium text-white">
                        {selectedOrder.shipping_cost === 0 ? 'FREE' : `KES ${selectedOrder.shipping_cost.toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-600">
                      <p className="text-base font-medium text-white">Total</p>
                      <p className="text-base font-bold text-white">KES {selectedOrder.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Download Receipt */}
                <button
                  onClick={() => handleDownloadReceipt(selectedOrder)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Receipt</span>
                </button>
              </div>
            )}

            {modalState === 'all-orders' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto overflow-x-auto">
                {allOrders.length > 0 ? (
                  <div className="min-w-full">
                    {allOrders.map((order) => (
                      <div key={order.id} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors mb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold truncate">{order.order_number}</h4>
                            <p className="text-slate-400 text-sm flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(order.created_at)}</span>
                            </p>
                            <div className="flex items-center space-x-4 mt-2 flex-wrap">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.payment_status)}`}>
                                Payment: {order.payment_status}
                              </span>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                Order: {order.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between lg:justify-end space-x-3">
                            <p className="text-white font-bold whitespace-nowrap">KES {order.total_amount.toLocaleString()}</p>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setPreviousModalState('all-orders');
                                setModalState('single-order');
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">No orders found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderModal;
