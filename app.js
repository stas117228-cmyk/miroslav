import { allQuestions } from './questions.js';

const ws = new WebSocket(`ws://${window.location.host}`);

const loginDiv = document.getElementById('login');
const lobbyDiv = document.getElementById('lobby');
const gameDiv = document.getElementById('game');
const resultsDiv = document.getElementById('results');

const nickInput = document.getElementById('nickInput');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const questionEl = document.getElementById('question');
const answerInput = document.getElementById('answerInput');
const timerEl = document.getElementById('timer');
const playerList = document.getElementById('playerList');
const leadersEl = document.getElementById('leaders');
const finalResultsEl = document.getElementById('finalResults');
const questionImage = document.getElementById('questionImage');

let nick = '';
let timeLeft = 30;

joinBtn.onclick = () => {
  nick = nickInput.value.trim();
  if (!nick) return;
  ws.send(JSON.stringify({ type: 'join', nick }));
  loginDiv.style.display = 'none';
  lobbyDiv.style.display = 'flex';
};

startBtn.onclick = () => {
  ws.send(JSON.stringify({ type: 'start' }));
};

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const answer = answerInput.value.trim();
    if (!answer) return;
    ws.send(JSON.stringify({ type: 'answer', answer }));
  }
});

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  // Лобби
  if (data.type === 'lobby') {
    playerList.innerHTML = data.players.map(p => `<div>${p}</div>`).join('');
  }

  // Новый вопрос
  if (data.type === 'newQuestion') {
    lobbyDiv.style.display = 'none';
    gameDiv.style.display = 'flex';
    questionEl.textContent = data.question.text || data.question;

    if (data.question.image) {
      questionImage.src = images/${data.question.image};
      questionImage.style.display = 'block';
    } else {
      questionImage.style.display = 'none';
    }

    answerInput.value = '';
    answerInput.disabled = false;
    answerInput.className = '';
    answerInput.focus();
    leadersEl.innerHTML = '';
    timeLeft = 30;
    timerEl.textContent = timeLeft;
  }

  // Таймер
  if (data.type === 'timer') {
    timeLeft = data.timeLeft;
    timerEl.textContent = timeLeft;
  }

  // Результат ответа
  if (data.type === 'answerResult') {
    if (data.correct) {
      answerInput.className = 'correct';
      answerInput.disabled = true;
    } else {
      answerInput.className = 'wrong';
    }
  }

  // Конец раунда
  if (data.type === 'roundEnd') {
    leadersEl.innerHTML = data.answers
      .map(p => `<div>${p.nick}: ${p.score} букв — ${p.answer || '-'}</div>`)
      .join('');
  }

  // Конец игры
  if (data.type === 'gameEnd') {
    gameDiv.style.display = 'none';
    resultsDiv.style.display = 'flex';
    finalResultsEl.innerHTML = data.winners
      .map(p => `<div>${p.nick}: ${p.score} букв</div>`)
      .join('');
  }
};
