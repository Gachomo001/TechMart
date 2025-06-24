import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  Target,
  Repeat,
  Clock,
  BarChart2,
  Activity,
  CreditCard,
  UserPlus,
} from 'lucide-react';

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

interface ProductPerformanceItem {
  product: {
    id: string;
    name: string;
  } | null;
  quantity: number;
  price_at_time: number;
  created_at: string;
}

interface CategorySalesItem {
  quantity: number;
  price_at_time: number;
  product: {
    category: {
      name: string;
    } | null;
  } | null;
  created_at: string;
}

interface AnalyticsData {
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
  recentOrders: {
    date: string;
    amount: number;
  }[];
  topProducts: {
    name: string;
    sales: number;
  }[];
  customerSegments: {
    segment: string;
    count: number;
    percentage: number;
  }[];
  revenueByCategory: {
    category: string;
    revenue: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
    profit: number;
  }[];
  recentCustomers: {
    id: string;
    name: string;
    email: string;
    date: string;
  }[];
  conversionRate: number;
  conversionRateGrowth: number;
  revenueByPaymentMethod: {
    method: string;
    amount: number;
    percentage: number;
  }[];
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

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startDate = new Date();
      const previousStartDate = new Date();

      // Set date ranges based on selected period
      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          previousStartDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          previousStartDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          previousStartDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

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
      const totalProfit = revenueData?.reduce((sum: number, order: Order): number => {
        const orderProfit = order.order_items?.reduce((itemSum: number, item: OrderItem): number => {
          const profit = (item.products?.price - item.products?.buying_price) * item.quantity;
          return itemSum + (profit || 0);
        }, 0) || 0;
        return sum + orderProfit;
      }, 0) || 0;

      // Fetch previous period revenue and profit
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
      const previousProfit = previousRevenueData?.reduce((sum: number, order: Order): number => {
        const orderProfit = order.order_items?.reduce((itemSum: number, item: OrderItem): number => {
          const profit = (item.products?.price - item.products?.buying_price) * item.quantity;
          return itemSum + (profit || 0);
        }, 0) || 0;
        return sum + orderProfit;
      }, 0) || 0;

      const revenueGrowth = previousRevenue === 0 ? 0 : ((totalRevenue - previousRevenue) / previousRevenue) * 100;
      const profitGrowth = previousProfit === 0 ? 0 : ((totalProfit - previousProfit) / previousProfit) * 100;

      // Fetch total orders (all orders, not just paid ones)
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      // Fetch total customers
      const { count: totalCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'customer');

      // Fetch total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact' });

      // Calculate orders growth
      const { count: previousOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousStartDate.toISOString());

      const ordersGrowth = (totalOrders === null || previousOrders === null || previousOrders === 0) 
        ? 0 
        : ((totalOrders - previousOrders) / previousOrders) * 100;

      // Mock growth data for customers and products (replace with actual calculations if needed)
      const customersGrowth = 5.7;
      const productsGrowth = 3.1;

