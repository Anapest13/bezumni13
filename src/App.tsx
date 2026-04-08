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
  User,
  ArrowLeft,
  Search,
  Heart
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MenuItem, Order, CartItem } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SAMPLE_MENU: MenuItem[] = [
  {
    id: 1,
    name: "Классическая Шаурма",
    description: "Курица, свежие овощи, фирменный соус в хрустящем лаваше",
    price: 250,
    category: "Классика",
    image_url: "https://picsum.photos/seed/shawarma1/400/300",
    is_available: true
  },
  {
    id: 2,
    name: "Сырная Шаурма",
    description: "Двойная порция сыра, курица, овощи и сырный соус",
    price: 290,
    category: "Сырная",
    image_url: "https://picsum.photos/seed/shawarma2/400/300",
    is_available: true
  },
  {
    id: 3,
    name: "Острая Шаурма",
    description: "Халапеньо, острый соус, курица и овощи",
    price: 270,
    category: "Острая",
    image_url: "https://picsum.photos/seed/shawarma3/400/300",
    is_available: true
  },
  {
    id: 4,
    name: "Веган Шаурма",
    description: "Фалафель, хумус, свежие овощи и кунжутный соус",
    price: 240,
    category: "Веган",
    image_url: "https://picsum.photos/seed/shawarma4/400/300",
    is_available: true
  }
];

type Tab = 'home' | 'menu' | 'cart' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [menu, setMenu] = useState<MenuItem[]>(SAMPLE_MENU);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');

  const categories = ['Все', ...Array.from(new Set(menu.map(item => item.category).filter(Boolean)))];

  const filteredMenu = menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Все' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashActive(false), 2000);
    fetchMenu();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchOrders();
    }
  }, [activeTab]);

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

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTotal = total * (1 - discount / 100);

  const placeOrder = async () => {
    const orderData = {
      customer_name: "Гость",
      customer_phone: "89990000000",
      items: cart,
      total_amount: finalTotal
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        alert('Заказ успешно оформлен!');
        setCart([]);
        setActiveTab('home');
      }
    } catch (err) {
      alert('Ошибка при оформлении заказа');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden flex justify-center">
      {/* Mobile Frame (only on desktop) */}
      <div className="w-full max-w-[450px] min-h-screen bg-[#0a0a0a] relative flex flex-col shadow-2xl shadow-orange-500/10 border-x border-white/5">
        
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
                {/* Promo Banner */}
                <section className="relative h-48 rounded-[32px] overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 p-6 flex flex-col justify-end group">
                  <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    Акция дня
                  </div>
                  <h3 className="text-3xl font-black italic uppercase leading-none mb-2">Скидка 15% <br /> на всё!</h3>
                  <p className="text-xs font-bold opacity-80">Промокод: <span className="text-black bg-white/40 px-2 rounded">COOL</span></p>
                  <UtensilsCrossed className="absolute -right-8 -top-8 w-48 h-48 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                </section>

                {/* Categories */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black uppercase italic">Категории</h3>
                    <button className="text-orange-500 text-xs font-bold uppercase">Все</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {['Все', 'Классика', 'Сырная', 'Острая', 'Веган'].map((cat, i) => (
                      <button 
                        key={cat}
                        className={cn(
                          "px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-95",
                          i === 0 ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "bg-white/5 border border-white/10"
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
                    {menu.slice(0, 3).map(item => (
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
                            <span className="font-black text-orange-500 italic">{item.price} ₽</span>
                            <button 
                              onClick={() => addToCart(item)}
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
                    <motion.div layout key={item.id} className="bg-white/5 border border-white/10 rounded-[32px] p-3 flex flex-col gap-3 group">
                      <div className="relative aspect-square rounded-[24px] overflow-hidden">
                        <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        <button className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/40 hover:text-red-500 transition-colors">
                          <Heart className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="px-1">
                        <h4 className="font-bold text-xs line-clamp-1">{item.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-black text-sm italic">{item.price} ₽</span>
                          <button 
                            onClick={() => addToCart(item)}
                            className="p-2 bg-orange-500 text-black rounded-xl active:scale-90 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
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
                        <div key={item.id} className="flex gap-4 bg-white/5 p-4 rounded-3xl border border-white/10">
                          <img src={item.image_url} className="w-20 h-20 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-sm">{item.name}</h4>
                              <button onClick={() => updateQuantity(item.id, -item.quantity)} className="text-white/20 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-black text-orange-500 italic">{item.price} ₽</span>
                              <div className="flex items-center gap-3 bg-black/40 rounded-xl p-1">
                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white/10 rounded-lg"><Minus className="w-4 h-4" /></button>
                                <span className="font-bold text-xs">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white/10 rounded-lg"><Plus className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white/5 rounded-3xl p-6 space-y-4 border border-white/10">
                      <div className="flex justify-between text-white/40 text-sm">
                        <span>Сумма</span>
                        <span>{total} ₽</span>
                      </div>
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

            {activeTab === 'admin' && (
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

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-white/5 px-8 flex items-center justify-between z-50">
          <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home />} label="Главная" />
          <NavButton active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} icon={<MenuIcon />} label="Меню" />
          <NavButton active={activeTab === 'cart'} onClick={() => setActiveTab('cart')} icon={<ShoppingBag />} label="Корзина" />
          <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<User />} label="Админ" />
        </nav>
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
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: '', image_url: '' });

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
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
                        <span className="text-white/60">{item.name} x{item.quantity}</span>
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
        <div className="space-y-4">
          {!isAddingItem ? (
            <button 
              onClick={() => setIsAddingItem(true)}
              className="w-full py-4 bg-white/5 border border-dashed border-white/20 rounded-2xl flex items-center justify-center gap-2 text-white/40 font-bold text-xs uppercase"
            >
              <Plus className="w-4 h-4" /> Добавить блюдо
            </button>
          ) : (
            <form onSubmit={addMenuItem} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-black uppercase italic text-sm">Новое блюдо</h4>
                <button type="button" onClick={() => setIsAddingItem(false)} className="text-white/40"><XCircle className="w-5 h-5" /></button>
              </div>
              <input 
                placeholder="Название" 
                value={newItem.name} 
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="Цена" 
                  type="number"
                  value={newItem.price} 
                  onChange={e => setNewItem({...newItem, price: e.target.value})}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
                  required
                />
                <input 
                  placeholder="Категория" 
                  value={newItem.category} 
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <input 
                placeholder="URL изображения" 
                value={newItem.image_url} 
                onChange={e => setNewItem({...newItem, image_url: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
              />
              <textarea 
                placeholder="Описание" 
                value={newItem.description} 
                onChange={e => setNewItem({...newItem, description: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500 h-20"
              />
              <button type="submit" className="w-full bg-orange-500 text-black font-black py-3 rounded-xl uppercase italic hover:bg-orange-400 transition-all">
                Сохранить
              </button>
            </form>
          )}
          
          {menu.map(item => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
              <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
              <div className="flex-1">
                <h4 className="font-bold text-xs">{item.name}</h4>
                <p className="text-orange-500 text-[10px] font-black italic">{item.price} ₽</p>
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
      )}
    </div>
  );
}
