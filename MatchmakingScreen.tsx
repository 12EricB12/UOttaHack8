import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { connectSocket, disconnectSocket } from "./socket";

export default function MatchmakingScreen({ navigation }: any) {
  const [serverUrl, setServerUrl] = useState("http://192.168.1.25:3000"); // CHANGE THIS
  const [playerId, setPlayerId] = useState(() => `P${Math.floor(Math.random() * 10000)}`);
  const [status, setStatus] = useState<"idle" | "waiting" | "found">("idle");
  const [info, setInfo] = useState("");

  const canQueue = useMemo(() => serverUrl.startsWith("http"), [serverUrl]);

  useEffect(() => {
    return () => {
      // cleanup on leave screen
      disconnectSocket();
    };
  }, []);

  const joinQueue = () => {
    try {
      const s = connectSocket(serverUrl);

      s.on("connect", () => setInfo("Connected to server ✅"));
      s.on("disconnect", () => setInfo("Disconnected ❌"));
      s.on("queue:status", (msg: any) => {
        setStatus(msg.status);
        if (msg.status === "waiting") setInfo("Waiting for opponent...");
        if (msg.status === "idle") setInfo("Idle");
      });

      s.on("match:found", (payload: any) => {
        setStatus("found");
        setInfo("Match found! Starting soon...");
        // go to match screen
        navigation.replace("Match", {
          serverUrl,
          playerId,
          matchId: payload.matchId,
          startAt: payload.startAt,
          durationSec: payload.durationSec,
          players: payload.players,
        });
      });

      s.on("error", (e: any) => setInfo(e?.message ?? "Error"));

      s.emit("queue:join", { playerId });
      setStatus("waiting");
    } catch (e: any) {
      setInfo(e.message ?? "Failed to join queue");
    }
  };

  const leaveQueue = () => {
    try {
      const s = connectSocket(serverUrl);
      s.emit("queue:leave");
      setStatus("idle");
      setInfo("Left queue");
    } catch {
      setInfo("Not connected");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LAN 1v1 Queue</Text>

      <Text style={styles.label}>Server URL (LAN IP)</Text>
      <TextInput style={styles.input} value={serverUrl} onChangeText={setServerUrl} />

      <Text style={styles.label}>Player ID</Text>
      <TextInput style={styles.input} value={playerId} onChangeText={setPlayerId} />

      <Text style={styles.info}>{info}</Text>

      {status !== "waiting" ? (
        <TouchableOpacity disabled={!canQueue} style={styles.btn} onPress={joinQueue}>
          <Text style={styles.btnText}>Join Queue</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.btn, styles.btnAlt]} onPress={leaveQueue}>
          <Text style={styles.btnText}>Leave Queue</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 20, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 10, marginTop: 8 },
  info: { marginTop: 14, textAlign: "center" },
  btn: { marginTop: 18, backgroundColor: "#007AFF", padding: 14, borderRadius: 12, alignItems: "center" },
  btnAlt: { backgroundColor: "#FF3B30" },
  btnText: { color: "white", fontWeight: "800", fontSize: 16 },
  back: { marginTop: 20, alignItems: "center" },
  backText: { color: "#333", fontWeight: "700" },
});
