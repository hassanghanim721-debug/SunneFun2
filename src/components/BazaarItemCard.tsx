import React, { memo } from 'react';
import { Home, Ship, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { CAPS } from '@/src/constants';

interface BazaarItemCardProps {
  item: any;
  ownedInstances?: any[];
  currentTime: number;
  isConvoyLeader: boolean;
  lang: string;
  t: any;
  globalStats: any;
  darkMode: boolean;
  isProcessing: boolean;
  onPurchase: (item: any) => void;
  onSell: (owned: any[], localizedName: string) => void;
  onCollectRent: (ids: string[], name: string, price: number, rent: number) => void;
}

export const BazaarItemCard: React.FC<BazaarItemCardProps> = memo(({
  item,
  ownedInstances = [],
  currentTime,
  isConvoyLeader,
  lang,
  t,
  globalStats,
  darkMode,
  isProcessing,
  onPurchase,
  onSell,
  onCollectRent
}) => {
  const isOwned = ownedInstances.length > 0;
  
  // Rent calculation helper
  const getTimestampMills = (ts: any) => {
    if (!ts) return Date.now();
    if (ts.toMillis) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return new Date(ts).getTime();
  };

  // Rent calculation for all owned instances
  const currentRent = ownedInstances.reduce((acc, inst) => {
    const lastCollected = getTimestampMills(inst.lastRentCollectedAt || inst.purchasedAt);
    const hoursElapsed = (currentTime - lastCollected) / (1000 * 60 * 60);
    const rentableHours = Math.floor(hoursElapsed);
    return acc + (rentableHours * Math.floor((item.price || 0) * 0.05));
  }, 0);

  const currentCount = globalStats?.[item.id] || 0;
  const cap = CAPS[item.id];
  const isSoldOut = cap !== undefined && currentCount >= cap;
  const isLocked = item.id === 'royal-castle' && !isConvoyLeader;

  const propertyMap: Record<string, { en: string, ar: string }> = {
    'oasis-inn': { en: 'Grand Villa', ar: 'فيلا فخمة' },
    'merchant-loft': { en: 'Merchant Loft', ar: 'نزل التاجر' },
    'nomad-tent': { en: 'Simple House', ar: 'منزل بسيط' },
    'red-sea-dhow': { en: 'Red Sea Dhow', ar: 'سفينة البحر الأحمر' },
    'desert-caravan': { en: 'Desert Caravan', ar: 'قافلة الصحراء' },
    'swift-camel': { en: 'Swift Camel', ar: 'ناقة سريعة' }
  };

  const localizedName = item.id && propertyMap[item.id] 
    ? propertyMap[item.id][lang as keyof typeof propertyMap[string]] 
    : item.name;

  return (
    <div className={cn(
      "glass-panel p-4 sm:p-6 flex flex-col h-full group transition-all duration-300",
      darkMode ? "text-gold-50" : "text-gray-900",
      isOwned ? (darkMode ? "border-green-600/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-green-300 shadow-[0_0_15px_rgba(34,197,94,0.1)]") : ""
    )}>
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
            darkMode ? "bg-gold-900/20 text-gold-400" : "bg-gold-50 text-gold-700",
            isSoldOut && !isOwned ? "grayscale opacity-50" : "",
            isLocked ? "bg-gray-100 text-gray-400 grayscale" : ""
          )}>
            {isLocked ? <AlertCircle size={20} className="sm:w-6 sm:h-6" /> : (item.type === 'ship' ? <Ship size={20} className="sm:w-6 sm:h-6" /> : <Home size={20} className="sm:w-6 sm:h-6" />)}
          </div>
          <div>
            <h4 className="font-serif font-bold text-base sm:text-lg leading-tight">{localizedName}</h4>
            <p className={cn(
              "text-[9px] sm:text-[10px] font-black uppercase tracking-widest",
              isLocked ? "text-red-500" : "text-gold-600"
            )}>
              {isLocked ? (lang === 'ar' ? 'يتطلب قائد قافلة' : 'Requires Convoy Leader') : (item.category || 'Legacy')}
            </p>
            {cap !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <div className="h-1 w-12 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", currentCount >= (cap * 0.9) ? "bg-red-500" : "bg-gold-500")}
                    style={{ width: `${Math.min(100, (currentCount / cap) * 100)}%` }}
                  />
                </div>
                <span className="text-[8px] text-gray-400 font-bold uppercase">
                  {cap - currentCount} {lang === 'ar' ? 'متبقي' : 'Left'}
                </span>
              </div>
            )}
          </div>
        </div>
        {isOwned && (
          <div className="bg-green-100 text-green-700 text-[8px] font-black uppercase px-2 py-1 rounded-full tracking-wider animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {lang === 'ar' ? `تمتلك ${ownedInstances.length}` : `Owned ${ownedInstances.length}`}
          </div>
        )}
        {isSoldOut && !isOwned && (
          <div className="bg-red-100 text-red-700 text-[8px] font-black uppercase px-2 py-1 rounded-full tracking-wider">
            {lang === 'ar' ? 'نفدت' : 'Sold Out'}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-6 flex-1">{item.desc}</p>
      
      <div className="space-y-4 pt-4 border-t border-gold-100/50">
        <div className={cn("flex flex-col gap-4")}>
          <div className={cn("flex items-center justify-between", lang === 'ar' ? "flex-row-reverse" : "")}>
            <div className={lang === 'ar' ? "text-right" : "text-left"}>
              <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">{lang === 'ar' ? 'السعر' : 'Price'}</span>
              <span className="font-bold text-gold-700 text-xl">{item.price.toLocaleString()} {t.currency}</span>
            </div>
          </div>

          {!isOwned ? (
            <button 
              onClick={() => onPurchase(item)}
              disabled={isSoldOut || isLocked || isProcessing}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2",
                isSoldOut || isLocked ? "bg-gray-400 cursor-not-allowed opacity-70" : "bg-gold-600 text-white hover:bg-gold-700 hover:shadow-gold-500/30"
              )}
            >
              {isLocked ? (lang === 'ar' ? 'مغلق' : 'Locked') : isSoldOut ? (lang === 'ar' ? 'مبيوع' : 'Sold') : (
                <>
                  <span>{lang === 'ar' ? 'شراء' : 'Buy Now'}</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className={cn(
                "flex items-center justify-between p-3 rounded-xl border animate-in fade-in slide-in-from-bottom-2",
                darkMode ? "bg-green-900/10 border-green-900/30" : "bg-green-50 border-green-100"
              )}>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-green-700/60 uppercase tracking-widest">{lang === 'ar' ? 'الإيجار المتراكم' : 'Accumulated Rent'}</span>
                  <span className="text-sm font-black text-green-700">{currentRent.toLocaleString()} {t.currency}</span>
                </div>
                <button 
                  onClick={() => onCollectRent(ownedInstances.map(inst => inst.id), localizedName, item.price, currentRent)}
                  disabled={currentRent <= 0 || isProcessing}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                    currentRent > 0 
                      ? "bg-green-600 text-white shadow-md hover:bg-green-700 active:scale-95" 
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {lang === 'ar' ? 'تحصيل' : 'Collect'}
                </button>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => onPurchase(item)}
                  disabled={isSoldOut || isLocked || isProcessing}
                  className="flex-1 py-3 bg-gold-100 text-gold-700 border border-gold-200 rounded-xl text-xs font-bold hover:bg-gold-200 transition-all active:scale-95"
                >
                  {lang === 'ar' ? `شراء إضافي` : `Buy More`}
                </button>
                <button
                  onClick={() => onSell(ownedInstances, localizedName)}
                  disabled={isProcessing}
                  className="flex-1 py-3 border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all active:scale-95"
                >
                  {lang === 'ar' ? 'بيع' : 'Sell'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
