const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;"
  );
  next();
});

let rooms = {};

io.on('connection', (socket) => {
  console.log(User connected: );

  socket.on('joinRoom', (roomId, playerName) => {
    if (!rooms[roomId]) rooms[roomId] = { players: [], answers: [] };
    rooms[roomId].players.push({ id: socket.id, name: playerName });
    socket.join(roomId);
    io.to(roomId).emit('updatePlayers', rooms[roomId].players);
  });

  socket.on('submitAnswer', (roomId, answer) => {
    if (rooms[roomId]) {
      rooms[roomId].answers.push({ id: socket.id, answer });
      io.to(roomId).emit('updateAnswers', rooms[roomId].answers);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('updatePlayers', rooms[roomId].players);
    }
    console.log(User disconnected: );
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(Server running on port );
});
