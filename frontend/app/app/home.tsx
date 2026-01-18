import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <LinearGradient
        colors={['#ffffff', '#ee8d2f']}
        style={styles.background}
    >
    <View style={styles.container}>
      <Image
      source={require("../assets/images/applogo.png")}
      style={styles.topRightImage} 
      />

      <Image
      source={require("../assets/images/bodybuilder.png")}
      style={{
        position: "absolute",
        top: "50%",
        left: -190,
        width: 800,
        height: 650,
        resizeMode: "contain",
      }}
      />

      <Text style={styles.titleText}>FORMWATCH</Text>
      <Text style={{color: "black",
                    position: "absolute",
                    top: 120,
                    marginLeft: 35,
                    fontSize: 24,
                    fontWeight: "500"}}>Welcome! Ready to workout?!</Text>
      {/* Middle Content */}
      <View style={styles.centerContent}>
        <TouchableOpacity
          style={[styles.bigButton, {position: 'absolute', top: 0, marginTop: 70}]}
          onPress={() => navigation.navigate("ActiveWorkout")}
        >
          <Text style={styles.bigButtonText}>Start a Solo Workout!</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bigButton, {position: 'absolute', top: 100, marginTop: 70}]}
          onPress={() => console.log("Start A Ranked Workout clicked")}
        >
          <Text style={styles.bigButtonText}>Start A Ranked Workout!</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Bottom Layout (Footer) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("UserStats")}
        >
          <Text style={styles.navText}>My Stats</Text>
        </TouchableOpacity>
      </View>
    </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Home Screen Styles
  bigButton: {
    backgroundColor: "#a107ac", // Standard blue
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
    height: 79,
    borderTopWidth: 5,
    borderTopColor: "#000",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 19, // Padding for safe area usually
    backgroundColor: "#fa9938",
  },
  navButton: {
    padding: 10,
  },
  navText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  titleText: {
    alignItems: "center",
    marginTop: 75,
    marginLeft: 35,
    fontSize: 36,
    fontWeight: "bold",
    color: ""
  }, 
  topRightImage: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 75,
    height: 75,
    resizeMode: "contain",
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});

export default HomeScreen;
