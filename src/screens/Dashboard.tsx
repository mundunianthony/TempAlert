// src/screens/Dashboard.tsx

import React, { useEffect, useState, useContext } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { getFirestore, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { AuthContext } from "../contexts/AuthContext";
import LineChart from "../components/LineChart"; 
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const thresholds = [
  { range: [0, 15], label: "Too Cold", color: "blue", icon: "snow" },
  { range: [16, 24], label: "Optimal", color: "green", icon: "checkmark-circle" },
  { range: [25, 30], label: "Warming Up", color: "yellow", icon: "alert-circle" },
  { range: [31, 40], label: "Too Hot", color: "orange", icon: "flame" },
  { range: [41, 100], label: "Critical Heat", color: "red", icon: "warning" },
];

const getStatus = (temp) => {
  for (let t of thresholds) {
    if (temp >= t.range[0] && temp <= t.range[1]) return t;
  }
  return { label: "Unknown", color: "gray", icon: "help-circle" };
};

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const [storerooms, setStorerooms] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "storerooms"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStorerooms(data);
      setLoading(false);
    });

    const unsubscribeAlerts = onSnapshot(
      query(collection(db, "alerts"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlerts(data);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeAlerts();
    };
  }, []);

  const renderStoreroom = ({ item }) => {
    const status = getStatus(item.temperature);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("StoreroomHistory", { storeroomId: item.id })}
        style={styles.storeroomRow}
      >
        <Text style={styles.roomName}>{item.name}</Text>
        <Text>{item.temperature}°C</Text>
        <Text style={[styles.status, { color: status.color }]}>
          <Icon name={status.icon} size={18} /> {status.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌡️ TempAlert</Text>
      <Text style={styles.welcome}>Welcome, {user?.displayName || user?.email}!</Text>

      {loading ? <ActivityIndicator size="large" /> : (
        <>
          <FlatList
            data={storerooms}
            renderItem={renderStoreroom}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={<Text style={styles.sectionTitle}>Storerooms</Text>}
          />

          <Text style={styles.sectionTitle}>Temperature Trends</Text>
          <LineChart data={storerooms} />

          <Text style={styles.updated}>
            Last updated: {alerts[0]?.createdAt?.toDate().toLocaleString() || "N/A"}
          </Text>

          <Text style={styles.sectionTitle}>Alerts</Text>
          <FlatList
            data={alerts.slice(0, 10)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.alertRow}>
                <Text>{item.message}</Text>
                <Text style={styles.alertTime}>
                  {item.createdAt?.toDate().toLocaleTimeString()}
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
