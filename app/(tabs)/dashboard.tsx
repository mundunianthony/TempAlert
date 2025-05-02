import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { getFirestore } from "@/src/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const database = getFirestore();

interface Storeroom {
  name: string;
  temperature: number;
  status: "Normal" | "Warning" | "Critical";
}

interface Alert {
  message: string;
  timestamp: string;
}

interface TemperatureDataPoint {
  value: number;
  timestamp: string;
}

export default function Dashboard() {
  const { user, lastName, logout } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // Add refreshKey state
  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const unsubscribeStorerooms = onSnapshot(
      collection(database, "storerooms"),
      (snapshot) => {
        const rooms = snapshot.docs.map((doc) => doc.data() as Storeroom);
        setStorerooms(rooms);
      }
    );

    const unsubscribeAlerts = onSnapshot(
      collection(database, "alerts"),
      (snapshot) => {
        const alertList = snapshot.docs.map((doc) => doc.data() as Alert);
        setAlerts(alertList);
      }
    );

    const unsubscribeTemp = onSnapshot(
      collection(database, "temperatureHistory/storeroom1/points"),
      (snapshot) => {
        const temps = snapshot.docs.map(
          (doc) => doc.data() as TemperatureDataPoint
        );
        setChartData(temps.map((point) => point.value));
      }
    );

    return () => {
      unsubscribeStorerooms();
      unsubscribeAlerts();
      unsubscribeTemp();
    };
  }, [user, router, refreshKey]); // Add refreshKey as a dependency

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal":
        return styles.textGreen;
      case "Warning":
        return styles.textYellow;
      case "Critical":
        return styles.textRed;
      default:
        return styles.textGray;
    }
  };

  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diff = Math.floor((now.getTime() - alertTime.getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const handleRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1); // Increment refreshKey to trigger re-render
  };

  if (!user) {
    return (
      <View style={styles.centeredView}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        {/* Welcome */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hello, {lastName || user.displayName || "User"} 👋
          </Text>
          <TouchableOpacity onPress={logout}>
            <MaterialIcons name="logout" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Storeroom Overview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Storeroom Overview</Text>
          {storerooms.map((room, index) => (
            <View
              key={index}
              style={[styles.row, index < storerooms.length - 1 && styles.divider]}
            >
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={[styles.roomStatus, getStatusColor(room.status)]}>
                {room.status} {room.temperature}°
              </Text>
            </View>
          ))}
        </View>

        {/* Graph Widget */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Graph Widget</Text>
          {chartData.length > 0 ? (
            <LineChart
              data={{
                labels: chartData.map((_, index) => `${index * 5}m`),
                datasets: [{ data: chartData }],
              }}
              width={screenWidth - 40}
              height={150}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#000",
                },
              }}
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withHorizontalLabels={false}
              withVerticalLabels={false}
            />
          ) : (
            <Text style={styles.loadingText}>Loading graph...</Text>
          )}
        </View>

        {/* Alerts Section */}
        <View style={[styles.card, { marginBottom: 80 }]}>
          <Text style={styles.cardTitle}>Alerts</Text>
          {alerts.map((alert, index) => (
            <View
              key={index}
              style={[styles.row, index < alerts.length - 1 && styles.divider]}
            >
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>{timeAgo(alert.timestamp)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={handleRefresh}>
          <FontAwesome name="home" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Feather name="clock" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Feather name="bell" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push("/profile")}>
          <Feather name="settings" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  header: {
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  divider: {
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  roomName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  roomStatus: {
    fontSize: 16,
    fontWeight: "600",
  },
  textGreen: { color: "#16a34a" },
  textYellow: { color: "#ca8a04" },
  textRed: { color: "#dc2626" },
  textGray: { color: "#6b7280" },
  alertMessage: {
    fontSize: 16,
    color: "#000",
  },
  alertTime: {
    fontSize: 14,
    color: "#6b7280",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
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
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
