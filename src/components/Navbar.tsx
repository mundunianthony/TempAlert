import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome, Feather } from "@expo/vector-icons";

interface NavbarProps {
  onRefresh?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHome?: () => void;
  onNavigateAlerts?: () => void;
  alerts: { message: string; timestamp: string }[];
  activeTab: "home" | "alerts" | "profile";
}

export default function Navbar({
  onRefresh = () => {},
  onNavigateProfile = () => {},
  onNavigateHome = () => {},
  onNavigateAlerts = () => {},
  alerts,
  activeTab,
}: NavbarProps) {
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navButton} onPress={onNavigateHome}>
        <FontAwesome
          name={activeTab === "home" ? "home" : "home"}
          size={28}
          color={activeTab === "home" ? "#007bff" : "#6b7280"}
          solid={activeTab === "home"}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton} onPress={onNavigateAlerts}>
        <Feather
          name={activeTab === "alerts" ? "bell" : "bell"}
          size={28}
          color={activeTab === "alerts" ? "#007bff" : "#6b7280"}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton} onPress={onNavigateProfile}>
        <Feather
          name={activeTab === "profile" ? "settings" : "settings"}
          size={28}
          color={activeTab === "profile" ? "#007bff" : "#6b7280"}
        />
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
