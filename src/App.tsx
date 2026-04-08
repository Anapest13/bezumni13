/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Settings, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Truck, 
  XCircle,
  Ticket,
  UtensilsCrossed,
  Home,
  Menu as MenuIcon,
  User as UserIcon,
  ArrowLeft,
  Search,
  Heart
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MenuItem, Order, CartItem, ProductVariant, type User, PromoCode, NewsItem } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SAMPLE_MENU: MenuItem[] = [
  {
    id: 1,
    name: "Фирменная",
    description: "Мясо цыпленка, ароматный лаваш, фирменный соус, томаты, свежий огурец, салат капустный",
    category_id: 1,
    category_name: "Шаурма",
    image_url: "https://picsum.photos/seed/shawarma1/400/300",
    is_available: true,
    variants: [
      { id: 1, product_id: 1, size_label: "300г", price: 220 },
      { id: 2, product_id: 1, size_label: "400г", price: 260 },
      { id: 3, product_id: 1, size_label: "500г", price: 290 }
    ]
  }
];

const EXTRAS = [
  { id: 1, name: 'Сырный соус', price: 40 },
  { id: 2, name: 'Халапеньо', price: 30 },
  { id: 3, name: 'Двойное мясо', price: 90 },
  { id: 4, name: 'Грибы', price: 40 },
];

const INGREDIENTS = [
  'Капуста', 'Огурцы', 'Помидоры', 'Лук', 'Чесночный соус'
];

