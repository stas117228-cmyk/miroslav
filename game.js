const socket = io();
const nickname = localStorage.getItem('nickname');
const roomId = localStorage.getItem('roomId');

console.log('Отправляем joinRoom', nickname, roomId);
socket.emit('joinRoom', { nickname, roomId });

socket.on('updatePlayers', players => {
    console.log('updatePlayers', players);
    document.getElementById('players').innerText = 'Игроки: ' + players.join(', ');
});
socket.on('timer', time => document.getElementById('timer').innerText = 'Осталось: ' + time + 's');
socket.on('newQuestion', ({ round, question }) => {
    document.getElementById('question').innerText = Раунд ${round}: ${question};
    document.getElementById('answer').value = '';
});
socket.on('wrongAnswer', () => alert('Неправильный ответ!'));
socket.on('correctAnswer', () => alert('Правильный ответ!'));
socket.on('roundOver', () => document.getElementById('nextRoundBtn').style.display='inline-block');

document.getElementById('sendBtn').onclick = () => {
    const ans = document.getElementById('answer').value.trim();
    if(ans) socket.emit('answer', { roomId, answer: ans });
};
document.getElementById('nextRoundBtn').onclick = () => {
    document.getElementById('nextRoundBtn').style.display='none';
    socket.emit('nextRound', { roomId });
};
