import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <View style={styles.container}>
      {/* Center Content */}
      <View style={styles.centerContent}>
        <TouchableOpacity
          style={styles.bigButton}
          onPress={() => navigation.navigate("ActiveWorkout")}
        >
          <Text style={styles.bigButtonText}>Start a Solo Workout!</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bigButton, styles.bigButtonAlt]}
          onPress={() => navigation.navigate("Matchmaking")}
        >
          <Text style={styles.bigButtonText}>Start a Ranked Workout!</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("ActiveWorkout")}
        >
          <Text style={styles.navText}>Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Matchmaking")}
        >
          <Text style={styles.navText}>Ranked</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 20,
  },
  bigButton: {
    width: "100%",
    backgroundColor: "#007AFF",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 14,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: "center",
  },
  bigButtonAlt: {
    backgroundColor: "#AF52DE", // purple-ish for ranked
  },
  bigButtonText: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "bold",
  },
  bottomBar: {
    flexDirection: "row",
    height: 80,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 20,
    backgroundColor: "#f9f9f9",
  },
  navButton: {
    padding: 10,
  },
  navText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
});

export default HomeScreen;
