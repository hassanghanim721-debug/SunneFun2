import React from 'react';
import { motion } from 'motion/react';
import { CITIES, ROUTES } from '@/src/constants';

interface TradeMapProps {
  lang: 'en' | 'ar';
}

export const TradeMap: React.FC<TradeMapProps> = ({ lang }) => {
  return (
    <div className="w-full h-full bg-[#f4f1ea] relative overflow-hidden rounded-xl border-8 border-[#d4c5a9] shadow-2xl p-4">
      {/* Parchment Overlay Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/handmade-paper.png")' }} />
      
      <div className="relative w-full h-full flex items-center justify-center">
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full drop-shadow-xl"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="parchment-tex" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="8" result="noise" />
              <feDiffuseLighting in="noise" lightingColor="#f4f1ea" surfaceScale="2">
                <feDistantLight azimuth="45" elevation="60" />
              </feDiffuseLighting>
            </filter>
            
            {/* Path Text Paths */}
            <path id="silkRoadPath" d="M 900 300 Q 750 350 500 500" />
            <path id="amberRoadPath" d="M 200 100 Q 300 350 500 500" />
            <path id="gulfRoutePath" d="M 600 850 Q 550 700 500 500" />
          </defs>

          {/* Ocean with Texture */}
          <rect width="1000" height="1000" fill="#a9d6e5" />
          <path d="M50,50 L950,50 L950,400 Q800,450 700,400 Q550,350 450,450 Q300,550 400,650 Q450,750 600,750 Q800,750 850,850 L850,950 L50,950 Z" 
                fill="#f4f1ea" stroke="#8b7355" strokeWidth="2" />

          {/* Mountains & Trees Illustrations (Hand-drawn look) */}
          <g opacity="0.6" stroke="#8b7355" strokeWidth="1" fill="none">
             {/* Mountains */}
             <path d="M100,200 L120,160 L140,200 M115,180 L130,165" />
             <path d="M130,220 L150,180 L170,220 M145,200 L160,185" />
             <path d="M160,210 L180,170 L200,210" />
             
             {/* Small Tree Clusters */}
             <path d="M100,650 Q105,630 110,650 M105,650 L105,660" />
             <path d="M120,670 Q125,650 130,670 M125,670 L125,680" />
             
             {/* Barrels near port */}
             <circle cx="280" cy="710" r="8" fill="#d4c5a9" />
             <circle cx="295" cy="725" r="8" fill="#d4c5a9" />
          </g>

          {/* The Paths (Thick and colored as in image) */}
          <motion.path d="M 250 400 L 400 350 L 500 500" stroke="#b91c1c" strokeWidth="8" fill="none" className="opacity-80" />
          <motion.path d="M 400 350 L 850 320" stroke="#b91c1c" strokeWidth="8" fill="none" className="opacity-80" />
          
          <motion.path d="M 350 450 L 500 400 L 800 500" stroke="#d97706" strokeWidth="8" fill="none" className="opacity-80" />
          
          <motion.path d="M 520 600 L 550 800" stroke="#1e40af" strokeWidth="8" fill="none" className="opacity-80" />
          <motion.path d="M 550 500 L 800 800" stroke="#1e40af" strokeWidth="8" fill="none" className="opacity-80" />

          {/* Path Labels (Curved text) */}
          <text className="text-[12px] font-bold fill-red-800 uppercase tracking-tighter" opacity="0.6">
            <textPath href="#silkRoadPath" startOffset="30%">GREAT SILK ROUTE - SILK ROAD</textPath>
          </text>
          <text className="text-[12px] font-bold fill-amber-800 uppercase tracking-tighter" opacity="0.6">
            <textPath href="#amberRoadPath" startOffset="20%">AMBER TRAIL - AMBER ROAD</textPath>
          </text>
          <text className="text-[12px] font-bold fill-blue-800 uppercase tracking-tighter" opacity="0.6" rotate="90">
             <textPath href="#gulfRoutePath" startOffset="40%">GULF WATERS - GULF HARBOR</textPath>
          </text>

          {/* Moving Objects (Camels & Ships) */}
          {/* Camels on Silk Road */}
          <motion.g
            animate={{ offsetDistance: ["0%", "100%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            style={{ 
              offsetPath: "path('M 800 320 L 400 350')",
              offsetRotate: "0deg"
            }}
          >
            <text className="text-xl">🐫</text>
          </motion.g>

          {/* Ships in Gulf */}
          <motion.g
            animate={{ offsetDistance: ["0%", "100%"] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            style={{ 
              offsetPath: "path('M 800 800 L 550 500')",
              offsetRotate: "0deg"
            }}
          >
            <text className="text-xl">⛵</text>
          </motion.g>

          {/* Main Landmark Buildings */}
          <g className="fill-[#e5e0d4] stroke-[#8b7355]" strokeWidth="1">
             <rect x="470" y="460" width="60" height="40" rx="2" />
             <path d="M470,460 Q500,430 530,460" />
             
             <rect x="850" y="300" width="40" height="30" rx="2" />
             <path d="M850,300 Q870,280 890,300" />
          </g>

          {/* Cities / Points of Interest */}
          {CITIES.map((city) => (
            <g key={city.id} className="cursor-pointer group">
              <circle cx={city.x} cy={city.y} r="5" fill="#8b7355" className="group-hover:fill-gold-600 transition-colors" />
              <text x={city.x} y={city.y + 20} textAnchor="middle" className="fill-[#5d4037] font-serif italic text-[14px] font-bold pointer-events-none drop-shadow-sm">
                {lang === 'ar' ? city.nameAr : city.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
