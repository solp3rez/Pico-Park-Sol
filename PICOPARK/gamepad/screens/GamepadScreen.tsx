import React, { useState } from "react";
import { View, Text, StyleSheet, Vibration } from "react-native";

interface GamepadProps {
  address: string;
  connected: boolean;
  player: any;
  sendInput: (key: "left" | "right" | "jump" | "start", pressed: boolean) => void;
  onDisconnect: () => void;
}

export default function GamepadScreen({ address, connected, player, sendInput, onDisconnect }: GamepadProps) {
  const [startPressed, setStartPressed] = useState(false);
  const playerColor = player?.color || "#e74c3c";

  // Manejo directo táctil ultra-rápido sin delays
  const handlePress = (key: "left" | "right" | "jump" | "start", pressed: boolean) => {
    sendInput?.(key, pressed);
  };

  return (
    <View style={styles.container}>
      
      {/* BARRA SUPERIOR: Detalles de conexión */}
      <View style={styles.topInfo}>
        <Text style={[styles.status, { color: connected ? "#2ecc71" : "#f1c40f" }]}>
          {connected ? "🟢 CONECTADO" : "🟡 RECONECTANDO..."}
        </Text>
        <Text style={styles.playerName}>
          Gatito: <Text style={{ color: playerColor, fontWeight: "bold" }}>{player?.name || "..."}</Text>
        </Text>
        <Text style={styles.exitLink} onPress={onDisconnect}>✕ Salir</Text>
      </View>

      {/* CUERPO DEL JOYSTICK DISTRIBUIDO */}
      <View style={styles.joystickWrapper}>
        
        {/* LADO IZQUIERDO: Flechas de movimiento AGRANDADAS y BIEN SEPARADAS */}
        <View style={styles.leftContainer}>
          <View
            style={styles.arrowBtn}
            onTouchStart={() => handlePress("left", true)}
            onTouchEnd={() => handlePress("left", false)}
            onTouchCancel={() => handlePress("left", false)}
          >
            <Text style={styles.arrowText}>◄</Text>
          </View>

          <View
            style={styles.arrowBtn}
            onTouchStart={() => handlePress("right", true)}
            onTouchEnd={() => handlePress("right", false)}
            onTouchCancel={() => handlePress("right", false)}
          >
            <Text style={styles.arrowText}>►</Text>
          </View>
        </View>

        {/* CENTRO: Botón START GAME con efecto visual real de hundimiento */}
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.startBtn,
              { 
                backgroundColor: startPressed ? "#1b1b2f" : "#e74c3c",
                borderColor: startPressed ? "#2ecc71" : "rgba(255,255,255,0.2)",
                transform: [{ scale: startPressed ? 0.95 : 1 }]
              }
            ]}
            onTouchStart={() => {
              Vibration.vibrate(40); // Hace vibrar el celu al tocarlo
              setStartPressed(true);
              handlePress("start", true);
            }}
            onTouchEnd={() => {
              setStartPressed(false);
              handlePress("start", false);
            }}
            onTouchCancel={() => {
              setStartPressed(false);
              handlePress("start", false);
            }}
          >
            <Text style={[styles.startText, { color: startPressed ? "#2ecc71" : "white" }]}>
              {startPressed ? "¡ENVIADO!" : "START GAME"}
            </Text>
          </View>
        </View>

        {/* LADO DERECHO: Botón de salto (A) GIGANTE */}
        <View style={styles.rightContainer}>
          <View
            style={[styles.jumpCircle, { backgroundColor: playerColor }]}
            onTouchStart={() => {
              Vibration.vibrate(20);
              handlePress("jump", true);
            }}
            onTouchEnd={() => handlePress("jump", false)}
            onTouchCancel={() => handlePress("jump", false)}
          >
            <Text style={styles.jumpLabel}>A</Text>
            <Text style={styles.jumpSub}>SALTO</Text>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d1a",
    paddingHorizontal: 35, 
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  topInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    height: 35,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  status: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  playerName: {
    color: "white",
    fontSize: 13,
  },
  exitLink: {
    color: "#ff5555",
    fontSize: 13,
    fontWeight: "bold",
  },
  joystickWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end", 
    justifyContent: "space-between",
    paddingBottom: 15,
  },
  leftContainer: {
    flexDirection: "row",
    gap: 40, // Espacio de 40 píxeles entre flechas para que no se pisen
    alignItems: "flex-end",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 15,
  },
  rightContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  arrowBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    width: 90, // Botones de dirección agrandados
    height: 85,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  arrowText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
  jumpCircle: {
    width: 110, // Botón de salto bien grande
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  jumpLabel: {
    color: "white",
    fontSize: 38,
    fontWeight: "bold",
  },
  jumpSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginTop: -2,
  },
  startBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 2,
    elevation: 4,
  },
  startText: {
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
});