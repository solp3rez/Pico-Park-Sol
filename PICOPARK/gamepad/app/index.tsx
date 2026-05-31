import React, { useState, useEffect } from "react";
import { StatusBar, Alert } from "react-native";

import ConnectionScreen from "../screens/ConnectionScreen";
import GamepadScreen from "../screens/GamepadScreen";
import { useGameSocket } from "../hooks/useGameSocket";

export default function App() {
  // Guardamos la dirección IP a la que se va a intentar conectar el hook
  const [address, setAddress] = useState<string | null>(null);

  // Inicializamos el hook en la raíz pasándole la IP elegida (o vacío si no hay)
  const { connected, player, error, sendInput } = useGameSocket(address || "");

  // Si el hook detecta un error de capa de red, salta la alerta y resetea la IP
  useEffect(() => {
    if (error && address) {
      Alert.alert("Error de Conexión", error, [
        {
          text: "OK",
          onPress: () => setAddress(null), // Limpia la dirección para reintentar de cero
        },
      ]);
    }
  }, [error, address]);

  // 🔥 CLAVE: Si no hay una IP ingresada O si el socket todavía NO conectó con éxito,
  // la app te retiene de manera estricta en la pantalla de login.
  if (!address || !connected) {
    return (
      <ConnectionScreen
        onConnect={(addr) => {
          // Filtro inicial: si escribe cualquier verdura sin puntos ni números correctos, se frena acá
          const ipRegex = /^[0-9a-zA-Z.:_-]+$/;
          if (!ipRegex.test(addr) || addr.trim().length < 4) {
            Alert.alert("IP Inválida", "Por favor ingresá una dirección correcta (Ej: 192.168.1.45:3000)");
            return;
          }
          setAddress(addr); // Si pasa el regex, el hook arranca a conectar de fondo
        }}
      />
    );
  }

  // SÓLO si "address" existe y "connected" es true, te abre el gamepad pasándole los datos ya conectados
  return (
    <>
      <StatusBar hidden />

      <GamepadScreen
        address={address}
        connected={connected}
        player={player}
        sendInput={sendInput}
        onDisconnect={() => setAddress(null)} 
      />
    </>
  );
}