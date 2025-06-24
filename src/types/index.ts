export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  buying_price: number;
  original_price: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  image_url: string | null;
  stock_quantity: number;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_bestseller: boolean;
  specifications: Record<string, string>;
  created_at: string;
  updated_at: string;
  product_images?: {
    image_url: string;
    is_primary: boolean;
  }[];

  // Computed properties for UI
  image?: string; // Computed from image_url or product_images
  category?: string; // Computed from category_id
  subcategory?: string; // Computed from subcategory_id
  subcategoryId?: string; // Alias for subcategory_id
  originalPrice?: number; // Alias for original_price
  inStock?: boolean; // Computed from stock_quantity
  featured?: boolean; // Alias for is_featured
  bestseller?: boolean; // Alias for is_bestseller
  stockLevel?: 'high' | 'limited' | 'out'; // Computed from stock_quantity
  reviewCount?: number; // Alias for review_count
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}