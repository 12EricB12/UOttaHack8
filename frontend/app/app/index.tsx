import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./home";
import WebviewTest from "./web";
import ResultsScreen from "./results";

const Stack = createNativeStackNavigator();

// --- Main App Navigation ---
export default function App() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ActiveWorkout" component={WebviewTest} />
      <Stack.Screen name="Results" component={ResultsScreen}/>
    </Stack.Navigator>
  );
}
