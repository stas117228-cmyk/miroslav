const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

function generateQuestion() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let question = '';
  for (let i = 0; i < 5; i++) {
    question += letters[Math.floor(Math.random() * letters.length)];
  }
  return question;
}

io.on('connection', (socket) => {
  console.log(Player connected: );

  socket.on('joinRoom', (roomId, playerName) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], question: '', round: 0, answers: {} };
    }
    rooms[roomId].players.push({ id: socket.id, name: playerName });
    socket.join(roomId);
    io.to(roomId).emit('updatePlayers', rooms[roomId].players);
  });

  socket.on('nextRound', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.round++;
    room.question = generateQuestion();
    room.answers = {};
    io.to(roomId).emit('newQuestion', room.question, room.round);
  });

  socket.on('submitAnswer', (roomId, answer) => {
    const room = rooms[roomId];
    if (!room) return;
    room.answers[socket.id] = answer;
    if (Object.keys(room.answers).length === room.players.length) {
      const scores = {};
      room.players.forEach(p => {
        scores[p.name] = room.answers[p.id].length;
      });
      io.to(roomId).emit('roundResults', scores);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('updatePlayers', rooms[roomId].players);
    }
    console.log(Player disconnected: );
  });
});

server.listen(PORT, () => {
  console.log(Server running on port );
});
