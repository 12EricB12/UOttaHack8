import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { connectSocket } from "./socket";
import WebviewTest from "./web"; // <-- your existing pose screen file

export default function MatchScreen({ route, navigation }: any) {
  const { serverUrl, playerId, matchId, startAt, durationSec, players } = route.params;

  const [repA, setRepA] = useState(0);
  const [repB, setRepB] = useState(0);
  const [status, setStatus] = useState("Waiting to start...");
  const [started, setStarted] = useState(false);

  const myRole = useMemo(() => {
    if (players?.A === playerId) return "A";
    if (players?.B === playerId) return "B";
    return "?";
  }, [players, playerId]);

  useEffect(() => {
    const s = connectSocket(serverUrl);

    s.on("match:start", (p: any) => {
      if (p.matchId !== matchId) return;
      setStarted(true);
      setStatus("Go!");
    });

    s.on("match:update", (p: any) => {
      if (p.matchId !== matchId) return;
      setRepA(p.repCountA);
      setRepB(p.repCountB);
    });

    s.on("match:end", (p: any) => {
      if (p.matchId !== matchId) return;
      setStatus("Match ended");
      // Navigate to summary later (your Step 8+)
      navigation.replace("Home");
    });

    return () => {
      s.off("match:start");
      s.off("match:update");
      s.off("match:end");
    };
  }, [serverUrl, matchId, navigation]);

  // Called by WebviewTest each time a rep completes
  const onRepComplete = (repIndex: number) => {
    const s = connectSocket(serverUrl);
    s.emit("rep:done", { matchId, playerId, repIndex });
  };

  const myCount = myRole === "A" ? repA : repB;
  const oppCount = myRole === "A" ? repB : repA;

  return (
    <View style={styles.container}>
      {/* Top overlay counters */}
      <View style={styles.topOverlay}>
        <Text style={styles.title}>1v1 Squat Match</Text>
        <Text style={styles.sub}>
          Match: {matchId} | Role: {myRole}
        </Text>
        <Text style={styles.timer}>
          Starts at: {new Date(startAt).toLocaleTimeString()} | Duration: {durationSec}s
        </Text>

        <View style={styles.counters}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>You</Text>
            <Text style={styles.cardValue}>{myCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Opponent</Text>
            <Text style={styles.cardValue}>{oppCount}</Text>
          </View>
        </View>

        <Text style={styles.status}>{status}</Text>
      </View>

      {/* Underlay: your pose detection screen */}
      <View style={styles.poseArea}>
        {/* If you want to block detecting before start, you can add a prop later.
            For now we just allow it to run, but the server only counts reps after match:start. */}
        <WebviewTest onRepComplete={onRepComplete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  topOverlay: {
    position: "absolute",
    top: 40,
    left: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 12,
    borderRadius: 14,
  },
  title: { color: "white", fontSize: 20, fontWeight: "800" },
  sub: { color: "white", marginTop: 4 },
  timer: { color: "white", marginTop: 4, opacity: 0.9 },
  counters: { flexDirection: "row", gap: 10, marginTop: 10 },
  card: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", padding: 12, borderRadius: 12 },
  cardLabel: { color: "white", opacity: 0.9 },
  cardValue: { color: "white", fontSize: 28, fontWeight: "900", marginTop: 6 },
  status: { color: "cyan", marginTop: 10, fontWeight: "700" },
  poseArea: { flex: 1 },
});
