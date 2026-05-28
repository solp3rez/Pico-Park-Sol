const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const Matter = require("matter-js");

const { Engine, World, Bodies, Body } = Matter;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;
const LOCAL_IP = "10.56.2.21";

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];
const NAMES = ["Rojo", "Azul", "Verde", "Amarillo"];

let engine, world;
let players = {};
let lobbyPlayers = {};
let gameStatus = "lobby";
let currentLevel = 1;

const LEVELS = {
  1: {
    width: 1200,
    height: 600,
    platforms: [{ x: 600, y: 580, w: 1200, h: 40 }],
    spawns: [{ x: 100, y: 520 }]
  }
};

function makeBody(id, spawn) {
  return Bodies.rectangle(spawn.x, spawn.y, 32, 40, {
    label: id,
    inertia: Infinity // Evita que el personaje rote/se caiga de costado
  });
}

function initLevel() {
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1; // Gravedad para que puedan caer/saltar

  const lvl = LEVELS[currentLevel];

  // Agregar plataformas físicas
  lvl.platforms.forEach(p => {
    World.add(world, Bodies.rectangle(p.x, p.y, p.w, p.h, { isStatic: true }));
  });

  // Traspasar jugadores del lobby al juego activo
  players = {};
  for (const id in lobbyPlayers) {
    const lp = lobbyPlayers[id];
    const body = makeBody(id, lvl.spawns[0]);
    World.add(world, body);

    players[id] = {
      ...lp,
      body,
      inputs: { left: false, right: false, jump: false }
    };
  }

  lobbyPlayers = {}; // Limpiamos lobby
  gameStatus = "playing";
  io.emit("gameStarted");
}

// LOOP DE FÍSICA Y SINK (60 FPS)
setInterval(() => {
  if (gameStatus !== "playing") return;

  for (const id in players) {
    const p = players[id];
    const b = p.body;
    let vx = 0;

    if (p.inputs.left) vx = -4;
    if (p.inputs.right) vx = 4;
    
    // Aplicar velocidad horizontal conservando la caída vertical
    Body.setVelocity(b, { x: vx, y: b.velocity.y });

    // Lógica básica de salto (solo si no está ya en el aire flotando a lo loco)
    if (p.inputs.jump && Math.abs(b.velocity.y) < 0.01) {
      Body.setVelocity(b, { x: b.velocity.x, y: -10 });
      p.inputs.jump = false; // Reset inmediato para evitar doble salto infinito
    }
  }

  Engine.update(engine, 1000 / 60);

  // Formateo limpio del estado para el Host
  const state = {};
  for (const id in players) {
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
  
  socket.on("joinAsPlayer", () => {
    const i = Object.keys(lobbyPlayers).length;
    lobbyPlayers[socket.id] = {
      id: socket.id,
      name: NAMES[i % NAMES.length],
      color: COLORS[i % COLORS.length]
    };
    io.emit("lobbyUpdate", { players: Object.values(lobbyPlayers) });
  });

  // Escucha el input del cel, si es "start" arranca el nivel
  socket.on("input", ({ key, pressed }) => {
    if (key === "start" && gameStatus === "lobby") {
      initLevel();
      return;
    }

    if (players[socket.id]) {
      players[socket.id].inputs[key] = pressed;
    }
  });

  socket.on("disconnect", () => {
    if (lobbyPlayers[socket.id]) {
      delete lobbyPlayers[socket.id];
      io.emit("lobbyUpdate", { players: Object.values(lobbyPlayers) });
    }
    if (players[socket.id]) {
      if (world && players[socket.id].body) World.remove(world, players[socket.id].body);
      delete players[socket.id];
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor listo http://${LOCAL_IP}:${PORT}`);
});