import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Landmark, Languages } from 'lucide-react';
import { auth, googleProvider } from '@/src/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { TRANSLATIONS } from '@/src/constants';
import { cn } from '@/src/lib/utils';

interface AuthProps {
  onAuthComplete: (user: any) => void;
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthComplete, lang, setLang }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = TRANSLATIONS[lang];

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
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
            {loading ? (lang === 'ar' ? 'جاري الدخول...' : 'Entering Oasis...') : t.googleLogin}
          </button>

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

