const socket = io();
const nickname = localStorage.getItem('nickname');
const roomId = localStorage.getItem('roomId');

socket.emit('joinRoom', { nickname, roomId });

let scoreChart;

function createChart(players) {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: players.map(p => p.nickname),
            datasets: [{
                label: 'Очки (буквы)',
                data: players.map(p => p.score),
                backgroundColor: 'purple'
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function updateChart(players) {
    if (scoreChart) {
        scoreChart.data.labels = players.map(p => p.nickname);
        scoreChart.data.datasets[0].data = players.map(p => p.score);
        scoreChart.update();
    } else {
        createChart(players);
    }
}

socket.on('roomFull', () => alert('Комната заполнена'));
socket.on('updatePlayers', players => document.getElementById('players').innerText = 'Игроки: ' + players.join(', '));
socket.on('timer', time => document.getElementById('timer').innerText = `Осталось: ${time}s`);
socket.on('newQuestion', ({ round, question }) => {
    document.getElementById('question').innerText = Раунд ${round}: ${question};
    document.getElementById('answer').value = '';
});
socket.on('wrongAnswer', () => alert('Неправильный ответ! Попробуйте снова.'));
socket.on('correctAnswer', () => alert('Правильный ответ!'));
socket.on('roundOver', results => {
    let text = 'Раунд завершён! Ответы игроков:\n';
    results.forEach(r => text += `${r.nickname}: ${r.answer} ${r.correct?'(правильно)':'(неправильно)'}\n`);
    alert(text);
});
socket.on('updateScores', players => updateChart(players));
socket.on('gameOver', winner => {
    alert('Игра окончена! Победитель: ' + winner.nickname + ' с ' + winner.score + ' букв.');
    window.location.href = '/';
});

document.getElementById('sendBtn').onclick = () => {
    const answer = document.getElementById('answer').value.trim();
    if (answer) socket.emit('answer', { roomId, answer });
};
