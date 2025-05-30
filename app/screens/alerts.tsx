import React, { useEffect, useState } from "react";
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
import { collection, onSnapshot } from "firebase/firestore";
import Navbar from "@/src/components/Navbar";

const database = getFirestore();

interface Alert {
  message: string;
  timestamp: string;
}

export default function Alerts() {
  const { user } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const unsubscribeAlerts = onSnapshot(
      collection(database, "alerts"),
      (snapshot) => {
        const alertList = snapshot.docs.map((doc) => doc.data() as Alert);
        setAlerts(alertList);
      }
    );

    return () => unsubscribeAlerts();
  }, [user, router]);

  const timeAgo = (timestamp: string) => {
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
      <View style={{ flex: 1 }}>
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
                <Text style={styles.alertMessage}>{alert.message}</Text>
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
  container: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 90, // enough space for navbar
    backgroundColor: "#f3f4f6",
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#000",
    textAlign: "left",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  divider: {
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  alertMessage: {
    fontSize: 16,
    color: "#000",
    flex: 1,
    marginRight: 12,
  },
  alertTime: {
    fontSize: 14,
    color: "#6b7280",
    minWidth: 60,
    textAlign: "right",
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
