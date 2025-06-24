import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CreditCard,
  UserPlus,
  Star,
  Clock,
  BarChart2,
  Target,
  Repeat,
  Activity,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface OrderItem {
  product_id: string;
  quantity: number;
  products: {
    price: number;
    buying_price: number;
  };
}

interface Order {
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
}

interface DashboardData {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  profitGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  productsGrowth: number;
  averageOrderValue: number;
  aovGrowth: number;
  recentOrders: {
    id: string;
    order_number: string;
    customer: string;
    date: string;
    amount: number;
    status: string;
    payment_status: string;
  }[];
  topProducts: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  lowStockProducts: LowStockProduct[];
  recentCustomers: {
    id: string;
    name: string;
    email: string;
    date: string;
  }[];
  revenueByPaymentMethod: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  conversionRate: number;
  conversionRateGrowth: number;
  customerRetention: {
    new: number;
    returning: number;
    retentionRate: number;
  };
  averageResponseTime: number;
  responseTimeGrowth: number;
  productPerformance: {
    best: {
      id: string;
      name: string;
      revenue: number;
      growth: number;
    }[];
    worst: {
      id: string;
      name: string;
      revenue: number;
      growth: number;
    }[];
  };
  salesByCategory: {
    category: string;
    revenue: number;
    percentage: number;
    growth: number;
  }[];
  peakHours: {
    hour: number;
    orders: number;
    revenue: number;
  }[];
}

interface ProductSales {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

interface PaymentMethodRevenue {
  [key: string]: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  price: number;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startDate = new Date();
      startDate.setMonth(now.getMonth() - 1); // Last month for current period
      const previousStartDate = new Date(startDate);
      previousStartDate.setMonth(previousStartDate.getMonth() - 1); // Month before last for previous period

