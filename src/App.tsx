/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TradeMap } from './components/TradeMap';
import { Auth } from './components/Auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Wallet, Coins, Landmark, Ship, Home, TrendingUp, AlertCircle, CheckCircle2, Menu, X, Moon, Sun, Crown, Gem, Store, User } from 'lucide-react';
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
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [confirmingSell, setConfirmingSell] = useState<{id: string, name: string, price: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
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
  
  const getUserRank = (balance: number) => {
    if (balance >= 500000) {
      return {
        title: lang === 'ar' ? 'سلطان' : 'Sultan',
        icon: Crown,
        color: 'text-amber-600',
        borderColor: 'border-amber-400',
        bgColor: 'bg-amber-100/50',
        glow: 'shadow-[0_0_15px_rgba(251,191,36,0.4)]',
        rank: 3
      };
    }
    if (balance >= 100000) {
      return {
        title: lang === 'ar' ? 'تاجر مشهور' : 'Famous Merchant',
        icon: Gem,
        color: 'text-blue-600',
        borderColor: 'border-blue-300',
        bgColor: 'bg-blue-50',
        glow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
        rank: 2
      };
    }
    return {
      title: lang === 'ar' ? 'تاجر مبتدئ' : 'Beginner Merchant',
      icon: Store,
      color: 'text-green-600',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      glow: '',
      rank: 1
    };
  };

  const userRank = profile ? getUserRank(profile.balance) : null;

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    const unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
      // Clear previous listners if any
      unsubs.forEach(unsub => unsub());
      unsubs = [];

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
        }, (err) => {
          if (auth.currentUser) handleFirestoreError(err, OperationType.GET, `users/${authenticatedUser.uid}`);
        });
        unsubs.push(unsubscribeProfile);

        // Sync Investments
        const investmentsQuery = query(collection(db, 'investments'), where('userId', '==', authenticatedUser.uid));
        const unsubscribeInvestments = onSnapshot(investmentsQuery, async (snapshot) => {
          const investments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          setActiveInvestments(investments);
        }, (err) => {
          if (auth.currentUser) handleFirestoreError(err, OperationType.LIST, 'investments');
        });
        unsubs.push(unsubscribeInvestments);

        // Sync Properties
        const propertiesQuery = query(collection(db, 'properties'), where('ownerId', '==', authenticatedUser.uid));
        const unsubscribeProperties = onSnapshot(propertiesQuery, (snapshot) => {
          setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => {
          if (auth.currentUser) handleFirestoreError(err, OperationType.LIST, 'properties');
        });
        unsubs.push(unsubscribeProperties);

        // Sync Trade Logs
        const logsQuery = query(collection(db, 'tradeLogs'), where('userId', '==', authenticatedUser.uid));
        const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
          const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTradeLogs(logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }, (err) => {
          if (auth.currentUser) handleFirestoreError(err, OperationType.LIST, 'tradeLogs');
        });
        unsubs.push(unsubscribeLogs);

        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setActiveInvestments([]);
        setProperties([]);
        setTradeLogs([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const timer = setInterval(async () => {
      const now = Date.now();
      setCurrentTime(now);
      
      // Proactive maturation check
      const readyToComplete = activeInvestments.filter(inv => 
        inv.status === 'En route' && inv.expiresAt && inv.expiresAt <= now
      );

      if (readyToComplete.length > 0 && !isProcessing) {
        setIsProcessing(true);
        try {
          const batch = writeBatch(db);
          const completions: any[] = [];

          for (const inv of readyToComplete) {
            const profitAmount = Math.floor(inv.amount * (1 + (inv.profit || 0) / 100));
            
            // Update investment
            batch.update(doc(db, 'investments', inv.id), {
              status: 'Completed',
              updatedAt: serverTimestamp()
            });

            // Update user balance
            batch.update(doc(db, 'users', user.uid), {
              balance: increment(profitAmount),
              updatedAt: serverTimestamp()
            });

            // Log completion
            const logRef = doc(collection(db, 'tradeLogs'));
            batch.set(logRef, {
              userId: user.uid,
              userName: profile.name,
              routeName: getRouteName(inv.routeId),
              amount: inv.amount,
              profitPercent: inv.profit,
              profitDinars: profitAmount - inv.amount,
              type: 'completion',
              timestamp: new Date().toISOString()
            });

            completions.push({
              id: `${inv.id}-${Date.now()}`,
              name: getRouteName(inv.routeId),
              profit: profitAmount - inv.amount,
              amount: inv.amount
            });
          }

          await batch.commit();
          
          setPersistentNotifications(prev => [...prev, ...completions]);
          
          // Auto hide after 5 seconds
          completions.forEach(c => {
            setTimeout(() => {
              setPersistentNotifications(prev => prev.filter(n => n.id !== c.id));
            }, 5000);
          });

        } catch (err) {
          console.error("Failed to process batch maturation:", err);
        } finally {
          setIsProcessing(false);
        }
      }

      // Periodically notify about rent
      properties.forEach(prop => {
        const lastCollected = prop.lastRentCollectedAt?.toMillis() || prop.purchasedAt?.toMillis() || now;
        if (now - lastCollected >= 3600000) { // 1 hour
          const hours = Math.floor((now - lastCollected) / 3600000);
          if (hours > 0 && !persistentNotifications.some(n => n.id === `rent-${prop.id}`)) {
            const rentNotif = {
              id: `rent-${prop.id}`,
              name: prop.name,
              profit: hours * Math.floor(prop.price * 0.05),
              type: 'rent'
            };
            setPersistentNotifications(prev => [...prev, rentNotif]);
          }
        }
      });
    }, 2000); // Check every 2 seconds for batch processing
    return () => clearInterval(timer);
  }, [activeInvestments, properties, user, profile, isProcessing, persistentNotifications, lang]);

  const handleInvest = async (amount: number, name: string, routeId: string, profit: number, durationMinutes: number) => {
    if (!profile || !user || isProcessing) return;
    
    const totalCost = amount * tradeQuantity;
    
    if (profile.balance >= totalCost) {
      setIsProcessing(true);
      try {
        const maturationTime = durationMinutes * 60 * 1000;
        const expiresAt = Date.now() + maturationTime;
        const startTime = Date.now();

        const batch = writeBatch(db);

        // Add multiple investments if quantity > 1
        for (let i = 0; i < tradeQuantity; i++) {
          const invRef = doc(collection(db, 'investments'));
          batch.set(invRef, {
            userId: user.uid,
            name: `${name} ${tradeQuantity > 1 ? `(#${i+1})` : ''}`,
            amount,
            profit,
            status: 'En route',
            routeId,
            startTime,
            expiresAt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Log each trade
          const logRef = doc(collection(db, 'tradeLogs'));
          batch.set(logRef, {
            userId: user.uid,
            userName: profile.name,
            routeName: getRouteName(routeId),
            amount,
            type: 'start',
            timestamp: new Date().toISOString()
          });
        }
        
        // Update user balance atomically
        batch.update(doc(db, 'users', user.uid), {
          balance: increment(-totalCost),
          updatedAt: serverTimestamp()
        });

        await batch.commit();
        
        setNotification({ 
          type: 'success', 
          message: lang === 'ar' 
            ? `بدأت ${tradeQuantity} رحلات ${name}.` 
            : `Started ${tradeQuantity} ${name} convoys successfully.` 
        });
        setConfirmingTrade(null);
        setTradeQuantity(1);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'investments');
      } finally {
        setIsProcessing(false);
      }
    } else {
      setNotification({ type: 'error', message: t.balance + ' ' + (lang === 'ar' ? 'غير كافية' : 'insufficient') });
      setConfirmingTrade(null);
    }
  };

  const handlePurchase = async (item: { id: string, name: string, price: number, type?: string, category?: string }) => {
    if (!profile || !user) return;

    if (profile.balance >= item.price) {
      try {
        const propertyData = {
          ownerId: user.uid,
          itemId: item.id,
          name: item.name,
          type: item.type || 'house',
          category: item.category || 'General',
          price: item.price,
          purchasedAt: serverTimestamp(),
          lastRentCollectedAt: serverTimestamp()
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

  const handleSellProperty = async (propId: string, name: string, marketValue: number) => {
    if (!profile || !user || isProcessing) return;
    
    const sellPrice = Math.floor(marketValue * 0.9);
    
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'properties', propId));
      batch.update(doc(db, 'users', user.uid), {
        balance: increment(sellPrice),
        updatedAt: serverTimestamp()
      });

      // Log the sale
      const logRef = doc(collection(db, 'tradeLogs'));
      batch.set(logRef, {
        userId: user.uid,
        userName: profile.name,
        routeName: name,
        amount: sellPrice,
        type: 'sell',
        timestamp: new Date().toISOString()
      });

      await batch.commit();
      setNotification({ type: 'success', message: lang === 'ar' ? `تم بيع ${name} بنجاح` : `Sold ${name} successfully` });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'properties');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCollectRent = async (propId: string, name: string, marketValue: number, currentRent: number) => {
    if (!profile || !user || isProcessing || currentRent <= 0) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'properties', propId), {
        lastRentCollectedAt: serverTimestamp()
      });
      batch.update(doc(db, 'users', user.uid), {
        balance: increment(currentRent),
        updatedAt: serverTimestamp()
      });

      // Log the rent
      const logRef = doc(collection(db, 'tradeLogs'));
      batch.set(logRef, {
        userId: user.uid,
        userName: profile.name,
        routeName: `${name} (Rent)`,
        amount: currentRent,
        type: 'rent',
        timestamp: new Date().toISOString()
      });

      await batch.commit();
      setNotification({ type: 'success', message: lang === 'ar' ? `تم تحصيل إيجار ${currentRent} ${t.currency}` : `Collected ${currentRent} ${t.currency} rent` });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'properties');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAssets = async () => {
    if (!profile || !user || isProcessing) return;
    
    const confirmed = window.confirm(lang === 'ar' 
      ? 'هل أنت متأكد من حذف جميع ممتلكاتك وبدء صفحة جديدة؟ هذا الإجراء ضروري في حالة حدوث "قلتش" ولا يمكن التراجع عنه.' 
      : 'Are you sure you want to delete ALL your assets and start fresh? This is useful if your data is "glitched" and cannot be undone.'
    );

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      // Fetch fresh to be sure
      const q = query(collection(db, 'properties'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(propDoc => {
        batch.delete(propDoc.ref);
      });
      
      // Also reset balance if requested? Use user prompt context: "problem".
      // Let's just stick to properties for now.
      
      await batch.commit();
      setNotification({ type: 'success', message: lang === 'ar' ? 'تمت عملية التنظيف بنجاح' : 'Cleanup completed successfully' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'properties');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: newName.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingName(false);
      setNotification({ type: 'success', message: lang === 'ar' ? 'تم تحديث الاسم بنجاح' : 'Name updated successfully' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const ACHIEVEMENTS = [
    { id: 'first_gold', icon: Coins, title: lang === 'ar' ? 'تاجر طموح' : 'Ambitious Trader', desc: lang === 'ar' ? 'تجاوز رصيدك 150,000 دينار' : 'Balance exceeded 150,000 Dinars', check: (p: any, props: any[], logs: any[]) => p?.balance >= 150000, reward: 5000 },
    { id: 'landlord', icon: Home, title: lang === 'ar' ? 'صاحب الأملاك' : 'Estate Mogul', desc: lang === 'ar' ? 'امتلك 3 عقارات' : 'Own 3 properties', check: (p: any, props: any[], logs: any[]) => props.filter(pr => pr.type === 'house').length >= 3, reward: 10000 },
    { id: 'mariner', icon: Ship, title: lang === 'ar' ? 'قبطان البحار' : 'Sea Captain', desc: lang === 'ar' ? 'امتلك سفينة البحر الأحمر' : 'Own a Red Sea Dhow', check: (p: any, props: any[], logs: any[]) => props.some(pr => pr.itemId === 'red-sea-dhow'), reward: 15000 },
    { id: 'sultan_wealth', icon: Crown, title: lang === 'ar' ? 'ثروة سلطان' : 'Sultan Wealth', desc: lang === 'ar' ? 'تجاوز رصيدك 500,000 دينار' : 'Balance exceeded 500,000 Dinars', check: (p: any, props: any[], logs: any[]) => p?.balance >= 500000, reward: 50000 },
    { id: 'industrialist', icon: Gem, title: lang === 'ar' ? 'رائد أعمال' : 'Industrialist', desc: lang === 'ar' ? 'امتلك قافلة الصحراء' : 'Own a Desert Caravan', check: (p: any, props: any[], logs: any[]) => props.some(pr => pr.itemId === 'desert-caravan'), reward: 25000 },
    { id: 'veteran', icon: TrendingUp, title: lang === 'ar' ? 'تاجر متمرس' : 'Veteran Trader', desc: lang === 'ar' ? 'أكمل 10 رحلات تجارية' : 'Complete 10 trade convoys', check: (p: any, props: any[], logs: any[]) => logs.filter(l => l.type === 'completion').length >= 10, reward: 20000 },
  ];

  const earnedAchievements = profile ? ACHIEVEMENTS.filter(a => a.check(profile, properties, tradeLogs)) : [];
  const totalAssetValue = properties.reduce((acc, p) => acc + (p.price || 0), 0);
  const netWorth = (profile?.balance || 0) + totalAssetValue;

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

  const getTimestampMills = (ts: any) => {
    if (!ts) return Date.now();
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return new Date(ts).getTime();
    return Date.now();
  };

  const BazaarItemCard = ({ item, ownedInstance }: { item: any; ownedInstance?: any; key?: any }) => {
    const isOwned = !!ownedInstance;
    
    // Rent calculation
    const lastCollected = isOwned ? getTimestampMills(ownedInstance.lastRentCollectedAt || ownedInstance.purchasedAt) : 0;
    const hoursElapsed = isOwned ? (currentTime - lastCollected) / (1000 * 60 * 60) : 0;
    const rentableHours = Math.floor(hoursElapsed);
    const currentRent = rentableHours * Math.floor((item.price || 0) * 0.05);

    const propertyMap: Record<string, { en: string, ar: string }> = {
      'oasis-inn': { en: 'Oasis Inn', ar: 'نزل الواحة' },
      'merchant-loft': { en: 'Merchant Loft', ar: 'نزل التاجر' },
      'nomad-tent': { en: 'Nomad Tent', ar: 'خيمة الرحالة' },
      'red-sea-dhow': { en: 'Red Sea Dhow', ar: 'سفينة البحر الأحمر' },
      'desert-caravan': { en: 'Desert Caravan', ar: 'قافلة الصحراء' },
      'swift-camel': { en: 'Swift Camel', ar: 'ناقة سريعة' }
    };

    const localizedName = item.id && propertyMap[item.id] 
      ? propertyMap[item.id][lang] 
      : item.name;

    return (
      <div className={cn(
        "glass-panel p-6 rounded-3xl border transition-all group shadow-sm flex flex-col h-full",
        darkMode ? "bg-black/40 border-gold-900/30 text-gold-50" : "bg-white/90 border-gold-200 text-gray-900",
        isOwned ? (darkMode ? "border-green-900/50" : "border-green-100 ring-1 ring-green-100/50") : ""
      )}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
              darkMode ? "bg-gold-900/20 text-gold-400" : "bg-gold-50 text-gold-700"
            )}>
              {item.type === 'ship' ? <Ship size={24} /> : <Home size={24} />}
            </div>
            <div>
              <h4 className="font-serif font-bold text-lg leading-tight">{localizedName}</h4>
              <p className="text-[10px] text-gold-600 font-black uppercase tracking-widest">{item.category || 'Legacy'}</p>
            </div>
          </div>
          {isOwned && (
            <div className="bg-green-100 text-green-700 text-[8px] font-black uppercase px-2 py-1 rounded-full tracking-wider animate-pulse">
              {t.owned}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-6 flex-1">{item.desc}</p>
        
        <div className="space-y-4 pt-4 border-t border-gold-100/50">
          {!isOwned ? (
            <div className={cn("flex items-center justify-between", lang === 'ar' ? "flex-row-reverse" : "")}>
              <div className={lang === 'ar' ? "text-right" : "text-left"}>
                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">{lang === 'ar' ? 'السعر' : 'Price'}</span>
                <span className="font-bold text-gold-700 text-xl">{item.price} {t.currency}</span>
              </div>
              <button 
                onClick={() => handlePurchase(item)}
                className={cn(
                  "px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition-all transform active:scale-95",
                  item.type === 'ship' 
                    ? "bg-gold-900 text-gold-100 hover:bg-black" 
                    : "bg-gold-500 text-gold-950 hover:bg-gold-400"
                )}
              >
                {item.type === 'house' ? t.rent : t.buy}
              </button>
            </div>
          ) : (
            <>
              <div className={cn("flex items-center justify-between", lang === 'ar' ? "flex-row-reverse" : "")}>
                <div className={lang === 'ar' ? "text-right" : "text-left"}>
                  <span className="text-[10px] text-green-600 font-bold uppercase block mb-0.5">{lang === 'ar' ? 'الإيجار المتراكم' : 'Accumulated Rent'}</span>
                  <span className="font-black text-green-600 text-xl">+{currentRent} {t.currency}</span>
                </div>
                <div className={lang === 'ar' ? "text-left" : "text-right"}>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">{lang === 'ar' ? 'قيمة الأصول' : 'Asset Value'}</span>
                  <span className="font-bold text-gray-600 text-sm">{item.price} {t.currency}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleCollectRent(ownedInstance.id, localizedName, item.price, currentRent)}
                  disabled={rentableHours < 1 || isProcessing}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 disabled:opacity-30 transition-all shadow-md active:scale-95"
                >
                  {lang === 'ar' ? 'تحصيل الإيجار' : 'Collect Rent'}
                </button>
                <button
                  onClick={() => setConfirmingSell({ id: ownedInstance.id, name: localizedName, price: item.price })}
                  disabled={isProcessing}
                  className="px-4 py-3 border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all active:scale-95"
                >
                  {lang === 'ar' ? 'بيع' : 'Sell'}
                </button>
              </div>

              {rentableHours < 1 && (
                <p className="text-[10px] text-gray-400 italic text-center">
                  {lang === 'ar' 
                    ? `يتوفر الإيجار القادم خلال ${Math.ceil(60 - (hoursElapsed % 1) * 60)} دقيقة` 
                    : `Next rent available in ${Math.ceil(60 - (hoursElapsed % 1) * 60)} mins`}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
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
      
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        <header className={cn(
          "h-14 md:h-16 flex items-center justify-between px-4 lg:px-8 border-b backdrop-blur-sm z-30 transition-colors",
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
                {activeTab === 'convoys' && t.myConvoys}
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
              "flex items-center gap-3 px-3 py-1.5 rounded-full border shadow-sm transition-all animate-in fade-in zoom-in duration-500",
              darkMode ? "bg-black/40 border-gold-900/50" : "bg-white border-gold-200"
            )}>
              {userRank && (
                <div className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                  userRank.bgColor,
                  userRank.color,
                  userRank.glow
                )}>
                  <userRank.icon size={12} />
                  <span className="hidden xs:inline">{userRank.title}</span>
                </div>
              )}
              <div className="h-4 w-px bg-gold-200/50 hidden xs:block" />
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gold-100/50 flex items-center justify-center">
                  <Coins size={12} className="text-gold-600" />
                </div>
                <span className={cn(
                  "font-bold text-sm",
                  darkMode ? "text-gold-300" : "text-gold-900"
                )}>
                  {profile.balance.toLocaleString()} <span className="text-gold-600 font-medium hidden sm:inline">{t.balance}</span>
                </span>
              </div>
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
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    notif.type === 'rent' ? "bg-blue-500/20 text-blue-500" : "bg-green-500/20 text-green-500"
                  )}>
                    {notif.type === 'rent' ? <Landmark size={20} /> : <TrendingUp size={20} />}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm leading-tight">
                      {notif.type === 'rent' 
                        ? (lang === 'ar' ? `إيجار متاح: ${notif.name}` : `Rent available: ${notif.name}`)
                        : (lang === 'ar' ? `وصلت قافلة ${notif.name}!` : `Convoy ${notif.name} arrived!`)}
                    </h5>
                    <p className={cn(
                      "text-xs font-bold",
                      notif.type === 'rent' ? "text-blue-500" : "text-green-500"
                    )}>
                      +{notif.profit} <span className="opacity-70">{t.currency}</span> {notif.type === 'rent' ? (lang === 'ar' ? 'إيجار' : 'rent') : (lang === 'ar' ? 'ربح' : 'profit')}
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

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className={cn(
                "fixed top-16 left-1/2 z-[70] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border",
                notification.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="font-bold text-sm">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Modals */}
        <AnimatePresence>
          {confirmingSell && (
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
                  darkMode ? "bg-red-950/90 border-red-900 text-red-50" : "bg-white border-red-100 text-gray-900"
                )}
              >
                <h3 className={cn(
                  "font-serif font-bold text-2xl mb-2 border-b pb-4",
                  darkMode ? "text-red-200 border-red-800" : "text-gray-900 border-red-50"
                )}>
                  {lang === 'ar' ? 'تأكيد البيع' : 'Confirm Sale'}
                </h3>
                <div className="space-y-4 py-6">
                    <div className="flex justify-between items-center">
                      <span className={cn("text-sm font-medium", darkMode ? "text-red-300/60" : "text-gray-500")}>
                        {lang === 'ar' ? 'الأصل' : 'Asset'}
                      </span>
                      <span className="font-bold text-lg">{confirmingSell.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={cn("text-sm font-medium", darkMode ? "text-red-300/60" : "text-gray-500")}>
                        {lang === 'ar' ? 'قيمة السوق' : 'Market Value'}
                      </span>
                      <span className="font-bold text-lg">{confirmingSell.price} {t.currency}</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between",
                      darkMode ? "bg-black/40 border-red-900" : "bg-red-50 border-red-100"
                    )}>
                      <span className={cn("font-bold text-sm tracking-tight text-red-600")}>
                        {lang === 'ar' ? 'سوف تستلم' : 'You will receive'}
                      </span>
                      <span className={cn("font-black text-xl text-red-600")}>
                        {Math.floor(confirmingSell.price * 0.9)} {t.currency}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
                      {lang === 'ar' ? 'رسوم السوق 10% مخصومة' : '10% market fee deducted'}
                    </p>
                    <div className="p-3 bg-red-100/50 border border-red-200 rounded-xl flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-600 shrink-0" />
                      <p className="text-[10px] text-red-700 font-bold leading-tight">
                        {lang === 'ar' 
                          ? 'تنبيه: ستفقد القدرة على تحصيل الإيجار من هذا العقار فور اتمام البيع.' 
                          : 'Warning: You will lose the ability to collect rent from this property immediately upon sale.'}
                      </p>
                    </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmingSell(null)}
                    className={cn(
                      "flex-1 py-4 font-bold transition-colors",
                      darkMode ? "text-red-400 hover:text-red-300" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={() => {
                      handleSellProperty(confirmingSell.id, confirmingSell.name, confirmingSell.price);
                      setConfirmingSell(null);
                    }}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg disabled:bg-gray-400"
                  >
                    {isProcessing ? (lang === 'ar' ? 'جاري التحميل...' : 'Loading...') : (lang === 'ar' ? 'تأكيد البيع' : 'Confirm Sale')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

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
                  "rounded-3xl p-8 max-sm w-full shadow-2xl border transition-colors",
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
                     <span className={cn("text-sm font-medium", darkMode ? "text-gold-400" : "text-gray-500")}>
                       {lang === 'ar' ? 'الكمية' : 'Quantity'}
                     </span>
                     <div className="flex items-center gap-4 bg-gold-100/20 rounded-xl p-1">
                       <button 
                         className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold hover:bg-gold-50 disabled:opacity-50"
                         onClick={() => setTradeQuantity(q => Math.max(1, q - 1))}
                         disabled={isProcessing}
                       >
                         -
                       </button>
                       <span className="font-bold w-4 text-center">{tradeQuantity}</span>
                       <button 
                         className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold hover:bg-gold-50 disabled:opacity-50"
                         onClick={() => setTradeQuantity(q => q + 1)}
                         disabled={isProcessing}
                       >
                         +
                       </button>
                     </div>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className={cn("text-sm font-medium", darkMode ? "text-gold-400" : "text-gray-500")}>{t.entry}</span>
                     <span className="font-bold text-lg">{confirmingTrade.cost * tradeQuantity} {t.currency}</span>
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
                    onClick={() => {
                      setConfirmingTrade(null);
                      setTradeQuantity(1);
                    }}
                    className={cn(
                      "flex-1 py-4 font-bold transition-colors",
                      darkMode ? "text-gold-500 hover:text-gold-300" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={() => handleInvest(confirmingTrade.cost, confirmingTrade.name, confirmingTrade.id, confirmingTrade.profit, confirmingTrade.duration)}
                    disabled={isProcessing || profile.balance < (confirmingTrade.cost * tradeQuantity)}
                    className="flex-1 py-4 bg-gold-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (lang === 'ar' ? 'جاري التحميل...' : 'Loading...') : t.stake}
                  </button>
                </div>
              </motion.div>
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
                className="w-full h-full p-4 md:p-6 flex flex-col"
              >
                <div className="flex-[1.5] md:flex-[3] min-h-0 mb-4 md:mb-6">
                  <TradeMap lang={lang} />
                </div>
                
                {/* Investing Panel */}
                <div className="flex-1 space-y-2 md:space-y-3 h-auto shrink-0 pb-6 overflow-y-auto">
                  {[
                    { id: 'silk-road', name: t.silkRoad, routeName: lang === 'ar' ? 'طريق الحرير العظيم' : 'GREAT SILK ROUTE', color: 'text-red-700', arrowColor: '#b91c1c', cost: 1000, profit: 10, duration: 1 },
                    { id: 'amber-road', name: t.amberRoad, routeName: lang === 'ar' ? 'مسار الكهرمان' : 'AMBER TRAIL', color: 'text-amber-600', arrowColor: '#d97706', cost: 2500, profit: 15, duration: 3 },
                    { id: 'gulf-harbor-sea', name: t.gulfHarbor, routeName: lang === 'ar' ? 'مياه الخليج' : 'GULF WATERS', color: 'text-blue-700', arrowColor: '#1e40af', cost: 5000, profit: 25, duration: 5 }
                  ].map((p, i) => (
                    <div key={i} className="glass-panel px-4 md:px-6 py-3 md:py-4 rounded-[24px] border-gold-100 flex items-center justify-between group hover:border-gold-300 transition-all cursor-pointer shadow-sm bg-white"
                         onClick={() => setConfirmingTrade(p)}>
                      <div className="flex items-center gap-3 md:gap-4 flex-1">
                        <div className="min-w-0">
                          <p className={cn("text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5", p.color)}>{p.routeName}</p>
                          <p className="font-serif font-bold text-lg md:text-xl text-gray-800 tracking-tight truncate">{p.name}</p>
                        </div>
                      </div>

                      {/* Curved Arrow Decoration */}
                      <div className="flex-1 px-4 md:px-8 hidden sm:flex justify-center overflow-visible">
                        <svg width="100" height="40" viewBox="0 0 100 40" fill="none">
                          <path d="M10,10 Q50,40 90,10" stroke={p.arrowColor} strokeWidth="3" strokeLinecap="round" />
                          <path d="M82,10 L90,10 L88,18" stroke={p.arrowColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>

                      <div className={cn("shrink-0 flex flex-col items-end", lang === 'ar' ? "mr-2 md:mr-4" : "ml-2 md:ml-4")}>
                        <p className="text-lg md:text-xl font-bold text-gray-700 mb-1 md:mb-2">{p.cost} {t.currency}</p>
                        <button className="bg-[#4a3728] text-white px-4 md:px-6 py-1.5 md:py-2 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-[#2d2118] transition-colors shadow-md">
                          {t.stake}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'convoys' && (
              <motion.div
                key="convoys"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full h-full p-6 md:p-8 overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto space-y-8">
                  <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-serif font-bold text-3xl text-gold-800">{t.myConvoys}</h3>
                      <p className="text-sm text-gold-600/70">{lang === 'ar' ? 'إدارة رحلاتك عبر الصحراء والبحار' : 'Manage your journeys across sands and seas'}</p>
                    </div>
                    <div className="flex bg-gold-100/30 p-1 rounded-xl w-fit">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gold-200">
                        <TrendingUp size={16} className="text-gold-600" />
                        <span className="font-bold text-sm text-gold-900">
                          {activeInvestments.filter(i => i.status === 'En route').length} {t.activeTab}
                        </span>
                      </div>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 gap-6">
                    {/* Active Convoys List */}
                    <div className="space-y-4">
                      <h4 className="font-display text-lg text-gold-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        {t.activeInvestments}
                      </h4>
                      {activeInvestments.filter(i => i.status === 'En route').length === 0 ? (
                        <div className="glass-panel p-10 rounded-3xl border border-dashed border-gold-300 text-center text-gold-600/50 italic">
                          {t.noInvestments}
                        </div>
                      ) : (
                        activeInvestments.filter(i => i.status === 'En route').map((inv) => {
                          const duration = inv.expiresAt - (inv.startTime || inv.createdAt?.toMillis() || Date.now());
                          const remaining = Math.max(0, inv.expiresAt - currentTime);
                          const progress = Math.min(100, Math.floor(((duration - remaining) / duration) * 100));
                          
                          return (
                            <div key={inv.id} className={cn(
                              "glass-panel p-5 rounded-3xl border transition-all hover:border-gold-400 group bg-white shadow-sm",
                              darkMode ? "bg-black/20 border-gold-900/40" : "border-gold-100",
                              lang === 'ar' ? "text-right" : "text-left"
                            )}>
                              <div className={cn("flex items-center justify-between mb-4", lang === 'ar' ? "flex-row-reverse" : "")}>
                                <div className={cn("flex items-center gap-4", lang === 'ar' ? "flex-row-reverse" : "")}>
                                  <div className="w-12 h-12 rounded-2xl bg-gold-100/50 flex items-center justify-center text-gold-700 shrink-0 group-hover:scale-110 transition-transform">
                                    <Ship size={24} />
                                  </div>
                                  <div>
                                    <p className="font-serif font-bold text-lg text-gray-800">{getRouteName(inv.routeId)}</p>
                                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{t.enRoute}</p>
                                  </div>
                                </div>
                                <div className={lang === 'ar' ? "text-left" : "text-right"}>
                                  <p className="font-bold text-gold-800 text-lg">{inv.amount} {t.currency}</p>
                                  <p className="text-xs font-black text-green-600">+{inv.profit}% {lang === 'ar' ? 'ربح متوقع' : 'Expected Profit'}</p>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-gold-600">
                                  <span>{lang === 'ar' ? 'التقدم' : 'Progress'}</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-gold-100/30 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-gradient-to-r from-gold-500 to-gold-700"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                                <div className={cn("flex items-center justify-between mt-2", lang === 'ar' ? "flex-row-reverse" : "")}>
                                  <span className="text-[9px] text-gray-400">
                                    {lang === 'ar' ? 'الوقت المتبقي: ' : 'Time remaining: '}
                                    {Math.ceil(remaining / 60000)} {Math.ceil(remaining / 60000) === 1 ? t.minute : t.minutes}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Arrived Convoys List */}
                    <div className="space-y-4 pt-4 border-t border-gold-200/50">
                      <h4 className="font-display text-lg text-gold-700 flex items-center gap-2">
                        <CheckCircle2 className="text-green-500" size={18} />
                        {t.historyTab}
                      </h4>
                      {activeInvestments.filter(i => i.status === 'Completed').length === 0 ? (
                        <div className="text-center py-6 text-gold-600/30 text-sm italic">
                          {lang === 'ar' ? 'لا توجد قوافل وصلت بعد.' : 'No convoys have arrived yet.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {activeInvestments.filter(i => i.status === 'Completed')
                            .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
                            .slice(0, 10).map((inv) => (
                            <div key={inv.id} className={cn(
                              "glass-panel p-4 rounded-2xl border bg-white/60 flex items-center justify-between",
                              darkMode ? "bg-black/10 border-gold-900/20" : "border-gold-100",
                              lang === 'ar' ? "flex-row-reverse" : ""
                            )}>
                              <div className={cn("flex items-center gap-3", lang === 'ar' ? "flex-row-reverse" : "")}>
                                <div className="w-10 h-10 rounded-xl bg-green-100/50 flex items-center justify-center text-green-600">
                                  <CheckCircle2 size={20} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-gray-800 truncate">{getRouteName(inv.routeId)}</p>
                                  <p className="text-[9px] text-gray-400">{new Date(inv.updatedAt?.toMillis() || Date.now()).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className={lang === 'ar' ? "text-left" : "text-right"}>
                                <p className="font-black text-green-600 text-sm">+{Math.floor(inv.amount * (inv.profit/100))} {t.currency}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">{t.completed}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'market' && (
              <motion.div
                key="market"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full h-full p-6 md:p-8 overflow-y-auto"
              >
                <div className="max-w-6xl mx-auto space-y-10">
                  <header className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gold-100 pb-6", lang === 'ar' ? "text-right" : "text-left")}>
                    <div>
                      <h3 className="font-serif font-bold text-3xl text-gold-800">{t.bazaar}</h3>
                      <p className="text-sm text-gold-600/70">{lang === 'ar' ? 'امتلك العقارات والسفن لزيادة ثروتك' : 'Acquire estates and vessels to grow your wealth'}</p>
                    </div>
                  </header>

                  <section>
                    <div className={cn("flex items-center gap-3 mb-6", lang === 'ar' ? "flex-row-reverse" : "")}>
                      <Home className="text-gold-600" size={24} />
                      <h3 className="font-display text-2xl text-gold-800">{t.estate}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { id: 'oasis-inn', name: lang === 'ar' ? 'نزل الواحة' : 'Oasis Inn', price: 5000, desc: lang === 'ar' ? 'سكن فاخر في القمر' : 'Luxury living in Al-Qamar', type: 'house', category: 'Luxury' },
                        { id: 'merchant-loft', name: lang === 'ar' ? 'نزل التاجر' : 'Merchant Loft', price: 2500, desc: lang === 'ar' ? 'مساحة مريحة قرب الأسواق' : 'Comfortable space near markets', type: 'house', category: 'Commercial' },
                        { id: 'nomad-tent', name: lang === 'ar' ? 'خيمة الرحالة' : 'Nomad Tent', price: 300, desc: lang === 'ar' ? 'منزل متنقل بسيط' : 'A simple mobile home', type: 'house', category: 'Basic' }
                      ].map((item, idx) => {
                        const ownedInstance = properties.find(p => p.itemId === item.id);
                        return <BazaarItemCard key={idx} item={item} ownedInstance={ownedInstance} />;
                      })}
                    </div>
                  </section>

                  <section>
                    <div className={cn("flex items-center gap-3 mb-6", lang === 'ar' ? "flex-row-reverse" : "")}>
                      <Ship className="text-gold-600" size={24} />
                      <h3 className="font-display text-2xl text-gold-800">{t.vessels}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                      {[
                        { id: 'red-sea-dhow', name: lang === 'ar' ? 'سفينة البحر الأحمر' : 'Red Sea Dhow', price: 8000, desc: lang === 'ar' ? 'سفينة تجارية سريعة' : 'Swift maritime trading ship', type: 'ship', category: 'Elite' },
                        { id: 'desert-caravan', name: lang === 'ar' ? 'قافلة الصحراء' : 'Desert Caravan', price: 12000, desc: lang === 'ar' ? 'ناقلة بضائع ضخمة' : 'Massive goods transporter', type: 'caravan', category: 'Industrial' },
                        { id: 'swift-camel', name: lang === 'ar' ? 'ناقة سريعة' : 'Swift Camel', price: 1200, desc: lang === 'ar' ? 'حيوان توصيل سريع' : 'Quick delivery animal', type: 'caravan', category: 'Basic' }
                      ].map((item, idx) => {
                        const ownedInstance = properties.find(p => p.itemId === item.id);
                        return <BazaarItemCard key={idx} item={item} ownedInstance={ownedInstance} />;
                      })}
                    </div>
                  </section>

                  {/* Any other properties not matched in standard list */}
                  {properties.filter(p => !['oasis-inn', 'merchant-loft', 'nomad-tent', 'red-sea-dhow', 'desert-caravan', 'swift-camel'].includes(p.itemId || '')).length > 0 && (
                    <section>
                      <div className={cn("flex items-center gap-3 mb-6", lang === 'ar' ? "flex-row-reverse" : "")}>
                        <Landmark className="text-gold-600" size={24} />
                        <h3 className="font-display text-2xl text-gold-800">{lang === 'ar' ? 'ممتلكات أخرى' : 'Other Assets'}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                        {properties.filter(p => !['oasis-inn', 'merchant-loft', 'nomad-tent', 'red-sea-dhow', 'desert-caravan', 'swift-camel'].includes(p.itemId || '')).map((prop, idx) => (
                          <BazaarItemCard 
                            key={idx} 
                            item={{ 
                              id: prop.itemId || prop.id, 
                              name: prop.name, 
                              price: prop.price || 0,
                              desc: lang === 'ar' ? 'ممتلكات خاصة' : 'Private Asset',
                              type: prop.type || 'house',
                              category: prop.category || 'Basic'
                            }} 
                            ownedInstance={prop} 
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'wallet' && (
              <motion.div
                key="wallet"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full h-full p-6 md:p-8 overflow-y-auto"
              >
                <div className="max-w-5xl mx-auto space-y-8">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={cn(
                      "glass-panel p-6 rounded-[32px] border relative overflow-hidden",
                      darkMode ? "bg-gold-900/10 border-gold-900/40" : "bg-white border-gold-100"
                    )}>
                      <div className="flex items-center gap-2 mb-4">
                        <Wallet size={16} className="text-gold-600" />
                        <span className="text-[10px] font-black uppercase text-gold-600 tracking-widest">{t.totalWealth}</span>
                      </div>
                      <h4 className="text-3xl font-bold font-serif">{profile.balance.toLocaleString()} {t.currency}</h4>
                      <p className="text-[10px] text-gray-400 mt-2">{lang === 'ar' ? 'السيولة المتاحة' : 'Available Liquidity'}</p>
                    </div>

                    <div className={cn(
                      "glass-panel p-6 rounded-[32px] border relative overflow-hidden",
                      darkMode ? "bg-black/40 border-gold-900/20" : "bg-white border-gold-100"
                    )}>
                      <div className="flex items-center gap-2 mb-4">
                        <Home size={16} className="text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{lang === 'ar' ? 'قيمة الأصول' : 'Asset Value'}</span>
                      </div>
                      <h4 className="text-3xl font-bold font-serif">{totalAssetValue.toLocaleString()} {t.currency}</h4>
                      <p className="text-[10px] text-gray-400 mt-2">{properties.length} {lang === 'ar' ? 'وحدات ممتلكة' : 'Units owned'}</p>
                    </div>

                    <div className={cn(
                      "glass-panel p-6 rounded-[32px] border relative overflow-hidden bg-gradient-to-br from-gold-600 to-gold-800 text-white border-gold-500"
                    )}>
                      <div className="flex items-center gap-2 mb-4">
                        <Crown size={16} className="text-gold-100" />
                        <span className="text-[10px] font-black uppercase text-gold-100 tracking-widest">{lang === 'ar' ? 'صافي الثروة' : 'Net Worth'}</span>
                      </div>
                      <h4 className="text-3xl font-bold font-serif">{netWorth.toLocaleString()} {t.currency}</h4>
                      <p className="text-[10px] text-gold-200 mt-2">{lang === 'ar' ? 'إجمالي قيمة الإمبراطورية' : 'Total Empire Valuation'}</p>
                    </div>
                  </div>

                  {/* Profile & Name Edit */}
                  <div className={cn(
                    "glass-panel p-8 rounded-[40px] border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6",
                    darkMode ? "border-gold-800 bg-gold-900/5" : "border-gold-100 bg-white"
                  )}>
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-20 h-20 rounded-3xl flex items-center justify-center border shadow-xl relative group",
                        userRank?.bgColor || "bg-gold-100",
                        userRank?.borderColor || "border-gold-200",
                        userRank?.color || "text-gold-600"
                      )}>
                        {userRank ? <userRank.icon size={40} /> : <User size={40} />}
                        <div className="absolute -bottom-2 -right-2 bg-gold-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-bold">
                          LEVEL {userRank?.rank || 1}
                        </div>
                      </div>
                      <div>
                        {editingName ? (
                          <div className="flex items-center gap-3">
                            <input 
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              autoFocus
                              className={cn(
                                "text-2xl font-serif font-bold bg-transparent border-b-2 border-gold-600 outline-none w-48",
                                darkMode ? "text-white" : "text-gray-900"
                              )}
                              placeholder={lang === 'ar' ? 'أدخل اسمك' : 'Enter name'}
                            />
                            <button 
                              onClick={handleUpdateName}
                              className="p-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={() => setEditingName(false)}
                              className="p-2 bg-gray-200 text-gray-600 rounded-lg"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <h3 className="text-3xl font-serif font-bold">{profile?.name}</h3>
                            <button 
                              onClick={() => {
                                setNewName(profile?.name || '');
                                setEditingName(true);
                              }}
                              className="text-xs text-gold-600 hover:underline font-bold"
                            >
                              {lang === 'ar' ? 'تعديل' : 'Edit'}
                            </button>
                          </div>
                        )}
                        <p className={cn("text-xs font-medium mt-1", darkMode ? "text-gold-400" : "text-gold-600")}>
                          {userRank?.title} • {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="text-center md:text-right">
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black leading-none mb-1">{lang === 'ar' ? 'الأرباح القادمة' : 'Projected'}</p>
                          <p className="text-2xl font-black text-green-500 leading-none">
                            +{activeInvestments.filter(i => i.status === 'En route').reduce((acc, inv) => acc + Math.floor(inv.amount * (inv.profit / 100)), 0).toLocaleString()}
                          </p>
                        </div>
                    </div>
                  </div>

                  {/* Achievements Container */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-2xl text-gold-800">{lang === 'ar' ? 'الإنجازات والجوائز' : 'Achievements & Honors'}</h4>
                      <div className="px-3 py-1 bg-gold-100 rounded-lg text-gold-700 text-[10px] font-black uppercase">
                        {earnedAchievements.length} / {ACHIEVEMENTS.length} {lang === 'ar' ? 'مكتمل' : 'Unlocked'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ACHIEVEMENTS.map((ach) => {
                        const isEarned = earnedAchievements.some(ea => ea.id === ach.id);
                        return (
                          <div key={ach.id} className={cn(
                            "p-5 rounded-[28px] border transition-all duration-500 group relative overflow-hidden",
                            isEarned 
                              ? (darkMode ? "bg-gold-900/20 border-gold-700/50" : "bg-gold-50 border-gold-200") 
                              : (darkMode ? "bg-black/20 border-white/5 opacity-50 grayscale" : "bg-gray-50 border-gray-100 grayscale opacity-40")
                          )}>
                            <div className="flex items-start gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                                isEarned ? "bg-gold-500 text-gold-950" : "bg-gray-200 text-gray-400"
                              )}>
                                <ach.icon size={24} />
                              </div>
                              <div className="min-w-0">
                                <h5 className={cn("font-bold text-sm leading-tight", isEarned ? "text-gray-900" : "text-gray-400")}>{ach.title}</h5>
                                <p className="text-[10px] text-gray-500 leading-tight mt-1">{ach.desc}</p>
                              </div>
                            </div>
                            {isEarned && (
                              <div className="absolute top-0 right-0 p-2">
                                <CheckCircle2 size={12} className="text-gold-600" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transaction History Relocated */}
                  <div className={cn(
                    "glass-panel rounded-3xl border p-8 shadow-sm transition-colors",
                    darkMode ? "border-gold-800 bg-black/40" : "border-gold-200 bg-white/90"
                  )}>
                    <h4 className="font-display text-xl mb-6 text-gold-600 border-b border-gold-100/10 pb-4">
                      {lang === 'ar' ? 'سجل المعاملات الأخير' : 'Recent Transaction History'}
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
                                log.type === 'start' ? "bg-blue-500/10 text-blue-500" : 
                                log.type === 'rent' ? "bg-indigo-500/10 text-indigo-500" : "bg-amber-500/10 text-amber-500"
                              )}>
                                {log.type === 'completion' ? <CheckCircle2 size={14} /> : 
                                 log.type === 'start' ? <TrendingUp size={14} /> : 
                                 log.type === 'rent' ? <Landmark size={14} /> : <Home size={14} />}
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
                                log.type === 'completion' || log.type === 'rent' ? "text-green-500" : "text-gold-600"
                              )}>
                                {log.type === 'completion' ? `+${log.profitDinars}` : 
                                 log.type === 'rent' ? `+${log.amount}` : `-${log.amount}`} {t.currency}
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
