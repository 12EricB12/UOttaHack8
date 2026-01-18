import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./home";
import WebviewTest from "./web";

// Step 7 screens (LAN queue + match room)
import MatchmakingScreen from "./src/screens/MatchmakingScreen";
import MatchScreen from "./src/screens/MatchScreen";

export type RootStackParamList = {
  Home: undefined;
  ActiveWorkout: undefined;

  Matchmaking: undefined;
  Match: {
    serverUrl: string;
    playerId: string;
    matchId: string;
    startAt: number;
    durationSec: number;
    players: { A: string; B: string };
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ActiveWorkout" component={WebviewTest} />

      {/* Step 7 */}
      <Stack.Screen name="Matchmaking" component={MatchmakingScreen} />
      <Stack.Screen name="Match" component={MatchScreen} />
    </Stack.Navigator>
  );
}
