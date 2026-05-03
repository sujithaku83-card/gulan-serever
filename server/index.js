const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Room = require('./game/Room');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const activeRooms = {}; // Basic memory store

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = new Room(roomId, io);
    }
    const room = activeRooms[roomId];
    
    // Add player and join socket room
    if (room.addPlayer(socket.id, playerName)) {
      socket.join(roomId);
      console.log(`${playerName} joined room ${roomId}`);
      room.broadcastState();
    } else {
      socket.emit('error', 'Room is full');
    }
  });

  socket.on('startFirstGame', (roomId) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].startFirstGame();
    }
  });

  socket.on('placeBet', ({ roomId, type, value }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].handleBet(socket.id, type, value);
    }
  });

  socket.on('setThurup', ({ roomId, card }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].setThurup(socket.id, card);
    }
  });

  socket.on('startGamePhase', (roomId) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].startGamePhase();
    }
  });

  socket.on('finishBetting', (roomId) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].endBettingPhase();
    }
  });

  socket.on('shuffleTeams', (roomId) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].shuffleTeams(socket.id);
    }
  });

  socket.on('askThurup', (roomId) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].askThurup();
    }
  });

  socket.on('playCard', ({ roomId, card }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].playCard(socket.id, card);
    }
  });

  socket.on('declareWin', (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const amount = typeof data === 'string' ? 1 : (data.amount || 1);
    const target = typeof data === 'object' ? data.target : 'me';
    if (activeRooms[roomId]) {
      activeRooms[roomId].declareWin(socket.id, amount, target);
    }
  });

  socket.on('send_chat', ({ roomId, message }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].addChatMessage(socket.id, message);
    }
  });

  socket.on('manualCoinTransfer', ({ roomId, color, amount, targetTeam }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].transferManualCoins(socket.id, amount, color, targetTeam);
    }
  });

  socket.on('webrtc_signal', ({ to, signalData }) => {
    socket.to(to).emit('webrtc_signal', {
      from: socket.id,
      signalData
    });
  });

  socket.on('webrtc_ready', ({ roomId }) => {
    // Tell everyone else in the room that this peer is ready for WebRTC
    socket.to(roomId).emit('peer_ready', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (let roomId in activeRooms) {
      const room = activeRooms[roomId];
      if (room.getPlayer(socket.id)) {
        socket.to(roomId).emit('peer_disconnected', socket.id);
      }
      room.removePlayer(socket.id);
      if (room.players.length === 0) {
        delete activeRooms[roomId]; // Clean up empty rooms
      } else {
        room.broadcastState();
      }
    }
  });
});

const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Server is running, but client build was not found. Please run npm run build in the client directory.');
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
