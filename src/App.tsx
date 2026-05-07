/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TradeMap } from './components/TradeMap';
import { Auth } from './components/Auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Wallet, Coins, Landmark, Ship, Home, TrendingUp, AlertCircle, CheckCircle2, Menu, X, Moon, Sun } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where,
  increment,
  getDocs,
  writeBatch 
} from 'firebase/firestore';
import { TRANSLATIONS } from './constants';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeInvestments, setActiveInvestments] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [darkMode, setDarkMode] = useState(false);
  const [confirmingTrade, setConfirmingTrade] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [persistentNotifications, setPersistentNotifications] = useState<any[]>([]);
  const [tradeLogs, setTradeLogs] = useState<any[]>([]);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
      setLoading(true);
      if (authenticatedUser) {
        setUser(authenticatedUser);
        
        // Sync Profile
        const userDocRef = doc(db, 'users', authenticatedUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (!snapshot.exists()) {
            const newProfile = {
              name: authenticatedUser.displayName || 'Noble Trader',
              email: authenticatedUser.email,
              balance: 100000,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            try {
              await setDoc(userDocRef, newProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${authenticatedUser.uid}`);
            }
          } else {
            setProfile(snapshot.data());
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${authenticatedUser.uid}`));

        // Sync Investments
        const investmentsQuery = query(collection(db, 'investments'), where('userId', '==', authenticatedUser.uid));
        const unsubscribeInvestments = onSnapshot(investmentsQuery, async (snapshot) => {
          const investments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          setActiveInvestments(investments);
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'investments'));

        // Sync Properties
        const propertiesQuery = query(collection(db, 'properties'), where('ownerId', '==', authenticatedUser.uid));
        const unsubscribeProperties = onSnapshot(propertiesQuery, (snapshot) => {
          setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'properties'));

        // Sync Trade Logs
        const logsQuery = query(collection(db, 'tradeLogs'), where('userId', '==', authenticatedUser.uid));
        const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
          const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTradeLogs(logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'tradeLogs'));

        setLoading(false);
        return () => {
          unsubscribeProfile();
          unsubscribeInvestments();
          unsubscribeProperties();
        };
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      
      // Proactive maturation check
      activeInvestments.forEach(async (inv) => {
        if (inv.status !== 'Completed' && inv.expiresAt && inv.expiresAt <= now) {
          try {
            const profitAmount = Math.floor(inv.amount * (1 + (inv.profit || 0) / 100));
            
            // Update investment to Completed
            await updateDoc(doc(db, 'investments', inv.id), {
              status: 'Completed',
              updatedAt: serverTimestamp()
            });

            // Add to user balance
            await updateDoc(doc(db, 'users', user.uid), {
              balance: increment(profitAmount),
              updatedAt: serverTimestamp()
            });

            // Log completion
            await addDoc(collection(db, 'tradeLogs'), {
              userId: user.uid,
              userName: profile.name,
              routeName: getRouteName(inv.routeId),
              amount: inv.amount,
              profitPercent: inv.profit,
              profitDinars: profitAmount - inv.amount,
              type: 'completion',
              timestamp: new Date().toISOString()
            });

            // Add persistent notification
            const newNotif = {
              id: `${inv.id}-${Date.now()}`,
              name: getRouteName(inv.routeId),
              profit: profitAmount - inv.amount,
              amount: inv.amount
            };
            setPersistentNotifications(prev => [...prev, newNotif]);
            
            // Auto hide after 5 seconds
            setTimeout(() => {
              setPersistentNotifications(prev => prev.filter(n => n.id !== newNotif.id));
            }, 5000);

          } catch (err) {
            console.error("Failed to process maturation in interval:", err);
          }
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeInvestments, user, lang]);

  const handleInvest = async (amount: number, name: string, routeId: string, profit: number, durationMinutes: number) => {
    if (!profile || !user) return;
    
    if (profile.balance >= amount) {
      try {
        const maturationTime = durationMinutes * 60 * 1000;
        const expiresAt = Date.now() + maturationTime;
        const startTime = Date.now();

        const investmentData = {
          userId: user.uid,
          name,
          amount,
          profit,
          status: 'En route',
          routeId,
          startTime,
          expiresAt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'investments'), investmentData);
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(-amount),
          updatedAt: serverTimestamp()
        });

        // Log trade start
        await addDoc(collection(db, 'tradeLogs'), {
          userId: user.uid,
          userName: profile.name,
          routeName: getRouteName(routeId),
          amount,
          type: 'start',
          timestamp: new Date().toISOString()
        });
        
        setNotification({ 
          type: 'success', 
          message: lang === 'ar' 
            ? `بدأت رحلة ${name}. سيستغرق الأمر ${durationMinutes} ${t.minutes}.` 
            : `Investment of ${amount} Dinars placed in ${name}. It will take ${durationMinutes} ${t.minutes}.` 
        });
        setConfirmingTrade(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'investments');
      }
    } else {
      setNotification({ type: 'error', message: t.balance + ' ' + (lang === 'ar' ? 'غير كافية' : 'insufficient') });
      setConfirmingTrade(null);
    }
  };

  const handlePurchase = async (item: { name: string, price: number, type?: string, category?: string }) => {
    if (!profile || !user) return;

    if (profile.balance >= item.price) {
      try {
        const propertyData = {
          ownerId: user.uid,
          name: item.name,
          type: item.type || 'house',
          category: item.category || 'General',
          price: item.price,
          purchasedAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'properties'), propertyData);
        await updateDoc(doc(db, 'users', user.uid), {
          balance: profile.balance - item.price,
          updatedAt: serverTimestamp()
        });

        // Log purchase
        await addDoc(collection(db, 'tradeLogs'), {
          userId: user.uid,
          userName: profile.name,
          routeName: item.name,
          amount: item.price,
          type: 'purchase',
          timestamp: new Date().toISOString()
        });

        setNotification({ type: 'success', message: lang === 'ar' ? `تم امتلاك ${item.name} بنجاح!` : `${item.name} acquired successfully!` });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'properties');
      }
    } else {
      setNotification({ type: 'error', message: lang === 'ar' ? 'يطلب التاجر المزيد من الذهب لهذا.' : 'The Merchant demands more gold for this.' });
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleReset = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // Reset Balance
      batch.update(doc(db, 'users', user.uid), {
        balance: 100000,
        updatedAt: serverTimestamp()
      });

      // Clear Investments
      const invQuery = query(collection(db, 'investments'), where('userId', '==', user.uid));
      const invSnap = await getDocs(invQuery);
      invSnap.forEach(d => batch.delete(d.ref));

      // Clear Properties
      const propQuery = query(collection(db, 'properties'), where('ownerId', '==', user.uid));
      const propSnap = await getDocs(propQuery);
      propSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      setNotification({ type: 'success', message: lang === 'ar' ? 'تمت إعادة تعيين الحساب إلى 100,000 دينار.' : 'Account reset to 100,000 Dinars successfully.' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const getRouteName = (routeId: string) => {
    const map: Record<string, keyof typeof t> = {
      'silk-road': 'silkRoad',
      'amber-road': 'amberRoad',
      'gulf-harbor-sea': 'gulfHarbor'
    };
    return t[map[routeId] || 'silkRoad'] as string;
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-parchment flex items-center justify-center">
        <Landmark size={48} className="text-gold-600 animate-bounce" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth lang={lang} setLang={setLang} onAuthComplete={(u) => setUser(u)} />;
  }

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div className={cn(
      "flex h-screen w-full overflow-hidden font-sans relative transition-colors duration-500",
      darkMode ? "bg-[#1a1410] text-gold-50" : "bg-parchment text-gray-900",
      lang === 'ar' ? "flex-row-reverse text-right" : ""
    )} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={profile} 
        onLogout={handleLogout} 
        onReset={handleReset}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        lang={lang}
        setLang={setLang}
        darkMode={darkMode}
      />
      
      <main className="flex-1 relative flex flex-col min-w-0">
        <header className={cn(
          "h-16 flex items-center justify-between px-4 lg:px-8 border-b backdrop-blur-sm z-30 transition-colors",
          darkMode ? "bg-black/60 border-gold-900/30" : "bg-white/50 border-gold-600/10"
        )}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={cn(
                "lg:hidden p-2 rounded-lg transition-colors",
                darkMode ? "text-gold-400 hover:bg-gold-900/20" : "text-gold-700 hover:bg-gold-50"
              )}
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <Landmark size={20} className="text-gold-600 hidden sm:block" />
              <h2 className={cn(
                "font-serif font-bold text-lg sm:text-xl italic truncate transition-colors",
                darkMode ? "text-gold-200" : "text-gray-800"
              )}>
                {activeTab === 'map' && t.routes}
                {activeTab === 'market' && t.bazaar}
                {activeTab === 'wallet' && t.wealth}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className={cn(
                "p-2 rounded-full transition-all duration-300",
                darkMode ? "bg-gold-900/30 text-gold-300 hover:bg-gold-900/50" : "bg-gold-100 text-gold-700 hover:bg-gold-200"
              )}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition-colors",
              darkMode ? "bg-gold-900/20 border-gold-800" : "bg-[#fff9f0] border-gold-200"
            )}>
              <div className="w-5 h-5 rounded-full bg-gold-100/50 flex items-center justify-center">
                <Coins size={12} className="text-gold-600" />
              </div>
              <span className={cn(
                "font-bold text-sm",
                darkMode ? "text-gold-300" : "text-gold-900"
              )}>
                {profile.balance.toLocaleString()} <span className="text-gold-600 font-medium">{t.balance}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Persistent Notifications Stack */}
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-md pointer-events-none px-4">
          <AnimatePresence>
            {persistentNotifications.map(notif => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className={cn(
                  "pointer-events-auto flex items-center justify-between gap-4 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl",
                  darkMode 
                    ? "bg-gold-900/40 border-gold-700/50 text-gold-100" 
                    : "bg-white/95 border-gold-200 text-gold-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm leading-tight">
                      {lang === 'ar' ? `وصلت قافلة ${notif.name}!` : `Convoy ${notif.name} arrived!`}
                    </h5>
                    <p className="text-xs text-green-500 font-bold">
                      +{notif.profit} <span className="opacity-70">{t.currency}</span> {lang === 'ar' ? 'ربح' : 'profit'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setPersistentNotifications(prev => prev.filter(n => n.id !== notif.id))}
                  className="p-2 hover:bg-black/5 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className={cn(
                "fixed top-16 left-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border",
                notification.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="font-bold text-sm">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'map' && (
              <motion.div
                key="map"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full h-full p-6 flex flex-col"
              >
                <div className="flex-1 min-h-0">
                  <TradeMap lang={lang} />
                </div>
                
                {/* Investing Panel */}
                <div className="pt-4 space-y-4 h-auto shrink-0 pb-6">
                  {[
                    { id: 'silk-road', name: t.silkRoad, routeName: lang === 'ar' ? 'طريق الحرير العظيم' : 'GREAT SILK ROUTE', color: 'text-red-700', arrowColor: '#b91c1c', cost: 1000, profit: 10, duration: 1, image: 'https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=100' },
                    { id: 'amber-road', name: t.amberRoad, routeName: lang === 'ar' ? 'مسار الكهرمان' : 'AMBER TRAIL', color: 'text-amber-600', arrowColor: '#d97706', cost: 2500, profit: 15, duration: 3, image: 'https://images.unsplash.com/photo-1629197520452-7bfbe9967d86?auto=format&fit=crop&q=80&w=100' },
                    { id: 'gulf-harbor-sea', name: t.gulfHarbor, routeName: lang === 'ar' ? 'مياه الخليج' : 'GULF WATERS', color: 'text-blue-700', arrowColor: '#1e40af', cost: 5000, profit: 25, duration: 5, image: 'https://images.unsplash.com/photo-1544623230-201823d1f5bb?auto=format&fit=crop&q=80&w=100' }
                  ].map((p, i) => (
                    <div key={i} className="glass-panel px-6 py-5 rounded-[24px] border-gold-100 flex items-center justify-between group hover:border-gold-300 transition-all cursor-pointer shadow-sm bg-white"
                         onClick={() => setConfirmingTrade(p)}>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-gold-100 shadow-sm">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn("text-[10px] font-black uppercase tracking-widest mb-0.5", p.color)}>{p.routeName}</p>
                          <p className="font-serif font-bold text-xl text-gray-800 tracking-tight truncate">{p.name}</p>
                        </div>
                      </div>

                      {/* Curved Arrow Decoration */}
                      <div className="flex-1 px-8 hidden sm:flex justify-center overflow-visible">
                        <svg width="100" height="40" viewBox="0 0 100 40" fill="none">
                          <path d="M10,10 Q50,40 90,10" stroke={p.arrowColor} strokeWidth="3" strokeLinecap="round" />
                          <path d="M82,10 L90,10 L88,18" stroke={p.arrowColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>

                      <div className={cn("shrink-0 flex flex-col items-end", lang === 'ar' ? "mr-4" : "ml-4")}>
                        <p className="text-xl font-bold text-gray-700 mb-2">{p.cost} {t.currency}</p>
                        <button className="bg-[#4a3728] text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-[#2d2118] transition-colors shadow-md">
                          {t.stake}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Confirmation Popup */}
                <AnimatePresence>
                  {confirmingTrade && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className={cn(
                          "rounded-3xl p-8 max-w-sm w-full shadow-2xl border transition-colors",
                          darkMode ? "bg-gold-900/90 border-gold-700 text-gold-50" : "bg-white border-gold-200 text-gray-900"
                        )}
                      >
                        <h3 className={cn(
                          "font-serif font-bold text-2xl mb-2 border-b pb-4",
                          darkMode ? "text-gold-200 border-gold-800" : "text-gray-900 border-gold-100"
                        )}>
                          {t.confirmTrade}
                        </h3>
                        <div className="space-y-4 py-6">
                           <div className="flex justify-between items-center">
                             <span className={cn("text-sm font-medium", darkMode ? "text-gold-400" : "text-gray-500")}>{t.entry}</span>
                             <span className="font-bold text-lg">{confirmingTrade.cost} {t.currency}</span>
                           </div>
                           <div className="flex justify-between items-center">
                             <span className={cn("text-sm font-medium", darkMode ? "text-gold-400" : "text-gray-500")}>{lang === 'ar' ? 'المدة' : 'Duration'}</span>
                             <span className="font-bold text-lg">{confirmingTrade.duration} {confirmingTrade.duration === 1 ? t.minute : t.minutes}</span>
                           </div>
                           <div className={cn(
                             "p-4 rounded-2xl border flex items-center justify-between",
                             darkMode ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-100"
                           )}>
                             <span className={cn("font-bold text-sm tracking-tight", darkMode ? "text-green-400" : "text-green-700")}>{t.profitInfo}</span>
                             <span className={cn("font-black text-xl", darkMode ? "text-green-300" : "text-green-800")}>{confirmingTrade.profit}%</span>
                           </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setConfirmingTrade(null)}
                            className={cn(
                              "flex-1 py-4 font-bold transition-colors",
                              darkMode ? "text-gold-500 hover:text-gold-300" : "text-gray-500 hover:text-gray-700"
                            )}
                          >
                            {t.cancel}
                          </button>
                          <button 
                            onClick={() => handleInvest(confirmingTrade.cost, confirmingTrade.name, confirmingTrade.id, confirmingTrade.profit, confirmingTrade.duration)}
                            className="flex-1 py-4 bg-gold-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg"
                          >
                            {t.stake}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'market' && (
              <motion.div
                key="market"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full h-full p-8 overflow-y-auto"
              >
                <div className="max-w-6xl mx-auto space-y-10">
                  <section>
                    <div className={cn("flex items-center gap-3 mb-6", lang === 'ar' ? "flex-row-reverse" : "")}>
                      <Home className="text-gold-600" size={24} />
                      <h3 className="font-display text-2xl text-gold-800">{t.estate}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { name: lang === 'ar' ? 'نزل الواحة' : 'Oasis Inn', price: 5000, desc: lang === 'ar' ? 'سكن فاخر في القمر' : 'Luxury living in Al-Qamar', type: 'house', category: 'Luxury', image: 'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&q=80&w=400' },
                        { name: lang === 'ar' ? 'نزل التاجر' : 'Merchant Loft', price: 2500, desc: lang === 'ar' ? 'مساحة مريحة قرب الأسواق' : 'Comfortable space near markets', type: 'house', category: 'Commercial', image: 'https://images.unsplash.com/photo-1518107616385-ad3022bb5832?auto=format&fit=crop&q=80&w=400' },
                        { name: lang === 'ar' ? 'خيمة الرحالة' : 'Nomad Tent', price: 300, desc: lang === 'ar' ? 'منزل متنقل بسيط' : 'A simple mobile home', type: 'house', category: 'Basic', image: 'https://images.unsplash.com/photo-1551131618-189a672da6a7?auto=format&fit=crop&q=80&w=400' }
                      ].map((item, idx) => {
                        const isOwned = properties.some(p => p.name === item.name);
                        return (
                          <div key={idx} className="glass-panel p-6 rounded-2xl border-gold-200 hover:border-gold-400 transition-all group shadow-sm bg-white/90">
                            <div className="aspect-video w-full rounded-xl mb-4 overflow-hidden shadow-inner bg-gold-50">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" referrerPolicy="no-referrer" />
                            </div>
                            <h4 className="font-serif font-bold text-lg mb-1">{item.name}</h4>
                            <p className="text-sm text-gray-500 mb-4">{item.desc}</p>
                            <div className={cn("flex items-center justify-between", lang === 'ar' ? "flex-row-reverse" : "")}>
                              <span className="font-bold text-gold-700">{item.price} {t.balance}</span>
                              <button 
                                onClick={() => !isOwned && handlePurchase(item)}
                                disabled={isOwned}
                                className={cn(
                                  "px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors",
                                  isOwned ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gold-500 text-gold-950 hover:bg-gold-400"
                                )}
                              >
                                {isOwned ? t.owned : t.rent}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <div className={cn("flex items-center gap-3 mb-6", lang === 'ar' ? "flex-row-reverse" : "")}>
                      <Ship className="text-gold-600" size={24} />
                      <h3 className="font-display text-2xl text-gold-800">{t.vessels}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
                      {[
                        { name: lang === 'ar' ? 'سفينة البحر الأحمر' : 'Red Sea Dhow', price: 8000, desc: lang === 'ar' ? 'سفينة تجارية سريعة' : 'Swift maritime trading ship', type: 'ship', category: 'Elite', image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&q=80&w=400' },
                        { name: lang === 'ar' ? 'قافلة الصحراء' : 'Desert Caravan', price: 12000, desc: lang === 'ar' ? 'ناقلة بضائع ضخمة' : 'Massive goods transporter', type: 'caravan', category: 'Industrial', image: 'https://images.unsplash.com/photo-1509023467864-1ecbb3f63628?auto=format&fit=crop&q=80&w=400' },
                        { name: lang === 'ar' ? 'ناقة سريعة' : 'Swift Camel', price: 1200, desc: lang === 'ar' ? 'حيوان توصيل سريع' : 'Quick delivery animal', type: 'caravan', category: 'Basic', image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=400' }
                      ].map((item, idx) => {
                        const isOwned = properties.some(p => p.name === item.name);
                        return (
                          <div key={idx} className="glass-panel p-6 rounded-2xl border-gold-200 hover:border-gold-400 transition-all group shadow-sm bg-white/90">
                            <div className="aspect-video w-full rounded-xl mb-4 overflow-hidden shadow-inner bg-gold-50">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" referrerPolicy="no-referrer" />
                            </div>
                            <h4 className="font-serif font-bold text-lg mb-1">{item.name}</h4>
                            <p className="text-sm text-gray-500 mb-4">{item.desc}</p>
                            <div className={cn("flex items-center justify-between", lang === 'ar' ? "flex-row-reverse" : "")}>
                              <span className="font-bold text-gold-700">{item.price} {t.balance}</span>
                              <button 
                                onClick={() => !isOwned && handlePurchase(item)}
                                disabled={isOwned}
                                className={cn(
                                  "px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors",
                                  isOwned ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gold-900 text-gold-100 hover:bg-black"
                                )}
                              >
                                {isOwned ? t.owned : t.buy}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {activeTab === 'wallet' && (
              <motion.div
                key="wallet"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full h-full p-8 overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={cn(
                      "glass-panel p-8 rounded-[40px] border shadow-sm transition-colors",
                      darkMode ? "border-gold-800 bg-gold-900/10 text-white" : "border-gold-200 bg-gradient-to-br from-white to-gold-50"
                    )}>
                      <p className="text-xs text-gold-600 font-bold uppercase tracking-widest mb-2">{t.totalWealth}</p>
                      <h3 className="font-serif font-bold text-4xl">{profile.balance.toLocaleString()}</h3>
                      <p className="text-xs text-gold-50 mt-2">{t.balance}</p>
                    </div>
                    
                    <div className={cn(
                      "glass-panel p-8 rounded-[40px] border shadow-sm flex flex-col justify-center transition-colors",
                      darkMode ? "border-gold-800 bg-black/40 text-white" : "border-gold-200 bg-white"
                    )}>
                      <p className="text-xs text-gold-600 font-bold uppercase tracking-widest mb-2">{t.activeInvestments}</p>
                      <h3 className="font-serif font-bold text-4xl">{activeInvestments.length}</h3>
                      <p className="text-xs text-gold-50 mt-2">{lang === 'ar' ? 'قافلة' : 'Convoys'}</p>
                    </div>

                    <div className={cn(
                      "glass-panel p-8 rounded-[40px] border shadow-sm flex flex-col justify-center transition-colors",
                      darkMode ? "border-gold-800 bg-black/40 text-white" : "border-gold-200 bg-white"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-green-600" />
                        <p className="text-xs text-gold-600 font-bold uppercase tracking-widest">{t.projected}</p>
                      </div>
                      <h3 className="font-serif font-bold text-4xl text-green-500">
                        +{activeInvestments.reduce((acc, inv) => acc + (inv.amount * (inv.profit / 100)), 0).toFixed(0)}
                      </h3>
                      <p className="text-xs text-gold-50 mt-2">{t.balance}</p>
                    </div>
                  </div>

                  <div className={cn(
                    "glass-panel rounded-3xl border p-8 shadow-sm transition-colors",
                    darkMode ? "border-gold-800 bg-black/40" : "border-gold-200 bg-white/90"
                  )}>
                    <h4 className="font-display text-xl mb-6 text-gold-600 border-b border-gold-100/10 pb-4">{t.wealth}</h4>
                    <div className="space-y-4">
                      {activeInvestments.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 italic">{t.noInvestments}</p>
                      ) : (
                        activeInvestments.map((inv) => {
                          const duration = inv.expiresAt - (inv.startTime || inv.createdAt?.toMillis() || Date.now());
                          const remaining = Math.max(0, inv.expiresAt - currentTime);
                          const progress = inv.status === 'Completed' ? 100 : Math.min(100, Math.floor(((duration - remaining) / duration) * 100));
                          
                          return (
                            <div key={inv.id} className={cn(
                              "flex flex-col p-5 border rounded-3xl transition-all",
                              darkMode ? "bg-black/20 border-gold-900/30" : "bg-parchment/30 border-gold-100 hover:border-gold-300",
                              lang === 'ar' ? "text-right" : "text-left"
                            )}>
                              <div className={cn("flex items-center justify-between mb-4", lang === 'ar' ? "flex-row-reverse" : "")}>
                                <div className={cn("flex items-center gap-4", lang === 'ar' ? "flex-row-reverse" : "")}>
                                  <div className="w-12 h-12 rounded-full bg-gold-100/10 flex items-center justify-center text-gold-600 shrink-0">
                                    <TrendingUp size={24} />
                                  </div>
                                  <div>
                                    <p className={cn("font-bold text-lg", darkMode ? "text-gold-100" : "text-gray-800")}>{getRouteName(inv.routeId)}</p>
                                    <div className={cn("flex items-center gap-2 mt-1", lang === 'ar' ? "flex-row-reverse" : "")}>
                                      <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        inv.status === 'En route' ? 'bg-blue-500 animate-pulse' : 'bg-gold-500'
                                      )} />
                                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        {t[inv.status.toLowerCase().replace(' ', '') as keyof typeof t] || inv.status}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className={lang === 'ar' ? "text-left" : "text-right"}>
                                  <p className="font-bold text-gold-700 text-lg">{inv.amount} {t.currency}</p>
                                  <p className={cn("text-xs font-bold", inv.profit >= 0 ? 'text-green-500' : 'text-red-500')}>
                                    {inv.profit > 0 ? `+${inv.profit}` : inv.profit}%
                                  </p>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-gold-600">
                                  <span>{lang === 'ar' ? 'التقدم' : 'Progress'}</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-gold-100/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gold-600 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Trade Logs Section */}
                  <div className={cn(
                    "glass-panel rounded-3xl border p-8 shadow-sm transition-colors",
                    darkMode ? "border-gold-800 bg-black/40" : "border-gold-200 bg-white/90"
                  )}>
                    <h4 className="font-display text-xl mb-6 text-gold-600 border-b border-gold-100/10 pb-4">
                      {lang === 'ar' ? 'سجل المعاملات' : 'Transaction History'}
                    </h4>
                    <div className="space-y-3">
                      {tradeLogs.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 italic">{lang === 'ar' ? 'لا يوجد سجل بعد' : 'No history yet'}</p>
                      ) : (
                        tradeLogs.slice(0, 10).map((log) => (
                          <div key={log.id} className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition-colors",
                            darkMode ? "bg-black/20 border-gold-900/10" : "bg-gold-50/30 border-gold-100"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                log.type === 'completion' ? "bg-green-500/10 text-green-500" : 
                                log.type === 'start' ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                              )}>
                                {log.type === 'completion' ? <CheckCircle2 size={14} /> : 
                                 log.type === 'start' ? <TrendingUp size={14} /> : <Home size={14} />}
                              </div>
                              <div>
                                <p className={cn("text-sm font-bold", darkMode ? "text-gold-100" : "text-gray-800")}>
                                  {log.routeName}
                                </p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "text-sm font-bold",
                                log.type === 'completion' ? "text-green-500" : "text-gold-600"
                              )}>
                                {log.type === 'completion' ? `+${log.profitDinars}` : `-${log.amount}`} {t.currency}
                              </p>
                              <p className="text-[9px] uppercase font-black tracking-tighter opacity-50">
                                {log.type}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}



