let ws;

function joinGame() {
  const name = document.getElementById("name").value;
  const room = document.getElementById("room").value;
  ws = new WebSocket(`ws://${location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", roomId: room, name }));
    document.getElementById("login").style.display = "none";
    document.getElementById("game").style.display = "block";
  };

  ws.onmessage = msg => {
    const data = JSON.parse(msg.data);
    if (data.type === "newRound") {
      document.getElementById("round").innerText = `Раунд ${data.round}`;
      document.getElementById("question").innerText = data.question;
      document.getElementById("answer").value = "";
    }
    if (data.type === "roundResult") {
      document.getElementById("scores").innerText = JSON.stringify(data.scores, null, 2);
    }
    if (data.type === "gameOver") {
      document.getElementById("scores").innerText = "Игра окончена!\n" + JSON.stringify(data.scores, null, 2);
    }
  };
}

function sendAnswer() {
  const answer = document.getElementById("answer").value;
  ws.send(JSON.stringify({ type: "answer", answer }));
}
