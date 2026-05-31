import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface GamepadProps {
  address: string;
  connected: boolean;
  player: any;
  sendInput: (key: "left" | "right" | "jump" | "start", pressed: boolean) => void;
  onDisconnect: () => void;
}

export default function GamepadScreen({ address, connected, player, sendInput, onDisconnect }: GamepadProps) {

  const send = (key: "left" | "right" | "jump" | "start", pressed = true) => {
    sendInput?.(key, pressed);
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.status}>
          {connected ? "🟢 Conectado exitosamente" : "🟡 Conectando..."}
        </Text>

        <TouchableOpacity onPress={onDisconnect}>
          <Text style={styles.exit}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* PLAYER INFO */}
      <View style={styles.playerBox}>
        <Text style={styles.playerName}>
          Jugador: {player?.name || "Asignando slot..."}
        </Text>
      </View>

      {/* CONTROLES VERTICALES */}
      <View style={styles.controls}>

        {/* ARRIBA / SALTO */}
        <TouchableOpacity
          style={styles.jumpBtn}
          onPressIn={() => send("jump", true)}
          onPressOut={() => send("jump", false)}
        >
          <Text style={styles.btnText}>⬆ SALTO</Text>
        </TouchableOpacity>

        {/* IZQUIERDA / DERECHA */}
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.sideBtn}
            onPressIn={() => send("left", true)}
            onPressOut={() => send("left", false)}
          >
            <Text style={styles.btnText}>◄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sideBtn}
            onPressIn={() => send("right", true)}
            onPressOut={() => send("right", false)}
          >
            <Text style={styles.btnText}>►</Text>
          </TouchableOpacity>
        </View>

        {/* START BUTTON */}
        <TouchableOpacity
          style={styles.startBtn}
          onPressIn={() => send("start", true)}
          onPressOut={() => send("start", false)}
        >
          <Text style={styles.startText}>START GAME</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d1a",
    paddingTop: 40,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  status: {
    color: "#2ecc71",
    fontSize: 14,
    fontWeight: "bold",
  },
  exit: {
    color: "#ff5555",
    fontSize: 20,
  },
  playerBox: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 10,
  },
  playerName: {
    color: "white",
    fontSize: 16,
  },
  controls: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  jumpBtn: {
    backgroundColor: "#f1c40f",
    padding: 20,
    borderRadius: 12,
    width: 160,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    gap: 20,
  },
  sideBtn: {
    backgroundColor: "#2c3e50",
    padding: 25,
    borderRadius: 12,
    width: 80,
    alignItems: "center",
  },
  startBtn: {
    marginTop: 30,
    backgroundColor: "#e74c3c",
    padding: 18,
    borderRadius: 12,
    width: 180,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  startText: {
    color: "white",
    fontWeight: "bold",
  },
});