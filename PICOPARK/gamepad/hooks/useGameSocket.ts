import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface PlayerInfo {
  id: string;
  color: string;
  name: string;
  index: number;
}

interface GameSocket {
  connected: boolean;
  player: PlayerInfo | null;
  error: string | null;
  sendInput: (key: "left" | "right" | "jump", pressed: boolean) => void;
}

export function useGameSocket(address: string): GameSocket {
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const url = address.startsWith("http")
      ? address
      : `http://${address}`;

    console.log("Conectando a:", url);

    const socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("CONECTADO");

      setConnected(true);
      setError(null);

      socket.emit("joinAsPlayer");
    });

    socket.on("playerAssigned", (info: PlayerInfo) => {
      console.log("PLAYER:", info);

      setPlayer(info);
    });

    socket.on("gameFull", () => {
      setError(
        "La sala está llena.\nIntentá más tarde."
      );

      socket.disconnect();
    });

    socket.on("disconnect", () => {
      console.log("DESCONECTADO");

      setConnected(false);
      setPlayer(null);
    });

    socket.on("connect_error", (err) => {
      console.log("ERROR:", err.message);

      setConnected(false);

      setError(
        `No se pudo conectar a:\n${address}\n\nVerificá:\n• misma red WiFi\n• servidor prendido\n• IP correcta`
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [address]);

  const sendInput = (
    key: "left" | "right" | "jump",
    pressed: boolean
  ) => {
    socketRef.current?.emit("input", {
      key,
      pressed,
    });
  };

  return {
    connected,
    player,
    error,
    sendInput,
  };
}