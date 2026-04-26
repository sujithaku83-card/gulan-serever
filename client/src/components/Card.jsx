import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ card, zIndex, backSide = false, interactive = false, onClick }) {
  const getColor = () => {
    if (card.suit === 'hearts' || card.suit === 'diamonds') return 'text-red-600';
    return 'text-slate-900';
  };

  const getSuitSymbol = () => {
    switch (card.suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  if (backSide) {
    return (
      <div className={`w-28 h-40 rounded-xl bg-amber-800 border-[3px] border-amber-600 shadow-xl flex items-center justify-center p-1.5`} style={{ zIndex }}>
        <div className="w-full h-full bg-gradient-to-b from-amber-700 to-amber-900 rounded-lg border-2 border-amber-500/50 flex flex-col items-center justify-center overflow-hidden inner-shadow">
           <span className="text-5xl drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">🦁</span>
           <span className="text-[10px] font-black text-amber-400 tracking-[0.2em] mt-3 uppercase opacity-80">GL</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      whileHover={interactive ? { y: -20, rotate: -2, zIndex: 50, scale: 1.05 } : {}}
      onClick={() => interactive && onClick && onClick(card)}
      className={`w-28 h-40 rounded-xl bg-gradient-to-br from-white to-slate-200 border-2 border-slate-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between p-2.5 ${interactive ? 'cursor-pointer hover:shadow-[0_0_30px_rgba(250,204,21,0.4)]' : 'cursor-default'} relative group`}
      style={{ zIndex }}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
    >
      {/* Top Left */}
      <div className={`text-xl font-black ${getColor()} leading-none text-left`}>
        {card.name}
        <div className="text-xl -mt-1">{getSuitSymbol()}</div>
      </div>
      
      {/* Center Motif */}
      <div className={`text-6xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 ${getColor()} pointer-events-none`}>
        {getSuitSymbol()}
      </div>

      {/* Bottom Right */}
      <div className={`text-xl font-black ${getColor()} leading-none rotate-180 text-left`}>
        {card.name}
        <div className="text-xl -mt-1">{getSuitSymbol()}</div>
      </div>
    </motion.div>
  );
}
