const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Раздача статических файлов из public/
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Сокеты для игры
const rooms = {};

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('joinRoom', ({ nickname, roomId }) => {
        if (!rooms[roomId]) rooms[roomId] = [];
        if (rooms[roomId].length >= 6) {
            socket.emit('roomFull');
            return;
        }

        rooms[roomId].push({ id: socket.id, nickname, score: 0 });
        socket.join(roomId);

        const players = rooms[roomId].map(p => p.nickname);
        io.to(roomId).emit('updatePlayers', players);

        socket.emit('newQuestion', { round: 1, question: getRandomQuestion() });
    });

    socket.on('answer', ({ roomId, answer }) => {
        const player = rooms[roomId]?.find(p => p.id === socket.id);
        if (player) player.score += answer.length;
    });

    socket.on('nextRound', (roomId) => {
        const room = rooms[roomId];
        if (!room) return;
        const round = room[0]?.round ? room[0].round + 1 : 2;

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
        }
    });
});

// Пример вопросов
const questions = [
    { q: "Какое животное считается самым ленивым на планете?" },
    { q: "Если у тебя есть три яблока и ты забираешь два, сколько у тебя яблок?" },
    { q: "Какая планета названа в честь римского бога войны?" },
    { q: "Что можно поймать, но нельзя бросить?" },
    { q: "Какая страна известна своими кленовыми листьями?" },
    { q: "Что всегда идёт, но никогда не приходит?" },
    { q: "Какой океан самый большой на Земле?" },
    { q: "Что становится мокрым, когда сушит?" },
    { q: "Сколько месяцев имеют 28 дней?" },
    { q: "Какая птица не умеет летать?" },
    { q: "Что можно увидеть с закрытыми глазами?" },
    { q: "Какой фрукт на английском называется 'grape'?" },
    { q: "Что тяжелее: килограмм пуха или килограмм камней?" },
    { q: "Какой элемент в таблице Менделеева обозначается символом 'O'?" },
    { q: "Что растёт вниз, но не вверх?" },
    { q: "Какая страна подарила статую Свободы США?" },
    { q: "Что всегда перед тобой, но ты никогда не видишь?" },
    { q: "Какой месяц имеет наименьшее количество дней?" },
    { q: "Какой газ мы вдыхаем, чтобы жить?" },
    { q: "Что можно сломать, не касаясь руками?" }
];

function getRandomQuestion() {
    return questions[Math.floor(Math.random() * questions.length)].q;
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
