import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { CITIES, ROUTES, TRANSLATIONS } from '@/src/constants';

interface TradeMapProps {
  lang: 'en' | 'ar';
  onPinClick: (routeId: string) => void;
  activeStormRoute?: string | null;
  darkMode?: boolean;
}

export const TradeMap: React.FC<TradeMapProps> = ({ lang, onPinClick, activeStormRoute, darkMode }) => {
  const t = TRANSLATIONS[lang];

  const PINS = [
    { id: 'silk-road', x: 850, y: 250, label: lang === 'ar' ? 'طريق الحرير' : 'Silk Road' },
    { id: 'amber-road', x: 300, y: 350, label: lang === 'ar' ? 'طريق العنبر' : 'Amber Road' },
    { id: 'gulf-harbor-sea', x: 600, y: 850, label: lang === 'ar' ? 'الخليج' : 'Gulf Harbor' }
  ];

  return (
    <div className={cn(
      "w-full h-full relative overflow-hidden group/map select-none transition-colors duration-1000",
      darkMode ? "bg-[#121212]" : "bg-[#f4f1ea]"
    )}>
      {/* Parchment Overlay Pattern */}
      <div className={cn(
        "absolute inset-0 pointer-events-none z-10 transition-opacity duration-1000",
        darkMode ? "opacity-5 invert" : "opacity-10"
      )} style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/handmade-paper.png")' }} />
      
      {/* Sandstorm Effect Overlay - Localized */}
      <AnimatePresence>
        {activeStormRoute && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute z-50 pointer-events-none overflow-hidden rounded-full blur-xl border-4",
              darkMode ? "border-amber-900/20" : "border-amber-600/30",
              activeStormRoute === 'silk-road' 
                ? "top-[32%] right-[5%] w-24 h-24 md:w-40 md:h-40" 
                : "top-[32%] right-[15%] w-24 h-24 md:w-40 md:h-40"
            )}
            style={{
              background: darkMode 
                ? 'radial-gradient(circle at center, rgba(120, 53, 15, 0.3) 0%, rgba(120, 53, 15, 0.05) 70%, transparent 100%)'
                : 'radial-gradient(circle at center, rgba(146, 64, 14, 0.4) 0%, rgba(146, 64, 14, 0.1) 70%, transparent 100%)'
            }}
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: -25, y: Math.random() * 200, opacity: 0 }}
                animate={{ 
                  x: 300, 
                  y: (Math.random() * 200) + (Math.random() * 30 - 15),
                  opacity: [0, 0.8, 0] 
                }}
                transition={{ 
                  duration: 1 + Math.random() * 1.5, 
                  repeat: Infinity, 
                  delay: Math.random() * 1,
                  ease: "linear"
                }}
                className={cn(
                  "absolute w-16 md:w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-600/60 to-transparent blur-[1px]",
                  darkMode && "via-amber-900/40"
                )}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {activeStormRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-amber-600/90 text-white font-black text-[10px] md:text-sm rounded-full shadow-2xl animate-pulse flex items-center gap-2 pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          {lang === 'ar' ? `عاصفة رملية على ${activeStormRoute}` : `Sandstorm on ${activeStormRoute}`}
        </div>
      )}

      <div className={cn(
        "relative w-full h-full flex items-center justify-center transition-all duration-1000",
        darkMode ? "brightness-[0.4] grayscale-[0.6] contrast-[1.1]" : ""
      )}>
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full transition-transform duration-700"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Ocean with Texture */}
          <rect width="1000" height="1000" fill={darkMode ? "#0c1a2e" : "#a9d6e5"} className="transition-colors duration-1000" />
          <path d="M50,50 L950,50 L950,400 Q800,450 700,400 Q550,350 450,450 Q300,550 400,650 Q450,750 600,750 Q800,750 850,850 L850,950 L50,950 Z" 
                fill={darkMode ? "#1a1410" : "#f4f1ea"} stroke={darkMode ? "#3d2b1f" : "#8b7355"} strokeWidth="2" className="transition-colors duration-1000" />

          {/* Mountains & Trees */}
          <g opacity="0.4" stroke="#8b7355" strokeWidth="1" fill="none">
             <path d="M100,200 L120,160 L140,200 M115,180 L130,165" />
             <path d="M130,220 L150,180 L170,220 M145,200 L160,185" />
             <path d="M160,210 L180,170 L200,210" />
             <path d="M100,650 Q105,630 110,650 M105,650 L105,660" />
             <circle cx="280" cy="710" r="8" fill="#d4c5a9" />
          </g>

          {/* North Star */}
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="pointer-events-none"
          >
            <path 
              d="M 500 60 L 505 75 L 520 80 L 505 85 L 500 100 L 495 85 L 480 80 L 495 75 Z" 
              fill="#D4AF37" 
              opacity="0.8"
            />
          </motion.g>

          {/* Trade Routes (Lines) */}
          {/* Silk Road: Mashreq to Pin to Amber Junction */}
          <motion.path d="M 850 250 L 575 300 L 300 350" stroke="#D4AF37" strokeWidth="14" fill="none" opacity="0.4" />
          
          {/* Amber Road: Amber Station curved to Zanzibar - staying on land side */}
          <motion.path d="M 300 350 Q 150 650 600 850" stroke="#B45309" strokeWidth="12" fill="none" opacity="0.4" />
          
          {/* Gulf Harbor Main: Zanzibar to Al Khaleej */}
          <motion.path d="M 600 850 Q 550 650 500 500" stroke="#1E40AF" strokeWidth="10" fill="none" opacity="0.4" />
          
          {/* Local Harbor: Al Khaleej to Al Khaleej Borders */}
          <motion.path d="M 480 480 Q 500 530 520 480" stroke="#1E40AF" strokeWidth="6" fill="none" opacity="0.3" />

          {/* Animated Ship */}
          <motion.g
            animate={{ 
              x: [600, 520, 600], 
              y: [850, 600, 850],
              rotate: [0, -30, 0]
            }}
            transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
          >
            <text fontSize="30" dy="15" dx="-15">⛵</text>
          </motion.g>

          {/* Animated Horse (Silk Road) */}
          <motion.g
            animate={{ 
              x: [850, 575, 300, 300, 300, 300, 575, 850, 850, 850], 
              y: [250, 300, 350, 350, 350, 350, 300, 250, 250, 250],
              scaleX: [1, 1, 1, 1, -1, -1, -1, -1, 1, 1]
            }}
            transition={{ 
              duration: 60, 
              repeat: Infinity, 
              ease: "linear",
              times: [0, 0.22, 0.45, 0.47, 0.5, 0.5, 0.72, 0.95, 0.97, 1]
            }}
          >
            <text fontSize="25" dy="12" dx="-12">🐎</text>
          </motion.g>

          {/* Animated Amber Road Convoy (1 Horse + 3 Camels) */}
          <g>
            {[
              { char: '🐎', delay: 0 },
              { char: '🐪', delay: 0.8 },
              { char: '🐪', delay: 1.6 },
              { char: '🐪', delay: 2.4 }
            ].map((unit, index) => (
              <motion.g
                key={index}
                animate={{ 
                  x: [300, 262, 300, 412, 600, 600, 600, 412, 300, 262, 300, 300, 300], 
                  y: [350, 493, 625, 743, 850, 850, 850, 743, 625, 493, 350, 350, 350],
                  scaleX: [-1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1, 1]
                }}
                transition={{ 
                  duration: 80, 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: unit.delay,
                  times: [0, 0.11, 0.22, 0.33, 0.45, 0.47, 0.5, 0.61, 0.72, 0.83, 0.95, 0.97, 1]
                }}
              >
                <text fontSize="22" dy="12" dx="-12">{unit.char}</text>
              </motion.g>
            ))}
          </g>

          {/* Interactive Pins */}
          {PINS.map((pin) => (
            <g 
              key={pin.id} 
              className="cursor-pointer" 
              onClick={() => onPinClick(pin.id)}
            >
              <motion.g
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {/* Pin Drop Shadow */}
                <circle cx={pin.x} cy={pin.y + 4} r="15" fill="black" opacity="0.2" />
                
                {/* Outer Ring */}
                <circle cx={pin.x} cy={pin.y} r="12" fill="white" stroke="#8b7355" strokeWidth="2" />
                
                {/* Inner Color */}
                <circle 
                  cx={pin.x} 
                  cy={pin.y} 
                  r="8" 
                  fill={pin.id === 'silk-road' ? '#b91c1c' : pin.id === 'amber-road' ? '#d97706' : '#1e40af'} 
                />
                
                {/* Pulse Animation */}
                <motion.circle
                  cx={pin.x}
                  cy={pin.y}
                  r="18"
                  stroke={pin.id === 'silk-road' ? '#b91c1c' : pin.id === 'amber-road' ? '#d97706' : '#1e40af'}
                  strokeWidth="2"
                  fill="none"
                  animate={{ r: [15, 30], opacity: [0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.g>

              {/* Label - visible on mobile / default */}
              <g transform={`translate(${pin.x}, ${pin.y + 45})`}>
                <rect
                  x="-120"
                  y="-20"
                  width="240"
                  height="40"
                  rx="20"
                  fill="rgba(20, 15, 10, 0.95)"
                  stroke="#8b7355"
                  strokeWidth="2"
                  className="shadow-2xl transition-transform duration-300 group-hover:scale-105"
                />
                <text 
                  textAnchor="middle" 
                  dy="8"
                  className="fill-gold-100 font-serif italic text-[24px] font-black pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,1)] uppercase tracking-wider"
                >
                  {pin.label}
                </text>
              </g>
            </g>
          ))}

          {/* Cities (Small markers and Labels) */}
          {CITIES.map((city) => {
            let labelX = city.x;
            let labelY = city.y + 18;
            let textAnchor = "middle";

            if (city.id === 'mashreq') labelY = city.y - 25;
            if (city.id === 'tayma') labelY = city.y - 25;
            if (city.id === 'harbor-bay') {
              labelX = city.x + 75;
              labelY = city.y + 5;
              textAnchor = "start";
            }
            if (city.id === 'al-qamar') {
              labelX = city.x - 25;
              labelY = city.y + 5;
              textAnchor = "end";
            }
            if (city.id === 'zanzibar-sub') {
              labelY = city.y + 35;
            }
            if (city.id === 'bandit-den') {
              labelY = city.y - 12;
            }
            if (city.id === 'high-outpost') {
              labelY = city.y - 12;
            }

            return (
              <g key={city.id}>
                <circle cx={city.x} cy={city.y} r="4" fill="#8b7355" opacity="0.7" />
                <text 
                  x={labelX} 
                  y={labelY} 
                  textAnchor={textAnchor} 
                  className="fill-[#5d4037] opacity-80 font-serif italic text-[18px] font-black pointer-events-none drop-shadow-sm"
                >
                  {lang === 'ar' ? city.nameAr : city.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
