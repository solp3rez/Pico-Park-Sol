import React, { useState } from "react";
import { StatusBar } from "react-native";

import ConnectionScreen from "../screens/ConnectionScreen";
import GamepadScreen from "../screens/GamepadScreen";

export default function App() {
  const [address, setAddress] = useState<string | null>(null);

  if (!address) {
    return (
      <ConnectionScreen
        onConnect={(addr) => setAddress(addr)}
      />
    );
  }

  return (
    <>
      <StatusBar hidden />

      <GamepadScreen
        address={address}
        onDisconnect={() => setAddress(null)}  // 🔥 ESTO ES LO QUE TE FALTABA
      />
    </>
  );
}