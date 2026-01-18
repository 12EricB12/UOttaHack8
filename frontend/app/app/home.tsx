import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Button,
  Dimensions,
} from "react-native";

function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <View style={styles.container}>
      {/* Middle Content */}
      <View style={styles.centerContent}>
        <TouchableOpacity
          style={styles.bigButton}
          onPress={() => navigation.navigate("ActiveWorkout")}
        >
          <Text style={styles.bigButtonText}>Go to next</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Bottom Layout (Footer) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => console.log("Home Clicked")}
        >
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => console.log("Matchmaking Clicked")}
        >
          <Text style={styles.navText}>Matchmaking</Text>
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
  },
  // Home Screen Styles
  bigButton: {
    backgroundColor: "#007AFF", // Standard blue
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 5, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bigButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  bottomBar: {
    flexDirection: "row",
    height: 80,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 20, // Padding for safe area usually
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
