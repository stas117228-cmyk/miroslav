const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let players = {};
let currentQuestion = '';
let round = 0;
const maxRounds = 10;

const questions = [
    'apple', 'banana', 'cherry', 'dragon', 'elephant',
    'flower', 'guitar', 'honey', 'island', 'jungle'
];

function nextRound() {
    if (round >= maxRounds) {
        // Подсчет победителя
        let winner = Object.entries(players).sort((a,b)=>b[1]-a[1])[0];
        io.emit('gameOver', winner);
        round = 0;
        players = {};
        return;
    }
    currentQuestion = questions[Math.floor(Math.random()*questions.length)];
    round++;
    io.emit('newQuestion', { question: currentQuestion, round });
}

io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id);

    socket.on('join', (name) => {
        players[name] = 0;
        socket.emit('joined', name);
    });

    socket.on('answer', ({name, answer}) => {
        players[name] += answer.length; // количество букв
        if(Object.keys(players).length >= 1) { // можно сделать проверку на всех игроков
            nextRound();
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected: ' + socket.id);
    });
});

server.listen(PORT, () => {
    console.log(Server running on port );
});
