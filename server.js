 const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const questions = [
  { q: "Столица Франции?", a: ["париж"] },
  { q: "5 + 7 = ?", a: ["12"] },
  { q: "Цвет неба днем?", a: ["синий"] }
];

const rooms = {};

console.log('Server запущен, ждём подключений...');

io.on('connection', socket => {
    console.log('Новый сокет подключился:', socket.id);

    socket.on('joinRoom', ({ nickname, roomId }) => {
        console.log('joinRoom получен:', nickname, roomId);

        if (!rooms[roomId]) rooms[roomId] = { players: [], round: 0, currentQuestion: null, timer: null, timeLeft: 20 };
        const room = rooms[roomId];

        if (room.players.length >= 6) { socket.emit('roomFull'); return; }

        room.players.push({ id: socket.id, nickname, score: 0 });
        socket.join(roomId);

        io.to(roomId).emit('updatePlayers', room.players.map(p => p.nickname));

        if (!room.currentQuestion) startRound(roomId);
    });

    socket.on('answer', ({ roomId, answer }) => {
        const room = rooms[roomId];
        if (!room || !room.currentQuestion) return;

        const isCorrect = room.currentQuestion.a.includes(answer.toLowerCase());
        socket.emit(isCorrect ? 'correctAnswer' : 'wrongAnswer');

        if (isCorrect) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) player.score += answer.length;
        }

        io.to(roomId).emit('updateScores', room.players);
    });

    socket.on('nextRound', ({ roomId }) => startRound(roomId));

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

    room.currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    room.timeLeft = 20;

    io.to(roomId).emit('newQuestion', { round: room.round + 1, question: room.currentQuestion.q });
    io.to(roomId).emit('timer', room.timeLeft);

    if (room.timer) clearInterval(room.timer);
    room.timer = setInterval(() => {
        room.timeLeft--;
        io.to(roomId).emit('timer', room.timeLeft);
        if (room.timeLeft <= 0) {
            clearInterval(room.timer);
            io.to(roomId).emit('roundOver');
            room.round++;
        }
    }, 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
