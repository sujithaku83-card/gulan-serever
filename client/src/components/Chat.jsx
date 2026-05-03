import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2 } from 'lucide-react';

export default function Chat({ socket, roomId, playerName, initialHistory = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialHistory);
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Make sure we have the latest history on mount
    setMessages(initialHistory);
  }, [initialHistory]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveChat = (msg) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === msg.id)) return prev;
        
        const newMessages = [...prev, msg];
        if (newMessages.length > 50) newMessages.shift(); // Keep last 50
        return newMessages;
      });

      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('receive_chat', handleReceiveChat);

    return () => {
      socket.off('receive_chat', handleReceiveChat);
    };
  }, [socket, isOpen]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    socket.emit('send_chat', { roomId, message: inputValue.trim() });
    setInputValue('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={handleOpen}
        className="fixed bottom-6 left-6 z-50 bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-center transition-all active:scale-95 group"
      >
        <div className="relative">
          <MessageSquare size={24} className="text-slate-300 group-hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-800">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 h-[400px] bg-slate-900/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/80 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-indigo-400" />
          <h3 className="text-white font-bold text-sm tracking-wider uppercase">Table Chat</h3>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition-colors p-1"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-slate-500 text-xs text-center mt-10">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === playerName;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-500 mb-0.5 ml-1 mr-1">{msg.sender}</span>
                <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5'
                }`}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-slate-800/50 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-2 outline-none focus:border-indigo-500 transition-colors"
        />
        <button 
          type="submit"
          disabled={!inputValue.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-2.5 rounded-xl transition-all"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
