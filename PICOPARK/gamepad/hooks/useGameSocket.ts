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
  sendInput: (key: "left" | "right" | "jump" | "start", pressed: boolean) => void;
}

export function useGameSocket(address: string): GameSocket {
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const url = address.startsWith("http") ? address : `http://${address}`;

    console.log("Conectando a:", url);

    const socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 3, // Intentará 3 veces antes de fallar
      reconnectionDelay: 1000,
      timeout: 3500,           // 💡 Si en 3.5 segundos no responde, tira error
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("CONECTADO");
      setConnected(true);
      setError(null);
      socket.emit("joinAsPlayer");
    });

    socket.on("playerAssigned", (info: PlayerInfo) => {
      console.log("PLAYER ASSIGNED:", info);
      setPlayer(info);
    });

    socket.on("gameFull", () => {
      setError("La sala está llena.\nIntentá más tarde.");
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      console.log("DESCONECTADO");
      setConnected(false);
      setPlayer(null);
    });

    socket.on("connect_error", (err) => {
      console.log("ERROR DE CONEXIÓN:", err.message);
      setConnected(false);
      setPlayer(null);
      setError(
        `No se pudo conectar al Host.\n\nVerificá:\n• Misma red Wi-Fi en PC y Celular\n• El Firewall de Windows desactivado\n• Que la IP de la PC sea correcta`
      );
    });

    return () => {
      socket.off("connect");
      socket.off("playerAssigned");
      socket.off("gameFull");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [address]);

  const sendInput = (key: "left" | "right" | "jump" | "start", pressed: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("input", {
        key,
        pressed,
      });
    }
  };

  return {
    connected,
    player,
    error,
    sendInput,
  };
}