const socket = io();
const roomId = prompt('Enter room ID:');
const playerName = prompt('Enter your name:');
socket.emit('joinRoom', roomId, playerName);

const playersDiv = document.getElementById('players');
const answersDiv = document.getElementById('answers');
const answerInput = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');

submitBtn.addEventListener('click', () => {
  const answer = answerInput.value.trim();
  if(answer) {
    socket.emit('submitAnswer', roomId, answer);
    answerInput.value = '';
  }
});

socket.on('updatePlayers', (players) => {
  playersDiv.innerHTML = '<h3>Players:</h3>' + players.map(p => p.name).join('<br>');
});

socket.on('updateAnswers', (answers) => {
  answersDiv.innerHTML = '<h3>Answers:</h3>' + answers.map(a => a.answer).join('<br>');
});