      // Fetch total revenue and profit for paid orders
      const { data: revenueData, error: revenueError } = await supabase
        .from('orders')
        .select(`
          total_amount,
          created_at,
          order_items (
            product_id,
            quantity,
            products (
              price,
              buying_price
            )
          )
        `)
        .eq('payment_status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString()) as { data: Order[] | null, error: any };

      if (revenueError) throw revenueError;

      const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalProfit = revenueData?.reduce((sum, order) => {
        const orderProfit = order.order_items?.reduce((itemSum, item) => {
          const profit = (item.products?.price - item.products?.buying_price) * item.quantity;
          return itemSum + (profit || 0);
        }, 0) || 0;
        return sum + orderProfit;
      }, 0) || 0;

      // Fetch previous period revenue
      const { data: previousRevenueData, error: previousRevenueError } = await supabase
        .from('orders')
        .select(`
          total_amount,
          order_items (
            product_id,
            quantity,
            products (
              price,
              buying_price
            )
          )
        `)
        .eq('payment_status', 'paid')
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', startDate.toISOString()) as { data: Order[] | null, error: any };

      if (previousRevenueError) throw previousRevenueError;

      const previousRevenue = previousRevenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const previousProfit = previousRevenueData?.reduce((sum, order) => {
        const orderProfit = order.order_items?.reduce((itemSum, item) => {
          const profit = (item.products?.price - item.products?.buying_price) * item.quantity;
          return itemSum + (profit || 0);
        }, 0) || 0;
        return sum + orderProfit;
      }, 0) || 0;

      const revenueGrowth = previousRevenue === 0 ? 0 : ((totalRevenue - previousRevenue) / previousRevenue) * 100;
      const profitGrowth = previousProfit === 0 ? 0 : ((totalProfit - previousProfit) / previousProfit) * 100;

      // Fetch total orders
      const { count: totalOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (ordersError) throw ordersError;

      // Fetch previous period orders
      const { count: previousOrders, error: previousOrdersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', startDate.toISOString());

      if (previousOrdersError) throw previousOrdersError;

      const ordersGrowth = (totalOrders === null || previousOrders === null || previousOrders === 0)
        ? 0
        : ((totalOrders - previousOrders) / previousOrders) * 100;

      // Fetch total customers
      const { count: totalCustomers, error: customersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'customer');

      if (customersError) throw customersError;

      // Fetch total products
      const { count: totalProducts, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (productsError) throw productsError;

      // Fetch recent orders with customer information
      const { data: recentOrdersData, error: recentOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          created_at,
          status,
          payment_status,
          shipping_info
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrdersError) throw recentOrdersError;

      const recentOrders = recentOrdersData?.map(order => ({
        id: order.id,
        order_number: order.order_number,
        customer: `${order.shipping_info.firstName} ${order.shipping_info.lastName}`,
        date: new Date(order.created_at).toLocaleDateString(),
        amount: order.total_amount,
        status: order.status,
        payment_status: order.payment_status
      })) || [];

      // Mock growth data for customers and products (replace with actual calculations if needed)
      const customersGrowth = 5.7;
      const productsGrowth = 3.1;

      // Calculate Average Order Value (AOV)
      const aov = (totalOrders ?? 0) > 0 ? totalRevenue / (totalOrders ?? 0) : 0;
      
      // Fetch previous period AOV
      const previousAov = (previousOrders ?? 0) > 0 
        ? previousRevenue / (previousOrders ?? 0) 
        : 0;
      
      const aovGrowth = previousAov === 0 ? 0 : ((aov - previousAov) / previousAov) * 100;

      // Fetch top selling products
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('order_items')
        .select(`
          product:products (
            id,
            name
          ),
          quantity,
          price_at_time
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (topProductsError) throw topProductsError;

      const productSales = topProductsData?.reduce((acc: Record<string, ProductSales>, item: any) => {
        const productId = item.product?.id;
        if (!productId) return acc;
        
        if (!acc[productId]) {
          acc[productId] = {
            id: productId,
            name: item.product?.name || 'Unknown Product',
            sales: 0,
            revenue: 0
          };
        }
        acc[productId].sales += item.quantity || 0;
        acc[productId].revenue += (item.quantity || 0) * (item.price_at_time || 0);
        return acc;
      }, {}) || {};

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      // Fetch low stock products
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, price')
        .lt('stock_quantity', 5)
        .order('stock_quantity', { ascending: true })
        .limit(5);

      if (lowStockError) throw lowStockError;

      const lowStockProducts = lowStockData?.map(product => ({
        id: product.id,
        name: product.name,
        stock_quantity: product.stock_quantity,
        price: product.price
      })) || [];

      // Fetch recent customers
      const { data: recentCustomersData, error: recentCustomersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentCustomersError) throw recentCustomersError;

      const recentCustomers = recentCustomersData?.map(customer => ({
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        date: new Date(customer.created_at).toLocaleDateString()
      })) || [];

      // Calculate revenue by payment method
      const { data: paymentMethodData, error: paymentMethodError } = await supabase
        .from('orders')
        .select('payment_method, total_amount')
        .eq('payment_status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (paymentMethodError) throw paymentMethodError;

      const paymentMethodRevenue = paymentMethodData?.reduce((acc: PaymentMethodRevenue, order: any) => {
        if (!acc[order.payment_method]) {
          acc[order.payment_method] = 0;
        }
        acc[order.payment_method] += order.total_amount || 0;
        return acc;
      }, {}) || {};

      const totalPaymentRevenue = Object.values(paymentMethodRevenue).reduce((sum: number, amount: number) => sum + amount, 0);

      const revenueByPaymentMethod = Object.entries(paymentMethodRevenue).map(([method, amount]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        amount,
        percentage: (amount / totalPaymentRevenue) * 100
      }));

      // Calculate metrics with null checks
      const safeTotalCustomers = totalCustomers ?? 0;
      const safeTotalOrders = totalOrders ?? 0;

      // Calculate conversion metrics
      const currentConversionRate = safeTotalCustomers > 0 ? (safeTotalOrders / safeTotalCustomers) * 100 : 0;

      // Fetch previous period conversion rate
      const { count: previousCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'customer')
        .lt('created_at', startDate.toISOString());

      const previousConversionRate = (previousCustomers ?? 0) > 0 
        ? ((previousOrders ?? 0) / (previousCustomers ?? 0)) * 100 
        : 0;

      const conversionRateGrowth = previousConversionRate === 0 
        ? 0 
        : ((currentConversionRate - previousConversionRate) / previousConversionRate) * 100;

      // Calculate Customer Retention
      const { data: customerOrders, error: customerOrdersError } = await supabase
        .from('orders')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      if (customerOrdersError) throw customerOrdersError;

      const customerOrderCount = customerOrders?.reduce((acc: Record<string, number>, order: any) => {
        acc[order.user_id] = (acc[order.user_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const returningCustomers = Object.values(customerOrderCount).filter(count => count > 1).length;
      const newCustomers = safeTotalCustomers - returningCustomers;
      const retentionRate = safeTotalCustomers > 0 ? (returningCustomers / safeTotalCustomers) * 100 : 0;

      // Calculate Average Response Time (mock data for now - replace with actual support ticket data)
      const averageResponseTime = 2.5; // hours
      const responseTimeGrowth = -15.2; // percentage

      // Fetch Product Performance
      const { data: productPerformanceData, error: productPerformanceError } = await supabase
        .from('order_items')
        .select(`
          product:products (
            id,
            name
          ),
          quantity,
          price_at_time,
          created_at
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (productPerformanceError) throw productPerformanceError;

      const productRevenue = productPerformanceData?.reduce((acc: Record<string, any>, item: any) => {
        const productId = item.product?.id;
        if (!productId) return acc;
        
        if (!acc[productId]) {
          acc[productId] = {
            id: productId,
            name: item.product?.name || 'Unknown Product',
            revenue: 0,
            previousRevenue: 0
          };
        }
        
        const revenue = (item.quantity || 0) * (item.price_at_time || 0);
        const isCurrentPeriod = new Date(item.created_at) >= startDate;
        
        if (isCurrentPeriod) {
          acc[productId].revenue += revenue;
        } else {
          acc[productId].previousRevenue += revenue;
        }
        
        return acc;
      }, {}) || {};

      const productsWithGrowth = Object.values(productRevenue).map((product: any) => ({
        ...product,
        growth: product.previousRevenue === 0 
          ? 0 
          : ((product.revenue - product.previousRevenue) / product.previousRevenue) * 100
      }));

      const sortedProducts = productsWithGrowth.sort((a: any, b: any) => b.revenue - a.revenue);
      const bestProducts = sortedProducts.slice(0, 3);
      const worstProducts = sortedProducts.slice(-3).reverse();

      // Fetch Sales by Category
      const { data: categorySalesData, error: categorySalesError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price_at_time,
          product:products (
            category:categories (
              name
            )
          ),
          created_at
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (categorySalesError) throw categorySalesError;

      const categoryRevenue = categorySalesData?.reduce((acc: Record<string, any>, item: any) => {
        const categoryName = item.product?.category?.name || 'Uncategorized';
        if (!acc[categoryName]) {
          acc[categoryName] = {
            revenue: 0,
            previousRevenue: 0
          };
        }
        
        const revenue = (item.quantity || 0) * (item.price_at_time || 0);
        const isCurrentPeriod = new Date(item.created_at) >= startDate;
        
        if (isCurrentPeriod) {
          acc[categoryName].revenue += revenue;
        } else {
          acc[categoryName].previousRevenue += revenue;
        }
        
        return acc;
      }, {}) || {};

      const totalCategoryRevenue = Object.values(categoryRevenue).reduce((sum: number, cat: any) => sum + cat.revenue, 0);

      const salesByCategory = Object.entries(categoryRevenue).map(([category, data]: [string, any]) => ({
        category,
        revenue: data.revenue,
        percentage: (data.revenue / totalCategoryRevenue) * 100,
        growth: data.previousRevenue === 0 
          ? 0 
          : ((data.revenue - data.previousRevenue) / data.previousRevenue) * 100
      })).sort((a, b) => b.revenue - a.revenue);

      // Calculate Peak Hours
      const { data: hourlyOrdersData, error: hourlyOrdersError } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (hourlyOrdersError) throw hourlyOrdersError;

      const hourlyStats = hourlyOrdersData?.reduce((acc: Record<number, { orders: number; revenue: number }>, order: any) => {
        const hour = new Date(order.created_at).getHours();
        if (!acc[hour]) {
          acc[hour] = { orders: 0, revenue: 0 };
        }
        acc[hour].orders += 1;
        acc[hour].revenue += order.total_amount || 0;
        return acc;
      }, {}) || {};

      const peakHours = Object.entries(hourlyStats)
        .map(([hour, stats]) => ({
          hour: parseInt(hour),
          orders: stats.orders,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 6);

      setData({
        totalRevenue,
        totalProfit,
        totalOrders: totalOrders || 0,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        revenueGrowth,
        profitGrowth,
        ordersGrowth,
        customersGrowth,
        productsGrowth,
        averageOrderValue: aov,
        aovGrowth,
        recentOrders,
        topProducts,
        lowStockProducts,
        recentCustomers,
        revenueByPaymentMethod,
        conversionRate: currentConversionRate,
        conversionRateGrowth,
        customerRetention: {
          new: newCustomers,
          returning: returningCustomers,
          retentionRate
        },
        averageResponseTime,
        responseTimeGrowth,
        productPerformance: {
          best: bestProducts,
          worst: worstProducts
        },
        salesByCategory,
        peakHours
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">Error loading dashboard</h2>
          <p className="mt-2 text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">No data available</h2>
          <p className="mt-2 text-slate-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white space-y-6 p-2">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Revenue Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-400 truncate">
                    Total Revenue
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-white">
                      KES {data.totalRevenue.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-slate-700/30 px-5 py-3">
              <div className={`flex items-center ${data.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.revenueGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="ml-1">{Math.abs(data.revenueGrowth).toFixed(1)}%</span>
                <span className="ml-1 text-slate-400">from last month</span>
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-400 truncate">
                    Total Profit
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-white">
                      KES {data.totalProfit.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-slate-700/30 px-5 py-3">
              <div className={`flex items-center ${data.profitGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.profitGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="ml-1">{Math.abs(data.profitGrowth).toFixed(1)}%</span>
                <span className="ml-1 text-slate-400">from last month</span>
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-400 truncate">
                    Total Orders
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-white">
                      {data.totalOrders.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-slate-700/30 px-5 py-3">
              <div className={`flex items-center ${data.ordersGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.ordersGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="ml-1">{Math.abs(data.ordersGrowth).toFixed(1)}%</span>
                <span className="ml-1 text-slate-400">from last month</span>
            </div>
          </div>
        </div>

        {/* Customers Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                  <dt className="text-sm font-medium text-slate-400 truncate">
                    Total Customers
                      </dt>
                      <dd>
                    <div className="text-lg font-medium text-white">
                      {data.totalCustomers.toLocaleString()}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
          <div className="bg-slate-700/30 px-5 py-3">
              <div className={`flex items-center ${data.customersGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.customersGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                <span className="ml-1">{Math.abs(data.customersGrowth).toFixed(1)}%</span>
                <span className="ml-1 text-slate-400">from last month</span>
            </div>
          </div>
        </div>

        {/* Average Order Value Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-400 truncate">
                    Average Order Value
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-white">
                      KES {data.averageOrderValue.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
                  </div>
                </div>
          <div className="bg-slate-700/30 px-5 py-3">
            <div className={`flex items-center ${data.aovGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.aovGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="ml-1">{Math.abs(data.aovGrowth).toFixed(1)}%</span>
              <span className="ml-1 text-slate-400">from last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Alerts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Top Selling Products</h3>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{product.name}</p>
                    <div className="flex items-center text-xs text-slate-400">
                      {product.sales} units sold
                    </div>
                  </div>
                  <div className="text-sm font-medium text-white">
                    KES {product.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Low Stock Alert</h3>
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{product.name}</p>
                    <div className="flex items-center text-xs text-red-400">
                      Only {product.stock_quantity} units left
                    </div>
                  </div>
                  <div className="text-sm font-medium text-white">
                    KES {product.price.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-700/50 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">
            Recent Orders
          </h3>
          <button
            onClick={() => navigate('/admin/orders')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            View All
          </button>
        </div>
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-700/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Order Number
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Payment Status
                  </th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    #{order.order_number}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {order.customer}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {order.date}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    KES {order.amount.toLocaleString()}
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        order.payment_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'}`}>
                      {order.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 