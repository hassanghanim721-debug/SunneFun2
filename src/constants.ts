
export interface City {
  id: string;
  name: string;
  nameAr: string;
  x: number;
  y: number;
  description: string;
}

export interface Route {
  id: string;
  name: string;
  path: string; // SVG path data
  color: string;
  type: 'land' | 'sea';
}

export interface Convoy {
  id: string;
  routeId: string;
  progress: number; // 0 to 1
  speed: number;
  cargo: string;
  worth: number;
  type: 'caravan' | 'ship';
}

export const TRANSLATIONS = {
  en: {
    title: 'SunneFun',
    subtitle: 'PREMIUM TRADE RPG',
    tradeMap: 'Trade Map',
    marketplace: 'Grand Bazaar',
    wealth: 'My Treasury',
    balance: 'Dinars',
    currency: 'D',
    investNow: 'Invest Now',
    profitInfo: 'You will receive a profit of ',
    confirmTrade: 'Confirm Trade',
    cancel: 'Cancel',
    minutes: 'minutes',
    minute: 'minute',
    entry: 'entry',
    rent: 'Rent',
    buy: 'Buy',
    owned: 'Owned',
    logout: 'Rest in Tent',
    routes: 'Trade Routes',
    bazaar: 'Grand Bazaar',
    treasury: 'The Treasury',
    totalWealth: 'Total Treasury',
    activeInvestments: 'Active Convoys',
    projected: 'Projected Earnings',
    noInvestments: 'No active convoys in the field.',
    estate: 'Estate & Lodging',
    vessels: 'Vessels & Caravans',
    stake: 'Stake',
    loginTitle: 'Welcome, Noble Trader',
    loginSubtitle: 'Sign in to manage your empire across the shifting sands.',
    googleLogin: 'Sign in with Google',
    loginLaws: 'By entering, you agree to the Laws of the Oasis & Trade Guilds.',
    enRoute: 'En route',
    nearingPort: 'Nearing Port',
    preparing: 'Preparing',
    delayed: 'Delayed',
    completed: 'Completed',
    myConvoys: 'My Convoys',
    activeTab: 'Active',
    historyTab: 'Arrived',
    quests: 'Daily Quests',
    clans: 'Clans',
    leaderboard: 'Hall of Fame',
    silkRoad: 'Silk Road',
    amberRoad: 'Amber Road',
    gulfHarbor: 'Gulf Harbor',
    level: 'Rank',
    reset: 'Reset Data',
    locked: 'Locked',
    requiresLeader: 'Convoy Leader Required (250,000 D)',
    secondaryMarket: 'Secondary Market'
  },
  ar: {
    title: 'SunneFun',
    subtitle: 'لعبة التجارة المتميزة',
    tradeMap: 'خريطة التجارة',
    marketplace: 'البازار الكبير',
    wealth: 'خزانتي',
    balance: 'دينار',
    currency: 'د',
    investNow: 'استثمر الآن',
    profitInfo: 'سوف تحصل على ربح بنسبة ',
    confirmTrade: 'تأكيد التجارة',
    cancel: 'إلغاء',
    minutes: 'دقائق',
    minute: 'دقيقة',
    entry: 'دخول',
    rent: 'استئجار',
    buy: 'شراء',
    owned: 'مملوك',
    logout: 'استرح في الخيمة',
    routes: 'طرق التجارة',
    bazaar: 'السوف الكبير',
    treasury: 'الخزانة الملكية',
    totalWealth: 'إجمالي الثروة',
    activeInvestments: 'القوافل النشطة',
    projected: 'الأرباح المتوقعة',
    noInvestments: 'لا توجد قوافل نشطة في الميدان.',
    estate: 'العقارات والإقامة',
    vessels: 'السفن والقوافل',
    stake: 'مشاركة',
    loginTitle: 'مرحباً أيها التاجر النبيل',
    loginSubtitle: 'سجل دخولك لإدارة إمبراطوريتك عبر الرمال المتحركة.',
    googleLogin: 'الدخول عبر جوجل',
    loginLaws: 'بالدخول، فإنك توافق على قوانين الواحة ونقابات التجارة.',
    enRoute: 'في الطريق',
    nearingPort: 'يقترب من الميناء',
    preparing: 'قيد التحضير',
    delayed: 'متأخر',
    completed: 'مكتمل',
    myConvoys: 'قوافلي',
    activeTab: 'نشط',
    historyTab: 'وصلت',
    quests: 'المهام اليومية',
    clans: 'النقابات',
    leaderboard: 'قاعة المشاهير',
    silkRoad: 'طريق الحرير',
    amberRoad: 'طريق العنبر',
    gulfHarbor: 'الخليج',
    level: 'الرتبة',
    reset: 'إعادة تعيين البيانات',
    locked: 'مقفل',
    requiresLeader: 'تتطلب رتبة قائد قافلة (250,000 د)',
    secondaryMarket: 'السوق الثانوي'
  }
};

export const CITIES: City[] = [
  { id: 'al-qamar', name: 'Al-Qamar', nameAr: 'القمر', x: 500, y: 560, description: 'The Jewel of the Desert.' },
  { id: 'harbor-bay', name: 'Gulf Harbor', nameAr: 'الخليج', x: 500, y: 500, description: 'The central trade harbor.' },
  { id: 'mashreq', name: 'Mashreq', nameAr: 'المشرق', x: 850, y: 250, description: 'Eastern peaks.' },
  { id: 'tayma', name: 'Tayma', nameAr: 'تيماء', x: 300, y: 350, description: 'Amber crossroad.' },
  { id: 'zanzibar-sub', name: 'Zanzibar', nameAr: 'زنجبار', x: 600, y: 850, description: 'Spice islands.' },
  { id: 'bandit-den', name: "Bandit's Den", nameAr: 'عرين اللصوص', x: 100, y: 480, description: 'Wild lands.' },
  { id: 'high-outpost', name: "Hisn al-Zalam", nameAr: 'حصن الظلام', x: 700, y: 150, description: 'Bandit mountain pass.' }
];

export const ROUTES: Route[] = [
  { 
    id: 'silk-road', 
    name: 'Silk Road', 
    path: 'M 850 250 L 300 350', 
    color: '#D4AF37', 
    type: 'land' 
  },
  { 
    id: 'amber-road', 
    name: 'Amber Road', 
    path: 'M 300 350 Q 150 650 600 850', 
    color: '#B45309', 
    type: 'land' 
  },
  { 
    id: 'gulf-harbor-sea', 
    name: 'Gulf Harbor Route', 
    path: 'M 600 850 Q 550 650 500 500', 
    color: '#1E40AF', 
    type: 'sea' 
  }
];

export const CAPS: Record<string, number> = {
  'nomad-tent': 8000,
  'merchant-loft': 1000,
  'oasis-inn': 500,
  'royal-castle': 500
};
