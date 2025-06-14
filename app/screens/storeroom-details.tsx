import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getFirestore } from "../../src/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Navbar from "../../src/components/Navbar";

const database = getFirestore();

interface TemperatureDataPoint {
  id: string;
  value: number;
  timestamp: string;
}

export default function StoreroomDetails() {
  const router = useRouter();
  const { storeroomId, storeroomName } = useLocalSearchParams<{
    storeroomId: string;
    storeroomName: string;
  }>();
  const [alerts, setAlerts] = useState<
    { id: string; message: string; timestamp: string }[]
  >([]);

  useEffect(() => {
    if (!storeroomId) return;

    const unsubscribe = onSnapshot(
      collection(database, `temperatureHistory/${storeroomId}/points`),
      (snapshot) => {
        const points = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as TemperatureDataPoint)
        );

        const filteredPoints = points.filter(
          (point) => point.value <= 15 || point.value >= 25
        );

        const sortedPoints = filteredPoints.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const historicalAlerts = sortedPoints.map((point) => ({
          id: point.id,
          message: getAlertMessage(point.value, storeroomName || "Storeroom"),
          timestamp: point.timestamp,
        }));

        setAlerts(historicalAlerts);
      }
    );

    return () => unsubscribe();
  }, [storeroomId, storeroomName]);

  const getAlertMessage = (temperature: number, storeroomName: string) => {
    if (temperature <= 15) {
      return `⚠️ Temperature too low in ${storeroomName} (${temperature}°C)! Risk of freezing—check cooling system.`;
    } else if (temperature >= 25 && temperature <= 30) {
      return `⚠️ Temperature warming up in ${storeroomName} (${temperature}°C)—monitor to prevent spoilage.`;
    } else if (temperature >= 31 && temperature <= 40) {
      return `🔥 Temperature too hot in ${storeroomName} (${temperature}°C)! Risk of spoilage—take action now.`;
    } else if (temperature > 40) {
      return `🚨 Critical heat in ${storeroomName} (${temperature}°C)! Immediate intervention required.`;
    }
    return "No alert";
  };

  const timeAgo = (timestamp: string) => {
    if (!timestamp) return "Unknown time";

    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffSeconds = Math.floor(
      (now.getTime() - alertTime.getTime()) / 1000
    );

    if (diffSeconds < 60) {
      return "< 1 min ago";
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? "min" : "mins"} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {storeroomName || "Storeroom"} Historical Alerts
        </Text>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 84 }}
          showsVerticalScrollIndicator={false}
        >
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <View key={alert.id} style={styles.alertRow}>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>{timeAgo(alert.timestamp)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noAlerts}>No historical alerts found</Text>
          )}
        </ScrollView>
        <Navbar
          alerts={alerts}
          activeTab="alerts"
          onNavigateHome={() => router.replace("/screens/dashboard")} 
          onNavigateAlerts={() => {}}
          onNavigateProfile={() => router.replace("/screens/profile")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    // Remove paddingTop, let SafeAreaView handle it
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  alertMessage: {
    fontSize: 16,
    color: "#000",
    flex: 1,
  },
  alertTime: {
    fontSize: 14,
    color: "#6b7280",
  },
  noAlerts: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 20,
  },
});
