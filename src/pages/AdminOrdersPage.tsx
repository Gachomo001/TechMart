import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { generateReceiptPDF } from '../utils/receiptGenerator';
import { Eye, X, AlertCircle, Search, ChevronDown } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { Download, Check } from 'lucide-react';
import { saveAs } from 'file-saver';
import 'jspdf-autotable';

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  total_amount: number;
  created_at: string;
  payment_method: 'card' | 'mpesa';
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

interface OrderModalProps {
  order: Order;
  onClose: () => void;
}

interface CancelConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    status?: Order['status'];
    payment_status?: Order['payment_status'];
  }>({});
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<Order['payment_status'] | 'all'>('all');

  useEffect(() => {
    // Check if user is admin using the isAdmin value from AuthContext
    if (!isAdmin) {
      navigate('/');
      return;
    }

    fetchOrders();
  }, [isAdmin, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    setPendingChanges(prev => ({
      ...prev,
      status: newStatus
    }));
  };

  const handlePaymentStatusChange = (orderId: string, newStatus: Order['payment_status']) => {
    setPendingChanges(prev => ({
      ...prev,
      payment_status: newStatus
    }));
  };

  const saveChanges = async () => {
    if (!selectedOrder) return;

    try {
      const updates: { status?: Order['status']; payment_status?: Order['payment_status'] } = {};
      
      if (pendingChanges.status) {
        updates.status = pendingChanges.status;
      }
      if (pendingChanges.payment_status) {
        updates.payment_status = pendingChanges.payment_status;
      }

      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', selectedOrder.id);

      if (error) throw error;
      
      await fetchOrders(); // Refresh orders list
      setPendingChanges({}); // Clear pending changes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          payment_status: 'failed'
        })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders(); // Refresh orders list
      setShowCancelConfirm(false);
      setShowOrderModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleDownloadReceipt = async (order: Order) => {
    try {
      // Generate PDF using the same function as in CheckoutPage
      const doc = await generateReceiptPDF({
        order_number: order.order_number,
        items: order.items,
        shipping_info: order.shipping_info,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        shipping_cost: order.shipping_cost,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_details: order.payment_method === 'mpesa' 
          ? { phoneNumber: order.shipping_info.phone }
          : null
      });

      // Save the PDF
      doc.save(`receipt-${order.order_number}.pdf`);

      // Store the PDF in the receipts table
      const pdfData = doc.output('arraybuffer');
      const { error } = await supabase
        .from('receipts')
        .insert({
          order_id: order.id,
          pdf_data: pdfData
        });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate receipt');
    }
  };

  const handleCloseModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
    setPendingChanges({}); // Clear any pending changes when closing
  };

  const OrderModal: React.FC<OrderModalProps> = ({ order, onClose }) => {
    const hasPendingChanges = Object.keys(pendingChanges).length > 0;
    const currentStatus = pendingChanges.status || order.status;
    const currentPaymentStatus = pendingChanges.payment_status || order.payment_status;
    const modalRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside to close
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Prevent scroll on status change by using a local state
    const [localStatus, setLocalStatus] = useState(currentStatus);
    const [localPaymentStatus, setLocalPaymentStatus] = useState(currentPaymentStatus);

    // Update local state when dropdowns change
    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as Order['status'];
      setLocalStatus(newStatus);
      setPendingChanges(prev => ({
        ...prev,
        status: newStatus
      }));
    };

    const handlePaymentStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as Order['payment_status'];
      setLocalPaymentStatus(newStatus);
      setPendingChanges(prev => ({
        ...prev,
        payment_status: newStatus
      }));
    };

    const handleSaveChanges = async () => {
      await saveChanges();
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div 
          ref={modalRef}
          className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700/50"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-white">Order Details</h2>
              <p className="text-sm text-slate-400">Order #{order.order_number}</p>
            </div>
            <button
              onClick={() => handleDownloadReceipt(order)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Download Invoice
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-sm font-medium text-white">
                    {order.shipping_info.firstName} {order.shipping_info.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-sm font-medium text-white">
                    {order.shipping_info.email || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Phone</p>
                  <p className="text-sm font-medium text-white">
                    {order.shipping_info.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Shipping Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">County</p>
                  <p className="text-sm font-medium text-white">
                    {order.shipping_info.county}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Region</p>
                  <p className="text-sm font-medium text-white">
                    {order.shipping_info.region}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Country</p>
                  <p className="text-sm font-medium text-white">
                    {order.shipping_info.country}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Shipping Type</p>
                  <p className="text-sm font-medium text-white">
                    {order.shipping_type}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={item.product.image_url} 
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-semibold text-white">{item.product.name}</p>
                        <p className="text-sm text-slate-400">
                          Qty: {item.quantity} × KES {item.price_at_time.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-lg text-white">
                      KES {(item.price_at_time * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm text-slate-400">Subtotal (incl. VAT)</p>
                  <p className="text-sm font-medium text-white">
                    KES {order.subtotal.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-slate-400">VAT (16%)</p>
                  <p className="text-sm font-medium text-white">
                    KES {order.tax_amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-slate-400">Shipping</p>
                  <p className="text-sm font-medium text-white">
                    {order.shipping_cost === 0 ? 'FREE' : `KES ${order.shipping_cost.toLocaleString()}`}
                  </p>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700/50">
                  <p className="text-base font-medium text-white">Total</p>
                  <p className="text-base font-bold text-white">
                    KES {order.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Management */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Order Management</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Order Status
                  </label>
                  <select
                    value={localStatus}
                    onChange={handleStatusChange}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={localPaymentStatus}
                    onChange={handlePaymentStatusChange}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-slate-700/50">
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Save Changes
              </button>
              {order.status !== 'cancelled' && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({ onConfirm, onCancel }) => {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
        <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-700/50">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <h3 className="text-lg font-medium text-white">Cancel Order</h3>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            Are you sure you want to cancel this order? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/50 border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              No, keep order
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Yes, cancel order
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${order.shipping_info.firstName} ${order.shipping_info.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_info.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_info.phone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOrderStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;

    return matchesSearch && matchesOrderStatus && matchesPaymentStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 pl-10 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as Order['status'] | 'all')}
                className="w-full sm:w-auto appearance-none px-4 py-2 pr-10 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Order Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as Order['payment_status'] | 'all')}
                className="w-full sm:w-auto appearance-none px-4 py-2 pr-10 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Payment Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-700/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Order Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id}
                  className="hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => handleViewOrder(order)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    #{order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {order.shipping_info.firstName} {order.shipping_info.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    KES {order.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 
                        order.payment_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-red-500/20 text-red-400'}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                        order.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                        order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadReceipt(order);
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Download Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={handleCloseModal}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && selectedOrder && (
        <CancelConfirmModal
          onConfirm={() => cancelOrder(selectedOrder.id)}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
};

export default AdminOrdersPage; 