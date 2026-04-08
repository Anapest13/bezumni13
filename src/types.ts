export interface Category {
  id: number;
  name: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size_label: string; // e.g. "300г", "0.5л"
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

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  created_at: string;
}

export interface CartItem {
  product_id: number;
  variant_id: number;
  name: string;
  size_label: string;
  price: number;
  quantity: number;
  image_url: string;
}
