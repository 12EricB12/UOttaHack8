import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./home";
import WebviewTest from "./web";
import ResultsScreen from "./results";
import WebviewTestMulti from "./web_multi";
import ResultsScreenMulti from "./results_multi";

const Stack = createNativeStackNavigator();

// --- Main App Navigation ---
export default function App() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ActiveWorkout" component={WebviewTest} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="ResultsMulti" component={WebviewTestMulti} />
      <Stack.Screen name="ActiveWorkoutMulti" component={ResultsScreenMulti} />
    </Stack.Navigator>
  );
}
