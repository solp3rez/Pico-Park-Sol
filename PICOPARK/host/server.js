const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Matter = require("matter-js");
const path = require("path");
const os = require("os");
const QRCode = require("qrcode");

const { Engine, World, Bodies, Body } = Matter;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket"],
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;

// Forzamos la IP que me pasaste para evitar errores de detección
const LOCAL_IP = "10.56.2.32";

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];
const NAMES = ["Rojo", "Azul", "Verde", "Amarillo"];
const PW = 32,
  PH = 40;
const SPEED = 3.5;
const JUMP_SPEED = 8;
const FPS = 60;

// Capas de colisión
const CAT_WORLD = 0x0002;
const CAT_PLAYER = 0x0001;
const CAT_BOX = 0x0004;

const BOX_W = 38,
  BOX_H = 38;

const LEVELS = {
  1: {
    width: 1200,
    height: 600,
    platforms: [
      { x: 600, y: 580, w: 1200, h: 40 },
      { x: 200, y: 460, w: 160, h: 20 },
      { x: 500, y: 360, w: 160, h: 20 },
      { x: 850, y: 300, w: 160, h: 20 },
    ],
    boxes: [
      { x: 380, y: 541 },
      { x: 430, y: 541 },
    ],
    keyPos: { x: 850, y: 255 },
    doorPos: { x: 1130, y: 536 },
    spawns: [
      { x: 80, y: 525 },
      { x: 135, y: 525 },
      { x: 190, y: 525 },
      { x: 245, y: 525 },
    ],
  },
  2: {
    width: 1200,
    height: 600,
    platforms: [
      { x: 600, y: 580, w: 1200, h: 40 },
      { x: 150, y: 480, w: 140, h: 20 },
      { x: 430, y: 380, w: 140, h: 20 },
      { x: 600, y: 200, w: 160, h: 20 },
      { x: 1000, y: 400, w: 160, h: 20 },
    ],
    boxes: [
      { x: 340, y: 541 },
      { x: 390, y: 541 },
      { x: 440, y: 541 },
    ],
    keyPos: { x: 600, y: 150 },
    doorPos: { x: 1080, y: 358 },
    spawns: [
      { x: 80, y: 525 },
      { x: 135, y: 525 },
      { x: 190, y: 525 },
      { x: 245, y: 525 },
    ],
  },
};

let engine = null;
let world = null;
const players = {};
const lobbyPlayers = {};
let playerSlots = 0;
let keyState = { x: 0, y: 0, collected: false, holder: null };
let doorPos = { x: 0, y: 0 };
let currentLevel = 1;
let gameStatus = "lobby";
let boxBodies = [];

function emitLobby() {
  io.emit("lobbyUpdate", {
    players: Object.values(lobbyPlayers),
    count: Object.keys(lobbyPlayers).length,
  });
}

function initLevel(num) {
  if (engine) {
    World.clear(world);
    Engine.clear(engine);
  }
  engine = Engine.create({ gravity: { y: 1.5 } });
  world = engine.world;

  const lvl = LEVELS[num];
  const worldFilter = { category: CAT_WORLD, mask: CAT_PLAYER | CAT_BOX };
  const T = 60;

  const walls = [
    Bodies.rectangle(-T / 2, lvl.height / 2, T, lvl.height, {
      isStatic: true,
      label: "wall",
      collisionFilter: worldFilter,
    }),
    Bodies.rectangle(lvl.width + T / 2, lvl.height / 2, T, lvl.height, {
      isStatic: true,
      label: "wall",
      collisionFilter: worldFilter,
    }),
    Bodies.rectangle(lvl.width / 2, -T / 2, lvl.width, T, {
      isStatic: true,
      label: "wall",
      collisionFilter: worldFilter,
    }),
  ];

  World.add(world, [
    ...lvl.platforms.map((p) =>
      Bodies.rectangle(p.x, p.y, p.w, p.h, {
        isStatic: true,
        friction: 0.5,
        restitution: 0,
        collisionFilter: worldFilter,
      }),
    ),
    ...walls,
  ]);

  boxBodies = lvl.boxes.map((b, i) =>
    Bodies.rectangle(b.x, b.y, BOX_W, BOX_H, {
      label: `box_${i}`,
      friction: 0.1,
      frictionAir: 0.03,
      restitution: 0.3,
      density: 0.004,
      collisionFilter: {
        category: CAT_BOX,
        mask: CAT_WORLD | CAT_PLAYER | CAT_BOX,
      },
    }),
  );
  if (boxBodies.length) World.add(world, boxBodies);

  keyState = {
    x: lvl.keyPos.x,
    y: lvl.keyPos.y,
    collected: false,
    holder: null,
  };
  doorPos = { x: lvl.doorPos.x, y: lvl.doorPos.y };
  gameStatus = "playing";

  let i = 0;
  for (const id in players) {
    const spawn = lvl.spawns[i] || lvl.spawns[0];
    players[id].body = makeBody(id, spawn);
    players[id].atDoor = false;
    players[id].inputs = { left: false, right: false, jump: false };
    World.add(world, players[id].body);
    i++;
  }
}

