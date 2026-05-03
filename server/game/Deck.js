const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = [
  { name: '3', points: 3, power: 8 },
  { name: 'J', points: 3, power: 8 },
  { name: '9', points: 2, power: 7 },
  { name: 'A', points: 1, power: 6 },
  { name: '10', points: 1, power: 5 },
  { name: 'K', points: 0, power: 4 },
  { name: 'Q', points: 0, power: 3 },
  { name: '8', points: 0, power: 2 },
  { name: '7', points: 0, power: 1 }
];

class Deck {
  constructor() {
    this.cards = [];
    this.build();
  }

  build() {
    this.cards = [];
    for (let suit of SUITS) {
      for (let rank of RANKS) {
        this.cards.push({ suit, ...rank });
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(num) {
    if (this.cards.length < num) return [];
    return this.cards.splice(0, num);
  }
}

module.exports = Deck;
