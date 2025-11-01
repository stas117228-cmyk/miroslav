const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Статические файлы (HTML, CSS) в корне
app.use(express.static(__dirname));

// Загружаем вопросы
const questions = JSON.parse(fs.readFileSync('questions.json', 'utf-8'));

// Хранилище комнат
const rooms = {};

function getRandomQuestion() {
  return questions[Math.floor(Math.random() * questions.length)];
}

io.on('connection', socket => {
  console.log('Новый игрок подключился');

  socket.on('joinRoom', ({ nickname, roomId }) => {
    if (!rooms[roomId]) rooms[roomId] = { players: [], currentQuestion: null, answers: {}, round: 1, timer: null, timeLeft: 20 };
    const room = rooms[roomId];

    if (room.players.length >= 6) {
      socket.emit('roomFull');
      return;
    }

    room.players.push({ id: socket.id, nickname, score: 0 });
    socket.join(roomId);

    io.to(roomId).emit('updatePlayers', room.players.map(p => p.nickname));

    if (room.currentQuestion) {
      socket.emit('newQuestion', { round: room.round, question: room.currentQuestion.q });
      socket.emit('timer', room.timeLeft);
    } else {
      startRound(roomId);
    }
  });

  socket.on('answer', ({ roomId, answer }) => {
    const room = rooms[roomId];
    if (!room || !room.currentQuestion) return;
    const isCorrect = room.currentQuestion.a.includes(answer.toLowerCase());
    if (isCorrect) room.answers[socket.id] = answer;
    socket.emit(isCorrect ? 'correctAnswer' : 'wrongAnswer');
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('updatePlayers', room.players.map(p => p.nickname));
      if (room.players.length === 0 && room.timer) {
        clearInterval(room.timer);
        delete rooms[roomId];
      }
    }
  });
});

function startRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.currentQuestion = getRandomQuestion();
  room.answers = {};
  room.timeLeft = 20;

  io.to(roomId).emit('newQuestion', { round: room.round, question: room.currentQuestion.q });
  io.to(roomId).emit('timer', room.timeLeft);

  if (room.timer) clearInterval(room.timer);

  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(roomId).emit('timer', room.timeLeft);
    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      endRound(roomId);
    }
  }, 1000);
}

function endRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const results = room.players.map(p => ({
    nickname: p.nickname,
    answer: room.answers[p.id] || '-',
    correct: room.answers[p.id] ? room.currentQuestion.a.includes(room.answers[p.id].toLowerCase()) : false
  }));

  results.forEach(r => {
    if (r.correct) {
      const player = room.players.find(p => p.nickname === r.nickname);
      if (player) player.score += r.answer.length;
    }
  });

  io.to(roomId).emit('roundOver', results);
  io.to(roomId).emit('updateScores', room.players);

  room.round++;
  if (room.round > 10) {
    const winner = room.players.reduce((a, b) => (a.score > b.score ? a : b));
    io.to(roomId).emit('gameOver', winner);
    if (room.timer) clearInterval(room.timer);
    delete rooms[roomId];
  } else {
    startRound(roomId);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
