import express from "express";
import { WebSocketServer } from "ws";
import { allQuestions } from "./questions.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static("."));

const server = app.listen(PORT, () => console.log(`Server running on ${PORT}`));
const wss = new WebSocketServer({ server });

let players = [];
let questions = [];
let currentIndex = 0;
let roundTimer;
const roundTime = 30;

function broadcast(data) {
  wss.clients.forEach(c => {
    if (c.readyState === c.OPEN) c.send(JSON.stringify(data));
  });
}

wss.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      players.push({ ws, nick: data.nick, score: 0, answered: false, answer: "" });
      broadcast({ type: "lobby", players: players.map(p => p.nick) });
    }

    if (data.type === "start") {
      // Выбираем случайные 10 вопросов
      questions = allQuestions
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);
      currentIndex = 0;
      startRound();
    }

    if (data.type === "answer") {
      const player = players.find(p => p.ws === ws);
      if (!player.answered) {
        const answerLower = data.answer.trim().toLowerCase();
        const correct = questions[currentIndex].answers.some(a => a.toLowerCase() === answerLower);
        if (correct) {
          player.answered = true;
          player.answer = data.answer;
          player.score += data.answer.length;
        }
        ws.send(JSON.stringify({ type: "answerResult", correct }));
      }
    }
  });

  ws.on("close", () => {
    players = players.filter(p => p.ws !== ws);
    broadcast({ type: "lobby", players: players.map(p => p.nick) });
  });
});

function startRound() {
  players.forEach(p => { p.answered = false; p.answer = ""; });
  broadcast({ type: "newQuestion", question: questions[currentIndex].question });

  let timeLeft = roundTime;
  roundTimer = setInterval(() => {
    timeLeft--;
    broadcast({ type: "timer", timeLeft });
    if (timeLeft <= 0) {
      clearInterval(roundTimer);
      endRound();
    }
  }, 1000);
}

function endRound() {
  broadcast({
    type: "roundEnd",
    answers: players.map(p => ({ nick: p.nick, answer: p.answer, score: p.score }))
  });
  currentIndex++;
  if (currentIndex < questions.length) setTimeout(startRound, 5000);
  else {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    broadcast({ type: "gameEnd", winners: sorted.map(p => ({ nick: p.nick, score: p.score })) });
  }
}
