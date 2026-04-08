export interface Category {
  id: number;
  name: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size_label: string;
  price: number;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name: string;
  image_url: string;
  is_available: boolean;
  variants: ProductVariant[];
}

export interface User {
  id: number;
  phone: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  bonus_balance: number;
}

export interface PromoCode {
  id: number;
  code: string;
  discount_percent: number;
  min_order_amount: number;
  is_active: boolean;
}

export interface Order {
  id: number;
  user_id: number | null;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  discount_amount: number;
  bonuses_used: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  estimated_time?: number; // in minutes
  review?: string;
  rating?: number;
  created_at: string;
}

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  image_url: string;
  type: 'promo' | 'news';
  created_at: string;
}

export interface CartItem {
  cart_id: string; // Unique ID for this specific customization
  product_id: number;
  variant_id: number;
  name: string;
  size_label: string;
  price: number;
  quantity: number;
  image_url: string;
  removed_ingredients: string[];
  added_extras: { id: number; name: string; price: number }[];
}
