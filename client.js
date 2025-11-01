const socket = io();

let playerName = '';

const joinBtn = document.getElementById('joinBtn');
const nameInput = document.getElementById('nameInput');
const gameDiv = document.getElementById('game');
const questionDiv = document.getElementById('question');
const answerInput = document.getElementById('answerInput');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');
const roundDiv = document.getElementById('round');

joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if(name){
        playerName = name;
        socket.emit('join', name);
    }
});

socket.on('joined', (name) => {
    document.querySelector('div').style.display = 'none';
    gameDiv.style.display = 'block';
    messagesDiv.innerHTML += <div>Joined as </div>;
});

sendBtn.addEventListener('click', () => {
    const answer = answerInput.value.trim();
    if(answer){
        socket.emit('answer', {name: playerName, answer});
        answerInput.value = '';
    }
});

socket.on('newQuestion', ({question, round}) => {
    questionDiv.textContent = Question: ;
    roundDiv.textContent = Round: ;
});

socket.on('gameOver', (winner) => {
    messagesDiv.innerHTML += <div>Game Over! Winner:  with  points</div>;
});
