export interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

export interface Product {
  image_url: string;
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  subcategory: string;
  rating: number;
  reviewCount: number;
  description: string;
  specifications: Record<string, string>;
  inStock: boolean;
  featured?: boolean;
  bestseller?: boolean;
  stockLevel: 'high' | 'limited' | 'out';
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  shipping_info: any;
  shipping_cost: number;
  shipping_type?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface IntaSendResponse {
  token: string;
  [key: string]: any;
}

// Define the shape of the IntaSend instance for method chaining
interface IntaSendInstance {
  on(
    event: 'COMPLETE' | 'FAILED' | 'IN-PROGRESS',
    callback: (response?: any) => void
  ): IntaSendInstance;
  run(): void;
  createPayment(paymentData: {
    amount: number;
    currency: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    api_ref: string;
    redirect_url: string;
    webhook: string;
  }): Promise<{
    invoice: {
      invoice_url: string;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
}

// Define the shape of the IntaSend constructor
interface IntaSendConstructor {
  new (paymentData: any): IntaSendInstance;
}

declare global {
  interface Window {
    IntaSend: IntaSendConstructor;
  }
}
