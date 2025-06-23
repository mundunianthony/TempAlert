import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { FontAwesome, Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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
  const activeColor = "#2563eb"; // blue-600
  const inactiveColor = "#64748b"; // slate-500
  const badgeCount = alerts.length;

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={[styles.navButton, activeTab === "home" && styles.activeButton]}
        onPress={onNavigateHome}
        activeOpacity={0.8}
      >
        <Ionicons
          name={activeTab === "home" ? "home" : "home-outline"}
          size={28}
          color={activeTab === "home" ? activeColor : inactiveColor}
        />
        <Text style={[styles.label, activeTab === "home" && styles.activeLabel]}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navButton, activeTab === "alerts" && styles.activeButton]}
        onPress={onNavigateAlerts}
        activeOpacity={0.8}
      >
        <View style={styles.iconWithBadge}>
          <MaterialCommunityIcons
            name={activeTab === "alerts" ? "bell-badge" : "bell-outline"}
            size={28}
            color={activeTab === "alerts" ? activeColor : inactiveColor}
          />
          {badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.label, activeTab === "alerts" && styles.activeLabel]}>Alerts</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navButton, activeTab === "profile" && styles.activeButton]}
        onPress={onNavigateProfile}
        activeOpacity={0.8}
      >
        <Ionicons
          name={activeTab === "profile" ? "person" : "person-outline"}
          size={28}
          color={activeTab === "profile" ? activeColor : inactiveColor}
        />
        <Text style={[styles.label, activeTab === "profile" && styles.activeLabel]}>Profile</Text>
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
    height: 72,
    backgroundColor: "#f8fafc", // slate-50
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 8,
    backgroundColor: "transparent",
  },
  activeButton: {
    backgroundColor: "#e0e7ff", // indigo-100
  },
  label: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  activeLabel: {
    color: "#2563eb",
    fontWeight: "700",
  },
  iconWithBadge: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: "#ef4444", // red-500
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
