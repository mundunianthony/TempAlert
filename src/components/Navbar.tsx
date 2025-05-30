import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome, Feather } from "@expo/vector-icons";

interface NavbarProps {
  onRefresh: () => void;
  onNavigateProfile: () => void;
  onNavigateHome: () => void;
  onNavigateAlerts: () => void; // new prop for alerts navigation
  alerts: { message: string; timestamp: string }[];
}

export default function Navbar({
  onRefresh = () => {},
  onNavigateProfile = () => {},
  onNavigateHome = () => {},
  onNavigateAlerts = () => {},
  alerts,
}: NavbarProps) {
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navButton} onPress={onNavigateHome}>
        <FontAwesome name="home" size={24} color="#007bff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton} onPress={onNavigateAlerts}>
        <Feather name="bell" size={24} color="#007bff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton} onPress={onNavigateProfile}>
        <Feather name="settings" size={24} color="#007bff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navButton: {
    padding: 8,
  },
});
