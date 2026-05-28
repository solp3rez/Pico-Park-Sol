const socket = io();

socket.emit("joinAsHost");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1200;
canvas.height = 600;

let lobbyPlayers = [];
let gameState = null;
let gameStarted = false;

// ───── SOCKET EVENTS ─────

socket.on("lobbyUpdate", (data) => {
  lobbyPlayers = data.players || [];
  document.getElementById("players").innerText =
    "Jugadores: " + lobbyPlayers.length;
});

socket.on("gameStarted", () => {
  gameStarted = true;
});

socket.on("gameState", (state) => {
  gameState = state;
});

// ───── START BUTTON ─────

document.getElementById("btn").onclick = () => {
  socket.emit("startGame");
};

// ───── DRAW ─────

function drawLobby() {
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText("LOBBY", 50, 50);

  lobbyPlayers.forEach((p, i) => {
    ctx.fillText(p.name, 50, 120 + i * 40);
  });
}

function drawGame() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameState) return;

  // players
  for (let id in gameState.players) {
    const p = gameState.players[id];

    ctx.fillStyle = p.color;
    ctx.fillRect(p.body.position.x, p.body.position.y, 30, 40);

    ctx.fillStyle = "white";
    ctx.fillText(p.name, p.body.position.x, p.body.position.y - 10);
  }
}

// ───── LOOP ─────

function loop() {
  requestAnimationFrame(loop);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) {
    drawLobby();
  } else {
    drawGame();
  }
}

loop();