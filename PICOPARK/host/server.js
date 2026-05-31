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
    width: 1200,
    height: 600,
    platforms: [{ x: 600, y: 580, w: 1200, h: 40 }],
    spawns: [{ x: 100, y: 520 }]
  }
};

function makeBody(id, spawn) {
  return Bodies.rectangle(spawn.x, spawn.y, 32, 40, {
    inertia: Infinity,
    restitution: 0,
    friction: 0.002
  });
}

function initLevel() {
  engine = Engine.create({ gravity: { y: 1 } });
  world = engine.world;

  const lvl = LEVELS[currentLevel];

  lvl.platforms.forEach(p => {
    const b = Bodies.rectangle(p.x, p.y, p.w, p.h, { isStatic: true });
    World.add(world, b);
  });

  players = {};
  let index = 0;
  for (const id in lobbyPlayers) {
    const spawn = lvl.spawns[index % lvl.spawns.length];
    const body = makeBody(id, spawn);
    World.add(world, body);

    players[id] = {
      body,
      color: lobbyPlayers[id].color,
      name: lobbyPlayers[id].name,
      inputs: { left: false, right: false, jump: false }
    };
    index++;
  }

  gameStatus = "playing";
  io.emit("gameStarted"); 
}

setInterval(() => {
  if (gameStatus !== "playing") return;

  for (const id in players) {
    const p = players[id];
    let vx = 0;
    if (p.inputs.left) vx = -4;
    if (p.inputs.right) vx = 4;

    Body.setVelocity(p.body, { x: vx, y: p.body.velocity.y });

    if (p.inputs.jump && Math.abs(p.body.velocity.y) < 0.01) {
      Body.setVelocity(p.body, { x: p.body.velocity.x, y: -10 });
    }
  }

  Engine.update(engine, 1000 / 60);

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
  console.log(`Nuevo dispositivo: ${socket.id}`);
  
  socket.on("joinAsPlayer", () => {
    const i = Object.keys(lobbyPlayers).length;
    lobbyPlayers[socket.id] = {
      id: socket.id,
      name: NAMES[i % NAMES.length],
      color: COLORS[i % COLORS.length]
    };
    
    socket.emit("playerAssigned", lobbyPlayers[socket.id]);
    io.emit("lobbyUpdate", { players: Object.values(lobbyPlayers) });
  });

  socket.on("input", ({ key, pressed }) => {
    if (key === "start" && pressed && gameStatus === "lobby") {
      console.log("-> ¡Inicio ejecutado!");
      initLevel();
      return;
    }

    const playerId = players[socket.id] ? socket.id : Object.keys(lobbyPlayers).find(id => id === socket.id);
    if (playerId && players[playerId]) {
      players[playerId].inputs[key] = pressed;
    }
  });

  socket.on("disconnect", () => {
    delete lobbyPlayers[socket.id];
    delete players[socket.id];
    io.emit("lobbyUpdate", { players: Object.values(lobbyPlayers) });
  });
});

const detectedIP = getLocalIP();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n======================================================`);
  console.log(`🎮 ¡SERVIDOR CORRIENDO SIN INTERFERENCIAS!`);
  console.log(`💻 Red local: ${detectedIP}`);
  console.log(`======================================================\n`);
});