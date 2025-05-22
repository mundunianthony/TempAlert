// src/navigation/AppNavigator.tsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import Dashboard from "../screens/Dashboard";
import Alerts from "../screens/Alerts";
import StoreroomHistory from "../screens/StoreroomHistory";
import Settings from "../screens/Settings";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Alerts" component={Alerts} />
        <Stack.Screen name="StoreroomHistory" component={StoreroomHistory} />
        <Stack.Screen name="Settings" component={Settings} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
