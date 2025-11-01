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
        if (!rooms[roomId]) rooms[roomId] = [];
        if (rooms[roomId].length >= 6) {
            socket.emit('roomFull');
            return;
        }

        rooms[roomId].push({ id: socket.id, nickname, score: 0, round: 1 });
        socket.join(roomId);

        // Отправляем список игроков
        const players = rooms[roomId].map(p => p.nickname);
        io.to(roomId).emit('updatePlayers', players);

        // Запускаем первый раунд
        startRound(roomId);
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

    socket.on('nextRound', roomId => {
        startRound(roomId);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(p => p.id !== socket.id);
            if (rooms[roomId].length === 0) delete rooms[roomId];
        }
    });
});

function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const question = getRandomQuestion();
    room.currentQuestion = question;
    room.answers = {};

    const round = room[0].round;
    io.to(roomId).emit('newQuestion', { round, question: question.q });

    let timeLeft = 20;
    io.to(roomId).emit('timer', timeLeft);
    const timerInterval = setInterval(() => {
        timeLeft--;
        io.to(roomId).emit('timer', timeLeft);
        if (timeLeft <= 0) clearInterval(timerInterval);
    }, 1000);

    setTimeout(() => {
        clearInterval(timerInterval);

        const results = room.map(p => ({
            nickname: p.nickname,
            answer: room.answers[p.id] || '-',
            correct: room.answers[p.id] ? question.a.includes(room.answers[p.id].toLowerCase()) : false
        }));

        results.forEach(r => {
            if (r.correct) {
                const player = room.find(p => p.nickname === r.nickname);
                if (player) player.score += r.answer.length;
            }
        });

        io.to(roomId).emit('roundOver', results);

        // Подготовка к следующему раунду
        room.forEach(p => p.round++);
        if (room[0].round > 10) {
            const winner = room.reduce((a, b) => (a.score > b.score ? a : b));
            io.to(roomId).emit('gameOver', winner);
            delete rooms[roomId];
        }
    }, 20000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
