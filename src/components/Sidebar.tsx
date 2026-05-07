import React from 'react';
import { ShoppingBag, Wallet, Map as MapIcon, LogOut, Languages } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { TRANSLATIONS } from '@/src/constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  onReset?: () => void;
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
  darkMode: boolean;
}

export const Sidebar: React.FC<SidebarProps & { isOpen?: boolean; onClose?: () => void }> = ({ 
  activeTab, 
  setActiveTab, 
  user, 
  onLogout, 
  onReset,
  isOpen, 
  onClose,
  lang,
  setLang,
  darkMode
}) => {
  const t = TRANSLATIONS[lang];
  
  const menuItems = [
    { id: 'map', icon: MapIcon, label: t.tradeMap },
    { id: 'market', icon: ShoppingBag, label: t.marketplace },
    { id: 'wallet', icon: Wallet, label: t.wealth },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 h-full flex flex-col border-r z-50 transition-all duration-300 lg:relative lg:translate-x-0 w-64",
        darkMode ? "bg-black/80 border-gold-900/30" : "glass-panel border-gold-600/20",
        lang === 'ar' ? "right-0 border-l border-r-0" : "left-0",
        isOpen ? "translate-x-0" : (lang === 'ar' ? "translate-x-full" : "-translate-x-full")
      )}>
        <div className={cn(
          "p-6 border-b flex items-center justify-between",
          darkMode ? "border-gold-900/20" : "border-gold-600/10",
          lang === 'ar' ? "flex-row-reverse" : ""
        )}>
          <h1 className={cn("font-display text-2xl leading-tight", darkMode ? "text-gold-400" : "text-gold-700", lang === 'ar' ? "text-right" : "")}>
            {t.title}
            <span className="block text-xs font-sans font-semibold tracking-[0.2em] text-gold-500/80">
              {t.subtitle}
            </span>
          </h1>
          <button onClick={onClose} className="lg:hidden p-2 text-gold-600">
             <LogOut size={20} className={cn(lang === 'en' ? "rotate-180" : "")} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose?.();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
                activeTab === item.id 
                  ? "bg-gold-500 text-gold-950 shadow-lg shadow-gold-500/20" 
                  : cn(
                      "text-gray-500 hover:text-gold-600",
                      darkMode ? "hover:bg-gold-950/40 text-gold-200/50" : "hover:bg-gold-50"
                    ),
                lang === 'ar' ? "flex-row-reverse text-right" : ""
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={cn(
          "p-4 space-y-4 border-t",
          darkMode ? "border-gold-900/20" : "border-gold-600/10"
        )}>
          {/* Language Switcher */}
          <div className={cn(
            "flex items-center justify-between p-2 rounded-lg border",
            darkMode ? "bg-gold-950/20 border-gold-900/40" : "bg-gold-50/30 border-gold-200/50",
            lang === 'ar' ? "flex-row-reverse" : ""
          )}>
            <Languages size={18} className="text-gold-600" />
            <div className="flex gap-1">
              <button 
                onClick={() => setLang('en')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded transition-colors",
                  lang === 'en' ? "bg-gold-600 text-white" : "text-gold-600 hover:bg-gold-100"
                )}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('ar')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded transition-colors",
                  lang === 'ar' ? "bg-gold-600 text-white" : "text-gold-600 hover:bg-gold-100"
                )}
              >
                AR
              </button>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl overflow-hidden",
            darkMode ? "bg-gold-900/10" : "bg-gold-50/50",
            lang === 'ar' ? "flex-row-reverse text-right" : ""
          )}>
            <div className="w-10 h-10 shrink-0 rounded-full bg-gold-200 flex items-center justify-center text-gold-700 font-bold border border-gold-300 uppercase cursor-pointer hover:bg-gold-300 transition-colors" 
                 title={lang === 'ar' ? "إعادة تعيين" : "Reset Account"}
                 onClick={onReset}>
              {user?.name?.[0] || (lang === 'ar' ? 'ت' : 'U')}
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold truncate", darkMode ? "text-gold-100" : "text-gray-800")}>
                {user?.name || (lang === 'ar' ? 'التاجر الكبير' : 'Grand Trader')}
              </p>
              <p className="text-xs text-gold-600 truncate">{user?.balance?.toLocaleString()} {t.balance}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors",
              lang === 'ar' ? "flex-row-reverse text-right" : ""
            )}
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">{t.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

