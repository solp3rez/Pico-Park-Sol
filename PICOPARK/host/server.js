const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const Matter = require("matter-js");
const os = require("os"); 

const { Engine, World, Bodies, Body } = Matter;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/gamepad", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gamepad.html"));
});

const PORT = 3000;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        if (!name.toLowerCase().includes("virtual") && !name.toLowerCase().includes("vbox")) {
          return iface.address;
        }
      }
    }
  }
  return "127.0.0.1";
}

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];
const NAMES = ["Rojo", "Azul", "Verde", "Amarillo"];

let engine, world;
let players = {};
let lobbyPlayers = {};
let gameStatus = "lobby";
let currentLevel = 1;

const LEVELS = {
  1: {
    platforms: [
      { x: 600, y: 550, w: 1200, h: 20, isStatic: true },
      { x: 300, y: 420, w: 200, h: 20, isStatic: true },
      { x: 900, y: 420, w: 200, h: 20, isStatic: true },
      { x: 600, y: 300, w: 300, h: 20, isStatic: true }
    ],
    boxes: [
      { x: 600, y: 200, w: 50, h: 50 }
    ],
    door: { x: 1100, y: 500 },
    key: { x: 600, y: 150 }
  }
};

function initLevel() {
  engine = Engine.create();
  world = engine.world;
  engine.gravity.y = 1.5;

  const lvl = LEVELS[currentLevel];
  
  lvl.platforms.forEach(p => {
    World.add(world, Bodies.rectangle(p.x, p.y, p.w, p.h, { isStatic: true }));
  });

  lvl.boxes.forEach(b => {
    World.add(world, Bodies.rectangle(b.x, b.y, b.w, b.h, { density: 0.001 }));
  });

  players = {};
  Object.keys(lobbyPlayers).forEach((id, index) => {
    const x = 100 + index * 50;
    const y = 500;
    const body = Bodies.rectangle(x, y, 32, 40, { inertia: Infinity, friction: 0.002 });
    World.add(world, body);
    
    players[id] = {
      id: id,
      body: body,
      name: lobbyPlayers[id].name,
      color: lobbyPlayers[id].color,
      inputs: { left: false, right: false, jump: false }
    };
  });

  gameStatus = "playing";
  io.emit("gameStarted");
}

setInterval(() => {
  if (gameStatus !== "playing") return;

  Engine.update(engine, 1000 / 60);

  for (let id in players) {
    const p = players[id];
    let vx = 0;
    if (p.inputs.left) vx = -4;
    if (p.inputs.right) vx = 4;

    Body.setVelocity(p.body, { x: vx, y: p.body.velocity.y });

    if (p.inputs.jump && Math.abs(p.body.velocity.y) < 0.01) {
      Body.setVelocity(p.body, { x: p.body.velocity.x, y: -12 });
    }
  }

  let state = {};
  for (let id in players) {
    state[id] = {
      x: players[id].body.position.x,
      y: players[id].body.position.y,
      color: players[id].color,
      name: players[id].name
    };
  }

  io.emit("gameState", { players: state });
}, 1000 / 60);

io.on("connection", (socket) => {
  console.log(`Nuevo dispositivo conectado: ${socket.id}`);
  
  socket.on("joinAsPlayer", () => {
    const i = Object.keys(lobbyPlayers).length;
    lobbyPlayers[socket.id] = {
      id: socket.id,
      name: NAMES[i % NAMES.length],
      color: COLORS[i % COLORS.length]
    };
    
    socket.emit("playerAssigned", lobbyPlayers[socket.id]);
    io.emit("lobbyUpdate", { players: Object.values(lobbyPlayers) });
    console.log(`Jugador asignado en Lobby: ${lobbyPlayers[socket.id].name}`);
  });

  // CORRECCIÓN CLAVE: Escuchamos el inicio tanto en formato clásico como pro del celular
  socket.on("startGame", () => {
    if (gameStatus === "lobby") {
      console.log("-> ¡Inicio ejecutado desde el Celular!");
      initLevel();
    }
  });

  socket.on("input", ({ key, pressed }) => {
    if (key === "start" && pressed && gameStatus === "lobby") {
      console.log("-> ¡Inicio ejecutado desde Botón Web!");
      initLevel();
      return;
    }

    const playerId = players[socket.id] ? socket.id : Object.keys(lobbyPlayers).find(id => id === socket.id);
    if (playerId && players[playerId]) {
      players[playerId].inputs[key] = pressed;
    }
  });

  socket.on("disconnect", () => {
    console.log(`Dispositivo desconectado: ${socket.id}`);
    delete lobbyPlayers[socket.id];
    delete players[socket.id];
    io.emit("lobbyUpdate", { players: Object.values(lobbyPlayers) });
  });
});

// FORZAR MUESTRA DE URLS AL ARRANCAR
const detectedIP = getLocalIP();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n========================================`);
  console.log(`🎮 ¡SERVIDOR DE PICO PARK ACTIVO! 🎮`);
  console.log(`========================================`);
  console.log(`👉 LOCAL COMPU: http://localhost:${PORT}`);
  console.log(`👉 PARA EL CELU: http://${detectedIP}:${PORT}`);
  console.log(`========================================\n`);
});