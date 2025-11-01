const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Игровая логика
const rooms = {};
const questions = [
    { q: "Какое животное считается самым ленивым на планете?", a: ["ленивец"] },
    { q: "Если у тебя есть три яблока и ты забираешь два, сколько у тебя яблок?", a: ["2"] },
    { q: "Какая планета названа в честь римского бога войны?", a: ["марс"] },
    { q: "Что можно поймать, но нельзя бросить?", a: ["простуда"] },
    { q: "Какая страна известна своими кленовыми листьями?", a: ["канада"] },
    { q: "Что всегда идёт, но никогда не приходит?", a: ["время"] },
    { q: "Какой океан самый большой на Земле?", a: ["тихий"] },
    { q: "Что становится мокрым, когда сушит?", a: ["полотенце"] },
    { q: "Сколько месяцев имеют 28 дней?", a: ["12"] },
    { q: "Какая птица не умеет летать?", a: ["пингвин"] },
];

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

        // Отправляем список игроков всем
        const playerNames = room.players.map(p => p.nickname);
        io.to(roomId).emit('updatePlayers', playerNames);

        // Если вопрос уже идёт, отправляем текущий вопрос новому игроку
        if (room.currentQuestion) {
            socket.emit('newQuestion', { round: room.round, question: room.currentQuestion.q });
            socket.emit('timer', room.timeLeft);
        } else {
            // Иначе запускаем первый раунд
            startRound(roomId);
        }
    });

    socket.on('answer', ({ roomId, answer }) => {
        const room = rooms[roomId];
        if (!room || !room.currentQuestion) return;

        const isCorrect = room.currentQuestion.a.includes(answer.toLowerCase());
        if (isCorrect) {
            room.answers[socket.id] = answer;
            socket.emit('correctAnswer');
        } else {
            socket.emit('wrongAnswer');
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.players = room.players.filter(p => p.id !== socket.id);
            const playerNames = room.players.map(p => p.nickname);
            io.to(roomId).emit('updatePlayers', playerNames);
            if (room.players.length === 0) {
                if (room.timer) clearInterval(room.timer);
                delete rooms[roomId];
            }
        }
    });
});

function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const question = getRandomQuestion();
    room.currentQuestion = question;
    room.answers = {};
    room.timeLeft = 20;

    io.to(roomId).emit('newQuestion', { round: room.round, question: question.q });
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

    room.round++;
    if (room.round > 10) {
        const winner = room.players.reduce((a, b) => (a.score > b.score ? a : b));
        io.to(roomId).emit('gameOver', winner);
        if (room.timer) clearInterval(room.timer);
        delete rooms[roomId];
    } else {
        startRound(roomId); // запускаем следующий раунд автоматически
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
