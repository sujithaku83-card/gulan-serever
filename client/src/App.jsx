import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Table from './components/Table';
import './index.css';

const socket = io(import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? undefined : 'http://localhost:3001'));

function App() {
  const [gameState, setGameState] = useState('lobby');
  const [sessionData, setSessionData] = useState(null);
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('TABLE_1');
  
  useEffect(() => {
    socket.on('updateState', (state) => {
      setGameState(state.gameState);
      setSessionData(state);
    });
    
    return () => socket.off('updateState');
  }, []);

  const handleJoin = () => {
    if (name.trim()) {
      socket.emit('joinRoom', { roomId, playerName: name });
      setJoined(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c111c] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-casino-green/20 via-[#0c111c] to-[#0c111c] pointer-events-none" />
      
      {!joined ? (
        <div className="relative z-10 bg-slate-800/50 p-8 rounded-3xl shadow-2xl border border-white/10 w-full max-w-md backdrop-blur-xl">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-yellow-400 to-amber-600 tracking-wider mb-2 drop-shadow-xl">40</h1>
            <p className="text-slate-400 font-medium tracking-widest text-sm uppercase">Multiplayer Card Game</p>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Player Name</label>
              <input 
                type="text" 
                placeholder="Enter your nickname" 
                className="w-full px-5 py-4 bg-slate-900/80 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white placeholder-slate-600 transition-all shadow-inner"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <button 
              onClick={handleJoin} 
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-[#0c111c] text-lg font-black tracking-wide rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all active:scale-[0.98] mt-4"
            >
              JOIN TABLE
            </button>
          </div>
        </div>
      ) : (
        <Table gameState={gameState} sessionData={sessionData} socket={socket} roomId={roomId} />
      )}
    </div>
  );
}

export default App;
