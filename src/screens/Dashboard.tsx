import React, { useEffect, useState, useContext } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { getFirestore, collection, onSnapshot, query, orderBy, DocumentData } from "firebase/firestore";
import { AuthContext } from "../contexts/AuthContext";
import LineChart from "../components/LineChart";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { updateStoreroomData } from "../services/firestoreService";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Define navigation param list
type RootStackParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Settings: undefined;
  StoreroomHistory: { storeroomId: string };
};

// Define navigation prop type
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define interfaces for data
interface Threshold {
  range: [number, number];
  label: string;
  color: string;
  icon: "snow" | "checkmark-circle" | "alert-circle" | "flame" | "warning" | "help-circle";
  status: string;
}

interface Storeroom {
  id: string;
  name: string;
  latestReading: {
    temperature: number;
    unit: string;
    timestamp: any; // Firestore Timestamp
    status: string;
  };
}

interface Alert {
  id: string;
  storeroomId: string;
  message: string;
  timestamp: any; // Firestore Timestamp
  status: string;
}

const thresholds: Threshold[] = [
  { range: [0, 15], label: "Too Cold", color: "blue", icon: "snow", status: "Too Cold" },
  { range: [16, 24], label: "Optimal", color: "green", icon: "checkmark-circle", status: "Optimal" },
  { range: [25, 30], label: "Warming Up", color: "yellow", icon: "alert-circle", status: "Warming Up" },
  { range: [31, 40], label: "Too Hot", color: "orange", icon: "flame", status: "Too Hot" },
  { range: [41, 100], label: "Critical Heat", color: "red", icon: "warning", status: "Critical" },
];

const getStatus = (temp: number): Threshold => {
  for (let t of thresholds) {
    if (temp >= t.range[0] && temp <= t.range[1]) return t;
  }
  return { range: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY], label: "Unknown", color: "gray", icon: "help-circle", status: "Unknown" };
};

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<NavigationProp>();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const db = getFirestore();

  useEffect(() => {
    // Fetch storerooms in real-time
    const unsubscribe = onSnapshot(
      collection(db, "storerooms"),
      (snapshot) => {
        const data: Storeroom[] = snapshot.docs.map((doc) => {
          const docData = doc.data() as DocumentData;
          return {
            id: doc.id,
            name: docData.name ?? "Unnamed",
            latestReading: docData.latestReading ?? { temperature: 0, unit: "°C", timestamp: null, status: "Unknown" },
          };
        });
        setStorerooms(data);
        setLoading(false);
      },
      (error) => {
        console.error("Storerooms listener error:", error);
        setLoading(false);
      }
    );

    // Fetch alerts in real-time
    const unsubscribeAlerts = onSnapshot(
      query(collection(db, "alerts"), orderBy("timestamp", "desc")),
      (snapshot) => {
        const data: Alert[] = snapshot.docs.map((doc) => {
          const docData = doc.data() as DocumentData;
          return {
            id: doc.id,
            storeroomId: docData.storeroomId ?? "",
            message: docData.message ?? "",
            timestamp: docData.timestamp ?? null,
            status: docData.status ?? "",
          };
        });
        setAlerts(data);
      },
      (error) => {
        console.error("Alerts listener error:", error);
      }
    );

    // Periodic data updates (every 60 seconds)
    updateStoreroomData().catch((error) => console.error("Initial update error:", error));
    const interval = setInterval(() => {
      updateStoreroomData().catch((error) => console.error("Update error:", error));
    }, 60000);

    return () => {
      unsubscribe();
      unsubscribeAlerts();
      clearInterval(interval);
    };
  }, []);

  const renderStoreroom = ({ item }: { item: Storeroom }) => {
    const status = getStatus(item.latestReading?.temperature ?? 0);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("StoreroomHistory", { storeroomId: item.id })}
        style={styles.storeroomRow}
      >
        <Text style={styles.roomName}>{item.name}</Text>
        <Text>{item.latestReading?.temperature ?? "N/A"}°C</Text>
        <Text style={[styles.status, { color: status.color }]}>
          <Icon name={status.icon} size={18} /> {status.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌡️ TempAlert</Text>
      <Text style={styles.welcome}>Welcome, {user?.displayName || user?.email || "Guest"}!</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <FlatList
            data={storerooms}
            renderItem={renderStoreroom}
            keyExtractor={(item: Storeroom) => item.id}
            ListHeaderComponent={<Text style={styles.sectionTitle}>Storerooms</Text>}
          />

          <Text style={styles.sectionTitle}>Temperature Trends</Text>
          <LineChart
            labels={storerooms.map((s) => s.name)}
            dataPoints={storerooms.map((s) => s.latestReading?.temperature ?? 0)}
          />

          <Text style={styles.updated}>
            Last updated: {alerts[0]?.timestamp?.toDate()?.toLocaleString() ?? "N/A"}
          </Text>

          <Text style={styles.sectionTitle}>Alerts</Text>
          <FlatList
            data={alerts.slice(0, 10)}
            keyExtractor={(item: Alert) => item.id}
            renderItem={({ item }: { item: Alert }) => (
              <View style={styles.alertRow}>
                <Text>{item.message}</Text>
                <Text style={styles.alertTime}>
                  {item.timestamp?.toDate()?.toLocaleTimeString() ?? "N/A"}
                </Text>
              </View>
            )}
          />
        </>
      )}

      <View style={styles.navbar}>
        <Icon name="home" size={28} onPress={() => navigation.navigate("Dashboard")} />
        <Icon name="notifications" size={28} onPress={() => navigation.navigate("Alerts")} />
        <Icon name="settings" size={28} onPress={() => navigation.navigate("Settings")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginVertical: 12 },
  welcome: { fontSize: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 20 },
  storeroomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  roomName: { fontWeight: "bold" },
  status: { fontWeight: "600" },
  updated: { marginTop: 12, fontStyle: "italic" },
  alertRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  alertTime: { fontSize: 12, color: "gray" },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f8f8f8",
  },
});