// src/components/Navbar.tsx

import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function Navbar() {
  const navigation = useNavigation();

  return (
    <View style={styles.navContainer}>
      <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
        <Text style={styles.link}>🏠 Home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Alerts")}>
        <Text style={styles.link}>📢 Alerts</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
        <Text style={styles.link}>⚙️ Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderColor: "#ddd",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  link: {
    fontSize: 16,
    color: "#1e90ff",
  },
});
