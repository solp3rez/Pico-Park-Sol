import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

// CORREGIDO: Salimos de 'screens' (..) y entramos a 'hooks'
import { useGameSocket } from "../hooks/useGameSocket";

const { width: SW } = Dimensions.get("window");

const LEFT_MAX = SW * 0.2;
const RIGHT_MAX = SW * 0.42;
const JUMP_MIN = SW * 0.58;

type Zone = "left" | "right" | "jump";

interface Props {
  address: string;
  onDisconnect: () => void;
}

export default function GamepadScreen({ address, onDisconnect }: Props) {
  const { connected, player, sendInput, error } = useGameSocket(address);
  const touchMap = useRef<Map<number, Zone>>(new Map());
  const inputRef = useRef({ left: false, right: false, jump: false });
  const [vis, setVis] = useState({ left: false, right: false, jump: false });

  const fire = (key: Zone, pressed: boolean) => {
    if (inputRef.current[key] === pressed) return;
    inputRef.current[key] = pressed;
    sendInput(key, pressed);
    setVis((v) => ({ ...v, [key]: pressed }));
  };

  const zoneOf = (x: number): Zone | null => {
    if (x < LEFT_MAX) return "left";
    if (x < RIGHT_MAX) return "right";
    if (x > JUMP_MIN) return "jump";
    return null;
  };

  const onTouchStart = (e: any) => {
    for (const t of e.nativeEvent.changedTouches) {
      const zone = zoneOf(t.pageX);
      if (!zone) continue;
      touchMap.current.set(t.identifier, zone);
      fire(zone, true);
    }
  };

  const onTouchEnd = (e: any) => {
    const remaining = new Set(
      (e.nativeEvent.touches as any[]).map((t) => t.identifier),
    );
    for (const t of e.nativeEvent.changedTouches) {
      const zone = touchMap.current.get(t.identifier);
      touchMap.current.delete(t.identifier);
      if (!zone) continue;
      const stillHeld = [...touchMap.current.entries()].some(
        ([id, z]) => z === zone && remaining.has(id),
      );
      if (!stillHeld) fire(zone, false);
    }
  };

  const playerColor = player?.color ?? "#888";

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onDisconnect}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        connected && player ? { borderColor: playerColor, borderWidth: 3 } : {},
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.led,
            { backgroundColor: connected ? "#2ecc71" : "#e74c3c" },
          ]}
        />
        <Text style={styles.statusText}>
          {connected
            ? player
              ? `${player.name} · ${address}`
              : "Conectado..."
            : "Conectando..."}
        </Text>
        <TouchableOpacity onPress={onDisconnect} style={styles.disconnectBtn}>
          <Text style={styles.disconnectText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View
        style={styles.touchArea}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <View style={styles.dpad} pointerEvents="none">
          <View style={[styles.dpadBtn, vis.left && styles.dpadPressed]}>
            <Text style={styles.arrow}>◄</Text>
          </View>
          <View style={styles.dpadCenter} />
          <View style={[styles.dpadBtn, vis.right && styles.dpadPressed]}>
            <Text style={styles.arrow}>►</Text>
          </View>
        </View>

        <View style={styles.centerArea} pointerEvents="none">
          {!connected && <ActivityIndicator color="#FFD700" size="large" />}
          {connected && player && (
            <>
              <View
                style={[styles.playerBadge, { backgroundColor: playerColor }]}
              >
                <Text style={styles.playerInitial}>{player.name[0]}</Text>
              </View>
              <Text style={[styles.playerName, { color: playerColor }]}>
                {player.name}
              </Text>
            </>
          )}
        </View>

        <View
          style={[
            styles.jumpBtn,
            { backgroundColor: vis.jump ? playerColor : playerColor + "BB" },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.jumpLabel}>A</Text>
          <Text style={styles.jumpSub}>SALTO</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d1a" },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0d0d1a",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: {
    color: "#e74c3c",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 28,
  },
  backBtn: { backgroundColor: "#2980b9", padding: 14, borderRadius: 10 },
  backBtnText: { color: "white", fontWeight: "bold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  led: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  statusText: { flex: 1, color: "#aaa", fontSize: 13 },
  disconnectBtn: { paddingHorizontal: 10 },
  disconnectText: { color: "#666", fontSize: 20 },
  touchArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  dpad: { flexDirection: "row", alignItems: "center", gap: 8 },
  dpadBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  dpadPressed: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "white",
  },
  dpadCenter: { width: 20 },
  arrow: { color: "white", fontSize: 30 },
  centerArea: { alignItems: "center", minWidth: 80 },
  playerBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  playerInitial: { color: "white", fontSize: 24, fontWeight: "bold" },
  playerName: { fontSize: 12, fontWeight: "bold", marginTop: 5 },
  jumpBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  jumpLabel: { color: "white", fontSize: 32, fontWeight: "bold" },
  jumpSub: { color: "white", fontSize: 10 },
});
