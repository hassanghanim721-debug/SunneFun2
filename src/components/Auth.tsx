import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Landmark, Languages } from 'lucide-react';
import { auth, googleProvider } from '@/src/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { TRANSLATIONS } from '@/src/constants';
import { cn } from '@/src/lib/utils';

interface AuthProps {
  onAuthComplete: (user: any, isTentative?: boolean) => void;
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthComplete, lang, setLang }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUser, setLastUser] = useState<{uid: string, name: string, photo: string, email: string} | null>(null);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const savedUser = localStorage.getItem('qafila_last_user');
    if (savedUser) {
      try {
        setLastUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
  }, []);

  const handleQuickReconnect = async () => {
    if (!lastUser) return;
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      login_hint: lastUser.email
    });
    try {
      const result = await signInWithPopup(auth, provider);
      onAuthComplete(result.user);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(lang === 'ar' ? 'فشل تسجيل الدخول. حاول مجدداً.' : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    if (lastUser?.email) {
      provider.setCustomParameters({
        login_hint: lastUser.email
      });
    }
    try {
      const result = await signInWithPopup(auth, provider);
      onAuthComplete(result.user);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(lang === 'ar' ? 'فشل تسجيل الدخول. حاول مجدداً.' : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen w-full bg-parchment flex items-center justify-center p-6 relative overflow-hidden",
      lang === 'ar' ? "text-right" : ""
    )} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full ornament-pattern opacity-10 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-gold-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gold-600/10 rounded-full blur-3xl" />

      <div className="absolute top-6 right-6 lg:right-12 z-20">
        <div className="flex items-center gap-3 p-2 rounded-xl glass-panel border border-gold-200">
          <Languages size={20} className="text-gold-600" />
          <div className="flex gap-1">
             <button 
               onClick={() => setLang('en')}
               className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-colors", lang === 'en' ? "bg-gold-600 text-white" : "text-gold-600 hover:bg-gold-50")}
             >
               EN
             </button>
             <button 
               onClick={() => setLang('ar')}
               className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-colors", lang === 'ar' ? "bg-gold-600 text-white" : "text-gold-600 hover:bg-gold-50")}
             >
               AR
             </button>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border-2 border-gold-600/30 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="bg-gold-600 p-8 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 ornament-pattern" />
          <Landmark size={48} className="mx-auto mb-4 drop-shadow-lg" />
          <h2 className="font-display text-3xl font-bold tracking-tight">{t.title}</h2>
          <p className="text-gold-200 text-sm font-medium tracking-widest uppercase">{t.subtitle}</p>
        </div>

        <div className="p-8">
          {lastUser && !loading && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleQuickReconnect}
              className="w-full mb-8 p-4 rounded-2xl bg-gold-50 border border-gold-400 flex items-center gap-4 transition-all hover:bg-gold-100 hover:shadow-md group text-right"
            >
              <img 
                src={lastUser.photo || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                className="w-12 h-12 rounded-full border-2 border-gold-600 shadow-sm"
                alt={lastUser.name} 
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gold-600 uppercase tracking-widest leading-none mb-1">
                  {lang === 'ar' ? 'مرحباً بعودتك' : 'Welcome Back'}
                </p>
                <h4 className="font-serif font-bold text-gray-900 truncate tracking-tight">{lastUser.name}</h4>
                <p className="text-[10px] text-gray-500 truncate">{lastUser.email}</p>
              </div>
            </motion.button>
          )}

          <div className="text-center mb-8">
             <h3 className="font-serif text-xl font-bold text-gray-800 italic">{t.loginTitle}</h3>
             <p className="text-sm text-gray-500 mt-2">{t.loginSubtitle}</p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-gold-400 text-gold-900 font-display font-bold text-lg rounded-xl hover:bg-gold-50 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            {loading ? (lang === 'ar' ? 'جاري الدخول...' : 'Entering Oasis...') : (lastUser ? (lang === 'ar' ? `دخول باسم ${lastUser.name.split(' ')[0]}` : `Sign in as ${lastUser.name.split(' ')[0]}`) : t.googleLogin)}
          </button>

          {lastUser && !loading && (
            <button 
              onClick={() => {
                localStorage.removeItem('qafila_last_user');
                setLastUser(null);
              }}
              className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              {lang === 'ar' ? 'استخدام حساب آخر' : 'Use another account'}
            </button>
          )}

          {error && (
            <p className="mt-4 text-center text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <p className="mt-10 text-center text-xs text-gray-400 font-medium tracking-tight">
            {t.loginLaws}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

