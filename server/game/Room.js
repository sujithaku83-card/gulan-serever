const Deck = require('./Deck');

class Room {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.players = []; // max 6. format: { socketId, name, index, hand: [] }
    this.gameState = 'lobby'; // lobby, dealing, betting, setting_thurup, playing, finished
    
    this.centralCoins = { yellow: 6, red: 1 };
    this.teams = {
      T1: { captain: null, coins: { yellow: 0, red: 0 }, L: 0, players: [] },
      T2: { captain: null, coins: { yellow: 0, red: 0 }, L: 0, players: [] }
    };
    
    this.pendingCollapse = false;
    this.gamesAfterL3 = 0;
    
    this.chatHistory = [];
    
    this.deck = new Deck();
    
    this.currentDealerIndex = 0; 
    this.turnIndex = 0; 
    this.seatOrder = []; 
    
    this.highestBidder = null;
    this.highestBid = { type: null, value: 0 }; 
    this.passes = 0;
    
    this.thurup = null; 
    this.hiddenThurup = null; 
    this.currentTrick = []; 
    this.teamPoints = { T1: 0, T2: 0 };
    this.isThurupRevealed = false;
  }

  addPlayer(socketId, name) {
    if (this.players.length >= 6) return false;
    this.players.push({ socketId, name, index: this.players.length, hand: [] });
    return true;
  }

  removePlayer(socketId) {
    this.players = this.players.filter(p => p.socketId !== socketId);
  }

  getPlayer(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  addChatMessage(socketId, message) {
    const player = this.getPlayer(socketId);
    if (!player) return;
    
    const chatMsg = {
      id: Date.now() + Math.random(),
      sender: player.name,
      senderId: socketId,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.chatHistory.push(chatMsg);
    if (this.chatHistory.length > 50) {
      this.chatHistory.shift();
    }
    
    this.io.to(this.roomId).emit('receive_chat', chatMsg);
  }

  startFirstGame() {
    if (this.players.length !== 6) return false;
    
    if (!this.teams.T1.captain || !this.teams.T2.captain) {
      this.assignRandomTeams();
      this.currentDealerIndex = 0;
    }
    
    this.startGameRound();
  }

  assignRandomTeams() {
    const shuffled = [...this.players].sort(() => 0.5 - Math.random());
    this.teams.T1.players = shuffled.slice(0, 3).map(p => p.socketId);
    this.teams.T2.players = shuffled.slice(3, 6).map(p => p.socketId);
    this.teams.T1.captain = this.teams.T1.players[0];
    this.teams.T2.captain = this.teams.T2.players[0];
    
    this.seatOrder = [
      this.teams.T1.players[0],
      this.teams.T2.players[0],
      this.teams.T1.players[1],
      this.teams.T2.players[1],
      this.teams.T1.players[2],
      this.teams.T2.players[2],
    ];
    this.broadcastState();
  }

  shuffleTeams(socketId) {
    if (this.gameState !== 'lobby') return;
    if (this.teams.T1.captain !== socketId && this.teams.T2.captain !== socketId) return;
    this.assignRandomTeams();
    this.currentDealerIndex = 0;
  }

  startGameRound() {
    this.gameState = 'dealing';
    this.deck.build();
    this.deck.shuffle();
    this.highestBid = { type: null, value: 0 };
    this.highestBidder = null;
    this.biddingTurnsCount = 0;
    this.hiddenThurup = null;
    this.thurup = null;
    this.currentTrick = [];
    this.teamPoints = { T1: 0, T2: 0 };
    this.isThurupRevealed = false;
    
    // First deal (6 cards each)
    this.seatOrder.forEach(socketId => {
      const p = this.getPlayer(socketId);
      p.hand = this.deck.deal(6);
    });
    
    this.broadcastState();
    
    setTimeout(() => {
      this.gameState = 'betting';
      this.turnIndex = this.currentDealerIndex; // Bidding starts precisely with designated leader
      this.broadcastState();
    }, 2000);
  }

  handleBet(socketId, bidType, bidValue) {
    if (this.gameState !== 'betting') return;
    
    // Strictly turn-based bidding
    if (this.seatOrder[this.turnIndex] !== socketId) return;

    let validBet = false;

    if (bidType === 'num') {
      const currentHighest = this.highestBid ? this.highestBid.value : 0;
      if (bidValue > currentHighest && bidValue >= 20 && bidValue <= 40) {
        this.highestBidder = socketId;
        this.highestBid = { type: bidType, value: bidValue };
        validBet = true;
      }
    } else if (['ADDI', 'ONESH', 'COOT'].includes(bidType)) {
       const typeHierarchy = { 'COOT': 1, 'ONESH': 2, 'ADDI': 3 };
       const currentLevel = this.highestBid && this.highestBid.type !== 'num' ? typeHierarchy[this.highestBid.type] : 0;
       if (typeHierarchy[bidType] > currentLevel) {
          this.highestBidder = socketId;
          this.highestBid = { type: bidType, value: 0 };
          validBet = true;
       }
    } else if (bidType === 'pass') {
      validBet = true;
    }

    if (validBet) {
      this.biddingTurnsCount++;
      if (this.biddingTurnsCount >= 6) {
        this.endBettingPhase();
      } else {
        this.turnIndex = (this.turnIndex + 1) % 6;
        this.broadcastState();
      }
    }
  }

  endBettingPhase() {
    if (this.gameState !== 'betting') return;
    
    if (!this.highestBidder) {
        // If everyone passed, default to the dealer with minimum bid
        this.highestBidder = this.seatOrder[this.currentDealerIndex];
        this.highestBid = { type: 'num', value: 20 };
    }

    if (this.highestBid.type === 'ADDI') {
       // ADDI caller sets thurup
       this.gameState = 'setting_thurup';
       this.turnIndex = this.seatOrder.indexOf(this.highestBidder);
       this.broadcastState();
    } else {
       this.gameState = 'setting_thurup';
       this.turnIndex = this.seatOrder.indexOf(this.highestBidder);
       this.broadcastState();
    }
  }

  setThurup(socketId, card) {
    if (this.gameState !== 'setting_thurup' || socketId !== this.highestBidder) return;
    this.hiddenThurup = card;
    
    this.gameState = 'waiting_to_start';
    // Determine who plays the first card of the game
    if (this.highestBid.type === 'ADDI') {
        this.turnIndex = this.seatOrder.indexOf(this.highestBidder);
    } else {
        this.turnIndex = this.currentDealerIndex;
    }
    
    this.broadcastState();
  }

  startGamePhase() {
    if (this.gameState === 'waiting_to_start') {
      this.gameState = 'playing';
      this.broadcastState();
    }
  }

  askThurup() {
    if (this.gameState !== 'playing' || this.isThurupRevealed || !this.hiddenThurup) return;
    
    this.thurup = this.hiddenThurup;
    this.isThurupRevealed = true;
    this.broadcastState();
  }

  playCard(socketId, card) {
    if (this.gameState !== 'playing' || this.seatOrder[this.turnIndex] !== socketId) return;
    
    const player = this.getPlayer(socketId);
    
    // Follow suit validation
    if (this.currentTrick.length > 0) {
      const leadSuit = this.currentTrick[0].card.suit;
      const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
      const isThurup = this.hiddenThurup && card.suit === this.hiddenThurup.suit;
      
      if (hasLeadSuit && card.suit !== leadSuit && !isThurup) {
        // Player must follow suit unless they are playing a Thurup card
        this.io.to(socketId).emit('error', 'You must follow suit!');
        return;
      }
    }
    
    // Auto-reveal thurup if the hidden card itself is played
    if (this.hiddenThurup && card.suit === this.hiddenThurup.suit && card.name === this.hiddenThurup.name) {
       this.isThurupRevealed = true;
       this.thurup = this.hiddenThurup;
    }

    // Remove card from hand
    player.hand = player.hand.filter(c => c.suit !== card.suit || c.name !== card.name);
    
    this.currentTrick.push({ socketId, card });
    
    // Check if trick is complete (6 cards)
    if (this.currentTrick.length === 6) {
      this.broadcastState();
      
      const leadSuit = this.currentTrick[0].card.suit;
      const thurupSuit = this.isThurupRevealed ? this.hiddenThurup.suit : null;
      const CARD_POWER = { '3': 8, 'J': 8, '9': 7, 'A': 6, '10': 5, 'K': 4, 'Q': 3, '8': 2, '7': 1 };
      let highestPower = CARD_POWER[this.currentTrick[0].card.name];
      let winningSuit = leadSuit;
      let winnerSocket = this.currentTrick[0].socketId;

      let trickPoints = 0;

      for (let play of this.currentTrick) {
        trickPoints += play.card.points || 0;
        const currentPower = CARD_POWER[play.card.name];
        
        if (thurupSuit && play.card.suit === thurupSuit) {
           if (winningSuit !== thurupSuit) {
               winningSuit = thurupSuit;
               highestPower = currentPower;
               winnerSocket = play.socketId;
           } else if (currentPower > highestPower) {
               highestPower = currentPower;
               winnerSocket = play.socketId;
           }
        } else if (play.card.suit === winningSuit && currentPower > highestPower) {
            highestPower = currentPower;
            winnerSocket = play.socketId;
        }
      }

      // Wait a moment then clear trick
      setTimeout(() => {
        this.currentTrick = [];
        
        const winningTeam = this.teams.T1.players.includes(winnerSocket) ? 'T1' : 'T2';
        this.teamPoints[winningTeam] += trickPoints;

        this.turnIndex = this.seatOrder.indexOf(winnerSocket);
        
        // Check if round is over
        if (this.players.every(p => p.hand.length === 0)) {
          this.gameState = 'round_finished'; 
          
          setTimeout(() => {
            this.currentDealerIndex = (this.currentDealerIndex + 1) % 6;
            if (this.pendingCollapse) {
                this.gamesAfterL3++;
                if (this.gamesAfterL3 > 1) {
                    this.assignRandomTeams();
                    this.currentDealerIndex = 0;
                    this.pendingCollapse = false;
                    this.gamesAfterL3 = 0;
                    this.teams.T1.L = 0;
                    this.teams.T2.L = 0;
                }
            }
            this.gameState = 'lobby';
            this.broadcastState();
          }, 5000);
        }
        
        this.broadcastState();
      }, 2000);
    } else {
      // Advance turn
      this.turnIndex = (this.turnIndex + 1) % 6;
      this.broadcastState();
    }
  }



  transferManualCoins(socketId, amount, color, targetTeam) {
    if (this.teams.T1.captain !== socketId && this.teams.T2.captain !== socketId) return;
    if (color !== 'yellow' && color !== 'red') return;
    
    const receivingTeam = targetTeam;
    const losingTeam = targetTeam === 'T1' ? 'T2' : 'T1';

    for (let i = 0; i < amount; i++) {
        if (this.centralCoins[color] > 0) {
            this.centralCoins[color]--;
            this.teams[receivingTeam].coins[color]++;
        } else if (this.teams[losingTeam].coins[color] > 0) {
            this.teams[losingTeam].coins[color]--;
            this.teams[receivingTeam].coins[color]++;
        }
    }
    
    // Check for L1/L2/L3 Progression
    if (this.teams[receivingTeam].coins.yellow === 6 && this.teams[receivingTeam].coins.red === 1) {
        this.teams[receivingTeam].L += 1;
        
        // Reset coins to center
        this.teams.T1.coins = { yellow: 0, red: 0 };
        this.teams.T2.coins = { yellow: 0, red: 0 };
        this.centralCoins = { yellow: 6, red: 1 };
        
        // Check for L3
        if (this.teams[receivingTeam].L >= 3) {
            this.pendingCollapse = true;
            this.gamesAfterL3 = 0;
            this.io.to(this.roomId).emit('l3_reached', receivingTeam);
        }
    }
    
    this.broadcastState();
  }

  broadcastState() {
    // Basic public state
    const publicState = {
      gameState: this.gameState,
      teams: this.teams,
      seatOrder: this.seatOrder,
      players: this.players.map(p => ({ socketId: p.socketId, name: p.name, cardCount: p.hand.length })),
      turnIndex: this.turnIndex,
      currentTrick: this.currentTrick,
      highestBid: this.highestBid,
      highestBidder: this.highestBidder,
      isThurupRevealed: this.isThurupRevealed,
      teamPoints: this.teamPoints,
      thurup: this.thurup,
      centralCoins: this.centralCoins,
      chatHistory: this.chatHistory
    };

    this.players.forEach(p => {
      this.io.to(p.socketId).emit('updateState', {
        ...publicState,
        myHand: p.hand
      });
    });
  }
}

module.exports = Room;
