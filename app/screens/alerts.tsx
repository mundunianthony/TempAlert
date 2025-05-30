import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "expo-router";
import { getFirestore } from "@/src/lib/firebase";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import Navbar from "@/src/components/Navbar";

const database = getFirestore();

interface Storeroom {
  id: string;
  name: string;
  temperature: number;
  status: "Normal" | "Warning" | "Critical";
  lastUpdated: Timestamp;
}

export default function Alerts() {
  const { user } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const unsubscribeStorerooms = onSnapshot(
      collection(database, "storerooms"),
      (snapshot) => {
        const rooms = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Storeroom)
        );
        setStorerooms(rooms);
      }
    );

    return () => unsubscribeStorerooms();
  }, [user, router]);

  const getAlertMessage = (temperature: number, storeroomName: string) => {
    if (temperature <= 15) {
      return `Temperature too low in ${storeroomName} (${temperature}°C)! Risk of freezing—check cooling system.`;
    } else if (temperature >= 25 && temperature <= 30) {
      return `Temperature warming up in ${storeroomName} (${temperature}°C)—monitor to prevent spoilage.`;
    } else if (temperature >= 31 && temperature <= 40) {
      return `Temperature too hot in ${storeroomName} (${temperature}°C)! Risk of spoilage—take action now.`;
    } else if (temperature > 40) {
      return `Critical heat in ${storeroomName} (${temperature}°C)! Immediate intervention required.`;
    }
    return "";
  };

  const alerts = useMemo(() => {
    return storerooms
      .filter((room) => room.temperature <= 15 || room.temperature >= 25)
      .map((room) => ({
        message: getAlertMessage(room.temperature, room.name),
        timestamp: room.lastUpdated
          ? room.lastUpdated.toDate().toISOString()
          : "",
        storeroomName: room.name,
        temperature: room.temperature,
      }))
      .filter((alert) => alert.message); // Remove empty messages
  }, [storerooms]);

  const timeAgo = (timestamp: string) => {
    if (!timestamp) return "";
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diff = Math.floor((now.getTime() - alertTime.getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  if (!user) {
    return (
      <View style={styles.centeredView}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Alerts</Text>
          {alerts.length === 0 ? (
            <Text style={styles.noAlerts}>No alerts found.</Text>
          ) : (
            alerts.map((alert, index) => (
              <View
                key={index}
                style={[
                  styles.row,
                  index < alerts.length - 1 && styles.divider,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertStoreroom}>
                    {alert.storeroomName}
                  </Text>
                </View>
                <Text style={styles.alertTime}>{timeAgo(alert.timestamp)}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <Navbar
          onRefresh={() => {}}
          onNavigateProfile={() => router.push("/screens/profile")}
          onNavigateHome={() => router.replace("/screens/dashboard")}
          onNavigateAlerts={() => router.replace("/screens/alerts")}
          alerts={alerts}
          activeTab="alerts"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 100, // enough space for navbar
    backgroundColor: "#f3f4f6",
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 28,
    color: "#000",
    textAlign: "left",
    paddingLeft: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  divider: {
    borderBottomWidth: 0,
  },
  alertMessage: {
    fontSize: 16,
    color: "#000",
    marginBottom: 2,
    fontWeight: "500",
  },
  alertStoreroom: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 14,
    color: "#6b7280",
    minWidth: 60,
    textAlign: "right",
    marginLeft: 8,
    alignSelf: "flex-start",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  noAlerts: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 40,
  },
});
