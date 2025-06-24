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
  specifications: any;
  created_at: string;
  updated_at: string;
  product_images?: {
    image_url: string;
    is_primary: boolean;
  }[];
} 