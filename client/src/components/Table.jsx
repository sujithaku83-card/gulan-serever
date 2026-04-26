import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Coins, Send } from 'lucide-react';
import Card from './Card';

export default function Table({ gameState, sessionData, socket, roomId }) {
  const [micOn, setMicOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [betValue, setBetValue] = useState(20);
  const [coinTransferAmount, setCoinTransferAmount] = useState(1);

  if (!sessionData) return null;

  const { players, teams, seatOrder, highestBid, highestBidder, myHand, currentTrick, turnIndex } = sessionData;
  const isMyTurn = socket.id === seatOrder[turnIndex];

  const handleStartGame = () => {
    socket.emit('startFirstGame', roomId);
  };

  const handleBet = (type) => {
    socket.emit('placeBet', { roomId, type, value: type === 'num' ? betValue : 0 });
  };

  const handleCardClick = (card) => {
    if (gameState === 'setting_thurup' && isMyTurn) {
      socket.emit('setThurup', { roomId, card });
    } else if (gameState === 'playing' && isMyTurn) {
      socket.emit('playCard', { roomId, card });
    }
  };

  const suitOrder = { 'hearts': 1, 'spades': 2, 'diamonds': 3, 'clubs': 4 };
  const rankOrder = { 'J': 8, '9': 7, 'A': 6, '10': 5, 'K': 4, 'Q': 3, '8': 2, '7': 1, '3': 8 };
  const sortedHand = myHand ? [...myHand].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    return (rankOrder[b.name] || 0) - (rankOrder[a.name] || 0);
  }) : [];

  const getPositionClass = (index) => {
    const positions = [
      "bottom-6 left-1/2 -translate-x-1/2", // self
      "bottom-[20%] left-[10%]",
      "top-[25%] left-[10%]",
      "top-6 left-1/2 -translate-x-1/2",
      "top-[25%] right-[15%]",
      "bottom-[20%] right-[15%]"
    ];
    return positions[index % 6];
  };

  // Find my index in seatOrder to relative position others
  const myIndexO = seatOrder.indexOf(socket.id);
  const myIndexInOrder = myIndexO === -1 ? 0 : myIndexO;

  return (
    <div className="relative w-full max-w-6xl h-[85vh] bg-casino-green/30 backdrop-blur-3xl rounded-[3rem] border-8 border-slate-800/80 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col items-center justify-center inner-shadow">
      
      {/* Table Felt Inner Oval */}
      <div className="absolute inset-4 rounded-[2.5rem] border-2 border-emerald-900/50 bg-gradient-to-tr from-emerald-900/40 via-emerald-800/20 to-emerald-900/40 pointer-events-none" />

      {/* Top Left Dashboard (Live Points & Mic) */}
      <div className="absolute top-6 left-6 flex flex-col gap-4 z-40 items-start">
        {/* Live Points Column */}
        {sessionData.teamPoints && gameState !== 'lobby' && (
          <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex flex-col gap-3 items-center shadow-2xl animate-in slide-in-from-left w-36">
            <div className="text-[10px] text-yellow-500 font-black tracking-widest uppercase">Live Points</div>
            <div className="w-full h-px bg-white/10" />
            <div className="w-full flex justify-between items-center">
               <span className="text-xs text-blue-400 font-bold uppercase">Team 1</span>
               <span className="text-xl font-black text-white">{sessionData.teamPoints.T1}</span>
            </div>
            <div className="w-full flex justify-between items-center">
               <span className="text-xs text-red-400 font-bold uppercase">Team 2</span>
               <span className="text-xl font-black text-white">{sessionData.teamPoints.T2}</span>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button 
            onClick={() => setMicOn(!micOn)}
            className={`p-4 rounded-full shadow-xl transition-all ${micOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' : 'bg-red-500/20 text-red-400 border border-red-400/30'}`}
          >
            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          
          <button 
            onClick={() => setSoundOn(!soundOn)}
            className={`p-4 rounded-full shadow-xl transition-all ${soundOn ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' : 'bg-slate-800/80 text-slate-500 border border-slate-700'}`}
          >
            {soundOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>
      </div>

      {/* Top Right Score Board */}
      <div className="absolute top-6 right-6 z-40 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex gap-8 items-center shadow-2xl">
        <div className="text-center">
          <div className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">Team 1 Coin</div>
          <div className="text-2xl font-black text-white">{teams.T1.points}</div>
          <div className="flex gap-2 mt-3 flex-wrap justify-center w-40">
            {[...Array(teams.T1.coins.yellow)].map((_, i) => <div key={`t1y-${i}`} className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-inner" />)}
            {teams.T1.coins.red > 0 && <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-red-800 shadow-inner" />}
          </div>
        </div>
        <div className="w-px h-16 bg-white/10" />
        <div className="text-center">
          <div className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">Team 2 Coin</div>
          <div className="text-2xl font-black text-white">{teams.T2.points}</div>
          <div className="flex gap-2 mt-3 flex-wrap justify-center w-40">
            {[...Array(teams.T2.coins.yellow)].map((_, i) => <div key={`t2y-${i}`} className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-inner" />)}
            {teams.T2.coins.red > 0 && <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-red-800 shadow-inner" />}
          </div>
        </div>
      </div>

      {/* Center Table Area (Lobby / Play state info) */}
      <div className="z-10 flex flex-col items-center">
        {gameState === 'lobby' && (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-black text-white/50 uppercase tracking-widest">
              {players.length === 6 ? 'Ready to play' : 'Waiting for players'}
            </h2>
            <div className="text-5xl font-black text-yellow-500 drop-shadow-lg">{players.length} / 6</div>
            {players.length === 6 && (
              <div className="flex flex-col items-center gap-4 mt-8">
                <button 
                  onClick={handleStartGame}
                  className="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xl font-black tracking-widest rounded-full uppercase shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all active:scale-95"
                >
                  Deal Cards
                </button>
                
                {(teams.T1.captain === socket.id || teams.T2.captain === socket.id) && (
                   <button 
                     onClick={() => socket.emit('shuffleTeams', roomId)}
                     className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-full shadow-lg border border-slate-600 active:scale-95 transition-all text-sm uppercase tracking-wider"
                   >
                     T - C
                   </button>
                )}
              </div>
            )}
          </div>
        )}

        {gameState !== 'lobby' && (
          <div className="text-center space-y-4 mt-8">
             {highestBidder && (
               <div className="bg-slate-900/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-yellow-500 font-bold shadow-lg inline-block">
                  Highest Bid: {highestBid.type === 'num' ? highestBid.value : highestBid.type}
               </div>
             )}
             
             {/* Render Trick Cards in the middle */}
             {gameState === 'playing' && currentTrick && currentTrick.length > 0 && !sessionData.thurup && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex -space-x-8 z-20">
                 {currentTrick.map((play, i) => (
                   <Card key={i} card={play.card} zIndex={i} />
                 ))}
               </div>
             )}
             
             {/* Render revealed thurup */}
             {sessionData.thurup && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 scale-150 shadow-[0_0_50px_rgba(234,179,8,0.6)] rounded-xl animate-in zoom-in">
                 <Card card={sessionData.thurup} />
                 <div className="absolute -top-8 w-full text-center text-yellow-400 font-black tracking-widest text-lg drop-shadow-md">THURUPPU</div>
               </div>
             )}
          </div>
        )}
      </div>

      {/* Players Circular Render */}
      {seatOrder.map((sid, index) => {
        const playerInfo = players.find(p => p.socketId === sid);
        if (!playerInfo) return null;
        
        // Relative index offset so 'I' am always bottom
        const relativeIndex = (index - myIndexInOrder + 6) % 6;
        const isTurn = seatOrder[turnIndex] === sid;
        const isMe = sid === socket.id;

        return (
          <div key={sid} className={`absolute ${getPositionClass(relativeIndex)} transition-all duration-500`}>
             <div className={`relative flex flex-col items-center ${isTurn ? 'scale-110' : ''}`}>
               
               {/* Avatar */}
               <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl ${isTurn ? 'bg-gradient-to-tr from-yellow-600 to-amber-500 ring-4 ring-yellow-400/50' : 'bg-slate-800 border border-slate-700'} relative`}>
                 {playerInfo.name.charAt(0).toUpperCase()}
                 {/* Blinking Turn Indicator */}
                 {isTurn && (
                   <>
                     <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900 animate-ping" />
                     <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                   </>
                 )}
               </div>
               
               {/* Name & Title */}
               <div className="mt-3 bg-slate-900/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/5 shadow-lg flex flex-col items-center">
                 <span className="font-bold text-sm block text-center truncate w-24">
                   {playerInfo.name} {isMe && '(You)'}
                 </span>
                 <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${teams.T1.players.includes(sid) ? 'text-blue-400' : 'text-red-400'}`}>
                   {teams.T1.players.includes(sid) ? 'Team 1' : 'Team 2'}
                 </span>
                 {(teams.T1.captain === sid || teams.T2.captain === sid) && (
                   <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest block text-center mt-0.5">Captain</span>
                 )}
               </div>

               {/* Hand Indicator (if not me) */}
               {!isMe && playerInfo.cardCount > 0 && (
                 <div className="absolute -bottom-4 right-0 bg-emerald-500 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg border border-emerald-400">
                   {playerInfo.cardCount}
                 </div>
               )}
             </div>

             {/* Rendering my cards right above my avatar */}
             {isMe && sortedHand && sortedHand.length > 0 && (
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex -space-x-8 hover:-space-x-4 transition-all duration-300">
                 {sortedHand.map((card, i) => (
                   <Card key={i} card={card} zIndex={i} interactive={gameState === 'setting_thurup' || gameState === 'playing'} onClick={() => handleCardClick(card)} />
                 ))}
               </div>
             )}
          </div>
        );
      })}

      {/* Betting Controls */}
      {gameState === 'betting' && (
        <div className="absolute right-6 bottom-6 bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-4 z-50 animate-in slide-in-from-right w-36">
          <div className="text-yellow-400 font-bold uppercase tracking-widest text-xs text-center">Place bet</div>
          <div className="flex flex-col items-stretch gap-3">
            <div className="flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-2 gap-2">
              <input type="range" min="20" max="40" step="1" className="w-full accent-yellow-500" value={betValue} onChange={e => setBetValue(Number(e.target.value))}/>
              <button onClick={() => handleBet('num')} className="bg-slate-800 hover:bg-slate-700 py-3 text-xs font-black text-white rounded-lg">BET {betValue}</button>
            </div>
            <div className="h-px w-full bg-white/10" />
            <button onClick={() => handleBet('ADDI')} className="px-4 py-3 bg-rose-500 hover:bg-rose-400 text-white text-xs font-black rounded-xl active:scale-95 transition-all">ADDI</button>
            <button onClick={() => handleBet('ONESH')} className="px-4 py-3 bg-blue-500 hover:bg-blue-400 text-white text-xs font-black rounded-xl active:scale-95 transition-all">ONESH</button>
            <button onClick={() => handleBet('COOT')} className="px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black rounded-xl active:scale-95 transition-all">COOT</button>
            <button onClick={() => handleBet('pass')} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl border border-slate-700 active:scale-95 transition-all">PASS</button>
            
            <div className="h-px w-full bg-white/10" />
            <button onClick={() => socket.emit('finishBetting', roomId)} className="px-4 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-900 text-xs font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-wider">START</button>
          </div>
        </div>
      )}

      {gameState === 'setting_thurup' && isMyTurn && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl text-center z-50 animate-in slide-in-from-right">
          <div className="text-yellow-400 font-bold uppercase tracking-widest text-lg">Select Thurup</div>
          <div className="text-slate-400 text-xs mt-2 max-w-[200px] mx-auto">Tap a card from your hand to set it face down as the blind card.</div>
        </div>
      )}

      {gameState === 'waiting_to_start' && isMyTurn && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl text-center z-50 animate-in slide-in-from-right">
          <div className="text-yellow-400 font-bold uppercase tracking-widest text-lg mb-4">Ready</div>
          <button onClick={() => socket.emit('startGamePhase', roomId)} className="px-8 py-3 w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all uppercase tracking-wider">
            Start Game
          </button>
        </div>
      )}
      {gameState === 'waiting_to_start' && !isMyTurn && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl text-center z-50 animate-in slide-in-from-right">
          <div className="text-yellow-400 font-bold uppercase tracking-widest text-lg">Waiting</div>
          <div className="text-slate-400 text-xs mt-2 max-w-[150px] mx-auto">Waiting for starting player to start...</div>
        </div>
      )}
      {/* Captain Controls (Win/Lose Declarations) */}
      {(teams.T1.captain === socket.id || teams.T2.captain === socket.id) && gameState === 'round_finished' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur-xl px-10 py-8 rounded-3xl border border-yellow-500 flex flex-col gap-4 items-center shadow-[0_0_50px_rgba(234,179,8,0.3)] z-50 animate-in zoom-in">
          <span className="text-yellow-500 font-black uppercase tracking-widest text-2xl">Round Finished</span>
          <span className="text-slate-300 text-sm mb-2">Captains: Claim your coin based on the final points!</span>
          <div className="flex gap-4 items-center mb-2">
            <span className="text-white font-bold">Coins to transfer:</span>
            <select value={coinTransferAmount} onChange={(e) => setCoinTransferAmount(Number(e.target.value))} className="bg-slate-800 text-white font-bold px-4 py-2 rounded-lg border border-slate-600 outline-none">
              {[1,2,3,4,5,6].map(num => <option key={num} value={num}>{num}</option>)}
            </select>
          </div>
          <button onClick={() => socket.emit('declareWin', { roomId, amount: coinTransferAmount })} className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-black rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.6)] active:scale-95 transition-all text-xl uppercase tracking-wider">
            Transfer Coin
          </button>
        </div>
      )}

      {/* Waiting for Captains */}
      {!(teams.T1.captain === socket.id || teams.T2.captain === socket.id) && gameState === 'round_finished' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-md px-10 py-8 rounded-3xl border border-white/10 flex flex-col gap-2 items-center shadow-2xl z-50 animate-in zoom-in">
          <span className="text-yellow-500 font-black uppercase tracking-widest text-xl">Round Finished</span>
          <span className="text-slate-400 text-sm">Waiting for Captains to transfer coins...</span>
        </div>
      )}

      {/* SHOW THURUP Button */}
      {gameState === 'playing' && !sessionData.isThurupRevealed && (
         <button onClick={() => socket.emit('askThurup', roomId)} className="absolute right-8 bottom-32 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-black uppercase tracking-wider shadow-[0_0_20px_rgba(79,70,229,0.5)] active:scale-95 transition-all z-40">
           SHOW
         </button>
      )}
    </div>
  );
}
