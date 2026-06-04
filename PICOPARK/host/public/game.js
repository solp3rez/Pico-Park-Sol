const socket = io();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1200;
canvas.height = 600;

let lobbyPlayers = [];
let gameState = null;
let gameStarted = false;

// ─────────────────────────────
// SOCKET EVENTS
// ─────────────────────────────

socket.on("lobbyUpdate", (data) => {
  lobbyPlayers = data.players || [];

  const playersText = document.getElementById("players");
  if (playersText) {
    playersText.innerText = "Jugadores: " + lobbyPlayers.length;
  }
});

socket.on("gameStarted", () => {
  gameStarted = true;
});

socket.on("gameState", (state) => {
  gameState = state;
});

// ─────────────────────────────
// BOTÓN START HTML (Si existe en tu DOM)
// ─────────────────────────────

const startButton = document.getElementById("btn");
if (startButton) {
  startButton.onclick = () => {
    // 🔥 HOY: Cambiado a < 1 para poder testear solo. Mañana volvelo a < 2
    if (lobbyPlayers.length < 1) {
      alert("Se necesitan mínimo 1 jugador");
      return;
    }

    socket.emit("input", {
      key: "start",
      pressed: true
    });
  };
}

// ─────────────────────────────
// DIBUJAR LOBBY
// ─────────────────────────────

function drawLobby() {
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "bold 40px Arial";
  ctx.fillText("PICO PARK", 50, 60);

  ctx.font = "24px Arial";
  ctx.fillText("Esperando jugadores...", 50, 100);

  ctx.fillText(`Jugadores: ${lobbyPlayers.length}/4`, 50, 150);

  lobbyPlayers.forEach((player, index) => {
    const y = 220 + index * 80;
    ctx.fillStyle = player.color;
    ctx.fillRect(50, y, 50, 50);

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText(player.name, 120, y + 35);
  });

  // START VISUAL: cambia a verde si hay 1 o más hoy
  ctx.fillStyle = lobbyPlayers.length >= 1 ? "#2ecc71" : "#666";
  ctx.fillRect(450, 450, 300, 80);

  ctx.fillStyle = "white";
  ctx.font = "bold 32px Arial";
  ctx.fillText("START GAME", 490, 500);

  // Mensaje de advertencia dinámico
  if (lobbyPlayers.length < 1) {
    ctx.fillStyle = "#ff5555";
    ctx.font = "20px Arial";
    ctx.fillText("Mínimo 1 jugador", 470, 560);
  }
}

// ─────────────────────────────
// DIBUJAR PARTIDA
// ─────────────────────────────

function drawGame() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Piso
  ctx.fillStyle = "#333";
  ctx.fillRect(0, 560, 1200, 40);

  if (!gameState) return;

  for (let id in gameState.players) {
    const p = gameState.players[id];
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 16, p.y - 20, 32, 40);

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(p.name, p.x - 20, p.y - 30);
  }
}

// ─────────────────────────────
// START CON CLICK EN CANVAS
// ─────────────────────────────

canvas.addEventListener("click", (e) => {
  if (gameStarted) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const insideButton = x >= 450 && x <= 750 && y >= 450 && y <= 530;
  if (!insideButton) return;

  // 🔥 HOY: Cambiado a < 1 para pruebas. Mañana lo cambias a < 2
  if (lobbyPlayers.length < 1) {
    alert("Se necesitan mínimo 1 jugador");
    return;
  }

  socket.emit("input", {
    key: "start",
    pressed: true
  });
});

// ─────────────────────────────
// LOOP
// ─────────────────────────────

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