      // Get recent orders (paid orders only)
      const { data: recentOrdersData, error: recentOrdersError } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrdersError) throw recentOrdersError;

      const recentOrders = recentOrdersData?.map(order => ({
        date: new Date(order.created_at).toLocaleDateString(),
        amount: order.total_amount
      })) || [];

      // Mock top products data (replace with actual data if needed)
      const topProducts = [
        { name: 'Product A', sales: 150 },
        { name: 'Product B', sales: 120 },
        { name: 'Product C', sales: 100 },
        { name: 'Product D', sales: 80 },
        { name: 'Product E', sales: 60 },
      ];

      // Mock customer segments data (replace with actual data if needed)
      const customerSegments = [
        { segment: 'New', count: 150 },
        { segment: 'Returning', count: 300 },
        { segment: 'Loyal', count: 200 },
        { segment: 'VIP', count: 50 },
      ];

      // Calculate customer segments with percentages
      const totalCustomerCount = customerSegments.reduce((sum, segment) => sum + segment.count, 0);
      const customerSegmentsWithPercentage: { segment: string; count: number; percentage: number; }[] = customerSegments.map(segment => ({
        segment: segment.segment,
        count: segment.count,
        percentage: (segment.count / totalCustomerCount) * 100,
      }));

      // Fetch Recent Customers
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
        email: customer.email || '',
        date: new Date(customer.created_at).toLocaleDateString()
      })) || [];

      // Calculate Conversion Rate
      const safeTotalCustomers = totalCustomers ?? 0;
      const safeTotalOrders = totalOrders ?? 0;
      const currentConversionRate = safeTotalCustomers > 0 ? (safeTotalOrders / safeTotalCustomers) * 100 : 0;

      // Fetch previous period conversion rate
      const { count: previousCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'customer')
        .lt('created_at', startDate.toISOString());

      // Calculate conversion rate growth
      const previousConversionRate = (previousCustomers ?? 0) > 0 
        ? ((previousOrders ?? 0) / (previousCustomers ?? 0)) * 100 
        : 0;
      const conversionRateGrowth = previousConversionRate === 0 
        ? 0 
        : ((currentConversionRate - previousConversionRate) / previousConversionRate) * 100;

      // Fetch revenue by payment method
      const { data: paymentMethodData, error: paymentMethodError } = await supabase
        .from('orders')
        .select('payment_method, total_amount')
        .eq('payment_status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (paymentMethodError) throw paymentMethodError;

      const paymentMethodRevenue = paymentMethodData?.reduce((acc: Record<string, number>, order) => {
        const method = order.payment_method || 'Unknown';
        acc[method] = (acc[method] || 0) + order.total_amount;
        return acc;
      }, {}) || {};

      const totalPaymentRevenue = Object.values(paymentMethodRevenue).reduce((sum, amount) => sum + amount, 0);
      const revenueByPaymentMethod = Object.entries(paymentMethodRevenue).map(([method, amount]) => ({
        method,
        amount,
        percentage: (amount / totalPaymentRevenue) * 100
      }));

      // Calculate customer retention
      const { data: customerOrdersData, error: customerOrdersError } = await supabase
        .from('orders')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      if (customerOrdersError) throw customerOrdersError;

      const customerOrderCount = customerOrdersData?.reduce((acc: Record<string, number>, order) => {
        acc[order.user_id] = (acc[order.user_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const returningCustomers = Object.values(customerOrderCount).filter(count => count > 1).length;
      const newCustomers = safeTotalCustomers - returningCustomers;
      const retentionRate = safeTotalCustomers > 0 ? (returningCustomers / safeTotalCustomers) * 100 : 0;

      // Fetch product performance
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
        .lte('created_at', now.toISOString()) as { data: ProductPerformanceItem[] | null, error: any };

      if (productPerformanceError) throw productPerformanceError;

      const productRevenue = productPerformanceData?.reduce((acc: Record<string, any>, item) => {
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

      // Fetch sales by category
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
        .lte('created_at', now.toISOString()) as { data: CategorySalesItem[] | null, error: any };

      if (categorySalesError) throw categorySalesError;

      const categoryRevenue = categorySalesData?.reduce((acc: Record<string, any>, item) => {
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

      // Calculate peak hours
      const { data: hourlyOrdersData, error: hourlyOrdersError } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (hourlyOrdersError) throw hourlyOrdersError;

      const hourlyStats = hourlyOrdersData?.reduce((acc: Record<number, { orders: number; revenue: number }>, order) => {
        const hour = new Date(order.created_at).getHours();
        if (!acc[hour]) {
          acc[hour] = { orders: 0, revenue: 0 };
        }
        acc[hour].orders += 1;
        acc[hour].revenue += order.total_amount;
        return acc;
      }, {}) || {};

      const peakHours = Object.entries(hourlyStats)
        .map(([hour, stats]) => ({
          hour: parseInt(hour),
          orders: stats.orders,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);

      // Mock average response time (replace with actual support ticket data)
      const averageResponseTime = 2.5; // hours
      const responseTimeGrowth = -15.2; // percentage

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
        recentOrders,
        topProducts,
        customerSegments: customerSegmentsWithPercentage,
        revenueByCategory: [],
        revenueByMonth: [],
        recentCustomers,
        conversionRate: currentConversionRate,
        conversionRateGrowth,
        revenueByPaymentMethod,
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
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">No data available</h2>
          <p className="mt-2 text-gray-600">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
              <span className="ml-1 text-slate-400">from previous period</span>
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
              <span className="ml-1 text-slate-400">from previous period</span>
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
              <span className="ml-1">{Math.abs(data.ordersGrowth)}%</span>
              <span className="ml-1 text-slate-400">from last period</span>
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
              <span className="ml-1">{Math.abs(data.customersGrowth)}%</span>
              <span className="ml-1 text-slate-400">from last period</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Additional Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Customers */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Recent Customers</h3>
            <UserPlus className="h-5 w-5 text-blue-400" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.recentCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{customer.name}</p>
                    <p className="text-xs text-slate-400">{customer.email}</p>
                  </div>
                  <span className="text-sm text-slate-400">{customer.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Conversion Rate</h3>
            <Target className="h-5 w-5 text-green-400" />
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-white mb-2">
              {data.conversionRate.toFixed(1)}%
            </div>
            <div className={`flex items-center ${data.conversionRateGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.conversionRateGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="ml-1">{Math.abs(data.conversionRateGrowth).toFixed(1)}%</span>
              <span className="ml-1 text-slate-400">from previous period</span>
            </div>
          </div>
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Revenue by Payment Method</h3>
            <CreditCard className="h-5 w-5 text-purple-400" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.revenueByPaymentMethod.map((method) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{method.method}</p>
                    <p className="text-xs text-slate-400">{method.percentage.toFixed(1)}%</p>
                  </div>
                  <span className="text-sm font-medium text-white">KES {method.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Retention */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Customer Retention</h3>
            <Repeat className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">New Customers</p>
                <p className="text-lg font-medium text-white">{data.customerRetention.new}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Returning Customers</p>
                <p className="text-lg font-medium text-white">{data.customerRetention.returning}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-sm text-slate-400">Retention Rate</p>
              <p className="text-lg font-medium text-white">{data.customerRetention.retentionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Average Response Time */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Average Response Time</h3>
            <Clock className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-white mb-2">
              {data.averageResponseTime.toFixed(1)}h
            </div>
            <div className={`flex items-center ${data.responseTimeGrowth <= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.responseTimeGrowth <= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="ml-1">{Math.abs(data.responseTimeGrowth).toFixed(1)}%</span>
              <span className="ml-1 text-slate-400">from previous period</span>
            </div>
          </div>
        </div>

        {/* Peak Shopping Hours */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Peak Shopping Hours</h3>
            <Activity className="h-5 w-5 text-red-400" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.peakHours.map((hour) => (
                <div key={hour.hour} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{hour.hour}:00</p>
                    <p className="text-xs text-slate-400">{hour.orders} orders</p>
                  </div>
                  <span className="text-sm font-medium text-white">KES {hour.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Performance */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Product Performance</h3>
            <BarChart2 className="h-5 w-5 text-blue-400" />
          </div>
          <div className="p-6">
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Top Performers</h4>
              <div className="space-y-3">
                {data.productPerformance.best.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <div className={`flex items-center text-xs ${product.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {product.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span className="ml-1">{Math.abs(product.growth).toFixed(1)}%</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-white">KES {product.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3">Needs Attention</h4>
              <div className="space-y-3">
                {data.productPerformance.worst.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <div className={`flex items-center text-xs ${product.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {product.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span className="ml-1">{Math.abs(product.growth).toFixed(1)}%</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-white">KES {product.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Sales by Category</h3>
            <Activity className="h-5 w-5 text-green-400" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.salesByCategory.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{category.category}</p>
                    <div className="flex items-center text-xs">
                      <span className="text-slate-400">{category.percentage.toFixed(1)}%</span>
                      <span className={`ml-2 ${category.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {category.growth >= 0 ? '+' : ''}{category.growth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-white">KES {category.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 