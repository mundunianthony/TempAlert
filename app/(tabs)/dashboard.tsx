import React, { useEffect, useState, useMemo } from "react";
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
import { collection, onSnapshot, Timestamp } from "firebase/firestore";

const database = getFirestore();

interface Storeroom {
  id: string;
  name: string;
  temperature: number;
  status: "Normal" | "Warning" | "Critical";
  lastUpdated: Timestamp;
}

interface TemperatureDataPoint {
  value: number;
  timestamp: string;
}

export default function Dashboard() {
  const { user, lastName, logout } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const unsubscribeStorerooms = onSnapshot(
      collection(database, "storerooms"),
      (snapshot) => {
        const rooms = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Storeroom));
        setStorerooms(rooms);
      }
    );

    const unsubscribeTemp = onSnapshot(
      collection(database, "temperatureHistory/storeroom1/points"),
      (snapshot) => {
        const temps = snapshot.docs.map((doc) => doc.data() as TemperatureDataPoint);
        setChartData(temps.map((point) => point.value));
      }
    );

    return () => {
      unsubscribeStorerooms();
      unsubscribeTemp();
    };
  }, [user, router, refreshKey]);

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
    if (!timestamp) return "Unknown time";

    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffSeconds = Math.floor((now.getTime() - alertTime.getTime()) / 1000);

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

  const alerts = useMemo(() => {
    return storerooms
      .filter((room) => room.temperature <= 15 || room.temperature >= 25)
      .map((room) => ({
        message: getAlertMessage(room.temperature, room.name),
        timestamp: room.lastUpdated ? room.lastUpdated.toDate().toISOString() : "",
      }));
  }, [storerooms]);

  const handleRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1);
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
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
            <MaterialIcons name="logout" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Storeroom Overview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Storeroom Overview</Text>
          {storerooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              onPress={() =>
                router.push({
                  pathname: "/storeroom-details",
                  params: { storeroomId: room.id, storeroomName: room.name },
                })
              }
              style={[styles.row, styles.touchableRow]}
            >
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={[styles.roomStatus, getStatusColor(room.status)]}>
                {room.status} {room.temperature}°
              </Text>
            </TouchableOpacity>
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
          {alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <View
                key={index}
                style={[styles.row, index < alerts.length - 1 && styles.divider]}
              >
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>{timeAgo(alert.timestamp)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noAlerts}>No active alerts</Text>
          )}
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
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/profile")}
        >
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
  noAlerts: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
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
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutText: {
    marginLeft: 4,
    fontSize: 16,
    color: "#000",
  },
  touchableRow: {
    padding: 10,
  },
});