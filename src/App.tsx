/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Heart,
  Pencil,
  MapPin,
  Map,
  Calendar,
  Banknote,
  QrCode,
  Zap,
  X,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MenuItem, Order, CartItem, ProductVariant, type User, PromoCode, NewsItem, Branch, City } from './types';

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

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Выбрать...',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v: boolean) => !v)}
        className={`w-full bg-black/40 border rounded-2xl px-4 py-3 text-sm font-bold text-left flex items-center justify-between transition-colors ${open ? 'border-orange-500/50' : 'border-white/10'}`}
      >
        <span className={selected ? 'text-white' : 'text-white/30'}>{selected?.label ?? placeholder}</span>
        <span className={`text-[10px] text-white/40 transition-transform duration-200 inline-block ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-xl max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full px-4 py-3 text-sm font-bold text-left transition-colors hover:bg-white/10 ${value === opt.value ? 'text-orange-500 bg-orange-500/10' : 'text-white'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [menu, setMenu] = useState<MenuItem[]>(SAMPLE_MENU);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(() => {
    try {
      const saved = localStorage.getItem('selectedCity');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(() => {
    try {
      const saved = localStorage.getItem('selectedBranch');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ phone: '', email: '', password: '', name: '' });
  const [authStep, setAuthStep] = useState<'form'|'verify'|'forgot'|'forgot-code'|'forgot-pass'>('form');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [popularProducts, setPopularProducts] = useState<MenuItem[]>([]);
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
  const [openedNews, setOpenedNews] = useState<NewsItem | null>(null);
  const [reviewModal, setReviewModal] = useState<{ orderId: number; rating: number; review: string } | null>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'platega'>('cash');
  const [pendingPlategaPayment, setPendingPlategaPayment] = useState<{ orderId: number; redirect: string; total: number } | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDataPolicy, setShowDataPolicy] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: '', message: '' });
  const [supportStatus, setSupportStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      title,
      message,
      onConfirm
    });
  };
  
  const newsRef = React.useRef<HTMLDivElement>(null);

  const getKrasnoyarskTime = () => {
    const utcDate = new Date();
    const krasnoyarskOffset = 7 * 60; // UTC+7 in minutes
    return new Date(utcDate.getTime() + (utcDate.getTimezoneOffset() + krasnoyarskOffset) * 60000);
  };

  const isBranchClosed = (branch: any) => {
    if (!branch) return false;
    // Standardize representation of boolean
    const is24_7 = branch.is_24_7 === true || branch.is_24_7 === 1 || String(branch.is_24_7).toLowerCase() === 'true';
    if (is24_7) return false;
    const hours = getKrasnoyarskTime().getHours();
    return hours >= 23 || hours < 8;
  };

  const renderClosedBranchNotice = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-white/10 rounded-[40px] p-8 text-center space-y-6 my-6 max-w-md mx-auto"
      >
        <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
          <Clock className="w-10 h-10 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-black uppercase italic text-orange-500">Филиал сейчас закрыт</h3>
          <p className="text-white/80 font-bold text-sm tracking-tight leading-relaxed">
            Филиал по адресу <span className="text-white">«{selectedBranch?.address}»</span> закрыт в ночное время (работает с 08:00 до 23:00 по времени Красноярска).
          </p>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 inline-block mx-auto">
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Текущее время в Красноярске:</p>
            <p className="text-orange-500 text-lg font-black italic mt-1 leading-none">
              {getKrasnoyarskTime().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => setIsBranchModalOpen(true)}
            className="w-full h-16 bg-orange-500 hover:bg-orange-400 text-black rounded-2xl font-black uppercase italic text-md flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
          >
            <MapPin className="w-5 h-5" /> Сменить филиал
          </button>
          
          <p className="text-[10px] font-black uppercase tracking-wider text-white/30 leading-normal">
            Вы можете выбрать один из наших филиалов, работающих круглосуточно (24/7)!
          </p>
        </div>
      </motion.div>
    );
  };

  // Load 2GIS Maps script dynamically
  useEffect(() => {
    const scriptId = 'dg-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=basic';
      script.async = true;
      document.head.appendChild(script);
    }
    fetchCities();
    fetchBranches();
  }, []);

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/cities?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setCities(data);
        
        // Sync selectedCity from localStorage with fresh data that has coordinates
        const cached = localStorage.getItem('selectedCity');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const freshCity = data.find((c: City) => c.id === parsed.id || c.name === parsed.name);
            if (freshCity) {
              setSelectedCity(freshCity);
            }
          } catch (e) {
            console.error('Failed to parse cached city:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const selectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    localStorage.setItem('selectedBranch', JSON.stringify(branch));
    if (branch.city_id && (!selectedCity || selectedCity.id !== branch.city_id)) {
      const city = cities.find(c => c.id === branch.city_id);
      if (city) {
        setSelectedCity(city);
        localStorage.setItem('selectedCity', JSON.stringify(city));
      }
    }
    setIsBranchModalOpen(false);
    fetchMenu(branch.id);
    fetchPopularProducts(branch.id);
    addNotification(`Выбран филиал: ${branch.address}`, 'info');
  };

  useEffect(() => {
    const isModalVisible = isBranchModalOpen || ((selectedBranch === null || selectedCity === null) && !isSplashActive);
    if (!isModalVisible || !selectedCity) return;

    let mapInstance: any = null;
    const initMap = async () => {
      const DG = (window as any).DG;
      if (DG && DG.map) {
        try {
          const cityBranches = branches.filter(b => b.city_id === selectedCity.id);
          const activeBranch = selectedBranch && selectedBranch.city_id === selectedCity.id ? selectedBranch : null;
          const firstBranch = activeBranch || cityBranches[0];
          
          let centerLat = 56.0153;
          let centerLng = 92.8932;
          
          if (firstBranch) {
            centerLat = Number(firstBranch.latitude);
            centerLng = Number(firstBranch.longitude);
          } else if (selectedCity.latitude && selectedCity.longitude) {
            centerLat = Number(selectedCity.latitude);
            centerLng = Number(selectedCity.longitude);
          } else if (selectedCity.name === 'Красноярск') {
            centerLat = 56.0153;
            centerLng = 92.8932;
          } else {
            // Get coordinates dynamically from OpenStreetMap's Nominatim geocoder
            try {
              const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(selectedCity.name)}&accept-language=ru&limit=1`, {
                headers: { 'User-Agent': 'ShawarmaBranchLocatorApp/1.0' }
              });
              if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                  centerLat = parseFloat(data[0].lat);
                  centerLng = parseFloat(data[0].lon);
                }
              }
            } catch (err) {
              console.error('Failed to resolve coordinates for client city fallback:', err);
            }
          }
          
          mapInstance = DG.map('dg-map', {
            center: [centerLat, centerLng],
            zoom: 12,
            fullscreenControl: false,
            zoomControl: true,
          });

          cityBranches.forEach(b => {
             const popupHTML = `
               <div style="font-family: inherit; color: #ffffff; min-width: 170px; max-width: 210px; display: flex; flex-direction: column; gap: 6px; padding: 2px;">
                 <div style="font-weight: 900; font-style: italic; font-size: 13px; text-transform: uppercase; color: #f97316; letter-spacing: -0.01em; line-height: 1.2;">
                   ${b.address}
                 </div>
                 <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${b.is_24_7 ? '#10b981' : '#f59e0b'}; display: flex; align-items: center; gap: 5px; margin-top: 2px; margin-bottom: 6px;">
                   <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${b.is_24_7 ? '#10b981' : '#f59e0b'};"></span>
                   ${b.is_24_7 ? '24/7 • Круглосуточно' : 'Рабочий день до 23:00'}
                 </div>
                 <button id="map-select-btn-${b.id}" style="
                   width: 100%;
                   background-color: #f97316;
                   color: #000000;
                   border: none;
                   border-radius: 12px;
                   padding: 8px 10px;
                   font-size: 10px;
                   font-weight: 900;
                   font-style: italic;
                   text-transform: uppercase;
                   cursor: pointer;
                   text-align: center;
                   transition: all 0.2s ease-in-out;
                   box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
                 " onmouseover="this.style.backgroundColor='#ea580c'; this.style.color='#ffffff';" onmouseout="this.style.backgroundColor='#f97316'; this.style.color='#000000';">
                   Выбрать филиал →
                 </button>
               </div>
             `;

             const marker = DG.marker([Number(b.latitude), Number(b.longitude)])
               .addTo(mapInstance)
               .bindPopup(popupHTML);
          });

          // Handle dynamically rendered popup click event
          mapInstance.on('popupopen', (e: any) => {
            const container = e.popup._container;
            if (!container) return;
            const selectBtns = container.querySelectorAll('[id^="map-select-btn-"]');
            selectBtns.forEach((btn: any) => {
              btn.onclick = (event: MouseEvent) => {
                event.preventDefault();
                const branchId = parseInt(btn.id.replace('map-select-btn-', ''));
                const matchedBranch = cityBranches.find(cb => cb.id === branchId);
                if (matchedBranch) {
                  selectBranch(matchedBranch);
                }
              };
            });
          });
        } catch (e) {
          console.error('Error rendering DG map:', e);
        }
      }
    };

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if ((window as any).DG) {
          clearInterval(interval);
          initMap();
        }
      }, 200);
      return () => clearInterval(interval);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstance && typeof mapInstance.destroy === 'function') {
        try { mapInstance.destroy(); } catch (e) {}
      }
    };
  }, [isBranchModalOpen, selectedBranch, branches, isSplashActive, selectedCity]);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const res = await fetch('/api/admin/promo?t=' + Date.now());
      if (res.ok) setPromoCodes(await res.json());
    } catch (err) {
      console.error('Failed to fetch promo codes');
    }
  };

  useEffect(() => {
    if (news.length > 0 && activeTab === 'home') {
      const interval = setInterval(() => {
        if (newsRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = newsRef.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            newsRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            newsRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [news, activeTab]);

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
    const timer = setTimeout(() => setIsSplashActive(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    const payment = params.get('payment');
    if (payment === 'success' && orderId) {
      const numericOrderId = parseInt(orderId);

      const confirmPaymentOnServer = async () => {
        try {
          const response = await fetch(`/api/orders/${numericOrderId}/simulate-pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            addNotification(`Оплата заказа #${numericOrderId} успешно получена!`, 'success');
            setUserOrders(prev => prev.map(o =>
              o.id === numericOrderId
                ? { ...o, is_paid: 1, status: (o.status === 'pending' ? 'preparing' : o.status) as Order['status'] }
                : o
            ));
            setActiveTab('profile');
          } else {
            addNotification('Статус оплаты проверяется...', 'info');
          }
          fetchUserOrders();
          if (user && user.role === 'admin') {
            fetchOrders();
          }
        } catch (error) {
          console.error('Error confirming payment:', error);
        }
      };

      confirmPaymentOnServer();

      // Clean up URL query parameters
      try {
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      } catch (e) {
        console.error(e);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!pendingPlategaPayment) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${pendingPlategaPayment.orderId}/status?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.is_paid || data.status !== 'pending') {
            addNotification(`Оплата заказа #${pendingPlategaPayment.orderId} успешно получена!`, 'success');
            fetchUserOrders();
            if (user && user.role === 'admin') {
              fetchOrders();
            }
            setPendingPlategaPayment(null);
            setActiveTab('profile');
          }
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [pendingPlategaPayment, user]);

  useEffect(() => {
    fetchMenu(selectedBranch?.id);
    fetchNews(selectedBranch?.id);
    fetchPopularProducts(selectedBranch?.id);
    
    // Poll for orders if logged in
    let pollInterval: NodeJS.Timeout;
    if (user) {
      fetchUserOrders();
      if (user.role === 'admin') {
        fetchOrders();
      }
      pollInterval = setInterval(() => {
        fetchUserOrders();
        if (user.role === 'admin') {
          fetchOrders();
        }
      }, 10000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user, selectedBranch]);

  // Watch for order status changes to notify
  const prevOrdersRef = React.useRef<Order[]>([]);
  useEffect(() => {
    if (userOrders.length > 0 && prevOrdersRef.current.length > 0) {
      userOrders.forEach(order => {
        const prev = prevOrdersRef.current.find(o => o.id === order.id);
        if (prev && prev.status !== order.status) {
          let statusText = '';
          switch(order.status) {
            case 'preparing': statusText = 'начали готовить!'; break;
            case 'ready': statusText = 'готов к выдаче!'; break;
            case 'delivered': statusText = 'доставлен! Приятного аппетита!'; break;
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

  const fetchNews = async (branchId?: number) => {
    try {
      const bId = branchId || selectedBranch?.id;
      const url = bId ? `/api/news?branch_id=${bId}&t=${Date.now()}` : `/api/news?t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) setNews(await res.json());
    } catch (err) {
      console.error('Failed to fetch news');
    }
  };

  const fetchUserOrders = async (forcedUserId?: number) => {
    let activeUserId = forcedUserId || user?.id;
    if (!activeUserId) {
      try {
        const saved = localStorage.getItem('user');
        if (saved) {
          const parsed = JSON.parse(saved);
          activeUserId = parsed.id;
        }
      } catch (e) {}
    }
    if (!activeUserId) return;
    try {
      const res = await fetch(`/api/user/${activeUserId}/orders?t=${Date.now()}`);
      if (res.ok) setUserOrders(await res.json());
    } catch (err) {
      console.error('Failed to fetch user orders');
    }
  };

  const handleDeleteOrderUser = (orderId: number) => {
    confirmAction(
      'Удаление заказа',
      'Вы уверены, что хотите удалить этот заказ из своей истории?',
      async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            addNotification('Заказ успешно удален из истории!', 'success');
            fetchUserOrders();
            // Also update any orders tab if open
            fetchOrders();
          } else {
            addNotification('Не удалось удалить заказ', 'info');
          }
        } catch (err) {
          console.error(err);
          addNotification('Ошибка при удалении заказа', 'info');
        }
      }
    );
  };

  const handleDeleteReviewUser = (orderId: number) => {
    confirmAction(
      'Удаление отзыва',
      'Вы уверены, что хотите удалить свой отзыв к этому заказу?',
      async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}/review`, {
            method: 'DELETE'
          });
          if (res.ok) {
            addNotification('Отзыв успешно удален!', 'success');
            fetchUserOrders();
            fetchOrders();
          } else {
            addNotification('Не удалось удалить отзыв', 'info');
          }
        } catch (err) {
          console.error(err);
          addNotification('Ошибка при удалении отзыва', 'info');
        }
      }
    );
  };

  const fetchPopularProducts = async (branchId?: number) => {
    try {
      const bId = branchId || selectedBranch?.id;
      const url = bId ? `/api/products/popular?branch_id=${bId}&t=${Date.now()}` : `/api/products/popular?t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) setPopularProducts(await res.json());
    } catch (err) {
      console.error('Failed to fetch popular products');
    }
  };

  const fetchMenu = async (branchId?: number) => {
    try {
      const bId = branchId || selectedBranch?.id;
      const url = bId ? `/api/menu?branch_id=${bId}&t=${Date.now()}` : `/api/menu?t=${Date.now()}`;
      const res = await fetch(url);
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
      const res = await fetch(`/api/admin/orders?t=${Date.now()}`);
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
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authForm),
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data);
          setIsAuthOpen(false);
          setAuthStep('form');
          addNotification('С возвращением!');
        } else {
          setAuthError(data.error || 'Ошибка входа');
        }
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authForm),
        });
        const data = await res.json();
        if (res.ok && data.pending) {
          setVerifyEmail(authForm.email);
          setAuthStep('verify');
        } else if (res.ok) {
          setUser(data);
          setIsAuthOpen(false);
          setAuthStep('form');
          addNotification('Добро пожаловать!');
        } else {
          setAuthError(data.error || 'Ошибка регистрации');
        }
      }
    } catch {
      setAuthError('Сетевая ошибка. Попробуйте позже.');
    } finally {
      setAuthLoading(false);
    }
  };

  const applyPromo = async () => {
    try {
      const bId = selectedBranch?.id;
      const url = bId ? `/api/promo/${promoCodeInput}?branch_id=${bId}` : `/api/promo/${promoCodeInput}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (subtotal < (data.min_order_amount || 0)) {
          alert(`Этот промокод действует при заказе от ${data.min_order_amount} ₽`);
        }
        setAppliedPromo(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Промокод не найден или не предназначен для этого филиала');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product: MenuItem, variant: ProductVariant) => {
    // Check if variant has stock limits
    const existingCount = cart.filter(c => c.variant_id === variant.id).reduce((s, c) => s + c.quantity, 0);
    if (variant.stock !== undefined && existingCount >= variant.stock) {
      addNotification(`Недостаточно товара на складе! Доступно: ${variant.stock} шт`, 'info');
      return;
    }

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
    
    // Check stock
    const existingCount = cart.filter(c => c.variant_id === variant.id).reduce((s, c) => s + c.quantity, 0);
    if (variant.stock !== undefined && existingCount >= variant.stock) {
      addNotification(`Недостаточно товара на складе! Доступно: ${variant.stock} шт`, 'info');
      return;
    }

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
        price: Number(variant.price) + added.reduce((s, a) => s + Number(a.price), 0),
        image_url: product.image_url,
        quantity: 1,
        removed_ingredients: removed,
        added_extras: added
      }];
    });
    setCustomizingItem(null);
  };

  const updateQuantity = (cartId: string, delta: number) => {
    const item = cart.find(i => i.cart_id === cartId);
    if (item && delta > 0) {
      // Find matching menu item to check stock limit
      const menuItem = menu.find(m => m.id === item.product_id);
      const variant = menuItem?.variants?.find(v => v.id === item.variant_id);
      if (variant && variant.stock !== undefined && item.quantity + delta > variant.stock) {
        addNotification(`Недостаточно товара на складе! Доступно: ${variant.stock} шт`, 'info');
        return;
      }
    }

    setCart(prev => prev.map(i => {
      if (i.cart_id === cartId) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isPromoValid = appliedPromo && subtotal >= (appliedPromo.min_order_amount || 0);
  const discountAmount = isPromoValid ? (subtotal * appliedPromo!.discount_percent / 100) : 0;
  const bonusToUse = useBonuses && user ? Math.min(user.bonus_balance, subtotal - discountAmount) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount - bonusToUse);

  const placeOrder = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const orderData = {
      branch_id: selectedBranch?.id,
      user_id: user.id,
      customer_name: user.name,
      customer_phone: user.phone,
      items: cart,
      total_amount: finalTotal,
      discount_amount: discountAmount,
      bonuses_used: bonusToUse,
      promo_code: isPromoValid ? appliedPromo?.code : null,
      payment_method: paymentMethod
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        const data = await res.json();
        setCart([]);
        setAppliedPromo(null);
        setUseBonuses(false);
        addNotification('Заказ успешно оформлен!');
        
        if (paymentMethod === 'platega' && data.platega_redirect) {
          setPendingPlategaPayment({
            orderId: data.id,
            redirect: data.platega_redirect,
            total: finalTotal
          });
        } else {
          setActiveTab('profile');
        }
        
        const userRes = await fetch(`/api/user/${user.id}`);
        if (userRes.ok) setUser(await userRes.json());
        fetchUserOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden flex justify-center">
      {/* Mobile Frame (centered on desktop, full width on mobile) */}
      <div className="w-full md:max-w-[450px] min-h-screen bg-[#0a0a0a] relative flex flex-col shadow-2xl shadow-orange-500/10 md:border-x border-white/5 pb-24">
        
        <AnimatePresence>
          {isSplashActive && (
            <motion.div 
              exit={{ opacity: 0, scale: 1.1 }}
              className="fixed inset-0 z-[100] bg-orange-500 flex flex-col items-center justify-center overflow-hidden"
            >
              <div className="relative mb-12">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="bg-black p-8 rounded-[40px] shadow-2xl relative z-10"
                >
                  <UtensilsCrossed className="w-20 h-20 text-orange-500" />
                </motion.div>
                
                {/* Dino Animation Layer */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-32 pointer-events-none">
                  <motion.div
                    animate={{ 
                      x: [-300, 300],
                      rotate: [0, 5, -5, 0],
                      y: [0, -40, 0, -40, 0] // Jumping motion
                    }}
                    transition={{ 
                      x: { duration: 3, repeat: Infinity, ease: "linear" },
                      rotate: { duration: 0.2, repeat: Infinity, ease: "linear" },
                      y: { duration: 0.5, repeat: Infinity, ease: "easeOut" }
                    }}
                    className="absolute"
                  >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="black" className="opacity-40">
                      <path d="M7 2v1h5v1h2v1h2v1h2v1h2v3h-1v1h-1v1H11v-1H9v-1H7v-1H5v-1H3v-2h1v-1h1v-1h1V4h1V2zM17 6h1v1h-1V6zm-1 6h1v1h-1v-1zM6 15h1v1h2v1h2v1h2v1h2v-1h2v-1h1v-1h1v-2h-1v1h-1v1h-2v1H9v-1H7v-1H6v-1h-1v2h1z"/>
                    </svg>
                  </motion.div>
                </div>
              </div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center relative z-20"
              >
                <div className="inline-block bg-black text-orange-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic mb-4 tracking-widest shadow-xl">
                  Best Shawarma in Town
                </div>
                <h1 className="text-5xl font-black uppercase italic tracking-tighter text-black leading-none">
                  Безумно<br/>Крутая
                </h1>
                <div className="mt-8 flex justify-center gap-3">
                  {[0,1,2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 bg-black rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-lg z-40">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <button 
                onClick={() => setIsBranchModalOpen(true)}
                className="text-orange-500 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                {selectedBranch ? `${selectedCity ? selectedCity.name + ', ' : ''}${selectedBranch.address}` : 'Выбрать филиал'}
                <span className="text-[8px] text-white/40 font-mono">▼</span>
              </button>
            </div>
            <img src="/logo.svg" alt="Безумно Крутая Шаурма" className="h-8 w-auto invert" />
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
              selectedBranch && isBranchClosed(selectedBranch) ? (
                renderClosedBranchNotice()
              ) : (
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
                  <div 
                    ref={newsRef}
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 scroll-smooth"
                  >
                    {news.map((item) => (
                      <motion.div 
                        key={item.id}
                        onClick={() => setOpenedNews(item)}
                        className="relative min-w-full h-48 rounded-[32px] overflow-hidden bg-zinc-900 snap-center shrink-0 cursor-pointer"
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

                {/* Popular Items */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black uppercase italic">Популярное</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {popularProducts.map(item => (
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
              )
            )}

            {activeTab === 'menu' && (
              selectedBranch && isBranchClosed(selectedBranch) ? (
                renderClosedBranchNotice()
              ) : (
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
                          {item.variants?.map(variant => {
                            const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
                            return (
                              <div key={variant.id} className="flex items-center justify-between bg-black/20 p-1.5 rounded-xl border border-white/5 gap-0.5">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-bold text-white/60 line-clamp-1">{variant.size_label}</span>
                                  <span className="font-black text-xs italic">{variant.price} ₽</span>
                                  {variant.stock !== undefined && variant.stock < 100 && (
                                    <span className={cn(
                                      "text-[7px] font-black uppercase tracking-tighter mt-0.5",
                                      isOutOfStock ? "text-red-500" : "text-emerald-500"
                                    )}>
                                      {isOutOfStock ? 'Нет' : `${variant.stock} шт`}
                                    </span>
                                  )}
                                </div>
                                <button 
                                  onClick={() => addToCart(item, variant)}
                                  disabled={isOutOfStock}
                                  className={cn(
                                    "p-1 rounded-lg active:scale-90 transition-all shrink-0",
                                    isOutOfStock 
                                      ? "bg-zinc-800 text-white/20 cursor-not-allowed" 
                                      : "bg-orange-500 text-black hover:bg-orange-400"
                                  )}
                                >
                                  {isOutOfStock ? <XCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            );
                          })}
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
              )
            )}

            {activeTab === 'cart' && (
              selectedBranch && isBranchClosed(selectedBranch) ? (
                renderClosedBranchNotice()
              ) : (
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

                      {/* Способ оплаты */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Способ оплаты</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={cn(
                              "py-3.5 px-4 rounded-2xl border text-xs font-bold transition-all uppercase tracking-tight flex flex-col items-center gap-1",
                              paymentMethod === 'cash'
                                ? "bg-orange-500/10 border-orange-500 text-orange-500"
                                : "bg-white/5 border-white/5 text-white/50 hover:border-white/10"
                            )}
                          >
                            <span className="flex items-center gap-1.5"><Banknote className="w-4 h-4" /> При получении</span>
                            <span className="text-[8px] opacity-60">Наличные или карта</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('platega')}
                            className={cn(
                              "py-3.5 px-4 rounded-2xl border text-xs font-bold transition-all uppercase tracking-tight flex flex-col items-center gap-1",
                              paymentMethod === 'platega'
                                ? "bg-orange-500/10 border-orange-500 text-orange-500"
                                : "bg-white/5 border-white/5 text-white/50 hover:border-white/10"
                            )}
                          >
                            <span className="flex items-center gap-1.5"><QrCode className="w-4 h-4" /> СБП онлайн</span>
                            <span className="text-[8px] opacity-60">Платёга • QR-код</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-3xl p-6 space-y-4 border border-white/10">
                      <div className="flex justify-between text-white/40 text-sm">
                        <span>Сумма</span>
                        <span>{subtotal} ₽</span>
                      </div>
                      {appliedPromo && (
                        <div className="space-y-1">
                          <div className={cn(
                            "flex justify-between text-sm",
                            isPromoValid ? "text-green-500" : "text-white/20"
                          )}>
                            <span>Скидка ({appliedPromo.discount_percent}%)</span>
                            <span>-{discountAmount} ₽</span>
                          </div>
                          {!isPromoValid && (
                            <p className="text-[10px] text-orange-500/60 font-bold uppercase">
                              Нужен заказ от {appliedPromo.min_order_amount} ₽
                            </p>
                          )}
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
              )
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
                    onClick={() => { setShowSupportModal(true); setSupportStatus('idle'); setSupportForm({ subject: '', message: '' }); }}
                    className="w-full py-3 bg-orange-500/10 border border-orange-500/30 rounded-2xl text-orange-500 text-xs font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all"
                  >
                    Написать в поддержку
                  </button>
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
                                    onClick={() => setReviewModal({ orderId: order.id, rating: star, review: '' })}
                                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-black transition-all"
                                  >
                                    <Heart className="w-5 h-5 text-white/20" />
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

                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">Тип оплаты</span>
                            <span className="text-xs font-black italic">
                              {order.payment_method === 'platega' ? (
                                order.is_paid ? (
                                  <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Оплачен по СБП</span>
                                ) : (
                                  <span className="text-yellow-500 flex items-center gap-1 animate-pulse"><Clock className="w-3.5 h-3.5" /> Ожидает оплаты (СБП)</span>
                                )
                              ) : (
                                <span className="text-white/60 flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> Наличные / Карта при получении</span>
                              )}
                            </span>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                            {order.payment_method === 'platega' && !order.is_paid && order.status !== 'cancelled' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const linkRes = await fetch(`/api/orders/${order.id}/platega-link`, { method: 'POST' });
                                    if (linkRes.ok) {
                                      const linkData = await linkRes.json();
                                      if (linkData.redirect) {
                                        setPendingPlategaPayment({ orderId: order.id, redirect: linkData.redirect, total: order.total_amount });
                                      }
                                    } else {
                                      addNotification('Не удалось создать ссылку для оплаты', 'info');
                                    }
                                  } catch {
                                    addNotification('Ошибка подключения', 'info');
                                  }
                                }}
                                className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 active:scale-95 shadow-md shadow-orange-500/10"
                              >
                                <QrCode className="w-4 h-4" /> Оплатить по СБП
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrderUser(order.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 active:scale-95 border border-red-500/10"
                              title="Удалить заказ из истории"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Удалить заказ</span>
                            </button>
                            {order.rating && (
                              <button
                                onClick={() => handleDeleteReviewUser(order.id)}
                                className="p-2 bg-orange-500/10 hover:bg-orange-500 hover:text-black text-orange-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 active:scale-95 border border-orange-500/10"
                                title="Удалить отзыв"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Удалить отзыв</span>
                              </button>
                            )}
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
                <AdminPanel 
                  orders={orders} 
                  user={user}
                  menu={menu} 
                  news={news}
                  promoCodes={promoCodes}
                  onUpdateStatus={fetchOrders} 
                  onUpdateMenu={fetchMenu} 
                  onUpdateNews={fetchNews}
                  onUpdatePromo={fetchPromoCodes}
                  confirmAction={confirmAction}
                  onUpdateCities={fetchCities}
                  onUpdateBranches={fetchBranches}
                  addNotification={addNotification}
                />
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
                onClick={() => { setIsAuthOpen(false); setAuthStep('form'); setAuthError(''); }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[40px] p-8 shadow-2xl"
              >
                {/* STEP: Email verification after register */}
                {authStep === 'verify' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-black uppercase italic mb-1">Подтверждение</h3>
                      <p className="text-white/40 text-sm">Код отправлен на <span className="text-orange-500 font-bold">{verifyEmail}</span></p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-white/20 ml-4">Код из письма</p>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="_ _ _ _ _ _"
                        value={verifyCode}
                        onChange={e => setVerifyCode(e.target.value.replace(/\D/g,''))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all text-center text-2xl font-black tracking-[0.5em]"
                      />
                    </div>
                    {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
                    <button
                      disabled={verifyCode.length < 6 || authLoading}
                      onClick={async () => {
                        setAuthLoading(true); setAuthError('');
                        try {
                          const res = await fetch('/api/auth/verify-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: verifyEmail, code: verifyCode }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setUser(data);
                            setIsAuthOpen(false);
                            setAuthStep('form');
                            addNotification('Добро пожаловать!');
                          } else {
                            setAuthError(data.error || 'Неверный код');
                          }
                        } catch { setAuthError('Сетевая ошибка'); }
                        finally { setAuthLoading(false); }
                      }}
                      className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl uppercase italic shadow-lg shadow-orange-500/20 disabled:opacity-40"
                    >
                      {authLoading ? 'Проверка...' : 'Подтвердить'}
                    </button>
                    <button onClick={() => { setAuthStep('form'); setVerifyCode(''); setAuthError(''); }} className="w-full text-white/40 text-xs font-bold uppercase tracking-widest">
                      Назад
                    </button>
                  </div>
                )}

                {/* STEP: Forgot password — enter email */}
                {authStep === 'forgot' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-black uppercase italic mb-1">Забыли пароль?</h3>
                      <p className="text-white/40 text-sm">Введите email — пришлём код для сброса</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-white/20 ml-4">Email</p>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                      />
                    </div>
                    {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
                    <button
                      disabled={!forgotEmail || authLoading}
                      onClick={async () => {
                        setAuthLoading(true); setAuthError('');
                        try {
                          const res = await fetch('/api/auth/forgot-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: forgotEmail }),
                          });
                          const data = await res.json();
                          if (res.ok) { setAuthStep('forgot-code'); }
                          else { setAuthError(data.error || 'Ошибка'); }
                        } catch { setAuthError('Сетевая ошибка'); }
                        finally { setAuthLoading(false); }
                      }}
                      className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl uppercase italic shadow-lg shadow-orange-500/20 disabled:opacity-40"
                    >
                      {authLoading ? 'Отправка...' : 'Отправить код'}
                    </button>
                    <button onClick={() => { setAuthStep('form'); setForgotEmail(''); setAuthError(''); }} className="w-full text-white/40 text-xs font-bold uppercase tracking-widest">
                      Назад
                    </button>
                  </div>
                )}

                {/* STEP: Forgot password — enter code */}
                {authStep === 'forgot-code' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-black uppercase italic mb-1">Введите код</h3>
                      <p className="text-white/40 text-sm">Код отправлен на <span className="text-orange-500 font-bold">{forgotEmail}</span></p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-white/20 ml-4">Код из письма</p>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="_ _ _ _ _ _"
                        value={forgotCode}
                        onChange={e => setForgotCode(e.target.value.replace(/\D/g,''))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all text-center text-2xl font-black tracking-[0.5em]"
                      />
                    </div>
                    {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
                    <button
                      disabled={forgotCode.length < 6 || authLoading}
                      onClick={() => { setAuthStep('forgot-pass'); setAuthError(''); }}
                      className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl uppercase italic shadow-lg shadow-orange-500/20 disabled:opacity-40"
                    >
                      Далее
                    </button>
                    <button onClick={() => { setAuthStep('forgot'); setForgotCode(''); setAuthError(''); }} className="w-full text-white/40 text-xs font-bold uppercase tracking-widest">
                      Назад
                    </button>
                  </div>
                )}

                {/* STEP: Forgot password — enter new password */}
                {authStep === 'forgot-pass' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-black uppercase italic mb-1">Новый пароль</h3>
                      <p className="text-white/40 text-sm">Придумайте новый пароль</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-white/20 ml-4">Новый пароль</p>
                      <input
                        type="password"
                        placeholder="Минимум 6 символов"
                        value={forgotNewPass}
                        onChange={e => setForgotNewPass(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                      />
                    </div>
                    {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
                    <button
                      disabled={forgotNewPass.length < 6 || authLoading}
                      onClick={async () => {
                        setAuthLoading(true); setAuthError('');
                        try {
                          const res = await fetch('/api/auth/reset-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: forgotEmail, code: forgotCode, newPassword: forgotNewPass }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setAuthStep('form');
                            setAuthMode('login');
                            setForgotEmail(''); setForgotCode(''); setForgotNewPass('');
                            addNotification('Пароль успешно изменён!');
                          } else {
                            setAuthError(data.error || 'Ошибка');
                          }
                        } catch { setAuthError('Сетевая ошибка'); }
                        finally { setAuthLoading(false); }
                      }}
                      className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl uppercase italic shadow-lg shadow-orange-500/20 disabled:opacity-40"
                    >
                      {authLoading ? 'Сохранение...' : 'Сохранить пароль'}
                    </button>
                    <button onClick={() => { setAuthStep('forgot-code'); setForgotNewPass(''); setAuthError(''); }} className="w-full text-white/40 text-xs font-bold uppercase tracking-widest">
                      Назад
                    </button>
                  </div>
                )}

                {/* STEP: Normal login/register form */}
                {authStep === 'form' && (
                  <>
                    <h3 className="text-2xl font-black uppercase italic mb-6">
                      {authMode === 'login' ? 'Вход' : 'Регистрация'}
                    </h3>
                    <form onSubmit={handleAuth} className="space-y-4">
                      {authMode === 'login' ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-white/20 ml-4">Телефон или Email</p>
                          <input
                            type="text"
                            placeholder="+7 (___) ___-__-__ или email@example.com"
                            value={authForm.phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^[\d+]/.test(val) && !val.includes('@')) {
                                setAuthForm({...authForm, phone: formatPhone(val)});
                              } else {
                                setAuthForm({...authForm, phone: val});
                              }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                            required
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-white/20 ml-4">Имя</p>
                            <input
                              type="text"
                              placeholder="Имя"
                              value={authForm.name}
                              onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-white/20 ml-4">Телефон</p>
                            <input
                              type="tel"
                              placeholder="+7 (___) ___-__-__"
                              value={authForm.phone}
                              onChange={(e) => setAuthForm({...authForm, phone: formatPhone(e.target.value)})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-white/20 ml-4">Email</p>
                            <input
                              type="email"
                              placeholder="email@example.com"
                              value={authForm.email}
                              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                              required
                            />
                          </div>
                        </div>
                      )}
                      <input
                        type="password"
                        placeholder="Пароль"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-orange-500 transition-all"
                        required
                      />
                      {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
                      <button disabled={authLoading} className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl uppercase italic shadow-lg shadow-orange-500/20 disabled:opacity-40">
                        {authLoading ? 'Загрузка...' : (authMode === 'login' ? 'Войти' : 'Создать аккаунт')}
                      </button>
                    </form>
                    {authMode === 'login' && (
                      <button
                        onClick={() => { setAuthStep('forgot'); setForgotEmail(''); setAuthError(''); }}
                        className="w-full mt-3 text-orange-500/60 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition-colors"
                      >
                        Забыли пароль?
                      </button>
                    )}
                    <button
                      onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
                      className="w-full mt-3 text-white/40 text-xs font-bold uppercase tracking-widest"
                    >
                      {authMode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}
                    </button>
                  </>
                )}
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
                      {Number(customizingItem.variant.price) + addedExtras.reduce((s, e) => s + Number(e.price), 0)} ₽
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
        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-white/5 px-6 flex items-center justify-between z-50 max-w-[500px] mx-auto">
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

        {/* Review Modal */}
        <AnimatePresence>
          {reviewModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-zinc-900 border border-white/10 p-8 rounded-[40px] w-full max-w-sm space-y-6"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black uppercase italic">Ваш отзыв</h3>
                  <p className="text-white/40 text-sm font-bold">Помогите нам стать лучше</p>
                </div>

                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                     <button
                      key={star}
                      onClick={() => setReviewModal({ ...reviewModal, rating: star })}
                      className="group"
                    >
                      <Heart className={cn(
                        "w-10 h-10 transition-all",
                        star <= reviewModal.rating ? "text-orange-500 fill-orange-500 scale-110" : "text-white/20 hover:text-orange-500/50"
                      )} />
                    </button>
                  ))}
                </div>

                <textarea
                  value={reviewModal.review}
                  onChange={(e) => setReviewModal({ ...reviewModal, review: e.target.value })}
                  placeholder="Что вам особенно понравилось?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold placeholder:text-white/20 outline-none focus:border-orange-500 transition-all min-h-[120px] resize-none text-white font-bold"
                />

                <div className="flex gap-4">
                  <button
                    onClick={() => setReviewModal(null)}
                    className="flex-1 bg-white/5 h-14 rounded-2xl font-black uppercase italic text-sm hover:bg-white/10 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={async () => {
                      await fetch(`/api/orders/${reviewModal.orderId}/review`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating: reviewModal.rating, review: reviewModal.review })
                      });
                      setReviewModal(null);
                      fetchUserOrders();
                      addNotification('Спасибо за ваш отзыв!', 'success');
                    }}
                    className="flex-[2] bg-orange-500 text-black h-14 rounded-2xl font-black uppercase italic text-sm shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Отправить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* News Modal */}
        <AnimatePresence>
          {openedNews && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-zinc-900 border border-white/10 rounded-[48px] w-full max-w-lg max-h-[90vh] flex flex-col relative overflow-hidden"
              >
                <button
                  onClick={() => setOpenedNews(null)}
                  className="absolute top-6 right-6 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white z-[110] hover:bg-white hover:text-black transition-all"
                >
                  <XCircle className="w-6 h-6" />
                </button>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <div className="h-64 relative">
                    <img src={openedNews.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent pointer-events-none" />
                  </div>

                  <div className="p-8 sm:p-10 space-y-6">
                    <div className="space-y-2">
                      <div className="inline-block bg-orange-500 text-black px-4 py-1.5 rounded-full text-xs font-black uppercase italic shadow-lg shadow-orange-500/20 mb-2">
                        {openedNews.type === 'promo' ? 'Акция' : 'Новость'}
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-black uppercase italic leading-none">{openedNews.title}</h2>
                    </div>
                    
                    <p className="text-white/60 font-bold leading-relaxed whitespace-pre-wrap">{openedNews.content}</p>

                    <div className="pt-6">
                      <button
                        onClick={() => setOpenedNews(null)}
                        className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl font-black uppercase italic text-lg hover:bg-white/10 transition-all font-bold"
                      >
                        Понятно
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Branch Selection Modal */}
        <AnimatePresence>
          {(isBranchModalOpen || ((selectedBranch === null || selectedCity === null) && !isSplashActive)) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className="bg-zinc-900 border border-white/10 p-6 sm:p-8 rounded-[40px] w-full max-w-sm space-y-6 max-h-[90vh] overflow-y-auto shrink-0"
              >
                {selectedCity === null ? (
                  <>
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black uppercase italic text-orange-500">Выберите город</h3>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-normal">Для отображения доступных филиалов «Безумно. Крутая. Шаурма»</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      {cities.map(city => (
                        <button
                          key={city.id}
                          onClick={() => {
                            setSelectedCity(city);
                            localStorage.setItem('selectedCity', JSON.stringify(city));
                          }}
                          className="w-full text-left p-5 rounded-3xl border border-white/10 bg-white/5 transition-all hover:border-orange-500/50 hover:bg-orange-500/5 flex justify-between items-center group"
                        >
                          <span className="font-black italic uppercase text-sm tracking-tight text-white group-hover:text-orange-500 transition-colors">
                            {city.name}
                          </span>
                          <span className="text-orange-500 font-black text-xs group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                      ))}
                      {cities.length === 0 && (
                        <div className="text-center py-6 text-white/20 text-xs font-bold uppercase tracking-wider">
                          Загрузка списка городов...
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black uppercase italic text-orange-500">Выберите филиал</h3>
                      <div className="flex items-center justify-center gap-1.5 bg-white/5 py-1 px-3 rounded-full w-fit mx-auto border border-white/5">
                        <span className="text-white/60 text-[9px] font-black uppercase tracking-wider">Город: {selectedCity.name}</span>
                        <button 
                          onClick={() => {
                            setSelectedCity(null);
                            setSelectedBranch(null);
                            localStorage.removeItem('selectedCity');
                            localStorage.removeItem('selectedBranch');
                          }}
                          className="text-orange-500 text-[9px] font-black uppercase tracking-wider hover:underline"
                        >
                          Сменить
                        </button>
                      </div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Где вы хотите забрать заказ?</p>
                    </div>

                    {/* 2GIS Map container */}
                    <div className="relative">
                      <div 
                        id="dg-map" 
                        className="w-full h-44 rounded-3xl bg-black/40 border border-white/5 overflow-hidden shadow-inner" 
                        style={{ minHeight: '176px' }}
                      />
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg pointer-events-none border border-white/10 flex items-center gap-1.5 z-10">
                        <Map className="w-3 h-3 text-orange-500" />
                        <span className="text-[9px] font-bold text-white/60 tracking-wider">2ГИС</span>
                      </div>
                    </div>

                    {/* Branches List */}
                    <div className="space-y-3">
                      {branches.filter(branch => branch.city_id === selectedCity.id).map(branch => {
                        const isSelected = selectedBranch?.id === branch.id;
                        return (
                          <button
                            key={branch.id}
                            onClick={() => selectBranch(branch)}
                            className={cn(
                              "w-full text-left p-4 rounded-3xl border transition-all flex flex-col gap-1 hover:border-orange-500/50 hover:bg-white/5",
                              isSelected 
                                ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/5" 
                                : "border-white/10 bg-white/5"
                            )}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-black italic uppercase text-sm tracking-tight text-white flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                                {branch.address}
                              </span>
                              <span className={cn(
                                "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider",
                                branch.is_24_7 
                                  ? "bg-emerald-500/20 text-emerald-400" 
                                  : "bg-amber-500/20 text-amber-400"
                              )}>
                                <span className={cn("w-1 h-1 rounded-full animate-pulse", branch.is_24_7 ? "bg-emerald-400" : "bg-amber-400")} />
                                {branch.is_24_7 ? '24/7' : 'до 23:00'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {branches.filter(branch => branch.city_id === selectedCity.id).length === 0 && (
                        <div className="text-center py-6 text-white/20 text-xs font-bold uppercase tracking-wider">
                          В этом городе пока нет филиалов...
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Only display close button if we already have a branch selected */}
                {selectedBranch && selectedCity && (
                  <button
                    onClick={() => setIsBranchModalOpen(false)}
                    className="w-full h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase italic text-sm transition-all text-white font-bold"
                  >
                    Закрыть
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-950 border border-white/10 p-6 sm:p-8 rounded-[32px] w-full max-w-sm text-center space-y-6 text-white font-bold"
              >
                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase italic text-orange-500">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-white/60 font-medium leading-relaxed font-sans">
                    {confirmModal.message}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl text-xs font-black uppercase italic transition-all active:scale-95 text-white font-bold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                    className="flex-1 bg-[#ef4444] hover:bg-red-500 py-3 rounded-xl text-xs font-black uppercase italic transition-all active:scale-95 text-black font-bold"
                  >
                    Подтвердить
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingPlategaPayment && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-950 border border-white/10 p-6 sm:p-8 rounded-[32px] w-full max-w-sm text-center space-y-6 text-white font-bold"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black uppercase italic text-orange-500">
                    Оплата заказа #{pendingPlategaPayment.orderId}
                  </h3>
                  <p className="text-2xl font-black text-white italic">
                    {pendingPlategaPayment.total} ₽
                  </p>
                  <p className="text-xs text-white/60 font-medium leading-relaxed font-sans">
                    Для завершения оформления отсканируйте QR-код через приложение вашего банка (СБП). После успешной оплаты статус обновится автоматически.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={pendingPlategaPayment.redirect}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black py-3 rounded-xl text-xs font-black uppercase italic transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                  >
                    <QrCode className="w-4 h-4" /> Оплатить по СБП (Платёга)
                  </a>

                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/orders/${pendingPlategaPayment.orderId}/simulate-pay`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        if (response.ok) {
                          addNotification('Оплата успешно симулирована!', 'success');
                          fetchUserOrders();
                          fetchOrders();
                          setPendingPlategaPayment(null);
                          setActiveTab('profile');
                        } else {
                          addNotification('Ошибка симуляции оплаты', 'info');
                        }
                      } catch (error) {
                        addNotification('Ошибка подключения к серверу', 'info');
                      }
                    }}
                    className="w-full bg-[#18181b] hover:bg-zinc-800 border border-orange-500/20 text-orange-400 hover:text-orange-300 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> Симулировать оплату (Dev)
                  </button>

                  <button
                    onClick={() => setPendingPlategaPayment(null)}
                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl text-xs font-black uppercase italic transition-all active:scale-95 text-white/60 hover:text-white font-bold"
                  >
                    Закрыть окно
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="w-full border-t border-white/5 py-4 px-4 text-center text-[10px] text-white/30 font-sans space-x-3">
          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="hover:text-white/60 transition-colors underline underline-offset-2"
          >
            Политика конфиденциальности
          </button>
          <span>·</span>
          <button
            onClick={() => setShowDataPolicy(true)}
            className="hover:text-white/60 transition-colors underline underline-offset-2"
          >
            Политика обработки данных
          </button>
        </footer>

        {/* Support Modal */}
        <AnimatePresence>
          {showSupportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
              onClick={() => setShowSupportModal(false)}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-[#111] border border-white/10 rounded-[32px] w-full max-w-md p-6 space-y-5"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase italic">Поддержка</h3>
                  <button onClick={() => setShowSupportModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {supportStatus === 'sent' ? (
                  <div className="text-center py-8 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                    <p className="text-lg font-black uppercase italic text-green-500">Заявка отправлена!</p>
                    <p className="text-white/40 text-sm">Мы свяжемся с вами в ближайшее время</p>
                    <button onClick={() => setShowSupportModal(false)} className="mt-4 px-6 py-2.5 bg-orange-500 text-black text-xs font-black uppercase rounded-2xl">
                      Закрыть
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Тема обращения</label>
                      <button
                        type="button"
                        onClick={() => setShowSubjectDropdown((v: boolean) => !v)}
                        className={`w-full bg-white/5 border rounded-2xl px-4 py-3 text-sm font-bold text-left flex items-center justify-between transition-colors ${showSubjectDropdown ? 'border-orange-500/50' : 'border-white/10'}`}
                      >
                        <span className={supportForm.subject ? 'text-white' : 'text-white/30'}>
                          {supportForm.subject || 'Выберите тему...'}
                        </span>
                        <span className={`text-[10px] text-white/40 transition-transform duration-200 ${showSubjectDropdown ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                      <AnimatePresence>
                        {showSubjectDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden z-10 shadow-xl"
                          >
                            {[
                              'Проблема с заказом',
                              'Вопрос по оплате',
                              'Качество блюд',
                              'Доставка',
                              'Бонусы и промокоды',
                              'Другое',
                            ].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => { setSupportForm((f: {subject: string; message: string}) => ({ ...f, subject: opt })); setShowSubjectDropdown(false); }}
                                className={`w-full px-4 py-3 text-sm font-bold text-left transition-colors hover:bg-white/10 ${supportForm.subject === opt ? 'text-orange-500 bg-orange-500/10' : 'text-white'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Сообщение</label>
                      <textarea
                        rows={4}
                        placeholder="Опишите вашу проблему или вопрос..."
                        value={supportForm.message}
                        onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold resize-none focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-white/20"
                      />
                    </div>

                    {supportStatus === 'error' && (
                      <p className="text-red-500 text-xs font-bold">Не удалось отправить. Попробуйте позже.</p>
                    )}

                    <button
                      disabled={supportStatus === 'sending' || !supportForm.subject || !supportForm.message.trim()}
                      onClick={async () => {
                        setSupportStatus('sending');
                        try {
                          const r = await fetch('/api/support', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: user?.name,
                              phone: user?.phone,
                              email: user?.email,
                              subject: supportForm.subject,
                              message: supportForm.message,
                            }),
                          });
                          if (r.ok) setSupportStatus('sent');
                          else setSupportStatus('error');
                        } catch {
                          setSupportStatus('error');
                        }
                      }}
                      className="w-full py-4 bg-orange-500 text-black font-black uppercase rounded-2xl text-sm tracking-wide disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                    >
                      {supportStatus === 'sending' ? 'Отправка...' : 'Отправить заявку'}
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Policy Modal */}
        <AnimatePresence>
          {showPrivacyPolicy && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-950 border border-white/10 rounded-[24px] w-full max-w-lg max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-sm font-black uppercase italic text-orange-500">Политика конфиденциальности</h2>
                  <button onClick={() => setShowPrivacyPolicy(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto p-6 text-[11px] text-white/70 font-sans leading-relaxed space-y-4">
                  <p className="text-white/40 text-[10px]">Дата вступления в силу: 09.06.2026</p>
                  <p>Настоящая Политика конфиденциальности (далее — «Политика») описывает, как приложение «Безумно Крутая Шаурма» (далее — «Приложение», «мы») собирает, использует и защищает персональные данные пользователей.</p>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">1. Какие данные мы собираем</h3>
                  <p>При регистрации и использовании Приложения мы можем собирать следующие данные:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Имя и фамилия</li>
                    <li>Номер телефона</li>
                    <li>Адрес электронной почты</li>
                    <li>История заказов (состав, сумма, дата, филиал)</li>
                    <li>Данные платёжных транзакций (идентификатор транзакции, статус оплаты — без данных карты)</li>
                  </ul>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">2. Цели использования данных</h3>
                  <p>Собранные данные используются исключительно для:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Оформления и доставки заказов</li>
                    <li>Начисления и списания бонусных баллов</li>
                    <li>Обратной связи и поддержки пользователей</li>
                    <li>Обработки платежей через сервис Платёга (СБП)</li>
                    <li>Улучшения качества сервиса</li>
                  </ul>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">3. Передача данных третьим лицам</h3>
                  <p>Мы не продаём и не передаём ваши персональные данные третьим лицам, за исключением случаев, необходимых для исполнения заказа (платёжный сервис Платёга) или требований законодательства Российской Федерации.</p>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">4. Хранение данных</h3>
                  <p>Данные хранятся на защищённых серверах. Срок хранения персональных данных — не более 5 лет с момента последнего использования Приложения, если иное не предусмотрено законодательством.</p>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">5. Права пользователя</h3>
                  <p>В соответствии с Федеральным законом № 152-ФЗ «О персональных данных» вы вправе:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Получить информацию об обрабатываемых персональных данных</li>
                    <li>Потребовать исправления неточных данных</li>
                    <li>Потребовать удаления данных</li>
                    <li>Отозвать согласие на обработку персональных данных</li>
                  </ul>
                  <p>Для реализации прав обратитесь к нам по контактам, указанным в Приложении.</p>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">6. Изменения политики</h3>
                  <p>Мы оставляем за собой право изменять настоящую Политику. Актуальная версия всегда доступна в Приложении.</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Data Processing Policy Modal */}
        <AnimatePresence>
          {showDataPolicy && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-950 border border-white/10 rounded-[24px] w-full max-w-lg max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-sm font-black uppercase italic text-orange-500">Политика обработки персональных данных</h2>
                  <button onClick={() => setShowDataPolicy(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto p-6 text-[11px] text-white/70 font-sans leading-relaxed space-y-4">
                  <p className="text-white/40 text-[10px]">Дата вступления в силу: 09.06.2026</p>
                  <p>Настоящая Политика обработки персональных данных (далее — «Политика») разработана в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных пользователей приложения «Безумно Крутая Шаурма».</p>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">1. Оператор персональных данных</h3>
                  <p>Оператором персональных данных является владелец приложения «Безумно Крутая Шаурма». Контактные данные оператора размещены в разделе «Контакты» Приложения.</p>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">2. Категории субъектов и перечень данных</h3>
                  <p>Обрабатываются данные физических лиц — пользователей Приложения. Перечень обрабатываемых данных:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Фамилия, имя</li>
                    <li>Номер телефона</li>
                    <li>Адрес электронной почты</li>
                    <li>Данные об оформленных заказах</li>
                    <li>Технические данные устройства (в обезличенном виде)</li>
                  </ul>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">3. Правовые основания обработки</h3>
                  <p>Обработка персональных данных осуществляется на основании:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Согласия субъекта персональных данных (ст. 6 ч. 1 п. 1 ФЗ-152)</li>
                    <li>Исполнения договора, стороной которого является субъект (ст. 6 ч. 1 п. 5 ФЗ-152)</li>
                  </ul>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">4. Цели обработки</h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Идентификация пользователя в Приложении</li>
                    <li>Обработка и исполнение заказов</li>
                    <li>Расчёт и начисление бонусных баллов</li>
                    <li>Проведение платёжных операций через СБП (Платёга)</li>
                    <li>Направление уведомлений о статусе заказа</li>
                    <li>Улучшение функциональности Приложения</li>
                  </ul>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">5. Способы обработки</h3>
                  <p>Обработка персональных данных осуществляется автоматизированным способом с использованием средств вычислительной техники. Передача данных по сети осуществляется по защищённому протоколу HTTPS.</p>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">6. Хранение и уничтожение данных</h3>
                  <p>Персональные данные хранятся не дольше, чем этого требуют цели обработки. После достижения целей обработки или по истечении установленных сроков данные подлежат уничтожению или обезличиванию. Срок хранения — не более 5 лет.</p>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">7. Права субъекта персональных данных</h3>
                  <p>Субъект персональных данных имеет право:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Получать информацию об обработке своих данных</li>
                    <li>Требовать уточнения, блокирования или уничтожения данных</li>
                    <li>Отозвать согласие на обработку данных</li>
                    <li>Обжаловать действия оператора в уполномоченном органе (Роскомнадзор)</li>
                  </ul>
                  <h3 className="text-white/90 font-black uppercase text-[10px] tracking-wider pt-2">8. Меры защиты данных</h3>
                  <p>Оператор принимает необходимые технические и организационные меры для защиты персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения.</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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

function AdminPanel({ orders, user, menu, news, promoCodes, onUpdateStatus, onUpdateMenu, onUpdateNews, onUpdatePromo, confirmAction, onUpdateCities, onUpdateBranches, addNotification }: { 
  orders: Order[], 
  user: User | null,
  menu: MenuItem[],
  news: NewsItem[],
  promoCodes: PromoCode[],
  onUpdateStatus: () => void,
  onUpdateMenu: () => void,
  onUpdateNews: () => void,
  onUpdatePromo: () => void,
  confirmAction: (title: string, message: string, onConfirm: () => void) => void,
  onUpdateCities?: () => void,
  onUpdateBranches?: () => void,
  addNotification?: (msg: string, type?: 'success' | 'info') => void
}) {
  const [adminTab, setAdminTab] = useState<'orders' | 'menu' | 'reviews' | 'news' | 'branches' | 'stock'>('orders');
  const [adminBranchFilter, setAdminBranchFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ avg_day: number; avg_week: number; avg_month: number; total_reviews: number } | null>(null);

  // Custom states for Cities, Branches & Stock management inside AdminPanel
  const [adminCities, setAdminCities] = useState<any[]>([]);
  const [adminBranches, setAdminBranches] = useState<any[]>([]);
  const [adminStocks, setAdminStocks] = useState<any[]>([]);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', address: '', is_24_7: true, latitude: '56.0153', longitude: '92.8932', city_id: '' });
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [stockBranchFilter, setStockBranchFilter] = useState<string>('all');
  const [adminSelectedCityId, setAdminSelectedCityId] = useState<number | null>(null);

  const handleDeleteCity = (cityId: number) => {
    const city = adminCities.find(c => c.id === cityId);
    if (!city) return;
    
    // Count dependencies (how many branches belong to this city)
    const branchesInCity = adminBranches.filter(b => b.city_id === cityId);
    const branchesCount = branchesInCity.length;
    
    const warningText = branchesCount > 0 
      ? `ВНИМАНИЕ! В городе «${city.name}» настроено филиалов: ${branchesCount}. Если вы удалите этот город, все эти филиалы также будут БЕЗВОЗВРАТНО УДАЛЕНЫ! Вы уверены, что хотите продолжить?`
      : `Вы действительно хотите удалить город «${city.name}»?`;

    confirmAction(
      'Удаление города',
      warningText,
      async () => {
        try {
          const res = await fetch(`/api/admin/cities/${cityId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            if (addNotification) {
              addNotification(`Город «${city.name}» успешно удален!`, 'success');
            } else {
              alert(`Город «${city.name}» успешно удален!`);
            }
            // Refresh cities and branches in admin view
            await fetchAdminCities();
            await fetchAdminBranches();
            // Also update parent cities
            if (onUpdateCities) onUpdateCities();
            if (onUpdateBranches) onUpdateBranches();
          } else {
            const data = await res.json().catch(() => ({}));
            if (addNotification) {
              addNotification(data.error || 'Не удалось удалить город', 'info');
            } else {
              alert(data.error || 'Не удалось удалить город');
            }
          }
        } catch (err) {
          console.error(err);
          if (addNotification) {
            addNotification('Ошибка при удалении города', 'info');
          } else {
            alert('Ошибка при удалении города');
          }
        }
      }
    );
  };

  useEffect(() => {
    fetchAdminBranches();
    fetchAdminCities();
  }, []);

  useEffect(() => {
    if (adminTab === 'branches') {
      fetchAdminBranches();
      fetchAdminCities();
    }
    if (adminTab === 'stock') {
      fetchAdminStocks();
      fetchAdminBranches();
    }
  }, [adminTab]);

  const adminMapRef = React.useRef<any>(null);
  const activeMarkerRef = React.useRef<any>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isCreatingNewCity, setIsCreatingNewCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');

  // Interactive mini-map for adding/editing a branch
  useEffect(() => {
    if (!isAddingBranch && !editingBranch) return;

    let adminMapInstance: any = null;
    let activeMarker: any = null;

    const initAdminMap = () => {
      const DG = (window as any).DG;
      if (!DG || !DG.map) return;

      const container = document.getElementById('admin-branch-map');
      if (!container) return;

      try {
        let initialLat = 56.0153;
        let initialLng = 92.8932;

        if (editingBranch) {
          initialLat = Number(editingBranch.latitude) || 56.0153;
          initialLng = Number(editingBranch.longitude) || 92.8932;
        } else if (newBranch.latitude && newBranch.longitude) {
          initialLat = Number(newBranch.latitude) || 56.0153;
          initialLng = Number(newBranch.longitude) || 92.8932;
        }

        adminMapInstance = DG.map('admin-branch-map', {
          center: [initialLat, initialLng],
          zoom: 12,
          fullscreenControl: false,
          zoomControl: true
        });
        adminMapRef.current = adminMapInstance;

        activeMarker = DG.marker([initialLat, initialLng]).addTo(adminMapInstance);
        activeMarkerRef.current = activeMarker;

        adminMapInstance.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          if (activeMarker) {
            activeMarker.setLatLng([lat, lng]);
          } else {
            activeMarker = DG.marker([lat, lng]).addTo(adminMapInstance);
            activeMarkerRef.current = activeMarker;
          }

          if (editingBranch) {
            setEditingBranch((prev: any) => ({
              ...prev,
              latitude: lat.toFixed(6),
              longitude: lng.toFixed(6)
            }));
          } else {
            setNewBranch((prev: any) => ({
              ...prev,
              latitude: lat.toFixed(6),
              longitude: lng.toFixed(6)
            }));
          }

          // Reverse geocode to get structural address!
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ru`, {
              headers: { 'User-Agent': 'ShawarmaBranchLocatorApp/1.0' }
            });
            if (response.ok) {
              const data = await response.json();
              if (data && data.address) {
                const addr = data.address;
                const roadPart = addr.road || '';
                const housePart = addr.house_number || '';
                let resolvedAddr = '';
                
                if (roadPart) {
                  resolvedAddr = roadPart;
                  if (housePart) {
                    resolvedAddr += ', ' + housePart;
                  }
                } else if (data.display_name) {
                  const rawParts = data.display_name.split(',');
                  const filteredParts = rawParts.filter((p: string) => {
                    const cleanP = p.trim().toLowerCase();
                    return !adminCities.some((c: any) => cleanP.includes(c.name.toLowerCase()));
                  });
                  resolvedAddr = filteredParts.slice(0, 2).join(', ').trim() || data.display_name;
                }

                if (editingBranch) {
                  setEditingBranch((prev: any) => ({
                    ...prev,
                    address: resolvedAddr
                  }));
                } else {
                  setNewBranch((prev: any) => ({
                    ...prev,
                    address: resolvedAddr
                  }));
                }
              }
            } else {
              throw new Error('Response code ' + response.status);
            }
          } catch (err: any) {
            console.error('Error reverse geocoding clicked point:', err);
            alert(`Не удалось автоматически определить адрес для выбранной точки (Ошибка: ${err.message || 'Ошибка сети/CORS'}). Вы можете ввести адрес вручную в текстовое поле.`);
          }
        });
      } catch (err) {
        console.error('Error during admin map creation:', err);
      }
    };

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if ((window as any).DG && document.getElementById('admin-branch-map')) {
          clearInterval(interval);
          initAdminMap();
        }
      }, 100);
      return () => clearInterval(interval);
    }, 150);

    return () => {
      clearTimeout(timer);
      if (adminMapInstance && typeof adminMapInstance.destroy === 'function') {
        try {
          adminMapInstance.destroy();
        } catch (e) {
          console.error('Error destroying admin map:', e);
        }
      }
      adminMapRef.current = null;
      activeMarkerRef.current = null;
    };
  }, [isAddingBranch, editingBranch]);

  const fetchAdminCities = async () => {
    try {
      const res = await fetch('/api/cities?t=' + Date.now());
      if (res.ok) setAdminCities(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeocode = async (addressStr: string) => {
    if (!addressStr || !addressStr.trim()) {
      alert('Пожалуйста, введите адрес');
      return;
    }

    // Find selected city name from adminCities
    const cityId = editingBranch ? editingBranch.city_id : newBranch.city_id;
    const selectedCityObj = adminCities.find(c => String(c.id) === String(cityId));
    const cityName = selectedCityObj ? selectedCityObj.name : '';
    
    // Search within context of selected city behind the scenes (do not append to input field)
    const searchQuery = cityName ? `${cityName}, ${addressStr}` : addressStr;

    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=ru&limit=1`, {
        headers: { 'User-Agent': 'ShawarmaBranchLocatorApp/1.0' }
      });
      if (!response.ok) throw new Error('Geocoding response failed');
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        // Update states
        if (editingBranch) {
          setEditingBranch((prev: any) => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lon.toFixed(6)
          }));
        } else {
          setNewBranch((prev: any) => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lon.toFixed(6)
          }));
        }

        // If marker & map refs exist, set center
        if (activeMarkerRef.current) {
          activeMarkerRef.current.setLatLng([lat, lon]);
        }
        if (adminMapRef.current) {
          adminMapRef.current.setView([lat, lon], 16);
        }
      } else {
        alert('Адрес не найден на карте! Пожалуйста, проверьте правильность написания.');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при поиске адреса. Пожалуйста, попробуйте позже.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleAddCityInline = async () => {
    const trimmedName = newCityName.trim();
    if (!trimmedName) {
      alert('Пожалуйста, введите название города');
      return;
    }
    
    // Check duplication check locally of current cities list
    const isDuplicate = adminCities.some(
      (city: any) => city.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      alert('Этот город уже есть в списке!');
      setNewCityName('');
      setIsCreatingNewCity(false);
      return;
    }

    setIsGeocoding(true);
    try {
      // Find coordinates of this city on the map to validate it exists and save centering coordinates!
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedName)}&accept-language=ru&limit=1`, {
        headers: { 'User-Agent': 'ShawarmaBranchLocatorApp/1.0' }
      });
      if (!response.ok) throw new Error('Geocoding search failed');
      const data = await response.json();
      
      if (!data || data.length === 0) {
        alert(`Город "${trimmedName}" не найден на карте! Пожалуйста, проверьте правильность написания.`);
        setIsGeocoding(false);
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      const res = await fetch('/api/admin/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, latitude: lat, longitude: lon })
      });
      if (res.ok) {
        const resultData = await res.json();
        const cityId = resultData.id;
        
        // Refresh cities fetch
        await fetchAdminCities();
        if (onUpdateCities) {
          onUpdateCities();
        }
        
        // Select this city in form
        if (editingBranch) {
          setEditingBranch((prev: any) => ({
            ...prev,
            city_id: cityId.toString()
          }));
        } else {
          setNewBranch((prev: any) => ({
            ...prev,
            city_id: cityId.toString()
          }));
        }
        
        setIsCreatingNewCity(false);
        setNewCityName('');
        alert(`Город "${trimmedName}" успешно верифицирован и добавлен!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Не удалось добавить новый город');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Ошибка при добавлении города: ${err.message || err}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const fetchAdminBranches = async () => {
    try {
      const res = await fetch('/api/branches?t=' + Date.now());
      if (res.ok) setAdminBranches(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminStocks = async () => {
    try {
      const res = await fetch('/api/admin/stock?t=' + Date.now());
      if (res.ok) setAdminStocks(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBranch.name,
          address: newBranch.address,
          is_24_7: newBranch.is_24_7,
          latitude: parseFloat(newBranch.latitude),
          longitude: parseFloat(newBranch.longitude),
          city_id: newBranch.city_id ? parseInt(newBranch.city_id) : null
        })
      });
      if (res.ok) {
        setIsAddingBranch(false);
        setNewBranch({ name: '', address: '', is_24_7: true, latitude: '56.0153', longitude: '92.8932', city_id: '' });
        fetchAdminBranches();
        alert('Филиал успешно добавлен!');
      } else {
        alert('Ошибка при добавлении филиала');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    try {
      const res = await fetch(`/api/admin/branches/${editingBranch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingBranch.name,
          address: editingBranch.address,
          is_24_7: editingBranch.is_24_7,
          latitude: parseFloat(editingBranch.latitude),
          longitude: parseFloat(editingBranch.longitude),
          city_id: editingBranch.city_id ? parseInt(editingBranch.city_id) : null
        })
      });
      if (res.ok) {
        setEditingBranch(null);
        fetchAdminBranches();
        alert('Филиал успешно обновлен!');
      } else {
        alert('Ошибка при обновлении филиала');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBranch = async (id: number) => {
    confirmAction(
      'Удаление филиала',
      'Вы действительно хотите удалить этот филиал?',
      async () => {
        try {
          const res = await fetch(`/api/admin/branches/${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchAdminBranches();
            alert('Филиал удален');
          } else {
            alert('Не удалось удалить филиал');
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const handleUpdateStock = async (branch_id: number, variant_id: number, stock: number) => {
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id, variant_id, stock })
      });
      if (res.ok) {
        setAdminStocks(prev => prev.map(s => 
          (s.branch_id === branch_id && s.variant_id === variant_id) ? { ...s, stock } : s
        ));
        if (typeof onUpdateMenu === 'function') {
          onUpdateMenu();
        }
      } else {
        alert('Ошибка при сохранении количества');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (adminTab === 'reviews') {
      fetchReviewStats();
    }
  }, [adminTab, adminBranchFilter]);

  const fetchReviewStats = async () => {
    try {
      const url = adminBranchFilter === 'all' 
        ? '/api/admin/stats/reviews?t=' + Date.now() 
        : `/api/admin/stats/reviews?branch_id=${adminBranchFilter}&t=` + Date.now();
      const res = await fetch(url);
      if (res.ok) setReviewStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch review stats');
    }
  };
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [newItem, setNewItem] = useState({ name: '', description: '', category_id: '', image_url: '' });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newNews, setNewNews] = useState({ title: '', content: '', image_url: '', type: 'news', branch_id: '' });
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newVariant, setNewVariant] = useState({ size_label: '', price: '' });
  const [variantsToAdd, setVariantsToAdd] = useState<{ size_label: string, price: number }[]>([]);
  const [newPromo, setNewPromo] = useState({ code: '', discount_percent: '', min_order_amount: '', usage_limit: '', branch_id: '' });

  useEffect(() => {
    if (adminTab === 'menu') {
      fetchCategories();
    }
  }, [adminTab]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error('Failed to fetch categories');
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
          min_order_amount: parseFloat(newPromo.min_order_amount),
          usage_limit: newPromo.usage_limit ? parseInt(newPromo.usage_limit) : null,
          branch_id: newPromo.branch_id ? parseInt(newPromo.branch_id) : null
        })
      });
      if (res.ok) {
        setNewPromo({ code: '', discount_percent: '', min_order_amount: '', usage_limit: '', branch_id: '' });
        onUpdatePromo();
        // Notification could be used here if passed as prop, but let's stick to simple alert for admin
        alert('Промокод добавлен!');
      } else {
        const data = await res.json();
        alert('Ошибка: ' + (data.error || 'Не удалось добавить промокод'));
      }
    } catch (err) {
      alert('Ошибка при добавлении промокода');
    }
  };

  const deletePromo = async (id: number) => {
    if (!window.confirm('Удалить этот промокод?')) return;
    try {
      const res = await fetch(`/api/admin/promo/${id}`, { method: 'DELETE' });
      if (res.ok) onUpdatePromo();
    } catch (err) {
      alert('Ошибка удаления');
    }
  };

  const togglePromoStatus = async (promo: PromoCode) => {
    try {
      const res = await fetch(`/api/admin/promo/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...promo, is_active: !promo.is_active })
      });
      if (res.ok) onUpdatePromo();
    } catch (err) {
      alert('Ошибка обновления');
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
    if (variantsToAdd.length === 0) {
      alert('Добавьте хотя бы один вариант (размер/цена)');
      return;
    }
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newItem, 
          category_id: parseInt(newItem.category_id),
          variants: variantsToAdd 
        })
      });
      if (res.ok) {
        setNewItem({ name: '', description: '', category_id: '', image_url: '' });
        setVariantsToAdd([]);
        setIsAddingItem(false);
        onUpdateMenu();
        alert('Блюдо добавлено!');
      }
    } catch (err) {
      alert('Ошибка при добавлении блюда');
    }
  };

  const addNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newNews,
          branch_id: newNews.branch_id ? parseInt(newNews.branch_id) : null
        })
      });
      if (res.ok) {
        setNewNews({ title: '', content: '', image_url: '', type: 'news', branch_id: '' });
        setIsAddingNews(false);
        onUpdateNews();
        alert('Новость добавлена!');
      }
    } catch (err) {
      alert('Ошибка при добавлении новости');
    }
  };

  const updateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews) return;
    try {
      const res = await fetch(`/api/admin/news/${editingNews.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingNews)
      });
      if (res.ok) {
        setEditingNews(null);
        onUpdateNews();
        alert('Новость обновлена!');
      }
    } catch (err) {
      alert('Ошибка при обновлении новости');
    }
  };

  const deleteNews = async (id: number) => {
    if (!window.confirm('Удалить эту новость?')) return;
    try {
      await fetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      onUpdateNews();
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const updateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/admin/menu/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editingItem.name,
          description: editingItem.description,
          image_url: editingItem.image_url,
          is_available: editingItem.is_available
        })
      });
      if (res.ok) {
        setEditingItem(null);
        onUpdateMenu();
        alert('Блюдо обновлено!');
      }
    } catch (err) {
      alert('Ошибка при обновлении блюда');
    }
  };

  const addVariant = () => {
    if (!newVariant.size_label || !newVariant.price) return;
    setVariantsToAdd([...variantsToAdd, { size_label: newVariant.size_label, price: parseFloat(newVariant.price) }]);
    setNewVariant({ size_label: '', price: '' });
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

  const handleDeleteOrderAdmin = async (id: number) => {
    confirmAction(
      'Удаление заказа',
      'Вы уверены, что хотите удалить этот заказ безвозвратно?',
      async () => {
        try {
          const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
          if (res.ok) {
            alert('Заказ успешно удален!');
            onUpdateStatus(); // Refresh parent orders
          } else {
            alert('Ошибка при удалении заказа');
          }
        } catch (err) {
          console.error(err);
          alert('Ошибка при удалении заказа');
        }
      }
    );
  };

  const handleDeleteReviewAdmin = async (id: number) => {
    confirmAction(
      'Удаление отзыва',
      'Вы уверены, что хотите удалить отзыв к этому заказу?',
      async () => {
        try {
          const res = await fetch(`/api/orders/${id}/review`, { method: 'DELETE' });
          if (res.ok) {
            alert('Отзыв успешно удален!');
            onUpdateStatus(); // Refresh parent orders
            fetchReviewStats(); // Refresh reviews summary stats
          } else {
            alert('Ошибка при удалении отзыва');
          }
        } catch (err) {
          console.error(err);
          alert('Ошибка при удалении отзыва');
        }
      }
    );
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

  const filteredOrders = adminBranchFilter === 'all' ? orders : orders.filter(o => o.branch_id === parseInt(adminBranchFilter));
  const ordersWithReviews = filteredOrders.filter(o => o.rating);
  const filteredNews = adminBranchFilter === 'all' ? news : news.filter(n => n.branch_id === parseInt(adminBranchFilter) || n.branch_id === null);
  const filteredPromos = adminBranchFilter === 'all' ? promoCodes : promoCodes.filter(p => p.branch_id === parseInt(adminBranchFilter) || p.branch_id === null);

  return (
    <div className="space-y-6 pb-20">
      {/* Branch filtering Toolbar */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black uppercase text-orange-500 italic tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Управление филиалом
          </h4>
          <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Фильтрация заказов, новостей, акций, промокодов и отзывов</p>
        </div>
        <CustomSelect
          value={adminBranchFilter}
          onChange={setAdminBranchFilter}
          options={[{value:'all',label:'Все филиалы (Показать всё)'}, ...adminBranches.map(b=>({value:String(b.id),label:`${b.address} (${b.city_name||'Неизвестно'})`}))]}
          className="min-w-[220px]"
        />
      </div>

      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto gap-1 no-scrollbar">
        <button 
          onClick={() => setAdminTab('orders')}
          className={cn(
            "px-4 py-3 rounded-xl font-bold text-xs uppercase italic transition-all whitespace-nowrap shrink-0",
            adminTab === 'orders' ? "bg-orange-500 text-black" : "text-white/40"
          )}
        >
          Заказы
        </button>
        <button 
          onClick={() => setAdminTab('menu')}
          className={cn(
            "px-4 py-3 rounded-xl font-bold text-xs uppercase italic transition-all whitespace-nowrap shrink-0",
            adminTab === 'menu' ? "bg-orange-500 text-black" : "text-white/40"
          )}
        >
          Меню
        </button>
        <button 
          onClick={() => setAdminTab('reviews')}
          className={cn(
            "px-4 py-3 rounded-xl font-bold text-xs uppercase italic transition-all whitespace-nowrap shrink-0",
            adminTab === 'reviews' ? "bg-orange-500 text-black" : "text-white/40"
          )}
        >
          Отзывы
        </button>
        <button 
          onClick={() => setAdminTab('news')}
          className={cn(
            "px-4 py-3 rounded-xl font-bold text-xs uppercase italic transition-all whitespace-nowrap shrink-0",
            adminTab === 'news' ? "bg-orange-500 text-black" : "text-white/40"
          )}
        >
          Новости
        </button>
        <button 
          onClick={() => setAdminTab('branches')}
          className={cn(
            "px-4 py-3 rounded-xl font-bold text-xs uppercase italic transition-all whitespace-nowrap shrink-0",
            adminTab === 'branches' ? "bg-orange-500 text-black" : "text-white/40"
          )}
        >
          Филиалы
        </button>
        <button 
          onClick={() => setAdminTab('stock')}
          className={cn(
            "px-4 py-3 rounded-xl font-bold text-xs uppercase italic transition-all whitespace-nowrap shrink-0",
            adminTab === 'stock' ? "bg-orange-500 text-black" : "text-white/40"
          )}
        >
          Склад
        </button>
      </div>

      {adminTab === 'orders' && (
        <div className="space-y-4">
          {filteredOrders.map(order => (
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
                <div className="flex-1 bg-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-white/10 shadow-inner group hover:border-orange-500/50 transition-all relative">
                  {getStatusIcon(order.status)}
                  <CustomSelect
                    value={order.status}
                    onChange={(v) => updateStatus(order.id, v)}
                    options={[
                      {value:'pending',label:'Ожидает'},
                      {value:'preparing',label:'Готовится'},
                      {value:'ready',label:'Готов'},
                      {value:'delivered',label:'Доставлен'},
                      {value:'cancelled',label:'Отменен'},
                    ]}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => handleDeleteOrderAdmin(order.id)}
                  className="bg-red-500/10 hover:bg-red-500 hover:text-black border border-red-500/20 rounded-xl px-3.5 py-2.5 text-[10px] font-black uppercase text-red-500 transition-all flex items-center gap-1 shrink-0 active:scale-95"
                  title="Удалить заказ полностью"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adminTab === 'news' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase italic">Новости и Акции</h3>
            <button 
              onClick={() => setIsAddingNews(!isAddingNews)}
              className="p-2 bg-orange-500 text-black rounded-xl active:scale-90 transition-all"
            >
              {isAddingNews ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>

          <AnimatePresence>
            {isAddingNews && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={addNews} 
                className="bg-white/5 p-6 rounded-[32px] border border-white/10 space-y-4 overflow-hidden"
              >
                <input 
                  type="text" 
                  placeholder="Заголовок"
                  value={newNews.title}
                  onChange={(e) => setNewNews({...newNews, title: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                  required
                />
                <textarea 
                  placeholder="Текст новости"
                  value={newNews.content}
                  onChange={(e) => setNewNews({...newNews, content: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500 min-h-[80px]"
                  required
                />
                <input 
                  type="url" 
                  placeholder="URL изображения"
                  value={newNews.image_url}
                  onChange={(e) => setNewNews({...newNews, image_url: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <CustomSelect
                    value={newNews.type}
                    onChange={(v) => setNewNews({...newNews, type: v})}
                    options={[{value:'news',label:'Новость'},{value:'promo',label:'Акция'}]}
                  />
                  <CustomSelect
                    value={newNews.branch_id}
                    onChange={(v) => setNewNews({...newNews, branch_id: v})}
                    options={[{value:'',label:'Общая новость'},...adminBranches.map(b=>({value:String(b.id),label:`${b.address} (${b.city_name||'Неизвестно'})`}))]}
                  />
                </div>

                <button className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl text-sm uppercase italic shadow-lg shadow-orange-500/20 mt-4">
                  Добавить новость
                </button>
              </motion.form>
            )}

            {editingNews && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={updateNews} 
                className="bg-white/5 p-6 rounded-[32px] border border-orange-500/30 space-y-4 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-black uppercase italic text-orange-500">Редактирование новости</h4>
                  <button type="button" onClick={() => setEditingNews(null)}><XCircle className="w-5 h-5 text-white/20" /></button>
                </div>
                <input 
                  type="text" 
                  placeholder="Заголовок"
                  value={editingNews.title}
                  onChange={(e) => setEditingNews({...editingNews, title: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                  required
                />
                <textarea 
                  placeholder="Текст новости"
                  value={editingNews.content}
                  onChange={(e) => setEditingNews({...editingNews, content: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500 min-h-[80px]"
                  required
                />
                <input 
                  type="url" 
                  placeholder="URL изображения"
                  value={editingNews.image_url}
                  onChange={(e) => setEditingNews({...editingNews, image_url: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <CustomSelect
                    value={editingNews.type}
                    onChange={(v) => setEditingNews({...editingNews, type: v as any})}
                    options={[{value:'news',label:'Новость'},{value:'promo',label:'Акция'}]}
                  />
                  <CustomSelect
                    value={editingNews.branch_id ? String(editingNews.branch_id) : ''}
                    onChange={(v) => setEditingNews({...editingNews, branch_id: v ? parseInt(v) : null})}
                    options={[{value:'',label:'Общая новость'},...adminBranches.map((b: Branch)=>({value:String(b.id),label:`${b.address} (${b.city_name||'Неизвестно'})`}))]}
                  />
                </div>

                <button className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl text-sm uppercase italic shadow-lg shadow-orange-500/20 mt-4">
                  Обновить новость
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {filteredNews.map(item => (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1">
                  <h4 className="font-bold text-xs flex flex-wrap items-center gap-2">
                    {item.title}
                    <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-white/60 font-mono">
                      {item.branch_id 
                        ? (adminBranches.find(b => b.id === item.branch_id)?.address || `Филиал #${item.branch_id}`) 
                        : 'Общая новость'}
                    </span>
                  </h4>
                  <p className="text-[8px] text-white/40 line-clamp-1">{item.content}</p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setEditingNews(item);
                      setIsAddingNews(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2 text-white/20 hover:text-orange-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteNews(item.id)}
                    className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminTab === 'reviews' && (
        <div className="space-y-6">
          {reviewStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black uppercase italic text-white/40 mb-1">День</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-black italic">{Number(reviewStats.avg_day || 0).toFixed(1)}</span>
                  <Heart className="w-3 h-3 text-orange-500 fill-orange-500" />
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black uppercase italic text-white/40 mb-1">Неделя</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-black italic">{Number(reviewStats.avg_week || 0).toFixed(1)}</span>
                  <Heart className="w-3 h-3 text-orange-500 fill-orange-500" />
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black uppercase italic text-white/40 mb-1">Месяц</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-black italic">{Number(reviewStats.avg_month || 0).toFixed(1)}</span>
                  <Heart className="w-3 h-3 text-orange-500 fill-orange-500" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {ordersWithReviews.length === 0 ? (
              <div className="text-center py-20 text-white/20 font-bold uppercase italic">Отзывов пока нет</div>
            ) : (
              ordersWithReviews.map(order => (
                <div key={order.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">{order.customer_name}</h4>
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Заказ #{order.id}</p>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Heart key={i} className={cn("w-3 h-3 transition-colors", i < (order.rating || 0) ? "text-orange-500 fill-orange-500" : "text-white/10")} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                    <p className="text-sm italic text-white/80 leading-relaxed font-medium">"{order.review || 'Без комментария'}"</p>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => handleDeleteReviewAdmin(order.id)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 active:scale-95 border border-red-500/10"
                      title="Удалить отзыв"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить отзыв</span>
                    </button>
                    <p className="text-[10px] text-white/20 font-bold uppercase italic">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {adminTab === 'menu' && (
        <div className="space-y-8">
          {/* Promo Codes Section */}
          <section className="space-y-4">
            <h3 className="text-lg font-black uppercase italic">Промокоды</h3>
            <form onSubmit={addPromoCode} className="bg-white/5 p-6 rounded-[32px] border border-white/10 space-y-4">
              <input 
                type="text" 
                placeholder="Код (например: COOL)"
                value={newPromo.code}
                onChange={(e) => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500 transition-all font-bold"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-white/20 ml-2 italic">Скидка %</p>
                  <input 
                    type="number" 
                    placeholder="20"
                    value={newPromo.discount_percent}
                    onChange={(e) => setNewPromo({...newPromo, discount_percent: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-orange-500 font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-white/20 ml-2 italic">Мин. сумма (₽)</p>
                  <input 
                    type="number" 
                    placeholder="1000"
                    value={newPromo.min_order_amount}
                    onChange={(e) => setNewPromo({...newPromo, min_order_amount: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-orange-500 font-bold"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-white/20 ml-2 italic">Лимит использований</p>
                  <input 
                    type="number" 
                    placeholder="Общее кол-во (необяз.)"
                    value={newPromo.usage_limit || ''}
                    onChange={(e) => setNewPromo({...newPromo, usage_limit: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-orange-500 font-bold font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-white/20 ml-2 italic">Привязка к филиалу</p>
                  <select 
                    value={newPromo.branch_id || ''}
                    onChange={(e) => setNewPromo({...newPromo, branch_id: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-orange-500 font-bold text-white"
                  >
                    <option value="">Общий (для всех)</option>
                    {adminBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.address} ({b.city_name || 'Неизвестно'})</option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl text-sm uppercase italic shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                Добавить промокод
              </button>
            </form>

            <div className="grid grid-cols-1 gap-3">
              {filteredPromos.map(promo => (
                <div key={promo.id} className={cn(
                  "bg-white/5 border rounded-3xl p-5 flex justify-between items-center transition-all",
                  promo.is_active ? "border-white/10" : "border-red-500/20 opacity-60"
                )}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black italic text-xl uppercase text-white leading-none">{promo.code}</span>
                      <div className={cn("w-1.5 h-1.5 rounded-full", promo.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
                    </div>
                    <p className="text-[10px] font-bold text-white/40 uppercase italic tracking-wider flex flex-wrap items-center gap-1.5 mt-1">
                      <span>-{promo.discount_percent}% • от {promo.min_order_amount} ₽</span>
                      {promo.usage_limit !== null && promo.usage_limit !== undefined && <span>• {promo.used_count || 0}/{promo.usage_limit}</span>}
                      <span className="text-[8px] bg-white/10 px-1 rounded text-orange-500/85 normal-case font-mono font-normal">
                        {promo.branch_id 
                          ? (adminBranches.find(b => b.id === promo.branch_id)?.address || `Филиал #${promo.branch_id}`) 
                          : 'Общий'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => togglePromoStatus(promo)}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        promo.is_active ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
                      )}
                    >
                      {promo.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => deletePromo(promo.id)}
                      className="p-3 bg-white/5 text-white/20 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Menu Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase italic">Меню</h3>
              <button 
                onClick={() => setIsAddingItem(!isAddingItem)}
                className="p-2 bg-orange-500 text-black rounded-xl active:scale-90 transition-all"
              >
                {isAddingItem ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>

            <AnimatePresence>
              {isAddingItem && (
                <motion.form 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={addMenuItem} 
                  className="bg-white/5 p-6 rounded-[32px] border border-white/10 space-y-4 overflow-hidden"
                >
                  <input 
                    type="text" 
                    placeholder="Название"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                    required
                  />
                  <textarea 
                    placeholder="Описание"
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500 min-h-[80px]"
                    required
                  />
                  <select 
                    value={newItem.category_id}
                    onChange={(e) => setNewItem({...newItem, category_id: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                    required
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                  <input 
                    type="url" 
                    placeholder="URL изображения"
                    value={newItem.image_url}
                    onChange={(e) => setNewItem({...newItem, image_url: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                    required
                  />

                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <p className="text-[10px] font-black uppercase text-white/40 italic">Варианты (размер и цена)</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Размер (напр. 300г)"
                        value={newVariant.size_label}
                        onChange={(e) => setNewVariant({...newVariant, size_label: e.target.value})}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs outline-none focus:border-orange-500"
                      />
                      <input 
                        type="number" 
                        placeholder="Цена"
                        value={newVariant.price}
                        onChange={(e) => setNewVariant({...newVariant, price: e.target.value})}
                        className="w-24 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs outline-none focus:border-orange-500"
                      />
                      <button 
                        type="button"
                        onClick={addVariant}
                        className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {variantsToAdd.map((v, idx) => (
                        <div key={idx} className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-1 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-orange-500">{v.size_label}: {v.price}₽</span>
                          <button 
                            type="button"
                            onClick={() => setVariantsToAdd(variantsToAdd.filter((_, i) => i !== idx))}
                            className="text-orange-500/50 hover:text-orange-500"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl text-sm uppercase italic shadow-lg shadow-orange-500/20 mt-4">
                    Сохранить блюдо
                  </button>
                </motion.form>
              )}

              {editingItem && (
                <motion.form 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={updateMenuItem} 
                  className="bg-white/5 p-6 rounded-[32px] border border-orange-500/30 space-y-4 overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-black uppercase italic text-orange-500">Редактирование</h4>
                    <button type="button" onClick={() => setEditingItem(null)}><XCircle className="w-5 h-5 text-white/20" /></button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Название"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                    required
                  />
                  <textarea 
                    placeholder="Описание"
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500 min-h-[80px]"
                    required
                  />
                  <input 
                    type="url" 
                    placeholder="URL изображения"
                    value={editingItem.image_url}
                    onChange={(e) => setEditingItem({...editingItem, image_url: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-orange-500"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="is_available"
                      checked={editingItem.is_available}
                      onChange={(e) => setEditingItem({...editingItem, is_available: e.target.checked})}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <label htmlFor="is_available" className="text-xs font-bold text-white/60">В наличии</label>
                  </div>

                  <button className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl text-sm uppercase italic shadow-lg shadow-orange-500/20 mt-4">
                    Обновить данные
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
            
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
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        setEditingItem(item);
                        setIsAddingItem(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-2 text-white/20 hover:text-orange-500 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteMenuItem(item.id)}
                      className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Branches Management Tab */}
      {adminTab === 'branches' && (
        <div className="space-y-6 text-white font-bold">
          <div className="flex justify-between items-center bg-[#0a0a0a] p-4 rounded-3xl border border-white/5">
            <div>
              <h3 className="text-sm font-black uppercase italic text-orange-500">Филиалы сети</h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Добавление и настройка рабочих зон</p>
            </div>
            <button
              onClick={async () => {
                const defaultCity = adminCities[0];
                let defaultLat = defaultCity?.latitude ? Number(defaultCity.latitude) : null;
                let defaultLng = defaultCity?.longitude ? Number(defaultCity.longitude) : null;

                if (defaultCity && (!defaultLat || !defaultLng)) {
                  try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(defaultCity.name)}&accept-language=ru&limit=1`, {
                      headers: { 'User-Agent': 'ShawarmaBranchLocatorApp/1.0' }
                    });
                    if (response.ok) {
                      const data = await response.json();
                      if (data && data.length > 0) {
                        defaultLat = parseFloat(data[0].lat);
                        defaultLng = parseFloat(data[0].lon);
                      }
                    }
                  } catch (e) {
                    console.error('Failed to geocode default city coordinates on branch add:', e);
                  }
                }

                const finalLat = defaultLat || 56.0153;
                const finalLng = defaultLng || 92.8932;

                setNewBranch({ 
                  name: '', 
                  address: '', 
                  is_24_7: true, 
                  latitude: String(finalLat), 
                  longitude: String(finalLng), 
                  city_id: defaultCity?.id ? String(defaultCity.id) : '' 
                });
                setIsAddingBranch(true);
                setEditingBranch(null);
              }}
              className="px-4 py-2 bg-orange-500 text-black text-xs font-black uppercase italic rounded-xl flex items-center gap-1 hover:bg-orange-400 font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Добавить
            </button>
          </div>

          <AnimatePresence>
            {(isAddingBranch || editingBranch) && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 30 }}
                  className="bg-zinc-900 border border-white/10 p-6 sm:p-8 rounded-[40px] w-full max-w-lg space-y-6 max-h-[90vh] overflow-y-auto shrink-0 relative text-white font-bold"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingBranch(false);
                      setEditingBranch(null);
                    }}
                    className="absolute top-6 right-6 w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white z-25 transition-all active:scale-95"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>

                  <form
                    onSubmit={editingBranch ? handleUpdateBranch : handleCreateBranch}
                    className="space-y-4"
                  >
                    <h4 className="text-sm font-black uppercase italic text-orange-400">
                      {editingBranch ? 'Редактировать филиал' : 'Новая точка выдачи'}
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">Город филиала</label>
                        {!isCreatingNewCity ? (
                          <div className="flex gap-2">
                            <select
                              value={editingBranch ? (editingBranch.city_id || '') : (newBranch.city_id || '')}
                              onChange={async (e) => {
                                const cityId = e.target.value;
                                const cityObj = adminCities.find(c => String(c.id) === String(cityId));
                                let lat = cityObj?.latitude ? Number(cityObj.latitude) : null;
                                let lng = cityObj?.longitude ? Number(cityObj.longitude) : null;
                                
                                if (cityObj && (!lat || !lng)) {
                                  try {
                                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityObj.name)}&accept-language=ru&limit=1`, {
                                      headers: { 'User-Agent': 'ShawarmaBranchLocatorApp/1.0' }
                                    });
                                    if (response.ok) {
                                      const data = await response.json();
                                      if (data && data.length > 0) {
                                        lat = parseFloat(data[0].lat);
                                        lng = parseFloat(data[0].lon);
                                      }
                                    }
                                  } catch (err) {
                                    console.error('Error fallback geocoding city on select:', err);
                                  }
                                }

                                const finalLat = lat || 56.0153;
                                const finalLng = lng || 92.8932;
                                
                                if (editingBranch) {
                                  setEditingBranch({ 
                                    ...editingBranch, 
                                    city_id: cityId,
                                    latitude: String(finalLat),
                                    longitude: String(finalLng)
                                  });
                                } else {
                                  setNewBranch({ 
                                    ...newBranch, 
                                    city_id: cityId,
                                    latitude: String(finalLat),
                                    longitude: String(finalLng)
                                  });
                                }
                                
                                // Reset map view and marker pos
                                if (adminMapRef.current) {
                                  try {
                                    adminMapRef.current.setView([finalLat, finalLng], 12);
                                  } catch (err) {
                                    console.error('Error centering admin map on city select:', err);
                                  }
                                }
                                if (activeMarkerRef.current) {
                                  try {
                                    activeMarkerRef.current.setLatLng([finalLat, finalLng]);
                                  } catch (err) {
                                    console.error('Error moving admin marker on city select:', err);
                                  }
                                }
                              }}
                              className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs outline-none focus:border-orange-500 text-white font-bold"
                              required
                            >
                              <option value="" disabled className="bg-zinc-950 text-white/40">Выберите город</option>
                              {adminCities.map(city => (
                                <option key={city.id} value={city.id} className="bg-zinc-950 text-white">{city.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setIsCreatingNewCity(true)}
                              className="bg-white/10 hover:bg-white/20 px-4 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest transition-all shrink-0 active:scale-95 border border-white/10"
                            >
                              + Город
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-2xl border border-white/5">
                            <input
                              type="text"
                              placeholder="Новый город (например: Новосибирск)"
                              value={newCityName}
                              onChange={(e) => setNewCityName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCityInline();
                                }
                              }}
                              className="w-full bg-black/40 border border-orange-500/30 rounded-xl py-2.5 px-3.5 text-xs outline-none focus:border-orange-500 text-white font-bold"
                              required
                            />
                            <div className="flex gap-2 w-full">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingNewCity(false);
                                  setNewCityName('');
                                }}
                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                              >
                                Отмена
                              </button>
                              <button
                                type="button"
                                onClick={handleAddCityInline}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-black py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">Название филиала</label>
                        <input
                          type="text"
                          placeholder="кв. Молодежный, ТЦ Взлетка"
                          value={editingBranch ? editingBranch.name : newBranch.name}
                          onChange={(e) => editingBranch 
                            ? setEditingBranch({ ...editingBranch, name: e.target.value })
                            : setNewBranch({ ...newBranch, name: e.target.value })
                          }
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs outline-none focus:border-orange-500 text-white font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">Фактический адрес</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Красноярск, ул. Авиаторов, 5"
                            value={editingBranch ? editingBranch.address : newBranch.address}
                            onChange={(e) => editingBranch 
                              ? setEditingBranch({ ...editingBranch, address: e.target.value })
                              : setNewBranch({ ...newBranch, address: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleGeocode(editingBranch ? editingBranch.address : newBranch.address);
                              }
                            }}
                            className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs outline-none focus:border-orange-500 text-white font-bold"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => handleGeocode(editingBranch ? editingBranch.address : newBranch.address)}
                            disabled={isGeocoding}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-800 text-black px-4 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all shrink-0 active:scale-95"
                          >
                            {isGeocoding ? 'Поиск...' : 'Найти'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-orange-500 block mb-1">Укажите расположение на карте</label>
                        <p className="text-[9px] text-white/40 uppercase font-black tracking-wider block mb-2 leading-tight">Поставьте маркер в нужном месте, кликнув по карте</p>
                        <div className="relative">
                          <div
                            id="admin-branch-map"
                            className="w-full bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-inner relative z-10"
                            style={{ height: '220px', minHeight: '220px' }}
                          />
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg pointer-events-none border border-white/10 flex items-center gap-1.5 z-[15]">
                            <Map className="w-3 h-3 text-orange-500" />
                            <span className="text-[9px] font-bold text-white/60 tracking-wider">2ГИС</span>
                          </div>
                        </div>
                        <div className="flex gap-4 text-[10px] text-white/40 font-mono mt-1 pt-1 justify-between">
                          <span>Широта: <strong className="text-white">{editingBranch ? editingBranch.latitude : newBranch.latitude}</strong></span>
                          <span>Долгота: <strong className="text-white">{editingBranch ? editingBranch.longitude : newBranch.longitude}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="branch_is_24_7"
                          checked={editingBranch ? editingBranch.is_24_7 : newBranch.is_24_7}
                          onChange={(e) => editingBranch
                            ? setEditingBranch({ ...editingBranch, is_24_7: e.target.checked })
                            : setNewBranch({ ...newBranch, is_24_7: e.target.checked })
                          }
                          className="w-4 h-4 accent-orange-500"
                        />
                        <label htmlFor="branch_is_24_7" className="text-xs font-bold text-white/60">
                          Круглосуточный филиал (24/7)
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingBranch(false);
                          setEditingBranch(null);
                        }}
                        className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3.5 rounded-2xl text-xs font-black uppercase italic"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-orange-500 hover:bg-orange-400 text-black py-3.5 rounded-2xl text-xs font-black uppercase italic"
                      >
                        {editingBranch ? 'Сохранить изменения' : 'Добавить филиал'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Cities Section */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black uppercase text-orange-500 italic tracking-wider">География присутствия</h4>
                <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Управление регионами сети ({adminCities.length})</p>
              </div>
              {!isCreatingNewCity && (
                <button
                  onClick={() => setIsCreatingNewCity(true)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shrink-0 active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-orange-500" /> Добавить
                </button>
              )}
            </div>

            {isCreatingNewCity && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Название города... (например: Новосибирск)"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCityInline();
                      }
                    }}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs outline-none focus:border-orange-500 text-white font-bold"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewCity(false);
                        setNewCityName('');
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] uppercase font-black p-2 rounded-xl transition-all active:scale-95"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCityInline}
                      className="bg-orange-500 hover:bg-orange-600 text-black text-[10px] font-black uppercase p-2 rounded-xl transition-all active:scale-95"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-2">
              {adminCities.map(city => {
                const count = adminBranches.filter(b => b.city_id === city.id).length;
                const isSelected = adminSelectedCityId === city.id;
                return (
                  <div 
                    key={city.id} 
                    onClick={() => setAdminSelectedCityId(isSelected ? null : city.id)}
                    className={cn(
                      "border rounded-2xl py-1.5 pl-3 pr-2 flex items-center gap-2 group transition-all text-xs font-bold text-white relative cursor-pointer select-none",
                      isSelected 
                        ? "bg-orange-500/20 border-orange-500" 
                        : "bg-black/40 border-white/5 hover:border-orange-500/20"
                    )}
                  >
                    <span>{city.name}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 font-black tracking-tighter">
                      ({count})
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCity(city.id);
                      }}
                      className="p-1 text-white/25 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Удалить город и все его филиалы"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {adminCities.length === 0 && (
                <p className="text-[10px] text-white/20 uppercase font-black tracking-wider py-2">Список городов пуст</p>
              )}
            </div>
          </div>

          {/* Branches Grid */}
          <div className="space-y-3">
            {[...adminBranches]
              .sort((a, b) => {
                if (adminSelectedCityId) {
                  const aMatch = a.city_id === adminSelectedCityId;
                  const bMatch = b.city_id === adminSelectedCityId;
                  if (aMatch && !bMatch) return -1;
                  if (!aMatch && bMatch) return 1;
                }
                return 0;
              })
              .map(branch => {
                const isActiveCityBranch = adminSelectedCityId && branch.city_id === adminSelectedCityId;
                return (
                  <div 
                    key={branch.id} 
                    className={cn(
                      "border rounded-3xl p-4 flex justify-between items-start transition-all duration-300",
                      isActiveCityBranch 
                        ? "bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/5 scale-[1.01]" 
                        : "bg-white/5 border-white/10"
                    )}
                  >
                <div className="space-y-1 font-bold">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 className="font-black text-xs text-white">{branch.name}</h4>
                    {branch.city_name && (
                      <span className="px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400">
                        {branch.city_name}
                      </span>
                    )}
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider",
                      branch.is_24_7 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      {branch.is_24_7 ? '24/7' : 'до 23:00'}
                    </span>
                  </div>
                  <p className="text-white/40 text-[10px] font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    {branch.address}
                  </p>
                  <p className="text-white/20 text-[8px] font-mono font-bold">
                    Координаты: {branch.latitude}, {branch.longitude}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingBranch({
                        ...branch,
                        latitude: branch.latitude.toString(),
                        longitude: branch.longitude.toString()
                      });
                      setIsAddingBranch(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2 text-white/20 hover:text-orange-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBranch(branch.id)}
                    className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Stock Management Tab */}
      {adminTab === 'stock' && (
        <div className="space-y-6 text-white font-bold">
          <div className="bg-[#0a0a0a] p-4 rounded-3xl border border-white/5 space-y-3">
            <div>
              <h3 className="text-sm font-black uppercase italic text-orange-500">Складской остаток</h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Учет количества напитков по филиалам</p>
            </div>
            
            {/* Filter */}
            <div className="flex gap-2 items-center text-white font-bold text-xs select-container">
              <span className="text-white/40 uppercase text-[9px] font-black tracking-wider">Филиал:</span>
              <select
                value={stockBranchFilter}
                onChange={(e) => setStockBranchFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-orange-500 flex-1 min-w-0 font-bold"
              >
                <option value="all" className="bg-zinc-950 text-white">Все филиалы</option>
                {adminBranches.map(b => (
                  <option key={b.id} value={b.id.toString()} className="bg-zinc-950 text-white">{b.address || b.name} ({b.city_name || 'Неизвестно'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* List ingredients stock */}
          <div className="space-y-3">
            {adminStocks
              .filter(s => stockBranchFilter === 'all' || s.branch_id.toString() === stockBranchFilter)
              .map((s, idx) => (
                <div key={`${s.branch_id}-${s.variant_id}-${idx}`} className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-orange-500 italic">
                      {s.branch_name}
                    </p>
                    <h4 className="font-bold text-xs truncate text-white">{s.product_name}</h4>
                    <p className="text-white/40 text-[9px] uppercase font-bold flex items-center gap-1">
                      Размер: <span className="text-white/60 font-black italic">{s.size_label}</span>
                    </p>
                  </div>

                  {/* Quantity Editor */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/5 shrink-0">
                    <button
                      onClick={() => handleUpdateStock(s.branch_id, s.variant_id, Math.max(0, s.stock - 1))}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 hover:bg-orange-500/10 active:scale-95 transition-all text-xs font-black text-white hover:text-orange-500 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={s.stock}
                      onChange={(e) => handleUpdateStock(s.branch_id, s.variant_id, Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 bg-transparent text-center font-mono font-black text-sm italic text-orange-500 outline-none"
                    />
                    <button
                      onClick={() => handleUpdateStock(s.branch_id, s.variant_id, s.stock + 1)}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 hover:bg-orange-500/10 active:scale-95 transition-all text-xs font-black text-white hover:text-orange-500 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            {adminStocks.length === 0 && (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 text-white/20 text-xs font-black uppercase tracking-wider">
                Загрузка складских остатков...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
