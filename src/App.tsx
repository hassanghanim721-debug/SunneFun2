/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TradeMap } from './components/TradeMap';
import { BazaarItemCard } from './components/BazaarItemCard';
import { Auth } from './components/Auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Wallet, Coins, Landmark, Ship, Home, TrendingUp, AlertCircle, CheckCircle2, Menu, X, Moon, Sun, Crown, Gem, Store, User, Bell, Skull, ScrollText } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
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
import { TRANSLATIONS, CAPS } from './constants';

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
  const [confirmingSell, setConfirmingSell] = useState<{ ownedInstances: any[], itemId: string, name: string, price: number } | null>(null);
  const [confirmingAssetPurchase, setConfirmingAssetPurchase] = useState<{ item: any, initialQuantity: number } | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [persistentNotifications, setPersistentNotifications] = useState<any[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [tradeLogs, setTradeLogs] = useState<any[]>([]);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [localQuests, setLocalQuests] = useState<any[]>([]);
  const [showRaidNotification, setShowRaidNotification] = useState<{loss: number, survivors: number} | null>(null);
  const [hasProcessedOfflineRaids, setHasProcessedOfflineRaids] = useState(false);
  const [clans, setClans] = useState<any[]>([]);
  const [myClan, setMyClan] = useState<any>(null);
  const [isCreatingClan, setIsCreatingClan] = useState(false);
  const [clanNameInput, setClanNameInput] = useState('');
  const [activeStormRoute, setActiveStormRoute] = useState<string | null>(null);

  // Storm Logic: 15m duration, 45m interval.
  useEffect(() => {
    const checkStorm = () => {
      const now = new Date();
      const mins = now.getMinutes();
      const isStormActive = mins < 15;
      const stormRouteId = (now.getHours() % 2 === 0) ? 'silk-road' : 'amber-road';
      setActiveStormRoute(isStormActive ? stormRouteId : null);
    };

    checkStorm();
    const interval = setInterval(checkStorm, 10000);
    return () => clearInterval(interval);
  }, []);

  const getUserRank = (value: number = 0) => {
    if (value >= 500000) {
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
    if (value >= 100000) {
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

  const totalAssetValue = properties.reduce((acc, p) => acc + (p.price || 0), 0);
  const netWorth = (profile?.balance || 0) + totalAssetValue;
  const isConvoyLeader = netWorth >= 250000;
  const isClanMember = !!profile?.clanId;
  const userRank = profile ? getUserRank(netWorth) : null;

  const hasAutoCollect = (profile?.rentCollectionsCount || 0) >= 10;

  // Continuous increment/decrement logic
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const startCounter = (callback: () => void) => {
    callback(); // Initial call
    const id = setInterval(callback, 100); // 10fps for smooth counting
    setIntervalId(id);
  };

  const stopCounter = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  useEffect(() => {
    return () => stopCounter();
  }, [intervalId]);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS];

  const getRouteIcon = (routeId: string, size = 24) => {
    switch (routeId) {
      case 'silk-road': return <span className="flex items-center justify-center" style={{ fontSize: size * 0.8 }}>🐎</span>;
      case 'amber-road': return <span className="flex items-center justify-center" style={{ fontSize: size * 0.8 }}>🐪</span>;
      default: return <Ship size={size} />;
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch Clans for Leaderboard
    const clansRef = collection(db, 'clans');
    const qClans = query(clansRef); // We'll sort via client-side for simple logic or add order in rules
    
    const unsubscribeClans = onSnapshot(qClans, (snapshot) => {
      const clanList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by member count or wealth (we'll use wealth if we had it, but let's use memberCount for now)
      setClans(clanList.sort((a: any, b: any) => (b.memberWealth || 0) - (a.memberWealth || 0)));
      
      if (profile?.clanId) {
        const myClanData = clanList.find(c => c.id === profile.clanId);
        setMyClan(myClanData);
      }
    });

    return () => unsubscribeClans();
  }, [user, profile?.clanId]);

  const handleJoinClan = async (clanId: string) => {
    if (!user || !profile) return;
    setIsProcessing(true);
    try {
      const clanRef = doc(db, 'clans', clanId);
      const userRef = doc(db, 'users', user.uid);
      
      const batch = writeBatch(db);
      batch.update(userRef, { clanId, updatedAt: serverTimestamp() });
      batch.update(clanRef, { 
        members: increment(1),
        memberWealth: increment(profile.balance || 0)
      });
      
      await batch.commit();
      setNotification({ type: 'success', message: lang === 'ar' ? 'تم الانضمام للنقابة بنجاح!' : 'Successfully joined the clan!' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clans/${clanId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateClan = async (clanName: string) => {
    if (!user || profile?.balance < 50000) {
      setNotification({ type: 'error', message: lang === 'ar' ? 'تحتاج إلى 50,000 دينار لإنشاء نقابة' : 'You need 50,000 Dinars to form a clan' });
      return;
    }
    setIsProcessing(true);
    try {
      const clanRef = doc(collection(db, 'clans'));
      const userRef = doc(db, 'users', user.uid);
      
      const batch = writeBatch(db);
      batch.set(clanRef, {
        name: clanName,
        leaderId: user.uid,
        leaderName: profile.name,
        members: 1,
        memberWealth: profile.balance,
        createdAt: serverTimestamp()
      });
      batch.update(userRef, { 
        clanId: clanRef.id, 
        balance: increment(-50000),
        updatedAt: serverTimestamp() 
      });
      
      await batch.commit();
      setNotification({ type: 'success', message: lang === 'ar' ? 'تم تأسيس النقابة بنجاح!' : 'Clan established successfully!' });
      setActiveTab('clans');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'clans');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
      // Clear previous listeners if any
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      if (authenticatedUser) {
        setLoading(true);
        setUser(authenticatedUser);
        
        // Save user info for faster future login (account remembering)
        localStorage.setItem('qafila_last_user', JSON.stringify({
          uid: authenticatedUser.uid,
          name: authenticatedUser.displayName,
          photo: authenticatedUser.photoURL,
          email: authenticatedUser.email
        }));
        
        // Sync Profile
        const userDocRef = doc(db, 'users', authenticatedUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (!snapshot.exists()) {
            const newProfile = {
              name: authenticatedUser.displayName || 'Noble Trader',
              email: authenticatedUser.email,
              balance: 100000,
              rentCollectionsCount: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            try {
              await setDoc(userDocRef, newProfile);
            } catch (err) {
              setLoading(false);
              handleFirestoreError(err, OperationType.WRITE, `users/${authenticatedUser.uid}`);
            }
          } else {
            const data = snapshot.data();
            setProfile(data);
            localStorage.setItem('qafila_cached_profile', JSON.stringify(data));

            // BANDIT MECHANIC: Lazy Calculation
            if (data.lastActiveAt) {
              if (!hasProcessedOfflineRaids) {
                setHasProcessedOfflineRaids(true);
                const lastActive = new Date(data.lastActiveAt).getTime();
                const now = Date.now();
                const hoursOffline = (now - lastActive) / (1000 * 60 * 60);

                if (hoursOffline >= 6 && !data.clanId) {
                  // Raid chance: 30% if offline > 6h
                  if (Math.random() < 0.3) {
                    const lossPercent = 0.02 + Math.random() * 0.03; // 2-5%
                    const raidLoss = Math.floor(data.balance * lossPercent);
                    
                    if (raidLoss > 0) {
                      const newBalance = data.balance - raidLoss;
                      updateDoc(userDocRef, {
                        balance: newBalance,
                        updatedAt: serverTimestamp(),
                        lastActiveAt: new Date().toISOString()
                      });
                      
                      // Log the raid
                      const logRef = doc(collection(db, 'tradeLogs'));
                      setDoc(logRef, {
                        userId: authenticatedUser.uid,
                        userName: data.name,
                        routeName: lang === 'ar' ? 'غارة اللصوص' : 'Bandit Raid',
                        amount: raidLoss,
                        type: 'raid',
                        timestamp: new Date().toISOString()
                      });
                      
                      setShowRaidNotification({ loss: raidLoss, survivors: 0 });
                    }
                  } else {
                    updateDoc(userDocRef, { lastActiveAt: new Date().toISOString() });
                  }
                } else if (hoursOffline >= 0.5) {
                   updateDoc(userDocRef, { lastActiveAt: new Date().toISOString() });
                }
              }
            } else {
              // No lastActiveAt yet, set it
              updateDoc(userDocRef, { lastActiveAt: new Date().toISOString() });
              setHasProcessedOfflineRaids(true);
            }

            // Sync Quests session
            if (!data.quests || isNewDay(data.quests.lastQuestReset)) {
              const freshQuests = [
                { id: 'q1', type: 'trade', target: 3, current: 0, completed: false, claimable: false, title: lang === 'ar' ? 'تاجر نشط' : 'Active Trader', desc: lang === 'ar' ? 'أكمل 3 رحلات تجارية' : 'Complete 3 trade convoys', reward: 5000 },
                { id: 'q2', type: 'wealth', target: 150000, current: data.balance, completed: data.balance >= 150000, claimable: data.balance >= 150000, title: lang === 'ar' ? 'جامع الذهب' : 'Gold Hoarder', desc: lang === 'ar' ? 'صل إلى 150,000 دينار' : 'Reach 150,000 Dinars', reward: 10000 },
                { id: 'q3', type: 'property', target: 1, current: properties.length, completed: properties.length >= 1, claimable: properties.length >= 1, title: lang === 'ar' ? 'صاحب عقار' : 'Landlord', desc: lang === 'ar' ? 'امتلك عقاراً واحداً' : 'Own 1 property', reward: 7500 }
              ];
              setLocalQuests(freshQuests);
            } else {
              setLocalQuests(data.quests.dailyQuests || []);
            }

            setLoading(false);
          }
        }, (err) => {
          setLoading(false);
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

        // Sync Global Stats
        const statsDocRef = doc(db, 'globalState', 'propertyStats');
        const unsubscribeStats = onSnapshot(statsDocRef, (snapshot) => {
          if (!snapshot.exists()) {
            setDoc(statsDocRef, {
              'nomad-tent': 0,
              'merchant-loft': 0,
              'oasis-inn': 0,
              'royal-castle': 0,
              'red-sea-dhow': 0,
              'desert-caravan': 0
            }).catch(() => {});
          } else {
            setGlobalStats(snapshot.data());
          }
        }, (err) => {
          if (auth.currentUser) handleFirestoreError(err, OperationType.GET, 'globalState/propertyStats');
        });
        unsubs.push(unsubscribeStats);
      } else {
        // If logged out, clear everything
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

  // UI Timer: Updates current time every second for countdowns.
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Maturation & Rent Timer: Processes maturation and updates/notifications every 15 seconds.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!profile || !user) return;
      const now = Date.now();
      
      // Proactive maturation check for trades
      const readyToCompletePool = activeInvestments.filter(inv => 
        inv.status === 'En route' && inv.expiresAt && inv.expiresAt <= now
      );

      if (readyToCompletePool.length > 0 && !isProcessing) {
        setIsProcessing(true);
        try {
          // Process in chunks of 150 to stay under 500 op limit (2 ops per inv + 1 profile update = 301 ops)
          const readyToComplete = readyToCompletePool.slice(0, 150);
          const batch = writeBatch(db);
          const completions: any[] = [];
          let totalIncrement = 0;

          for (const inv of readyToComplete) {
            const profitTotal = Math.floor(inv.amount * (1 + (inv.profit || 0) / 100));
            totalIncrement += profitTotal;
            
            // Update investment
            batch.update(doc(db, 'investments', inv.id), {
              status: 'Completed',
              updatedAt: serverTimestamp()
            });

            // Log completion
            const logRef = doc(collection(db, 'tradeLogs'));
            batch.set(logRef, {
              userId: user.uid,
              userName: profile?.name || 'Trader',
              routeName: getRouteName(inv.routeId),
              amount: inv.amount,
              profitPercent: inv.profit,
              profitDinars: profitTotal - inv.amount,
              type: 'completion',
              timestamp: new Date().toISOString()
            });

            completions.push({
              id: `${inv.id}-${Date.now()}-${inv.id.substring(0,4)}`,
              name: getRouteName(inv.routeId),
              profit: profitTotal - inv.amount,
              amount: inv.amount
            });
          }

          // Single aggregate update for user balance (Avoids "500 field transforms" error)
          batch.update(doc(db, 'users', user.uid), {
            balance: increment(totalIncrement),
            updatedAt: serverTimestamp()
          });

          await batch.commit();
          
          if (completions.length > 0) {
            updateQuestProgress('trade', completions.length);
          }
          
          setPersistentNotifications(prev => [...prev, ...completions]);
          
        } catch (err) {
          console.error("Failed to process batch maturation:", err);
        } finally {
          setIsProcessing(false);
        }
      }

      // Periodically notify about rent or auto-collect
      const autoCollectIds: string[] = [];
      let autoCollectTotalRent = 0;

      properties.forEach(prop => {
        const lastCollected = getTimestampMills(prop.lastRentCollectedAt || prop.purchasedAt);
        const hours = Math.floor((now - lastCollected) / 3600000);
        
        if (hours > 0) {
          const currentRent = hours * Math.floor(prop.price * 0.05);
          
          if (hasAutoCollect) {
            autoCollectIds.push(prop.id);
            autoCollectTotalRent += currentRent;
          } else if (!dismissedNotifications.has(`rent-${prop.id}`) && !persistentNotifications.some(n => n.id === `rent-${prop.id}`)) {
            const rentNotif = {
              id: `rent-${prop.id}`,
              name: prop.name,
              profit: currentRent,
              type: 'rent'
            };
            setPersistentNotifications(prev => [...prev, rentNotif]);
          }
        }
      });

      if (autoCollectIds.length > 0 && !isProcessing) {
        // Collect in chunks of 450 to stay under 500 op limit
        for (let i = 0; i < autoCollectIds.length; i += 450) {
          const chunk = autoCollectIds.slice(i, i + 450);
          const chunkRent = properties
            .filter(p => chunk.includes(p.id))
            .reduce((sum, p) => {
              const lastC = getTimestampMills(p.lastRentCollectedAt || p.purchasedAt);
              const hrs = Math.floor((now - lastC) / 3600000);
              return sum + (hrs * Math.floor(p.price * 0.05));
            }, 0);
          
          handleCollectRent(chunk, lang === 'ar' ? 'مجموعة عقارات' : 'Multiple Assets', 0, chunkRent, true);
        }
      }
    }, 15000); // Check every 15 seconds for database operations
    return () => clearInterval(timer);
  }, [activeInvestments, properties, user, profile, isProcessing, persistentNotifications, lang]);

  const updateQuestProgress = (type: string, incrementValue: number = 1) => {
    setLocalQuests(prev => {
      const updated = prev.map(q => {
        if (q.type === type && !q.completed) {
          const newCurrent = type === 'wealth' ? (profile?.balance || 0) : q.current + incrementValue;
          const completed = newCurrent >= q.target;
          return { ...q, current: newCurrent, completed, claimable: completed };
        }
        return q;
      });
      return updated;
    });
  };

  useEffect(() => {
    if (profile) {
      updateQuestProgress('wealth', profile.balance);
      updateQuestProgress('property', properties.length);
    }
  }, [profile?.balance, properties.length]);

  const claimQuestReward = async (questId: string) => {
    const quest = localQuests.find(q => q.id === questId);
    if (!quest || !quest.claimable || !user) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      
      const updatedQuests = localQuests.map(q => q.id === questId ? { ...q, claimable: false, completed: true, status: 'claimed' } : q);
      
      batch.update(userRef, {
        balance: increment(quest.reward),
        'quests.dailyQuests': updatedQuests,
        'quests.lastQuestReset': new Date().toISOString(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      setLocalQuests(updatedQuests);
      setNotification({ type: 'success', message: lang === 'ar' ? `تم استلام مكافأة ${quest.reward} د!` : `Claimed ${quest.reward} D reward!` });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const ensureAuthenticated = async () => {
    if (auth.currentUser) return true;
    
    // Trigger Google login now
    setNotification({ 
      type: 'success', 
      message: lang === 'ar' ? 'يرجى تأكيد هويتك للمتابعة...' : 'Please verify your identity to continue...' 
    });
    
    try {
      const provider = new GoogleAuthProvider();
      if (user?.email) {
        provider.setCustomParameters({
          login_hint: user.email
        });
      }
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setUser(result.user);
        return true;
      }
    } catch (err) {
      console.error("lazy auth failed", err);
      setNotification({ type: 'error', message: lang === 'ar' ? 'فشل التحقق من الهوية' : 'Identity verification failed' });
    }
    return false;
  };

  const handleInvest = async (amount: number, name: string, routeId: string, profit: number, durationMinutes: number) => {
    if (!profile || !user || isProcessing) return;
    
    const isVerified = await ensureAuthenticated();
    if (!isVerified) return;

    const totalCost = amount * tradeQuantity;

    // Sandstorm Modifiers
    let finalProfit = profit;
    let finalDuration = durationMinutes;
    let isHitByStorm = false;

    if (activeStormRoute) {
      if (activeStormRoute === routeId) {
        // Hit by storm: "Stop and wait" + risk
        isHitByStorm = true;
        finalDuration += 10; // 10m stop and wait
        const riskChance = Math.random() < 0.05; // 5% chance
        if (riskChance) {
          finalProfit = Math.max(0, profit - 15); // lose 15% profit
        }
      } else if (routeId !== 'gulf-harbor-sea') {
        // "Other" route (not sea): Bonus profit + delay
        finalProfit += 50;
        finalDuration += 5;
      }
    }
    
    if (profile.balance >= totalCost) {
      setIsProcessing(true);
      try {
        const maturationTime = finalDuration * 60 * 1000;
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
            profit: finalProfit,
            status: isHitByStorm ? 'Waiting (Storm)' : 'En route',
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

  const handlePurchase = async (item: { id: string, name: string, price: number, type?: string, category?: string }, quantity: number = 1) => {
    if (!profile || !user || isProcessing) return;

    const isVerified = await ensureAuthenticated();
    if (!isVerified) return;

    const currentCount = globalStats?.[item.id] || 0;
    const cap = CAPS[item.id] || 999999;

    if (currentCount + quantity > cap) {
      setNotification({ 
        type: 'error', 
        message: lang === 'ar' 
          ? 'المخزون غير كافٍ للكمية المطلوبة!' 
          : 'Stock insufficient for requested quantity!' 
      });
      return;
    }

    const totalCost = item.price * quantity;

    if (profile.balance >= totalCost) {
      if (item.id === 'royal-castle' && !isConvoyLeader) {
        setNotification({ 
          type: 'error', 
          message: lang === 'ar' 
            ? 'يجب أن تكون "قائد قافلة" (رصيد 250,000) لامتلاك القصور الملكية.' 
            : 'You must be a "Convoy Leader" (250,000 balance) to own Royal Castles.' 
        });
        return;
      }

      setIsProcessing(true);
      try {
        const batch = writeBatch(db);
        
        for (let i = 0; i < quantity; i++) {
          const propertyRef = doc(collection(db, 'properties'));
          batch.set(propertyRef, {
            ownerId: user.uid,
            itemId: item.id,
            name: item.name,
            type: item.type || 'house',
            category: item.category || 'General',
            price: item.price,
            purchasedAt: serverTimestamp(),
            lastRentCollectedAt: serverTimestamp()
          });
        }

        batch.update(doc(db, 'users', user.uid), {
          balance: increment(-totalCost),
          updatedAt: serverTimestamp()
        });

        // Update global count
        batch.update(doc(db, 'globalState', 'propertyStats'), {
          [item.id]: increment(quantity)
        });

        // Log purchase
        const logRef = doc(collection(db, 'tradeLogs'));
        batch.set(logRef, {
          userId: user.uid,
          userName: profile.name,
          routeName: item.name,
          amount: totalCost,
          quantity: quantity,
          type: 'purchase',
          timestamp: new Date().toISOString()
        });

        await batch.commit();
        setNotification({ type: 'success', message: lang === 'ar' ? `تم امتلاك ${quantity > 1 ? quantity + ' وحدات من' : ''} ${item.name} بنجاح!` : `${quantity > 1 ? quantity + ' units of ' : ''}${item.name} acquired successfully!` });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'properties');
      } finally {
        setIsProcessing(false);
      }
    } else {
      setNotification({ type: 'error', message: lang === 'ar' ? 'يطلب التاجر المزيد من الذهب لهذا.' : 'The Merchant demands more gold for this.' });
    }
  };

  const handleSellProperty = async (propIds: string[], itemId: string, name: string, marketValue: number) => {
    if (!profile || !user || isProcessing || propIds.length === 0) return;
    
    const quantity = propIds.length;
    const sellPrice = Math.floor(marketValue * 0.9 * quantity);
    
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      propIds.forEach(id => {
        batch.delete(doc(db, 'properties', id));
      });
      
      batch.update(doc(db, 'users', user.uid), {
        balance: increment(sellPrice),
        updatedAt: serverTimestamp()
      });

      // Update global count (it returns to the bank)
      batch.update(doc(db, 'globalState', 'propertyStats'), {
        [itemId]: increment(-quantity)
      });

      // Log the sale
      const logRef = doc(collection(db, 'tradeLogs'));
      batch.set(logRef, {
        userId: user.uid,
        userName: profile.name,
        routeName: quantity > 1 ? `${name} x${quantity}` : name,
        amount: sellPrice,
        type: 'sell',
        timestamp: new Date().toISOString()
      });

      await batch.commit();
      setNotification({ type: 'success', message: lang === 'ar' ? `تم بيع ${quantity > 1 ? quantity + ' وحدات' : name} بنجاح` : `Sold ${quantity > 1 ? quantity + ' units' : name} successfully` });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'properties');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCollectRent = async (propId: string | string[], name: string, marketValue: number, totalRent: number, isAuto: boolean = false) => {
    if (!profile || !user || isProcessing || totalRent <= 0) return;

    if (!isAuto) {
      const isVerified = await ensureAuthenticated();
      if (!isVerified) return;
      setIsProcessing(true);
    }
    
    try {
      const batch = writeBatch(db);
      const propIds = Array.isArray(propId) ? propId : [propId];
      
      propIds.forEach(id => {
        batch.update(doc(db, 'properties', id), {
          lastRentCollectedAt: serverTimestamp()
        });
      });

      batch.update(doc(db, 'users', user.uid), {
        balance: increment(totalRent),
        rentCollectionsCount: increment(propIds.length),
        updatedAt: serverTimestamp()
      });

      // Log the rent
      const logRef = doc(collection(db, 'tradeLogs'));
      batch.set(logRef, {
        userId: user.uid,
        userName: profile.name,
        routeName: `${name} (${isAuto ? 'Auto' : ''} Rent${propIds.length > 1 ? ' x' + propIds.length : ''})`,
        amount: totalRent,
        type: 'rent',
        timestamp: new Date().toISOString()
      });

      await batch.commit();
      if (!isAuto) {
        setNotification({ type: 'success', message: lang === 'ar' ? `تم تحصيل إيجار ${totalRent} ${t.currency}` : `Collected ${totalRent} ${t.currency} rent` });
      }
    } catch (err) {
      if (!isAuto) handleFirestoreError(err, OperationType.UPDATE, 'properties');
    } finally {
      if (!isAuto) setIsProcessing(false);
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
    { id: 'master_collector', icon: Bell, title: lang === 'ar' ? 'جامع الإيجار المحترف' : 'Master Collector', desc: lang === 'ar' ? 'حصل الإيجار 10 مرات لفتح التحصيل التلقائي' : 'Collect rent 10 times to unlock Auto-Collect', check: (p: any, props: any[], logs: any[]) => (p?.rentCollectionsCount || 0) >= 10, reward: 5000 },
  ];

  const earnedAchievements = profile ? ACHIEVEMENTS.filter(a => a.check(profile, properties, tradeLogs)) : [];

  const groupedActiveConvoys = useMemo(() => {
    const groups: Record<string, any> = {};
    activeInvestments
      .filter(i => i.status === 'En route')
      .forEach(inv => {
        if (!groups[inv.routeId]) {
          groups[inv.routeId] = {
            routeId: inv.routeId,
            count: 0,
            totalAmount: 0,
            totalProfit: 0,
            nextMaturing: inv,
            status: inv.status,
          };
        }
        groups[inv.routeId].count++;
        groups[inv.routeId].totalAmount += inv.amount;
        groups[inv.routeId].totalProfit += Math.floor(inv.amount * (inv.profit / 100));
        
        if (inv.expiresAt < groups[inv.routeId].nextMaturing.expiresAt) {
          groups[inv.routeId].nextMaturing = inv;
        }
      });
    return Object.values(groups);
  }, [activeInvestments]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, any> = {};
    persistentNotifications.forEach(notif => {
      const key = notif.type === 'rent' ? `rent-${notif.id}` : `convoy-${notif.name}`;
      if (!groups[key]) {
        groups[key] = { ...notif, count: 1, originalIds: [notif.id] };
      } else {
        groups[key].profit += notif.profit;
        groups[key].count += 1;
        groups[key].originalIds.push(notif.id);
      }
    });
    return Object.values(groups);
  }, [persistentNotifications]);

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
    return (t[map[routeId] || 'silkRoad'] as string) || routeId;
  };

  const isNewDay = (lastDateStr: string) => {
    if (!lastDateStr) return true;
    const lastDate = new Date(lastDateStr);
    const now = new Date();
    return lastDate.getDate() !== now.getDate() || lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear();
  };

  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() && 
           d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  };

  const getTimestampMills = (ts: any) => {
    if (!ts) return Date.now();
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return new Date(ts).getTime();
    return Date.now();
  };

  // Synchronize Quests reactively
  useEffect(() => {
    if (!profile || !user || localQuests.length === 0) return;
    
    let hasChanged = false;
    const updatedQuests = localQuests.map(q => {
      let current = q.current;
      if (q.id === 'q1') { // trades
        const todayLogs = tradeLogs.filter(l => l.type === 'invest' && isToday(l.timestamp));
        current = todayLogs.length;
      } else if (q.id === 'q2') { // wealth
        current = profile.balance;
      } else if (q.id === 'q3') { // property
        current = properties.length;
      }
      
      const completed = current >= q.target;
      const claimable = completed && q.status !== 'claimed';
      
      if (current !== q.current || completed !== q.completed || claimable !== q.claimable) {
        hasChanged = true;
        return { ...q, current, completed, claimable };
      }
      return q;
    });

    if (hasChanged) {
      setLocalQuests(updatedQuests);
    }
  }, [profile?.balance, properties.length, tradeLogs, localQuests.length]);

  const renderBazaarItem = (item: any) => {
    const ownedInstances = properties.filter(p => p.itemId === item.id);
    return (
      <BazaarItemCard 
        key={item.id}
        item={item} 
        ownedInstances={ownedInstances}
        currentTime={currentTime}
        isConvoyLeader={isConvoyLeader}
        lang={lang}
        t={t}
        globalStats={globalStats}
        darkMode={darkMode}
        isProcessing={isProcessing}
        onPurchase={(item: any) => {
          setModalQuantity(1);
          setConfirmingAssetPurchase({ item, initialQuantity: 1 });
        }}
        onSell={(owned: any[], localizedName: string) => {
          setModalQuantity(1);
          setConfirmingSell({ ownedInstances: owned, itemId: item.id, name: localizedName, price: item.price });
        }}
        onCollectRent={handleCollectRent}
      />
    );
  };

  const onAuthComplete = (authenticatedUser: any) => {
    setLoading(true);
    setUser(authenticatedUser);
    // Note: App.tsx's onAuthStateChanged listener will catch this and load the profile
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-parchment flex items-center justify-center">
        <Landmark size={48} className="text-gold-600 animate-bounce" />
      </div>
    );
  }

  if (!user || (!profile && user)) {
    return <Auth lang={lang} setLang={setLang} onAuthComplete={onAuthComplete} />;
  }

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div className={cn(
      "flex h-screen w-full overflow-hidden font-sans relative transition-colors duration-500",
      darkMode ? "dark bg-[#1a1410] text-gold-50" : "bg-parchment text-gray-900",
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
          "h-14 md:h-20 flex items-center justify-between px-3 md:px-8 border-b backdrop-blur-md z-30 transition-all",
          darkMode ? "bg-black/60 border-gold-900/30" : "bg-white/70 border-gold-600/10"
        )}>
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={cn(
                "lg:hidden p-2 rounded-xl transition-colors",
                darkMode ? "text-gold-400 hover:bg-gold-900/20" : "text-gold-700 hover:bg-gold-50"
              )}
            >
              <Menu size={20} className="md:w-6 md:h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Landmark size={18} className="text-gold-600 hidden sm:block" />
              <h2 className={cn(
                "font-serif font-black text-base md:text-2xl italic truncate",
                darkMode ? "text-gold-200" : "text-gray-800"
              )}>
                {activeTab === 'map' && t.routes}
                {activeTab === 'market' && t.bazaar}
                {activeTab === 'wallet' && t.wealth}
                {activeTab === 'convoys' && t.myConvoys}
                {activeTab === 'quests' && t.quests}
                {activeTab === 'clans' && t.clans}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-4 max-w-[60%] sm:max-w-none">
            <div className="flex items-center gap-1 md:gap-2">
              <div className="relative">
                <button
                  onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
                  className={cn(
                    "p-2 md:p-2.5 rounded-full transition-all duration-300 relative",
                    darkMode ? "bg-gold-900/30 text-gold-300 hover:bg-gold-900/50" : "bg-gold-100 text-gold-700 hover:bg-gold-200",
                    isNotificationMenuOpen ? (darkMode ? "bg-gold-900/60" : "bg-gold-300") : ""
                  )}
                >
                  <Bell size={14} className="md:w-5 md:h-5" />
                  {persistentNotifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] font-black rounded-full flex items-center justify-center border-2 border-parchment animate-pulse ring-2 ring-red-500/20">
                      {persistentNotifications.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        "absolute top-full mt-2 w-[calc(100vw-2.5rem)] xs:w-80 max-h-[400px] overflow-y-auto rounded-3xl shadow-2xl z-50 border p-2",
                        darkMode ? "bg-[#1a1410]/95 border-gold-900/50 backdrop-blur-xl" : "bg-white/95 border-gold-200 backdrop-blur-xl",
                        lang === 'ar' ? "left-[-0.5rem] xs:left-0" : "right-[-0.5rem] xs:right-0"
                      )}
                    >
                      <div className="p-4 border-b border-gold-100/10 flex justify-between items-center sticky top-0 bg-inherit z-10">
                        <h4 className="font-serif font-bold text-lg">{lang === 'ar' ? 'تنبيهات القافلة' : 'Caravan Alerts'}</h4>
                        {persistentNotifications.length > 0 && (
                          <button 
                            onClick={() => {
                              setPersistentNotifications([]);
                              const newDismissed = new Set(dismissedNotifications);
                              persistentNotifications.forEach(n => newDismissed.add(n.id));
                              setDismissedNotifications(newDismissed);
                            }}
                            className="text-[10px] uppercase font-black text-gold-600 hover:text-gold-800 transition-colors"
                          >
                            {lang === 'ar' ? 'مسح الكل' : 'Clear All'}
                          </button>
                        )}
                      </div>
                      <div className="py-2 space-y-1">
                        {groupedNotifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 italic text-sm">
                            {lang === 'ar' ? 'لا توجد تنبيهات جديدة' : 'No new notifications'}
                          </div>
                        ) : (
                          groupedNotifications.map(notif => (
                            <div
                              key={notif.id}
                              className={cn(
                                "flex items-center justify-between gap-3 p-3 rounded-2xl transition-colors group",
                                darkMode ? "hover:bg-gold-900/20" : "hover:bg-gold-50"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                    notif.type === 'rent' ? "bg-blue-500/20 text-blue-500" : "bg-green-500/20 text-green-500"
                                  )}>
                                    {notif.type === 'rent' ? <Landmark size={20} /> : <TrendingUp size={20} />}
                                  </div>
                                  {notif.count > 1 && (
                                    <div className="absolute -top-1 -right-1 bg-gold-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border border-white shadow-sm z-10">
                                      {notif.count}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h5 className={cn(
                                    "font-bold text-xs leading-tight line-clamp-1",
                                    darkMode ? "text-gold-100" : "text-gray-900"
                                  )}>
                                    {notif.type === 'rent' 
                                      ? (lang === 'ar' ? `إيجار متاح: ${notif.name}` : `Rent available: ${notif.name}`)
                                      : (lang === 'ar' ? `${notif.count > 1 ? `(${notif.count}) ` : ''}وصلت قوافل ${notif.name}!` : `${notif.count > 1 ? `(${notif.count}) ` : ''}Convoy ${notif.name} groups arrived!`)}
                                  </h5>
                                  <p className={cn(
                                    "text-[10px] font-bold mt-0.5",
                                    notif.type === 'rent' ? "text-blue-500" : "text-green-500"
                                  )}>
                                    {notif.profit.toLocaleString()} {t.currency} {notif.type === 'rent' ? (lang === 'ar' ? 'إيجار' : 'rent') : (lang === 'ar' ? 'ربح' : 'profit')}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPersistentNotifications(prev => prev.filter(n => !notif.originalIds.includes(n.id)));
                                  setDismissedNotifications(prev => {
                                    const next = new Set(prev);
                                    notif.originalIds.forEach((id: string) => next.add(id));
                                    return next;
                                  });
                                }}
                                className="p-1.5 opacity-0 group-hover:opacity-100 transition-all text-gray-400 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={toggleDarkMode}
                className={cn(
                  "p-2 md:p-2.5 rounded-full transition-all duration-300",
                  darkMode ? "bg-gold-900/30 text-gold-300 hover:bg-gold-900/50" : "bg-gold-100 text-gold-700 hover:bg-gold-200"
                )}
              >
                {darkMode ? <Sun size={14} className="md:w-5 md:h-5" /> : <Moon size={14} className="md:w-5 md:h-5" />}
              </button>
            </div>

            <div className={cn(
              "flex items-center gap-1 md:gap-3 px-2 sm:px-4 py-1.5 md:py-2.5 rounded-2xl md:rounded-[20px] border shadow-sm transition-all overflow-hidden bg-opacity-80 backdrop-blur-md",
              darkMode ? "bg-black/40 border-gold-900/50" : "bg-white border-gold-200"
            )}>
              {userRank && (
                <div className={cn(
                  "flex items-center gap-1 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[8px] md:text-[11px] font-black uppercase tracking-tighter shrink-0",
                  userRank.bgColor,
                  userRank.color,
                  userRank.glow
                )}>
                  <userRank.icon size={10} className="md:w-3.5 md:h-3.5" />
                  <span className="hidden xs:inline">{userRank.title}</span>
                </div>
              )}
              <div className="h-4 w-px bg-gold-200/50 hidden xs:block" />
              
              <div className="flex items-center gap-1 md:gap-2 ml-auto shrink-1 min-w-0">
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-gold-100/50 flex items-center justify-center shrink-0">
                  <Coins size={12} className="text-gold-600 md:w-4 md:h-4" />
                </div>
                <span className={cn(
                  "font-black text-[10px] md:text-base whitespace-nowrap truncate",
                  darkMode ? "text-gold-300" : "text-gold-900"
                )}>
                  {profile?.balance?.toLocaleString() || 0} <span className="text-gold-600 font-bold hidden lg:inline">{t.currency}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Removed fixed notification stack as it's now in the header bell menu */}
        
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
          {confirmingAssetPurchase && (
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
                  darkMode ? "bg-[#2d2118] border-gold-900 border-opacity-30 text-gold-50" : "bg-white border-gold-200 text-gray-900"
                )}
              >
                <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gold-500/20">
                   <Home size={32} className="text-gold-500" />
                </div>

                <h3 className={cn(
                  "font-serif font-bold text-2xl mb-2 text-center",
                  darkMode ? "text-gold-200" : "text-gray-900"
                )}>
                  {lang === 'ar' ? 'تأكيد الشراء' : 'Confirm Purchase'}
                </h3>
                
                <p className="text-center text-sm text-gray-500 mb-6 px-4">
                  {lang === 'ar' 
                    ? `هل ترغب في شراء ${modalQuantity} من ${confirmingAssetPurchase.item.name}؟`
                    : `Do you wish to acquire ${modalQuantity} units of ${confirmingAssetPurchase.item.name}?`}
                </p>

                <div className="space-y-4 py-4 border-y border-gold-100/50 mb-6">
                    <div className="flex justify-between items-center px-2">
                       <span className={cn("text-[10px] font-black uppercase tracking-widest", darkMode ? "text-gold-400/60" : "text-gray-400")}>
                        {lang === 'ar' ? 'الكمية' : 'Quantity'}
                      </span>
                      <div className="flex items-center gap-2 bg-gold-50 p-1 rounded-xl border border-gold-100">
                        <button 
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-gold-700 hover:bg-gold-100 active:scale-90 transition-all select-none"
                          onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                          disabled={isProcessing}
                        >
                          -
                        </button>
                        <span className="font-bold text-sm min-w-[1.5rem] text-center">{modalQuantity}</span>
                        <button 
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-gold-700 hover:bg-gold-100 active:scale-90 transition-all select-none"
                          onClick={() => {
                            const currentCount = globalStats?.[confirmingAssetPurchase.item.id] || 0;
                            const cap = CAPS[confirmingAssetPurchase.item.id];
                            const maxBuyable = cap !== undefined ? Math.max(0, cap - currentCount) : 999;
                            const isLocked = confirmingAssetPurchase.item.id === 'royal-castle' && netWorth < 250000;
                            const max = isLocked ? 1 : maxBuyable;
                            setModalQuantity(q => q < max ? q + 1 : q);
                          }}
                          disabled={isProcessing}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center px-2">
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", darkMode ? "text-gold-400/60" : "text-gray-400")}>
                        {lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}
                      </span>
                      <span className="font-bold text-sm">{confirmingAssetPurchase.item.price.toLocaleString()} {t.currency}</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between",
                      darkMode ? "bg-black/40 border-gold-900/50" : "bg-gold-50 border-gold-100"
                    )}>
                      <span className={cn("font-bold text-sm tracking-tight text-gold-600")}>
                        {lang === 'ar' ? 'الإجمالي' : 'Total Cost'}
                      </span>
                      <span className={cn("font-black text-xl text-gold-600")}>
                        {(confirmingAssetPurchase.item.price * modalQuantity).toLocaleString()} {t.currency}
                      </span>
                    </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmingAssetPurchase(null)}
                    className={cn(
                      "flex-1 py-4 font-bold transition-colors",
                      darkMode ? "text-gold-400 hover:text-gold-300" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={() => {
                      handlePurchase(confirmingAssetPurchase.item, modalQuantity);
                      setConfirmingAssetPurchase(null);
                    }}
                    disabled={isProcessing || (profile.balance < confirmingAssetPurchase.item.price * modalQuantity)}
                    className="flex-1 py-4 bg-gold-600 text-white font-bold rounded-2xl hover:bg-gold-700 transition-all shadow-lg disabled:bg-gray-400"
                  >
                    {isProcessing ? (lang === 'ar' ? 'جاري...' : 'Loading...') : (lang === 'ar' ? 'تأكيد' : 'Confirm')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

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
                  darkMode ? "bg-[#2d2118] border-gold-900 border-opacity-30 text-gold-50" : "bg-white border-gold-200 text-gray-900"
                )}
              >
                <h3 className={cn(
                  "font-serif font-bold text-2xl mb-2 border-b pb-4",
                  darkMode ? "text-gold-200 border-gold-900/30" : "text-gray-900 border-gold-100"
                )}>
                  {lang === 'ar' ? 'تأكيد البيع' : 'Confirm Sale'}
                </h3>
                <div className="space-y-4 py-6">
                    <div className="flex justify-between items-center">
                       <span className={cn("text-sm font-medium", darkMode ? "text-gold-400/60" : "text-gray-500")}>
                        {lang === 'ar' ? 'الأصل' : 'Asset'}
                      </span>
                      <span className="font-bold text-lg">{confirmingSell.name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                       <span className={cn("text-sm font-medium", darkMode ? "text-gold-400/60" : "text-gray-500")}>
                        {lang === 'ar' ? 'الكمية' : 'Quantity'}
                      </span>
                      <div className="flex items-center gap-2 bg-gold-50 p-1 rounded-xl border border-gold-100">
                        <button 
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-gold-700 hover:bg-gold-100 active:scale-90 transition-all select-none"
                          onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                          disabled={isProcessing}
                        >
                          -
                        </button>
                        <span className="font-bold text-sm min-w-[1.5rem] text-center">{modalQuantity}</span>
                        <button 
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-gold-700 hover:bg-gold-100 active:scale-90 transition-all select-none"
                          onClick={() => {
                            const max = confirmingSell.ownedInstances.length;
                            setModalQuantity(q => q < max ? q + 1 : q);
                          }}
                          disabled={isProcessing}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                       <span className={cn("text-sm font-medium", darkMode ? "text-gold-400/60" : "text-gray-500")}>
                        {lang === 'ar' ? 'قيمة السوق' : 'Market Value'}
                      </span>
                      <span className="font-bold text-lg">{(confirmingSell.price || 0).toLocaleString()} {t.currency}</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between",
                      darkMode ? "bg-black/40 border-gold-900/50" : "bg-gold-50 border-gold-100"
                    )}>
                      <span className={cn("font-bold text-sm tracking-tight text-gold-600")}>
                        {lang === 'ar' ? 'سوف تستلم' : 'You will receive'}
                      </span>
                      <span className={cn("font-black text-xl text-gold-600")}>
                        {Math.floor((confirmingSell.price || 0) * 0.9 * modalQuantity).toLocaleString()} {t.currency}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
                      {lang === 'ar' ? 'رسوم السوق 10% مخصومة' : '10% market fee deducted'}
                    </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmingSell(null)}
                    className={cn(
                      "flex-1 py-4 font-bold transition-colors",
                      darkMode ? "text-gold-400 hover:text-gold-300" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={() => {
                      const idsToSell = confirmingSell.ownedInstances.slice(0, modalQuantity).map(i => i.id);
                      handleSellProperty(idsToSell, confirmingSell.itemId, confirmingSell.name, confirmingSell.price);
                      setConfirmingSell(null);
                    }}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-gold-600 text-white font-bold rounded-2xl hover:bg-gold-700 transition-all shadow-lg disabled:bg-gray-400"
                  >
                    {isProcessing ? (lang === 'ar' ? 'جاري التحميل...' : 'Loading...') : (lang === 'ar' ? 'تأكيد البيع' : 'Confirm Sale')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showRaidNotification && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            >
              <div className="bg-[#2d2118] border-2 border-red-900 rounded-[40px] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #7f1d1d, transparent)' }} />
                
                <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                  <Skull size={40} className="text-red-500 animate-pulse" />
                </div>
                
                <h3 className="font-display text-2xl text-red-100 mb-2">
                  {lang === 'ar' ? 'غارة اللصوص!' : 'BANDIT RAID!'}
                </h3>
                <p className="text-red-200/70 text-sm mb-6 leading-relaxed">
                  {lang === 'ar' 
                    ? `بينما كنت بعيداً عن حراسة قافلتك، هاجم اللصوص خزائنك واستولوا على ${showRaidNotification.loss.toLocaleString()} دينار.` 
                    : `While your treasury was unguarded, desert bandits raided your vaults and made off with ${showRaidNotification.loss.toLocaleString()} Dinars.`}
                </p>
                
                <div className="bg-black/40 rounded-2xl p-4 mb-8 border border-white/5">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">
                      <span>{lang === 'ar' ? 'الخسارة' : 'LosS'}</span>
                      <span className="text-red-500">-{showRaidNotification.loss.toLocaleString()} {t.currency}</span>
                   </div>
                   <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-red-600" />
                   </div>
                </div>

                <button 
                  onClick={() => setShowRaidNotification(null)}
                  className="w-full py-4 bg-red-900 text-white rounded-2xl font-bold hover:bg-black transition-all border border-red-500/30 shadow-lg active:scale-95"
                >
                  {lang === 'ar' ? 'سأنتقم منهم' : 'I will have my revenge'}
                </button>
              </div>
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
                     <span className={cn("text-sm font-medium", darkMode ? "text-gold-400" : "text-gray-500")}>
                       {lang === 'ar' ? 'الكمية' : 'Quantity'}
                     </span>
                     <div className="flex items-center gap-2 bg-gold-100/20 rounded-xl p-1">
                       <button 
                         className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold hover:bg-gold-50 disabled:opacity-50 select-none"
                         onMouseDown={() => startCounter(() => setTradeQuantity(q => Math.max(1, q - 1)))}
                         onMouseUp={stopCounter}
                         onMouseLeave={stopCounter}
                         onTouchStart={() => startCounter(() => setTradeQuantity(q => Math.max(1, q - 1)))}
                         onTouchEnd={stopCounter}
                         disabled={isProcessing}
                       >
                         -
                       </button>
                       <span className="font-bold min-w-[1.5rem] text-center">{tradeQuantity}</span>
                       <button 
                         className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold hover:bg-gold-50 disabled:opacity-50 select-none"
                         onMouseDown={() => startCounter(() => setTradeQuantity(q => q + 1))}
                         onMouseUp={stopCounter}
                         onMouseLeave={stopCounter}
                         onTouchStart={() => startCounter(() => setTradeQuantity(q => q + 1))}
                         onTouchEnd={stopCounter}
                         disabled={isProcessing}
                       >
                         +
                       </button>
                       <button 
                         onClick={() => {
                           const maxAffordable = Math.floor((profile?.balance || 0) / confirmingTrade.cost);
                           if (maxAffordable > 0) setTradeQuantity(maxAffordable);
                         }}
                         className="px-2 py-1.5 bg-gold-800 text-white text-[10px] font-black rounded-lg hover:bg-black transition-colors ml-1"
                       >
                         {lang === 'ar' ? 'الكل (All)' : 'All'}
                       </button>
                     </div>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className={cn("text-sm font-medium", darkMode ? "text-gold-400" : "text-gray-500")}>{t.entry}</span>
                     <span className="font-bold text-lg">{(confirmingTrade.cost * tradeQuantity).toLocaleString()} {t.currency}</span>
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
                    disabled={isProcessing || (profile?.balance || 0) < (confirmingTrade.cost * tradeQuantity)}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-[calc(100%-1rem)] h-[calc(100%-1rem)] m-2 rounded-[32px] md:rounded-[60px] overflow-hidden border-8 border-parchment shadow-[0_0_50px_rgba(0,0,0,0.3)] relative"
              >
                <TradeMap 
                  lang={lang} 
                  activeStormRoute={activeStormRoute}
                  darkMode={darkMode}
                  onPinClick={(id) => {
                  const routes = [
                    { id: 'silk-road', name: t.silkRoad, cost: 1000, profit: 10, duration: 1, minRank: 0 },
                    { id: 'amber-road', name: t.amberRoad, cost: 2500, profit: 15, duration: 3, minRank: 0 },
                    { id: 'gulf-harbor-sea', name: t.gulfHarbor, cost: 5000, profit: 25, duration: 5, minRank: 250000 }
                  ];
                  const p = routes.find(r => r.id === id);
                  if (p) {
                    const isRouteLocked = p.minRank > 0 && netWorth < p.minRank;
                    if (isRouteLocked) {
                      setNotification({ 
                        type: 'error', 
                        message: lang === 'ar' 
                          ? `يتطلب هذا المسار رتبة "قائد قافلة" (صافي ثروة ${p.minRank.toLocaleString()} دينار)` 
                          : `This route requires "Convoy Leader" status (${p.minRank.toLocaleString()} Dinars Net Worth)` 
                      });
                    } else {
                      setConfirmingTrade(p);
                    }
                  }
                }} />

                {/* Floating Route Cards Overlay - Smaller & Fixed Corner List */}
                <div className={cn(
                  "absolute bottom-0 z-40 px-3 py-4 flex flex-col gap-2 max-h-[65%] overflow-y-auto no-scrollbar pointer-events-none",
                  "left-0 items-start"
                )}>
                  {[
                    { id: 'silk-road', name: t.silkRoad, cost: 1000, profit: 10, duration: 1, minRank: 0, color: 'border-red-500/10 bg-red-50/25' },
                    { id: 'amber-road', name: t.amberRoad, cost: 2500, profit: 15, duration: 3, minRank: 0, color: 'border-amber-500/10 bg-amber-50/25' },
                    { id: 'gulf-harbor-sea', name: t.gulfHarbor, cost: 5000, profit: 25, duration: 5, minRank: 250000, color: 'border-blue-500/10 bg-blue-50/25' }
                  ].map((route) => {
                    const isStormWarning = activeStormRoute === route.id;
                    const isStormBonus = activeStormRoute && activeStormRoute !== route.id && route.id !== 'gulf-harbor-sea';
                    
                    return (
                      <motion.button
                        key={route.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02, x: 3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                           const isRouteLocked = route.minRank > 0 && (profile?.balance || 0) < route.minRank;
                           if (isRouteLocked) {
                              setNotification({ 
                                type: 'error', 
                                message: lang === 'ar' 
                                  ? 'يتطلب هذا المسار رتبة "قائد قافلة" (رصيد 250,000 دينار)' 
                                  : 'This route requires "Convoy Leader" status (250,000 Dinars)' 
                              });
                           } else {
                              setConfirmingTrade(route);
                           }
                        }}
                        className={cn(
                          "w-36 md:w-48 p-2 md:p-2.5 rounded-[20px] border backdrop-blur-md shadow-lg transition-all pointer-events-auto relative",
                          darkMode ? "bg-black/20 border-gold-900/40" : route.color,
                          lang === 'ar' ? "text-right" : "text-left",
                          isStormWarning ? "ring-2 ring-amber-500/40" : "",
                          isStormBonus ? "ring-2 ring-green-500/40" : ""
                        )}
                      >
                        {isStormWarning && (
                          <div className={cn(
                            "absolute -top-1 px-2 py-0.5 bg-amber-600 text-white text-[9px] font-black rounded-full whitespace-nowrap animate-pulse shadow-xl z-50",
                            lang === 'ar' ? "right-2" : "left-2"
                          )}>
                             {lang === 'ar' ? '⚠️ عاصفة!' : '⚠️ STORM!'}
                          </div>
                        )}
                        {isStormBonus && (
                          <div className={cn(
                            "absolute -top-1 px-2 py-0.5 bg-green-600 text-white text-[9px] font-black rounded-full whitespace-nowrap animate-bounce shadow-xl z-50",
                            lang === 'ar' ? "right-2" : "left-2"
                          )}>
                            💎 {lang === 'ar' ? 'مكافأة!' : 'BONUS!'}
                          </div>
                        )}

                        <div className={cn(
                          "flex justify-between items-center mb-1 gap-2",
                          lang === 'ar' ? "flex-row-reverse" : ""
                        )}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={cn(
                              "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 shadow-inner",
                              route.id === 'silk-road' ? "bg-red-500/10 text-red-600" : route.id === 'amber-road' ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                            )}>
                               {getRouteIcon(route.id, 14)}
                            </div>
                            <div className="min-w-0">
                              <h4 className={cn("font-serif font-black text-[10px] md:text-sm leading-none truncate", darkMode ? "text-gold-100" : "text-gray-900")}>{route.name}</h4>
                            </div>
                          </div>
                          <div className={cn("flex flex-col shrink-0 mt-0.5", lang === 'ar' ? "items-start" : "items-end")}>
                            <span className={cn(
                              "text-[9px] md:text-[11px] font-black uppercase tracking-tighter",
                              isStormBonus ? "text-green-600" : "text-green-600/70"
                            )}>
                              +{isStormBonus ? route.profit + 50 : route.profit}%
                            </span>
                          </div>
                        </div>

                        <div className={cn(
                          "flex items-center justify-between mt-1 pt-1 border-t border-black/5",
                          lang === 'ar' ? "flex-row-reverse" : ""
                        )}>
                          <p className="text-[8px] md:text-[10px] text-gray-500 font-bold">{(route.cost || 0).toLocaleString()} {t.currency}</p>
                          <div className="flex items-center gap-1 opacity-60">
                            <TrendingUp size={8} />
                            <span className="text-[7px] md:text-[9px] font-black uppercase">
                              {isStormBonus ? route.duration + 5 : isStormWarning ? route.duration + 10 : route.duration} {t.minutes}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
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
                      {groupedActiveConvoys.length === 0 ? (
                        <div className="glass-panel p-10 rounded-3xl border-dashed border-gold-300/50 text-center text-gold-600/50 italic">
                          {t.noInvestments}
                        </div>
                      ) : (
                        groupedActiveConvoys.map((group) => {
                          const inv = group.nextMaturing;
                          const duration = inv.expiresAt - (inv.startTime || inv.createdAt?.toMillis() || Date.now());
                          const remaining = Math.max(0, inv.expiresAt - currentTime);
                          const progress = Math.min(100, Math.floor(((duration - remaining) / duration) * 100));
                          
                          return (
                            <div key={group.routeId} className={cn(
                              "glass-panel p-5 rounded-3xl group",
                              lang === 'ar' ? "text-right" : "text-left"
                            )}>
                              <div className={cn("flex items-center justify-between mb-4", lang === 'ar' ? "flex-row-reverse" : "")}>
                                <div className={cn("flex items-center gap-4", lang === 'ar' ? "flex-row-reverse" : "")}>
                                  <div className="relative">
                                    <div className="w-12 h-12 rounded-2xl bg-gold-100/50 flex items-center justify-center text-gold-700 shrink-0 group-hover:scale-110 transition-transform">
                                      {getRouteIcon(group.routeId, 24)}
                                    </div>
                                    {group.count > 1 && (
                                      <div className="absolute -top-2 -right-2 bg-gold-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg z-10">
                                        {group.count}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-serif font-bold text-lg text-gray-800">
                                      {getRouteName(group.routeId)}
                                      {group.count > 1 && <span className="opacity-50 mx-2">x{group.count}</span>}
                                    </p>
                                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{t.enRoute}</p>
                                  </div>
                                </div>
                                <div className={lang === 'ar' ? "text-left" : "text-right"}>
                                 <p className="font-bold text-gold-800 text-lg">{(group.totalAmount).toLocaleString()} {t.currency}</p>
                                  <p className="text-xs font-black text-green-600">
                                    +{(group.totalProfit).toLocaleString()} {t.currency} 
                                    <span className="text-[9px] opacity-60 ml-1">({lang === 'ar' ? 'إجمالي الربح بالدينار' : 'Total profit in Dinars'})</span>
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-gold-600">
                                  <span>{lang === 'ar' ? 'التقدم (الوصول التالي)' : 'Progress (Next Arrival)'}</span>
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
                                    {lang === 'ar' ? 'الوصول التالي خلال: ' : 'Next arrival in: '}
                                    {Math.ceil(remaining / 60000)} {Math.ceil(remaining / 60000) === 1 ? t.minute : t.minutes}
                                  </span>
                                  <span className="text-[9px] text-gold-500 font-black">
                                    {lang === 'ar' ? `إجمالي القوافل النشطة: ${group.count}` : `Total Active: ${group.count}`}
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
                              "glass-panel p-4 rounded-2xl flex items-center justify-between",
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
                                <p className="font-black text-green-600 text-sm">+{Math.floor(inv.amount * (inv.profit/100)).toLocaleString()} {t.currency}</p>
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

            {activeTab === 'quests' && (
              <motion.div
                key="quests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full h-full p-4 lg:p-8 overflow-y-auto"
              >
                <div className="max-w-2xl mx-auto space-y-6 pb-20">
                  <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-gold-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gold-600 border border-gold-200">
                        <ScrollText size={32} />
                     </div>
                     <h3 className="font-serif font-black text-2xl mb-1">{t.quests}</h3>
                     <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                        {lang === 'ar' ? 'أكمل المهام لتحصل على مكافآت ذهبية' : 'Complete goals to earn gold rewards'}
                     </p>
                  </div>

                {/* Quest List */}
                <div className="space-y-4">
                  {localQuests.length > 0 ? [...localQuests].sort((a, b) => {
                    if (a.status === 'claimed' && b.status !== 'claimed') return 1;
                    if (a.status !== 'claimed' && b.status === 'claimed') return -1;
                    return 0;
                  }).map((q) => (
                    <div key={q.id} className={cn(
                      "glass-panel p-4 sm:p-6 relative overflow-hidden transition-all",
                      q.status === 'claimed' ? "opacity-60 grayscale" : ""
                    )}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                           <div className={cn(
                             "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0",
                             q.completed ? "text-green-500" : (darkMode ? "bg-gold-950/40 border border-gold-900/30 text-gold-400" : "bg-gold-50 border border-gold-200 text-gold-600")
                           )}>
                             {q.completed ? <CheckCircle2 size={24} className="sm:w-8 sm:h-8" /> : (q.type === 'trade' ? <Ship size={20} className="sm:w-6 sm:h-6" /> : q.type === 'wealth' ? <Coins size={20} className="sm:w-6 sm:h-6" /> : <Home size={20} className="sm:w-6 sm:h-6" />)}
                           </div>
                           <div className="min-w-0">
                             <h4 className="font-serif font-bold text-base sm:text-lg truncate">{q.title}</h4>
                             <p className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-none">{q.desc}</p>
                           </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                           <span className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 block mb-0.5">{lang === 'ar' ? 'المكافأة' : 'Reward'}</span>
                           <span className="font-black text-base sm:text-xl text-gold-600">+{(q.reward).toLocaleString()} <span className="text-[10px] sm:text-xs">{t.currency}</span></span>
                        </div>
                      </div>

                      <div className="space-y-2">
                         <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                            <span className="text-gray-400">{lang === 'ar' ? 'التقدم' : 'Progress'}</span>
                            <span className={q.completed ? "text-green-600" : "text-gold-600"}>
                              {Math.floor(Math.min(100, (q.current / q.target) * 100))}%
                            </span>
                         </div>
                         <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (q.current / q.target) * 100)}%` }}
                              className={cn("h-full", q.completed ? "bg-green-500" : "bg-gold-500")}
                            />
                         </div>
                      </div>

                      {q.claimable && q.status !== 'claimed' && (
                        <button 
                          onClick={() => claimQuestReward(q.id)}
                          disabled={isProcessing}
                          className="w-full mt-4 sm:mt-6 py-3 sm:py-4 bg-gold-900 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-black transition-all shadow-xl animate-bounce text-sm"
                        >
                          {lang === 'ar' ? 'استلم المكافأة!' : 'Claim Reward!'}
                        </button>
                      )}
                      
                      {q.status === 'claimed' && (
                        <div className="mt-4 sm:mt-6 py-2 sm:py-4 text-center text-green-600 font-bold text-xs sm:text-sm bg-green-50 rounded-xl sm:rounded-2xl border border-green-100">
                           {lang === 'ar' ? 'تم استلام المكافأة' : 'Reward Claimed'}
                        </div>
                      )}
                    </div>
                  )) : (
                      <div className="text-center py-20 text-gray-400 italic">
                         {lang === 'ar' ? 'جاري تحميل المهام...' : 'Loading quests...'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'clans' && (
              <motion.div
                key="clans"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full h-full p-4 lg:p-8 overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto space-y-8 pb-24">
                  <div className="text-center mb-10">
                     <div className="w-20 h-20 bg-amber-100 rounded-[32px] flex items-center justify-center mx-auto mb-4 text-amber-600 border-2 border-amber-200 shadow-xl shadow-amber-500/10">
                        <Crown size={40} />
                     </div>
                     <h3 className="font-serif font-black text-3xl mb-2">{t.clans}</h3>
                     <p className="text-gray-500 text-sm max-w-md mx-auto">
                        {lang === 'ar' 
                          ? 'انضم إلى نقابة قوية لتأمين تجارتك وتجنب غارات اللصوص. القبائل القوية تسيطر على الرمال.' 
                          : 'Join a powerful trade clan to secure your assets and avoid bandit raids. Strong clans rule the sands.'}
                     </p>
                  </div>

                  {myClan ? (
                    <div className="space-y-6">
                      <div className={cn(
                        "glass-panel p-6 sm:p-10 rounded-[48px] relative overflow-hidden"
                      )}>
                         <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Crown size={120} />
                         </div>
                         <div className="relative flex flex-col md:flex-row justify-between gap-8">
                            <div>
                               <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest block mb-2">{lang === 'ar' ? 'نقابتك' : 'Your Clan'}</span>
                               <h4 className="font-serif font-black text-4xl text-amber-800 mb-4">{myClan.name}</h4>
                               <div className="flex gap-6">
                                  <div>
                                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'ar' ? 'الأعضاء' : 'Members'}</p>
                                     <p className="font-bold text-xl">{(myClan.members || 0).toLocaleString()}</p>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'ar' ? 'ثروة النقابة' : 'Clan Wealth'}</p>
                                     <p className="font-bold text-xl text-amber-600">{myClan.memberWealth?.toLocaleString()} {t.currency}</p>
                                  </div>
                               </div>
                            </div>
                            
                            <div className="flex flex-col justify-center gap-3">
                               <div className={cn(
                                 "p-4 rounded-2xl border flex items-center gap-3 transition-colors",
                                 darkMode ? "bg-green-950/20 border-green-900/30" : "bg-green-50 border-green-100"
                               )}>
                                 <div className="text-green-500">
                                    <CheckCircle2 size={24} />
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black uppercase text-green-600 tracking-widest">{lang === 'ar' ? 'حماية مفعلة' : 'Immunity Active'}</p>
                                    <p className={cn(
                                      "text-xs font-bold",
                                      darkMode ? "text-green-400" : "text-green-700"
                                    )}>{lang === 'ar' ? 'أنت محمي من غارات اللصوص' : 'Safe from bandit raids'}</p>
                                 </div>
                               </div>
                               <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center">
                                     <Coins size={24} />
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{lang === 'ar' ? 'خزينة النقابة' : 'Clan Treasury'}</p>
                                     <p className="text-xs text-blue-700 font-bold">{Math.floor((myClan.memberWealth || 0) * 0.1).toLocaleString()} {t.currency}</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Clan Expedition - Added detail */}
                      <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Ship className="text-gold-600" />
                            <h5 className="font-black text-lg">{lang === 'ar' ? 'الحملة النشطة' : 'Active Expedition'}</h5>
                          </div>
                          <span className="text-xs font-bold text-gold-600 bg-gold-100 px-3 py-1 rounded-full">{lang === 'ar' ? 'جاري التنفيذ' : 'In Progress'}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-gray-500">
                             <span>{lang === 'ar' ? 'التقدم' : 'Progress'}</span>
                             <span>65%</span>
                          </div>
                          <div className="h-3 w-full bg-gold-200 rounded-full overflow-hidden">
                             <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: "65%" }}
                              className="h-full bg-gold-600 shadow-[0_0_10px_rgba(184,134,11,0.5)]" 
                             />
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium italic mt-2">
                             {lang === 'ar' ? '* يساهم جميع أعضاء النقابة في نجاح هذه الحملة' : '* All clan members contribute to the success of this expedition'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                       {isCreatingClan ? (
                         <div className={cn(
                           "glass-panel p-8 rounded-[40px] border flex flex-col items-center text-center justify-center col-span-1 md:col-span-2",
                           darkMode ? "bg-black/20 border-gold-900/40" : "border-gold-400 bg-gold-50/30"
                         )}>
                            <h4 className="font-serif font-black text-xl text-gold-700 mb-4">{lang === 'ar' ? 'تأسيس نقابة جديدة' : 'Establish New Clan'}</h4>
                            <input 
                              type="text"
                              value={clanNameInput}
                              onChange={(e) => setClanNameInput(e.target.value)}
                              placeholder={lang === 'ar' ? 'اسم النقابة...' : 'Clan Name...'}
                              className="w-full max-w-sm px-6 py-3 rounded-xl border border-gold-200 mb-4 outline-none focus:ring-2 ring-gold-500"
                            />
                            <div className="flex gap-4">
                              <button 
                                onClick={() => setIsCreatingClan(false)}
                                className="px-6 py-2 bg-gray-200 rounded-xl font-bold"
                              >
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                              </button>
                              <button 
                                onClick={() => {
                                  if (clanNameInput.trim()) {
                                    handleCreateClan(clanNameInput);
                                    setIsCreatingClan(false);
                                  }
                                }}
                                disabled={isProcessing || !clanNameInput.trim()}
                                className="px-6 py-2 bg-gold-700 text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50"
                              >
                                {lang === 'ar' ? 'تأسيس (50k)' : 'Establish (50k)'}
                              </button>
                            </div>
                         </div>
                       ) : (
                         <>
                           <div className={cn(
                             "glass-panel p-8 rounded-[40px] border border-dashed flex flex-col items-center text-center justify-center",
                             darkMode ? "bg-black/20 border-gold-900/40" : "border-gray-300 bg-gray-50/50"
                           )}>
                              <h4 className="font-bold mb-2">{lang === 'ar' ? 'أسس نقابتك الخاصة' : 'Form Your Own Clan'}</h4>
                              <p className="text-xs text-gray-500 mb-6">{lang === 'ar' ? 'يكلف التأسيس 50,000 دينار' : 'Foundation costs 50,000 Dinars'}</p>
                              <button 
                                 onClick={() => setIsCreatingClan(true)}
                                 className="px-8 py-3 bg-gold-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
                              >
                                 {lang === 'ar' ? 'تأسيس نقابة' : 'Establish Clan'}
                              </button>
                           </div>
                           
                           <div className={cn(
                             "glass-panel p-8 rounded-[40px] border flex flex-col items-center text-center justify-center",
                             darkMode ? "bg-black/20 border-gold-900/40" : "border-amber-200 bg-amber-50/20"
                           )}>
                              <h4 className="font-bold mb-2">{lang === 'ar' ? 'انضم لنقابة موجودة' : 'Join an Existing Clan'}</h4>
                              <p className="text-xs text-gray-500 mb-6">{lang === 'ar' ? 'اختر من القائمة أدناه' : 'Select from the leaderboard below'}</p>
                              <div className="animate-bounce">
                                 <TrendingUp className="text-amber-500" />
                              </div>
                           </div>
                         </>
                       )}
                    </div>
                  )}

                  <div className="space-y-4">
                     <h4 className="font-serif font-black text-xl px-4 flex items-center gap-2">
                        <Gem className="text-amber-500" size={20} />
                        {t.leaderboard}
                     </h4>
                     <div className="space-y-3">
                        {clans.map((c, idx) => (
                          <div key={c.id} className={cn(
                            "glass-panel p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-amber-400 transition-all",
                            profile?.clanId === c.id ? "border-amber-400 ring-2 ring-amber-400/20" : ""
                          )}>
                             <div className="flex items-center gap-4 sm:gap-6">
                                <span className="font-display font-black text-xl sm:text-2xl text-gray-300 w-6 sm:w-8">#{idx + 1}</span>
                                <div className="min-w-0">
                                   <h5 className="font-bold text-base sm:text-lg truncate">{c.name}</h5>
                                   <p className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-widest truncate">
                                      {(c.members || 0).toLocaleString()} {lang === 'ar' ? 'أعضاء' : 'Members'} • {c.leaderName}
                                   </p>
                                </div>
                             </div>
                             
                             <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0">
                                <div className="text-left sm:text-right">
                                   <p className="text-[8px] sm:text-[10px] font-black uppercase text-amber-600 tracking-widest">{lang === 'ar' ? 'القوة المالية' : 'Financial Power'}</p>
                                   <p className="font-bold text-sm sm:text-base">{c.memberWealth?.toLocaleString()} {t.currency}</p>
                                </div>
                                
                                {!profile?.clanId && (
                                  <button 
                                    onClick={() => handleJoinClan(c.id)}
                                    disabled={isProcessing}
                                    className="px-4 sm:px-6 py-1.5 sm:py-2 bg-amber-100 text-amber-700 rounded-full font-bold text-[10px] sm:text-xs hover:bg-amber-200 transition-all border border-amber-200"
                                  >
                                    {lang === 'ar' ? 'انضمام' : 'Join'}
                                  </button>
                                )}
                                {profile?.clanId === c.id && (
                                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                                     <CheckCircle2 size={18} />
                                  </div>
                                )}
                             </div>
                          </div>
                        ))}
                        {clans.length === 0 && (
                          <div className="p-12 text-center text-gray-400 italic">
                             {lang === 'ar' ? 'لا توجد نقابات نشطة حتى الآن' : 'No active clans yet'}
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'market' && (
              <motion.div
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {[
                        { id: 'oasis-inn', name: lang === 'ar' ? 'فيلا فخمة' : 'Grand Villa', price: 150000, desc: lang === 'ar' ? 'فيلا فخمة بحدائق واسعة' : 'Palatial villa with gardens', type: 'house', category: lang === 'ar' ? 'هيبة عالية' : 'High Prestige' },
                        { id: 'merchant-loft', name: lang === 'ar' ? 'نزل التاجر' : 'Merchant Loft', price: 25000, desc: lang === 'ar' ? 'مساحة مريحة قرب الأسواق' : 'Comfortable space near markets', type: 'house', category: lang === 'ar' ? 'تكلفة متوسطة' : 'Moderate Cost' },
                        { id: 'nomad-tent', name: lang === 'ar' ? 'منزل بسيط' : 'Simple House', price: 5000, desc: lang === 'ar' ? 'سكن متواضع للمبتدئين' : 'Starter home for new traders', type: 'house', category: lang === 'ar' ? 'تكلفة منخفضة' : 'Low Cost' },
                        { id: 'royal-castle', name: lang === 'ar' ? 'قصر ملكي' : 'Royal Castle', price: 1000000, desc: lang === 'ar' ? 'أقصى درجات الفخامة والمكانة' : 'Maximum prestige and rent', type: 'house', category: lang === 'ar' ? 'نادر جداً' : 'Ultra Rare' }
                      ].map((item, idx) => {
                        const ownedInstances = properties.filter(p => p.itemId === item.id);
                        return <BazaarItemCard key={idx} item={item} ownedInstances={ownedInstances} />;
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
                        { id: 'red-sea-dhow', name: lang === 'ar' ? 'سفينة البحر الأحمر' : 'Red Sea Dhow', price: 8000, desc: lang === 'ar' ? 'سفينة تجارية سريعة' : 'Swift maritime trading ship', type: 'ship', category: lang === 'ar' ? 'نخبة' : 'Elite' },
                        { id: 'desert-caravan', name: lang === 'ar' ? 'قافلة الصحراء' : 'Desert Caravan', price: 12000, desc: lang === 'ar' ? 'ناقلة بضائع ضخمة' : 'Massive goods transporter', type: 'caravan', category: lang === 'ar' ? 'صناعي' : 'Industrial' },
                        { id: 'swift-camel', name: lang === 'ar' ? 'ناقة سريعة' : 'Swift Camel', price: 1200, desc: lang === 'ar' ? 'حيوان توصيل سريع' : 'Quick delivery animal', type: 'caravan', category: lang === 'ar' ? 'أساسي' : 'Basic' }
                      ].map((item, idx) => {
                        const ownedInstances = properties.filter(p => p.itemId === item.id);
                        return <BazaarItemCard key={idx} item={item} ownedInstances={ownedInstances} />;
                      })}
                    </div>
                  </section>

                  {/* Any other properties not matched in standard list */}
                  {properties.filter(p => !['oasis-inn', 'merchant-loft', 'nomad-tent', 'red-sea-dhow', 'desert-caravan', 'swift-camel', 'royal-castle'].includes(p.itemId || '')).length > 0 && (
                    <section>
                      <div className={cn("flex items-center gap-3 mb-6", lang === 'ar' ? "flex-row-reverse" : "")}>
                        <Landmark className="text-gold-600" size={24} />
                        <h3 className="font-display text-2xl text-gold-800">{lang === 'ar' ? 'ممتلكات أخرى' : 'Other Assets'}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                        {/* Group other assets too */}
                        {Object.entries(properties.filter(p => !['oasis-inn', 'merchant-loft', 'nomad-tent', 'red-sea-dhow', 'desert-caravan', 'swift-camel', 'royal-castle'].includes(p.itemId || '')).reduce((acc, p) => {
                          const id = p.itemId || p.id;
                          if (!acc[id]) acc[id] = [];
                          acc[id].push(p);
                          return acc;
                        }, {} as Record<string, any[]>)).map(([id, instances], idx) => (
                          <BazaarItemCard 
                            key={id} 
                            item={{ 
                              id: id, 
                              name: (instances as any[])[0].name, 
                              price: (instances as any[])[0].price || 0,
                              desc: lang === 'ar' ? 'ممتلكات خاصة' : 'Private Asset',
                              type: (instances as any[])[0].type || 'house',
                              category: (instances as any[])[0].category || 'Basic'
                            }} 
                            ownedInstances={instances as any[]} 
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
                className="w-full h-full p-4 sm:p-8 overflow-y-auto"
              >
                <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-20">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <div className="glass-panel p-6 relative overflow-hidden">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Wallet size={14} className="text-gold-600 sm:w-4 sm:h-4" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase text-gold-600 tracking-widest">{t.totalWealth}</span>
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-bold font-serif">{profile.balance.toLocaleString()} {t.currency}</h4>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 mt-2">{lang === 'ar' ? 'السيولة المتاحة' : 'Available Liquidity'}</p>
                    </div>

                    <div className="glass-panel p-6 relative overflow-hidden">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Home size={14} className="text-blue-600 sm:w-4 sm:h-4" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase text-blue-600 tracking-widest">{lang === 'ar' ? 'قيمة الأصول' : 'Asset Value'}</span>
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-bold font-serif">{totalAssetValue.toLocaleString()} {t.currency}</h4>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 mt-2">{properties.length} {lang === 'ar' ? 'وحدات ممتلكة' : 'Units owned'}</p>
                    </div>

                    <div className="glass-panel p-6 relative overflow-hidden bg-gradient-to-br from-gold-600 to-gold-800 text-white border-gold-500 shadow-xl shadow-gold-500/20">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Crown size={14} className="text-gold-100 sm:w-4 sm:h-4" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase text-gold-100 tracking-widest">{lang === 'ar' ? 'صافي الثروة' : 'Net Worth'}</span>
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-bold font-serif">{netWorth.toLocaleString()} {t.currency}</h4>
                      <p className="text-[9px] sm:text-[10px] text-gold-200 mt-2">{lang === 'ar' ? 'إجمالي قيمة الإمبراطورية' : 'Total Empire Valuation'}</p>
                    </div>
                  </div>

                  {/* Profile & Name Edit */}
                  <div className="glass-panel p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
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
                  <div className="glass-panel p-8 shadow-sm transition-colors">
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
                                {log.type === 'completion' ? `+${(log.profitDinars || 0).toLocaleString()}` : 
                                 log.type === 'rent' ? `+${(log.amount || 0).toLocaleString()}` : `-${(log.amount || 0).toLocaleString()}`} {t.currency}
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