function makeBody(socketId, spawn) {
  return Bodies.rectangle(spawn.x, spawn.y, PW, PH, {
    label: `player_${socketId}`,
    friction: 0.3,
    frictionAir: 0.015,
    restitution: 0,
    inertia: Infinity,
    collisionFilter: { category: CAT_PLAYER, mask: CAT_WORLD | CAT_BOX },
  });
}

function isOnGround(body) {
  const footY = body.position.y + PH / 2;
  const footX = body.position.x;
  const threshold = 5;

  for (const b of world.bodies) {
    if (b === body) continue;
    if (
      b.isStatic ||
      b.label.startsWith("box") ||
      b.label.startsWith("player")
    ) {
      const bounds = b.bounds;
      if (
        footX > bounds.min.x - 2 &&
        footX < bounds.max.x + 2 &&
        footY >= bounds.min.y - threshold &&
        footY <= bounds.min.y + threshold
      ) {
        return true;
      }
    }
  }
  return false;
}

function tick() {
  if (gameStatus !== "playing") return;

  for (const id in players) {
    const p = players[id];
    const { body, inputs } = p;
    const onGround = isOnGround(body);

    let vx = body.velocity.x;
    if (inputs.left) vx = -SPEED;
    else if (inputs.right) vx = SPEED;
    else vx *= onGround ? 0.7 : 0.98;

    let vy = body.velocity.y;
    if (inputs.jump && onGround) {
      vy = -JUMP_SPEED;
      p.inputs.jump = false;
    }

    Body.setVelocity(body, { x: vx, y: vy });

    if (!keyState.collected) {
      const dx = body.position.x - keyState.x;
      const dy = body.position.y - keyState.y;
      if (dx * dx + dy * dy < 1000) {
        keyState.collected = true;
        keyState.holder = id;
        io.emit("keyCollected", { playerName: p.name });
      }
    }

    if (keyState.holder === id) {
      keyState.x = body.position.x;
      keyState.y = body.position.y - 30;
    }

    const distToDoor = Math.hypot(
      body.position.x - doorPos.x,
      body.position.y - doorPos.y,
    );
    p.atDoor = keyState.collected && distToDoor < 45;
  }

  Engine.update(engine, 1000 / FPS);

  const pList = Object.values(players);
  if (pList.length >= 1 && keyState.collected && pList.every((p) => p.atDoor)) {
    gameStatus = "complete";
    io.emit("levelComplete", { level: currentLevel });
  }

  const state = {
    status: gameStatus,
    level: currentLevel,
    key: keyState,
    door: doorPos,
    boxes: boxBodies.map((b) => ({ x: b.position.x, y: b.position.y })),
    players: {},
  };
  for (const id in players) {
    state.players[id] = {
      x: players[id].body.position.x,
      y: players[id].body.position.y,
      color: players[id].color,
      name: players[id].name,
      atDoor: players[id].atDoor,
    };
  }
  io.emit("gameState", state);
}

setInterval(tick, 1000 / FPS);

io.on("connection", (socket) => {
  socket.on("joinAsHost", () => {
    socket.emit("serverInfo", { ip: LOCAL_IP, port: PORT });
    socket.emit("levelData", LEVELS[currentLevel]);
  });

  socket.on("joinAsPlayer", () => {
    if (Object.keys(lobbyPlayers).length + Object.keys(players).length >= 4)
      return;

    const index = playerSlots % 4;
    playerSlots++;
    lobbyPlayers[socket.id] = {
      id: socket.id,
      color: COLORS[index],
      name: NAMES[index],
      index,
    };
    socket.emit("playerAssigned", lobbyPlayers[socket.id]);
    emitLobby();
  });

  socket.on("startGame", () => {
    if (gameStatus !== "lobby") return;
    initLevel(currentLevel);
    for (const id in lobbyPlayers) {
      const lp = lobbyPlayers[id];
      players[id] = {
        body: makeBody(id, LEVELS[currentLevel].spawns[lp.index]),
        ...lp,
        inputs: { left: false, right: false, jump: false },
        atDoor: false,
      };
      World.add(world, players[id].body);
    }
    for (const id in lobbyPlayers) delete lobbyPlayers[id];
    io.emit("gameStarted", { level: currentLevel });
  });

  socket.on("input", ({ key, pressed }) => {
    if (players[socket.id]) players[socket.id].inputs[key] = pressed;
  });

  socket.on("disconnect", () => {
    if (players[socket.id]) {
      World.remove(world, players[socket.id].body);
      delete players[socket.id];
    }
    delete lobbyPlayers[socket.id];
    emitLobby();
  });
});

app.get("/qr", async (req, res) => {
  try {
    const addr = `http://${LOCAL_IP}:${PORT}`;
    const qr = await QRCode.toDataURL(addr);
    res.json({ qr, ip: LOCAL_IP, port: PORT });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\nServidor PicoPark en: http://${LOCAL_IP}:${PORT}\n`);
});