type Tab = 'home' | 'menu' | 'cart' | 'profile' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [menu, setMenu] = useState<MenuItem[]>(SAMPLE_MENU);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ phone: '', email: '', password: '', name: '' });
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  
  const [customizingItem, setCustomizingItem] = useState<{ product: MenuItem, variant: ProductVariant } | null>(null);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtras, setAddedExtras] = useState<{ id: number; name: string; price: number }[]>([]);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [useBonuses, setUseBonuses] = useState(false);
  
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  const addNotification = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 1) return '+7';
    let formatted = '+7';
    if (numbers.length > 1) formatted += ' (' + numbers.substring(1, 4);
    if (numbers.length >= 5) formatted += ') ' + numbers.substring(4, 7);
    if (numbers.length >= 8) formatted += '-' + numbers.substring(7, 9);
    if (numbers.length >= 10) formatted += '-' + numbers.substring(9, 11);
    return formatted;
  };

  const categories = ['Все', ...Array.from(new Set((Array.isArray(menu) ? menu : []).map(item => item.category_name).filter(Boolean)))];

  const filteredMenu = (Array.isArray(menu) ? menu : []).filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Все' || item.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashActive(false), 2000);
    fetchMenu();
    fetchNews();
    
    // Poll for orders if logged in
    let pollInterval: NodeJS.Timeout;
    if (user) {
      pollInterval = setInterval(fetchUserOrders, 10000);
    }

    return () => {
      clearTimeout(timer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user]);

  // Watch for order status changes to notify
  const prevOrdersRef = React.useRef<Order[]>([]);
  useEffect(() => {
    if (userOrders.length > 0 && prevOrdersRef.current.length > 0) {
      userOrders.forEach(order => {
        const prev = prevOrdersRef.current.find(o => o.id === order.id);
        if (prev && prev.status !== order.status) {
          let statusText = '';
          switch(order.status) {
            case 'preparing': statusText = 'начали готовить! 👨‍🍳'; break;
            case 'ready': statusText = 'готов к выдаче! 🌯'; break;
            case 'delivered': statusText = 'доставлен! Приятного аппетита! ❤️'; break;
          }
          if (statusText) addNotification(`Ваш заказ #${order.id} ${statusText}`);
        }
      });
    }
    prevOrdersRef.current = userOrders;
  }, [userOrders]);

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchOrders();
    }
    if (activeTab === 'profile' && user) {
      fetchUserOrders();
    }
  }, [activeTab, user]);

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      if (res.ok) setNews(await res.json());
    } catch (err) {
      console.error('Failed to fetch news');
    }
  };

  const fetchUserOrders = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/user/${user.id}/orders`);
      if (res.ok) setUserOrders(await res.json());
    } catch (err) {
      console.error('Failed to fetch user orders');
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setMenu(data);
      }
    } catch (err) {
      console.error('Failed to fetch menu');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setIsAuthOpen(false);
        addNotification(authMode === 'login' ? 'С возвращением! 👋' : 'Добро пожаловать! 🎉');
      } else {
        alert(data.error || 'Ошибка авторизации');
      }
    } catch (err) {
      console.error(err);
      alert('Сетевая ошибка. Попробуйте позже.');
    }
  };

  const applyPromo = async () => {
    try {
      const res = await fetch(`/api/promo/${promoCodeInput}`);
      if (res.ok) {
        const data = await res.json();
        setAppliedPromo(data);
      } else {
        alert('Промокод не найден');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product: MenuItem, variant: ProductVariant) => {
    if (product.category_name.toLowerCase().includes('шаурма')) {
      setCustomizingItem({ product, variant });
      setRemovedIngredients([]);
      setAddedExtras([]);
    } else {
      confirmAddToCart(product, variant, [], []);
    }
  };

  const confirmAddToCart = (product: MenuItem, variant: ProductVariant, removed: string[], added: { id: number; name: string; price: number }[]) => {
    const cartId = `${variant.id}-${removed.join(',')}-${added.map(a => a.id).join(',')}`;
    setCart(prev => {
      const existing = prev.find(i => i.cart_id === cartId);
      if (existing) {
        return prev.map(i => i.cart_id === cartId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        cart_id: cartId,
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        size_label: variant.size_label,
        price: variant.price + added.reduce((s, a) => s + a.price, 0),
        image_url: product.image_url,
        quantity: 1,
        removed_ingredients: removed,
        added_extras: added
      }];
    });
    setCustomizingItem(null);
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.cart_id === cartId) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedPromo ? (subtotal * appliedPromo.discount_percent / 100) : 0;
  const bonusToUse = useBonuses && user ? Math.min(user.bonus_balance, subtotal - discountAmount) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount - bonusToUse);

  const placeOrder = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const orderData = {
      user_id: user.id,
      customer_name: user.name,
      customer_phone: user.phone,
      items: cart,
      total_amount: finalTotal,
      discount_amount: discountAmount,
      bonuses_used: bonusToUse
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        setCart([]);
        setAppliedPromo(null);
        setUseBonuses(false);
        addNotification('Заказ успешно оформлен! 🎉');
        setActiveTab('profile'); // Switch to profile to see the order
        const userRes = await fetch(`/api/user/${user.id}`);
        if (userRes.ok) setUser(await userRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden flex justify-center">
      {/* Mobile Frame (centered on desktop, full width on mobile) */}
      <div className="w-full md:max-w-[450px] min-h-screen bg-[#0a0a0a] relative flex flex-col shadow-2xl shadow-orange-500/10 md:border-x border-white/5">
        
        <AnimatePresence>
          {isSplashActive && (
            <motion.div 
              exit={{ opacity: 0, scale: 1.1 }}
              className="fixed inset-0 z-[100] bg-orange-500 flex flex-col items-center justify-center"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-black p-6 rounded-[40px] shadow-2xl"
              >
                <UtensilsCrossed className="w-20 h-20 text-orange-500" />
              </motion.div>
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 text-3xl font-black uppercase italic tracking-tighter text-black"
              >
                Безумно Крутая
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-lg z-40">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Добро пожаловать</p>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Крутая Шаурма</h2>
          </div>
          <div className="relative">
            <button 
              onClick={() => setActiveTab('cart')}
              className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
            >
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-32 px-6">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* Active Order Tracker */}
                {userOrders.find(o => ['pending', 'preparing', 'ready'].includes(o.status)) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-orange-500 text-black p-4 rounded-[32px] flex items-center justify-between shadow-xl shadow-orange-500/20"
                    onClick={() => setActiveTab('profile')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center">
                        <ChefHat className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ваш заказ готовится</p>
                        <h4 className="text-lg font-black italic uppercase leading-tight">Заказ #{userOrders.find(o => ['pending', 'preparing', 'ready'].includes(o.status))?.id}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase opacity-60">Время</p>
                      <p className="text-lg font-black italic">~{userOrders.find(o => ['pending', 'preparing', 'ready'].includes(o.status))?.estimated_time || 20} мин</p>
                    </div>
                  </motion.div>
                )}

                {/* News Carousel */}
                <section className="relative overflow-hidden rounded-[32px]">
                  <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2">
                    {news.map((item) => (
                      <motion.div 
                        key={item.id}
                        className="relative min-w-full h-48 rounded-[32px] overflow-hidden bg-zinc-900 snap-center shrink-0"
                      >
                        <img src={item.image_url} className="absolute inset-0 w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                          <div className="absolute top-4 right-4 bg-orange-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase">
                            {item.type === 'promo' ? 'Акция' : 'Новость'}
                          </div>
                          <h3 className="text-2xl font-black italic uppercase leading-tight">{item.title}</h3>
                          <p className="text-xs font-bold opacity-80 line-clamp-1">{item.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Categories */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black uppercase italic">Категории</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {categories.map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-95",
                          selectedCategory === cat ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "bg-white/5 border border-white/10"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Popular Items */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black uppercase italic">Популярное</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {(Array.isArray(menu) ? menu : []).slice(0, 3).map(item => (
                      <div key={item.id} className="bg-white/5 border border-white/10 rounded-[28px] p-4 flex gap-4 group hover:border-orange-500/30 transition-all">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                          <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <h4 className="font-bold text-sm">{item.name}</h4>
                            <p className="text-white/40 text-[10px] line-clamp-1">{item.description}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-black text-orange-500 italic">{item.variants?.[0]?.price || 0} ₽</span>
                            <button 
                              onClick={() => item.variants?.[0] && addToCart(item, item.variants[0])}
                              className="w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all active:scale-90"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'menu' && (
              <motion.div 
                key="menu"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input 
                      type="text" 
                      placeholder="Найти вкусняшку..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {categories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-6 py-2 rounded-full text-[10px] font-black uppercase italic whitespace-nowrap transition-all border",
                          selectedCategory === cat 
                            ? "bg-orange-500 border-orange-500 text-black" 
                            : "bg-white/5 border-white/10 text-white/40"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {filteredMenu.map(item => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white/5 rounded-[32px] p-3 border border-white/5 hover:border-orange-500/30 transition-all group"
                    >
                      <div className="relative aspect-square rounded-[24px] overflow-hidden mb-3">
                        <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="px-1">
                        <h4 className="font-bold text-xs line-clamp-1">{item.name}</h4>
                        <p className="text-[10px] text-white/40 line-clamp-1 mb-2">{item.description}</p>
                        
                        <div className="space-y-2">
                          {item.variants?.map(variant => (
                            <div key={variant.id} className="flex items-center justify-between bg-black/20 p-1.5 rounded-xl border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white/60">{variant.size_label}</span>
                                <span className="font-black text-xs italic">{variant.price} ₽</span>
                              </div>
                              <button 
                                onClick={() => addToCart(item, variant)}
                                className="p-1.5 bg-orange-500 text-black rounded-lg active:scale-90 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {filteredMenu.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-white/20 font-bold italic uppercase">Ничего не найдено :(</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'cart' && (
              <motion.div 
                key="cart"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-black uppercase italic">Корзина</h3>
                {cart.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-white/20 gap-4">
                    <ShoppingBag className="w-20 h-20 opacity-10" />
                    <p className="font-bold uppercase italic tracking-widest">Пустовато...</p>
                    <button 
                      onClick={() => setActiveTab('menu')}
                      className="mt-4 px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm"
                    >
                      В меню
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.cart_id} className="flex gap-4 bg-white/5 p-4 rounded-3xl border border-white/10">
                          <img src={item.image_url} className="w-20 h-20 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm">{item.name}</h4>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{item.size_label}</p>
                                {item.removed_ingredients && item.removed_ingredients.length > 0 && (
                                  <p className="text-[8px] text-red-400 uppercase font-bold">Без: {item.removed_ingredients.join(', ')}</p>
                                )}
                                {item.added_extras && item.added_extras.length > 0 && (
                                  <p className="text-[8px] text-green-400 uppercase font-bold">Доп: {item.added_extras.map(e => e.name).join(', ')}</p>
                                )}
                              </div>
                              <button onClick={() => updateQuantity(item.cart_id, -item.quantity)} className="text-white/20 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-black text-orange-500 italic">{item.price} ₽</span>
                              <div className="flex items-center gap-3 bg-black/40 rounded-xl p-1">
                                <button onClick={() => updateQuantity(item.cart_id, -1)} className="p-1 hover:bg-white/10 rounded-lg"><Minus className="w-4 h-4" /></button>
                                <span className="font-bold text-xs">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cart_id, 1)} className="p-1 hover:bg-white/10 rounded-lg"><Plus className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Промокод"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-orange-500 transition-all text-sm"
                        />
                        <button 
                          onClick={applyPromo}
                          className="px-6 bg-white/10 rounded-2xl font-bold text-xs uppercase italic"
                        >
                          Применить
                        </button>
                      </div>

                      {user && user.bonus_balance > 0 && (
                        <button 
                          onClick={() => setUseBonuses(!useBonuses)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                            useBonuses ? "bg-orange-500/10 border-orange-500/50" : "bg-white/5 border-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                              useBonuses ? "bg-orange-500 border-orange-500" : "border-white/20"
                            )}>
                              {useBonuses && <CheckCircle2 className="w-3 h-3 text-black" />}
                            </div>
                            <span className="text-xs font-bold">Списать бонусы (доступно {user.bonus_balance})</span>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="bg-white/5 rounded-3xl p-6 space-y-4 border border-white/10">
                      <div className="flex justify-between text-white/40 text-sm">
                        <span>Сумма</span>
                        <span>{subtotal} ₽</span>
                      </div>
                      {appliedPromo && (
                        <div className="flex justify-between text-green-500 text-sm">
                          <span>Скидка ({appliedPromo.discount_percent}%)</span>
                          <span>-{discountAmount} ₽</span>
                        </div>
                      )}
                      {useBonuses && (
                        <div className="flex justify-between text-orange-500 text-sm">
                          <span>Бонусы</span>
                          <span>-{bonusToUse} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-black uppercase italic">
                        <span>Итого</span>
                        <span className="text-orange-500">{finalTotal} ₽</span>
                      </div>
                      <button 
                        onClick={placeOrder}
                        className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl text-lg uppercase italic shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                      >
                        Заказать сейчас
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && user && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-6"
              >
                <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center space-y-4">
                  <div className="w-20 h-20 bg-orange-500 rounded-full mx-auto flex items-center justify-center text-black text-3xl font-black italic">
                    {user.name[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic">{user.name}</h3>
                    <p className="text-white/40 font-bold">{user.phone}</p>
                    <p className="text-white/20 text-xs">{user.email}</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                    <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Бонусный баланс</p>
                    <p className="text-3xl font-black italic text-orange-500">{user.bonus_balance} ₽</p>
                  </div>
                  <button 
                    onClick={() => setUser(null)}
                    className="text-red-500 text-xs font-bold uppercase tracking-widest"
                  >
                    Выйти из аккаунта
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase italic">История заказов</h3>
                  {userOrders.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
                      <p className="text-white/40 text-sm font-bold">У вас пока нет заказов</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userOrders.map(order => (
                        <div key={order.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Заказ #{order.id}</p>
                              <p className="text-xs text-white/60">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                              order.status === 'delivered' ? "bg-green-500/20 text-green-500" :
                              order.status === 'cancelled' ? "bg-red-500/20 text-red-500" :
                              "bg-orange-500/20 text-orange-500"
                            )}>
                              {order.status === 'pending' && 'Ожидает'}
                              {order.status === 'preparing' && 'Готовится'}
                              {order.status === 'ready' && 'Готов'}
                              {order.status === 'delivered' && 'Доставлен'}
                              {order.status === 'cancelled' && 'Отменен'}
                            </div>
                          </div>

                          {/* Order Visualization */}
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <div className="relative pt-2 pb-6 px-2">
                              <div className="flex justify-between mb-2 relative z-10">
                                {[ 
                                  { s: 'pending', i: <Clock className="w-3 h-3" />, l: 'Принят' },
                                  { s: 'preparing', i: <ChefHat className="w-3 h-3" />, l: 'Готовим' },
                                  { s: 'ready', i: <CheckCircle2 className="w-3 h-3" />, l: 'Готов' },
                                  { s: 'delivered', i: <Truck className="w-3 h-3" />, l: 'В пути' }
                                ].map((step, idx) => {
                                  const statuses = ['pending', 'preparing', 'ready', 'delivered'];
                                  const currentIdx = statuses.indexOf(order.status);
                                  const isActive = idx <= currentIdx;
                                  const isCurrent = idx === currentIdx;
                                  return (
                                    <div key={step.s} className="flex flex-col items-center gap-1.5">
                                      <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700",
                                        isActive ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-white/5 text-white/20 border border-white/10",
                                        isCurrent && "animate-pulse scale-110"
                                      )}>
                                        {step.i}
                                      </div>
                                      <span className={cn("text-[8px] font-black uppercase tracking-tighter", isActive ? "text-orange-500" : "text-white/20")}>
                                        {step.l}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="absolute top-[22px] left-6 right-6 h-[2px] bg-white/5 -z-0">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ 
                                    width: 
                                      order.status === 'pending' ? '0%' : 
                                      order.status === 'preparing' ? '33%' : 
                                      order.status === 'ready' ? '66%' : 
                                      order.status === 'delivered' ? '100%' : '0%'
                                  }}
                                  transition={{ duration: 1, ease: "easeInOut" }}
                                  className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                                />
                              </div>
                            </div>
                          )}

                          {(order.status === 'preparing' || order.status === 'pending') && (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
                              <Clock className="w-6 h-6 text-orange-500 animate-pulse" />
                              <div>
                                <p className="text-[10px] text-orange-500 font-black uppercase">Ожидаемое время</p>
                                <p className="text-lg font-black italic text-orange-500">~{order.estimated_time || 20} мин</p>
                              </div>
                            </div>
                          )}

                          {order.status === 'delivered' && !order.rating && (
                            <div className="pt-4 border-t border-white/5 space-y-3">
                              <p className="text-xs font-bold uppercase italic text-white/40">Оцените заказ</p>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <button 
                                    key={star}
                                    onClick={async () => {
                                      const review = prompt('Оставьте отзыв (необязательно):');
                                      await fetch(`/api/orders/${order.id}/review`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ rating: star, review })
                                      });
                                      fetchUserOrders();
                                    }}
                                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-black transition-all"
                                  >
                                    <Heart className="w-5 h-5" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {order.rating && (
                            <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                              <Heart className="w-4 h-4 text-orange-500 fill-orange-500" />
                              <span className="text-xs font-bold text-orange-500">Ваша оценка: {order.rating}/5</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2">
                            <span className="text-white/40 text-xs font-bold">Сумма заказа</span>
                            <span className="font-black italic text-orange-500">{order.total_amount} ₽</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'admin' && user?.role === 'admin' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
              >
                <AdminPanel orders={orders} menu={menu} onUpdateStatus={fetchOrders} onUpdateMenu={fetchMenu} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Auth Modal */}
        <AnimatePresence>
          {isAuthOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAuthOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[40px] p-8 shadow-2xl"
              >
                <h3 className="text-2xl font-black uppercase italic mb-6">
                  {authMode === 'login' ? 'Вход' : 'Регистрация'}
                </h3>
                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'register' && (
                    <input 
                      type="text" 
                      placeholder="Имя"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                      required
                    />
                  )}
                  <input 
                    type="tel" 
                    placeholder="Телефон"
                    value={authForm.phone}
                    onChange={(e) => setAuthForm({...authForm, phone: formatPhone(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                    required
                  />
                  {authMode === 'register' && (
                    <input 
                      type="email" 
                      placeholder="Email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                      required
                    />
                  )}
                  <input 
                    type="password" 
                    placeholder="Пароль"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                    required
                  />
                  <button className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl uppercase italic shadow-lg shadow-orange-500/20">
                    {authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
                  </button>
                </form>
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="w-full mt-6 text-white/40 text-xs font-bold uppercase tracking-widest"
                >
                  {authMode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Customization Modal */}
        <AnimatePresence>
          {customizingItem && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCustomizingItem(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-zinc-900 border-t sm:border border-white/10 rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic">{customizingItem.product.name}</h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{customizingItem.variant.size_label}</p>
                  </div>
                  <button onClick={() => setCustomizingItem(null)} className="p-2 bg-white/5 rounded-full"><XCircle className="w-6 h-6 text-white/20" /></button>
                </div>

                <div className="space-y-8">
                  <section>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4 italic">Убрать ингредиенты</h4>
                    <div className="flex flex-wrap gap-2">
                      {INGREDIENTS.map(ing => (
                        <button 
                          key={ing}
                          onClick={() => setRemovedIngredients(prev => 
                            prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
                          )}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border",
                            removedIngredients.includes(ing) 
                              ? "bg-red-500/20 border-red-500/50 text-red-500" 
                              : "bg-white/5 border-white/10 text-white/60"
                          )}
                        >
                          {removedIngredients.includes(ing) ? 'Без ' : ''}{ing}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4 italic">Добавить допы</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {EXTRAS.map(extra => (
                        <button 
                          key={extra.id}
                          onClick={() => setAddedExtras(prev => 
                            prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]
                          )}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            addedExtras.find(e => e.id === extra.id)
                              ? "bg-orange-500/10 border-orange-500/50"
                              : "bg-white/5 border-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                              addedExtras.find(e => e.id === extra.id) ? "bg-orange-500 border-orange-500" : "border-white/20"
                            )}>
                              {addedExtras.find(e => e.id === extra.id) && <CheckCircle2 className="w-3 h-3 text-black" />}
                            </div>
                            <span className="text-xs font-bold">{extra.name}</span>
                          </div>
                          <span className="text-xs font-black italic text-orange-500">+{extra.price} ₽</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/40 font-bold uppercase">Итоговая цена</p>
                    <p className="text-2xl font-black italic text-orange-500">
                      {customizingItem.variant.price + addedExtras.reduce((s, e) => s + e.price, 0)} ₽
                    </p>
                  </div>
                  <button 
                    onClick={() => confirmAddToCart(customizingItem.product, customizingItem.variant, removedIngredients, addedExtras)}
                    className="px-8 py-4 bg-orange-500 text-black font-black rounded-2xl uppercase italic shadow-lg shadow-orange-500/20"
                  >
                    Добавить
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-white/5 px-6 flex items-center justify-between z-50">
          <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home />} label="Главная" />
          <NavButton active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} icon={<MenuIcon />} label="Меню" />
          <NavButton active={activeTab === 'cart'} onClick={() => setActiveTab('cart')} icon={<ShoppingBag />} label="Корзина" />
          <NavButton active={activeTab === 'profile'} onClick={() => {
            if (user) setActiveTab('profile');
            else setIsAuthOpen(true);
          }} icon={<UserIcon />} label="Профиль" />
          {user?.role === 'admin' && (
            <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings />} label="Админ" />
          )}
        </nav>

        {/* Notifications */}
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] w-full max-w-[400px] px-6 pointer-events-none">
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div 
                key={n.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-3 bg-orange-500 text-black p-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto"
              >
                <div className="bg-black/10 p-2 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="font-bold text-sm leading-tight">{n.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all active:scale-90",
        active ? "text-orange-500" : "text-white/20"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all",
        active ? "bg-orange-500/10" : ""
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function AdminPanel({ orders, menu, onUpdateStatus, onUpdateMenu }: { 
  orders: Order[], 
  menu: MenuItem[],
  onUpdateStatus: () => void,
  onUpdateMenu: () => void
}) {
  const [adminTab, setAdminTab] = useState<'orders' | 'menu'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', category_id: '', image_url: '' });
  const [newVariant, setNewVariant] = useState({ size_label: '', price: '' });
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [newPromo, setNewPromo] = useState({ code: '', discount_percent: '', min_order_amount: '' });

  useEffect(() => {
    if (adminTab === 'menu') fetchPromoCodes();
  }, [adminTab]);

  const fetchPromoCodes = async () => {
    try {
      const res = await fetch('/api/admin/promo');
      if (res.ok) setPromoCodes(await res.json());
    } catch (err) {
      console.error('Failed to fetch promo codes');
    }
  };

  const addPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPromo,
          discount_percent: parseInt(newPromo.discount_percent),
          min_order_amount: parseInt(newPromo.min_order_amount)
        })
      });
      if (res.ok) {
        setNewPromo({ code: '', discount_percent: '', min_order_amount: '' });
        fetchPromoCodes();
        alert('Промокод добавлен!');
      }
    } catch (err) {
      alert('Ошибка при добавлении промокода');
    }
  };

  const updateStatus = async (id: number, status: string) => {
    let estimated_time = undefined;
    if (status === 'preparing') {
      const time = prompt('Введите примерное время приготовления (мин):', '20');
      if (time) estimated_time = parseInt(time);
    }
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, estimated_time })
      });
      onUpdateStatus();
    } catch (err) {
      console.error('Failed to update status');
    }
  };

  const fetchOrderDetails = async (id: number) => {
    if (selectedOrder === id) {
      setSelectedOrder(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/orders/${id}/items`);
      if (res.ok) {
        const data = await res.json();
        setOrderDetails(data);
        setSelectedOrder(id);
      }
    } catch (err) {
      console.error('Failed to fetch order details');
    }
  };

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, price: parseFloat(newItem.price) })
      });
      if (res.ok) {
        setNewItem({ name: '', description: '', price: '', category: '', image_url: '' });
        setIsAddingItem(false);
        onUpdateMenu();
        alert('Блюдо добавлено!');
      }
    } catch (err) {
      alert('Ошибка при добавлении блюда');
    }
  };

  const deleteMenuItem = async (id: number) => {
    if (!window.confirm('Удалить это блюдо?')) return;
    try {
      await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
      onUpdateMenu();
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'preparing': return <ChefHat className="w-4 h-4 text-orange-500" />;
      case 'ready': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'delivered': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
        <button 
          onClick={() => setAdminTab('orders')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold text-xs uppercase italic transition-all",
            adminTab === 'orders' ? "bg-orange-500 text-black" : "text-white/40"
          )}
        >
          Заказы
        </button>
        <button 
          onClick={() => setAdminTab('menu')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold text-xs uppercase italic transition-all",
            adminTab === 'menu' ? "bg-orange-500 text-black" : "text-white/40"
          )}
        >
          Меню
        </button>
      </div>

      {adminTab === 'orders' ? (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-start" onClick={() => fetchOrderDetails(order.id)}>
                <div>
                  <span className="text-orange-500 font-black italic">#{order.id}</span>
                  <h4 className="font-bold text-sm mt-1">{order.customer_name}</h4>
                  <p className="text-white/40 text-[10px]">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black italic">{order.total_amount} ₽</p>
                  <p className="text-[10px] text-white/40 uppercase font-bold mt-1">Детали</p>
                </div>
              </div>

              <AnimatePresence>
                {selectedOrder === order.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/5 pt-4 space-y-2"
                  >
                    {orderDetails.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-white/60">{item.name} ({item.size_label}) x{item.quantity}</span>
                        <span className="font-bold">{item.price * item.quantity} ₽</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/40 rounded-xl px-3 py-2 flex items-center gap-2 border border-white/5">
                  {getStatusIcon(order.status)}
                  <select 
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="bg-transparent text-[10px] font-bold uppercase outline-none w-full"
                  >
                    <option value="pending">Ожидает</option>
                    <option value="preparing">Готовится</option>
                    <option value="ready">Готов</option>
                    <option value="delivered">Доставлен</option>
                    <option value="cancelled">Отменен</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Promo Codes Section */}
          <section className="space-y-4">
            <h3 className="text-lg font-black uppercase italic">Промокоды</h3>
            <form onSubmit={addPromoCode} className="bg-white/5 p-4 rounded-3xl border border-white/10 space-y-3">
              <input 
                type="text" 
                placeholder="Код (например: COOL)"
                value={newPromo.code}
                onChange={(e) => setNewPromo({...newPromo, code: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-xs outline-none focus:border-orange-500"
                required
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Скидка %"
                  value={newPromo.discount_percent}
                  onChange={(e) => setNewPromo({...newPromo, discount_percent: e.target.value})}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-xs outline-none focus:border-orange-500"
                  required
                />
                <input 
                  type="number" 
                  placeholder="Мин. сумма"
                  value={newPromo.min_order_amount}
                  onChange={(e) => setNewPromo({...newPromo, min_order_amount: e.target.value})}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-xs outline-none focus:border-orange-500"
                  required
                />
              </div>
              <button className="w-full bg-orange-500 text-black font-black py-2 rounded-xl text-xs uppercase italic">
                Добавить промокод
              </button>
            </form>

            <div className="grid grid-cols-1 gap-2">
              {promoCodes.map(promo => (
                <div key={promo.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-between items-center">
                  <div>
                    <span className="font-black italic text-orange-500">{promo.code}</span>
                    <span className="text-[10px] text-white/40 ml-2">-{promo.discount_percent}% от {promo.min_order_amount} ₽</span>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full", promo.is_active ? "bg-green-500" : "bg-red-500")} />
                </div>
              ))}
            </div>
          </section>

          {/* Menu Section */}
          <section className="space-y-4">
            <h3 className="text-lg font-black uppercase italic">Меню</h3>
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-center">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Управление меню</p>
              <p className="text-[10px] text-white/20 mt-2">Добавление новых позиций временно доступно только через БД</p>
            </div>
            
            <div className="space-y-2">
              {(Array.isArray(menu) ? menu : []).map(item => (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                  <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <h4 className="font-bold text-xs">{item.name}</h4>
                    <div className="flex gap-2 mt-1">
                      {item.variants?.map(v => (
                        <span key={v.id} className="text-orange-500 text-[8px] font-black italic bg-orange-500/10 px-1.5 py-0.5 rounded-md">
                          {v.size_label}: {v.price}₽
                        </span>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteMenuItem(item.id)}
                    className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
