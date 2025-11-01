const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаём статику из корня
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Игровая логика
const rooms = {};
const questions = [
    "Какое животное считается самым ленивым на планете?",
    "Если у тебя есть три яблока и ты забираешь два, сколько у тебя яблок?",
    "Какая планета названа в честь римского бога войны?",
    "Что можно поймать, но нельзя бросить?",
    "Какая страна известна своими кленовыми листьями?",
    "Что всегда идёт, но никогда не приходит?",
    "Какой океан самый большой на Земле?",
    "Что становится мокрым, когда сушит?",
    "Сколько месяцев имеют 28 дней?",
    "Какая птица не умеет летать?",
    "Что можно увидеть с закрытыми глазами?",
    "Какой фрукт на английском называется 'grape'?",
    "Что тяжелее: килограмм пуха или килограмм камней?",
    "Какой элемент в таблице Менделеева обозначается символом 'O'?",
    "Что растёт вниз, но не вверх?",
    "Какая страна подарила статую Свободы США?",
    "Что всегда перед тобой, но ты никогда не видишь?",
    "Какой месяц имеет наименьшее количество дней?",
    "Какой газ мы вдыхаем, чтобы жить?",
    "Что можно сломать, не касаясь руками?"
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

        // Отправляем первый вопрос
        socket.emit('newQuestion', { round: 1, question: getRandomQuestion() });
    });

    socket.on('answer', ({ roomId, answer }) => {
        const player = rooms[roomId]?.find(p => p.id === socket.id);
        if (player) player.score += answer.length;
    });

    socket.on('nextRound', roomId => {
        const room = rooms[roomId];
        if (!room) return;

        let round = room[0]?.round ? room[0].round + 1 : 2;
        if (round > 10) {
            const winner = room.reduce((a, b) => (a.score > b.score ? a : b));
            io.to(roomId).emit('gameOver', winner);
            delete rooms[roomId];
        } else {
            room.forEach(p => p.round = round);
            io.to(roomId).emit('newQuestion', { round, question: getRandomQuestion() });
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(p => p.id !== socket.id);
            if (rooms[roomId].length === 0) delete rooms[roomId];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
