const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let rooms = {};

function generateQuestion() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let letter = letters[Math.floor(Math.random() * letters.length)];
  return `Введите слово с буквой "${letter}"`;
}

function nextRound(roomId) {
  const room = rooms[roomId];
  room.round++;
  room.question = generateQuestion();
  room.answers = {};
  broadcastRoom(roomId, { type: "newRound", question: room.question, round: room.round });
}

function broadcastRoom(roomId, message) {
  const room = rooms[roomId];
  room.players.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

wss.on("connection", ws => {
  ws.on("message", msg => {
    let data;
    try { data = JSON.parse(msg); } catch(e) { return; }

    if (data.type === "join") {
      const { roomId, name } = data;
      if (!rooms[roomId]) {
        rooms[roomId] = { players: [], round: 0, question: "", answers: {}, scores: {} };
      }
      ws.name = name;
      ws.roomId = roomId;
      rooms[roomId].players.push(ws);

      if (rooms[roomId].players.length >= 3 && rooms[roomId].round === 0) {
        nextRound(roomId);
      }
    }

    if (data.type === "answer") {
      const room = rooms[ws.roomId];
      room.answers[ws.name] = data.answer;

      if (Object.keys(room.answers).length === room.players.length) {
        // подсчет очков
        room.players.forEach(player => {
          room.scores[player.name] = (room.scores[player.name] || 0) + room.answers[player.name].length;
        });

        if (room.round >= 10) {
          broadcastRoom(ws.roomId, { type: "gameOver", scores: room.scores });
        } else {
          broadcastRoom(ws.roomId, { type: "roundResult", answers: room.answers, scores: room.scores });
          setTimeout(() => nextRound(ws.roomId), 2000);
        }
      }
    }
  });

  ws.on("close", () => {
    const room = rooms[ws.roomId];
    if (room) {
      room.players = room.players.filter(p => p !== ws);
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
