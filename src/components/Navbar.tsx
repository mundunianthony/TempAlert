import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Text,
  ScrollView,
} from "react-native";
import { FontAwesome, Feather } from "@expo/vector-icons";

interface Alert {
  message: string;
  timestamp: string;
}

interface NavbarProps {
  onRefresh: () => void;
  onNavigateProfile: () => void;
  onNavigateHome: () => void;
  alerts: Alert[];
}

export default function Navbar({
  onRefresh,
  onNavigateProfile,
  onNavigateHome,
  alerts,
}: NavbarProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const timeAgo = (timestamp: string) => {
    if (!timestamp) return "Unknown time";
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffSeconds = Math.floor(
      (now.getTime() - alertTime.getTime()) / 1000
    );
    if (diffSeconds < 60) return "< 1 min ago";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60)
      return `${diffMinutes} ${diffMinutes === 1 ? "min" : "mins"} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24)
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  };

  return (
    <>
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={onNavigateHome}>
          <FontAwesome name="home" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Feather name="clock" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="bell" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onNavigateProfile}>
          <Feather name="settings" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alerts</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <View key={idx} style={styles.alertRow}>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <Text style={styles.alertTime}>
                      {timeAgo(alert.timestamp)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noAlerts}>No active alerts</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    minHeight: 200,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
  },
  alertRow: {
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 16,
    color: "#000",
  },
  alertTime: {
    fontSize: 14,
    color: "#6b7280",
  },
  noAlerts: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginVertical: 16,
  },
  closeButton: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: "#007bff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
