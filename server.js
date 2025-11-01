const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let rooms = {}; // { roomId: { players: {}, round: 0, questions: [] } }
let questions = require('./questions.json');

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('joinRoom', ({ roomId, nickname }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {}, round: 0, questions: shuffle(questions).slice(0,10) };
        }
        if (Object.keys(rooms[roomId].players).length >= 6) {
            socket.emit('roomFull');
            return;
        }

        rooms[roomId].players[socket.id] = { nickname, score: 0 };
        socket.join(roomId);

        io.to(roomId).emit('updatePlayers', Object.values(rooms[roomId].players).map(p => p.nickname));
        if (Object.keys(rooms[roomId].players).length >= 1) {
            startRound(roomId);
        }
    });

    socket.on('answer', ({ roomId, answer }) => {
        const room = rooms[roomId];
        if (!room) return;
        const currentQuestion = room.questions[room.round];
        if (currentQuestion) {
            room.players[socket.id].score += answer.length;
        }
    });

    socket.on('nextRound', (roomId) => {
        const room = rooms[roomId];
        if (!room) return;
        room.round++;
        if (room.round >= room.questions.length) {
            // Игра закончена
            const winner = Object.values(room.players).reduce((a,b) => a.score >= b.score ? a : b);
            io.to(roomId).emit('gameOver', winner);
            delete rooms[roomId];
        } else {
            startRound(roomId);
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];
                io.to(roomId).emit('updatePlayers', Object.values(rooms[roomId].players).map(p => p.nickname));
            }
        }
    });
});

function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const question = room.questions[room.round];
    io.to(roomId).emit('newQuestion', { round: room.round+1, question: question.q });
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
