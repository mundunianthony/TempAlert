import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import {
  Feather,
  FontAwesome,
  MaterialIcons,
  Ionicons,
} from "@expo/vector-icons";
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
  const [loading, setLoading] = useState(true);
  const [expandedAlerts, setExpandedAlerts] = useState(false);
  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    setLoading(true);

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
        setLoading(false);
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
      unsubscribeTemp();
    };
  }, [user, router, refreshKey]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal":
        return styles.statusNormal;
      case "Warning":
        return styles.statusWarning;
      case "Critical":
        return styles.statusCritical;
      default:
        return styles.statusUnknown;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Normal":
        return <Ionicons name="checkmark-circle" size={18} color="#10b981" />;
      case "Warning":
        return <Ionicons name="alert-circle" size={18} color="#f59e0b" />;
      case "Critical":
        return <Ionicons name="warning" size={18} color="#ef4444" />;
      default:
        return <Ionicons name="help-circle" size={18} color="#6b7280" />;
    }
  };

  const timeAgo = (timestamp: string) => {
    if (!timestamp) return "Unknown time";

    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffSeconds = Math.floor(
      (now.getTime() - alertTime.getTime()) / 1000
    );

    if (diffSeconds < 60) {
      return "Just now";
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
      return `Temperature too low in ${storeroomName} (${temperature}°C)! Risk of freezing—check cooling system.`;
    } else if (temperature >= 25 && temperature <= 30) {
      return `Temperature warming up in ${storeroomName} (${temperature}°C)—monitor to prevent spoilage.`;
    } else if (temperature >= 31 && temperature <= 40) {
      return `Temperature too hot in ${storeroomName} (${temperature}°C)! Risk of spoilage—take action now.`;
    } else if (temperature > 40) {
      return `Critical heat in ${storeroomName} (${temperature}°C)! Immediate intervention required.`;
    }
    return "No alert";
  };

  const getAlertSeverity = (temperature: number) => {
    if (temperature <= 15) {
      return {
        icon: <Ionicons name="snow" size={24} color="#3b82f6" />,
        color: "#3b82f6", // Blue
        bgColor: "#dbeafe", // Light blue
        label: "Too Cold",
      };
    } else if (temperature >= 25 && temperature <= 30) {
      return {
        icon: <Ionicons name="alert-circle" size={24} color="#f59e0b" />,
        color: "#f59e0b", // Amber
        bgColor: "#fef3c7", // Light amber
        label: "Warning",
      };
    } else if (temperature >= 31 && temperature <= 40) {
      return {
        icon: <Ionicons name="flame" size={24} color="#f97316" />,
        color: "#f97316", // Orange
        bgColor: "#ffedd5", // Light orange
        label: "Too Hot",
      };
    } else if (temperature > 40) {
      return {
        icon: <Ionicons name="warning" size={24} color="#ef4444" />,
        color: "#ef4444", // Red
        bgColor: "#fee2e2", // Light red
        label: "Critical",
      };
    }
    return {
      icon: <Ionicons name="information-circle" size={24} color="#6b7280" />,
      color: "#6b7280", // Gray
      bgColor: "#f3f4f6", // Light gray
      label: "Info",
    };
  };

  const alerts = useMemo(() => {
    return storerooms
      .filter((room) => room.temperature <= 15 || room.temperature >= 25)
      .map((room) => ({
        message: getAlertMessage(room.temperature, room.name),
        timestamp: room.lastUpdated
          ? room.lastUpdated.toDate().toISOString()
          : "",
        temperature: room.temperature,
        storeroomName: room.name,
      }));
  }, [storerooms]);

  // Determine how many alerts to show
  const alertsToShow = expandedAlerts ? alerts : alerts.slice(0, 3);
  const hasMoreAlerts = alerts.length > 3;

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((prevKey) => prevKey + 1);
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.greeting}>
            {lastName || user.displayName || "User"} 👋
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", onPress: logout },
            ]);
          }}
        >
          <MaterialIcons name="logout" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0891b2" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="thermometer" size={24} color="#0891b2" />
              </View>
              <Text style={styles.summaryValue}>
                {storerooms.length > 0
                  ? `${Math.round(
                      storerooms.reduce(
                        (sum, room) => sum + room.temperature,
                        0
                      ) / storerooms.length
                    )}°C`
                  : "N/A"}
              </Text>
              <Text style={styles.summaryLabel}>Avg Temp</Text>
            </View>
            <TouchableOpacity
              style={[styles.summaryCard, styles.summaryCardSecondary]}
              onPress={() => router.push("/screens/alerts")}
              activeOpacity={0.8}
            >
              <View style={styles.summaryIconContainer}>
                <Ionicons name="alert-circle" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.summaryValue}>{alerts.length}</Text>
              <Text style={styles.summaryLabel}>Alerts</Text>
            </TouchableOpacity>

            <View style={[styles.summaryCard, styles.summaryCardTertiary]}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="cube" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.summaryValue}>{storerooms.length}</Text>
              <Text style={styles.summaryLabel}>Storerooms</Text>
            </View>
          </View>

          {/* Storeroom Overview */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Storeroom Overview</Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {storerooms.length === 0 ? (
              <Text style={styles.emptyStateText}>No storerooms available</Text>
            ) : (
              storerooms.map((room, index) => (
                <TouchableOpacity
                  key={room.id}
                  onPress={() =>
                    router.push({
                      pathname: "./storeroom-details",
                      params: {
                        storeroomId: room.id,
                        storeroomName: room.name,
                      },
                    })
                  }
                  style={[
                    styles.storeroomItem,
                    index < storerooms.length - 1 && styles.divider,
                  ]}
                >
                  <View style={styles.storeroomInfo}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.lastUpdated}>
                      Updated{" "}
                      {timeAgo(room.lastUpdated?.toDate().toISOString() || "")}
                    </Text>
                  </View>

                  <View style={styles.temperatureContainer}>
                    <Text style={styles.temperatureValue}>
                      {room.temperature}°C
                    </Text>
                    <View
                      style={[styles.statusBadge, getStatusColor(room.status)]}
                    >
                      {getStatusIcon(room.status)}
                      <Text
                        style={[styles.statusText, getStatusColor(room.status)]}
                      >
                        {room.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Temperature Trends */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Temperature Trends</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#0891b2" />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {chartData.length > 0 ? (
              <LineChart
                data={{
                  labels: chartData.map((_, index) => `${index * 5}m`),
                  datasets: [
                    {
                      data: chartData,
                      color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`, // Cyan color
                      strokeWidth: 2,
                    },
                  ],
                }}
                width={screenWidth - 48}
                height={180}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`,
                  labelColor: (opacity = 1) =>
                    `rgba(100, 116, 139, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#0891b2",
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: "", // Solid lines
                    stroke: "#e2e8f0",
                    strokeWidth: 1,
                  },
                }}
                style={styles.chart}
                bezier
                withInnerLines={true}
                withOuterLines={false}
                withHorizontalLines={true}
                withVerticalLines={false}
                withHorizontalLabels={true}
                withVerticalLabels={true}
                fromZero={false}
                yAxisSuffix="°C"
                yAxisInterval={5}
              />
            ) : (
              <View style={styles.chartPlaceholder}>
                <ActivityIndicator size="small" color="#0891b2" />
                <Text style={styles.loadingText}>Loading chart data...</Text>
              </View>
            )}
          </View>

          {/* Alerts Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {alerts.length > 0 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/screens/alerts")}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#0891b2" />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.card, { marginBottom: 100 }]}>
            {alerts.length > 0 ? (
              <>
                {alertsToShow.map((alert, index) => {
                  const severity = getAlertSeverity(alert.temperature);

                  return (
                    <View
                      key={index}
                      style={[
                        styles.alertItem,
                        index < alertsToShow.length - 1 && styles.divider,
                      ]}
                    >
                      <View
                        style={[
                          styles.alertIconContainer,
                          { backgroundColor: severity.bgColor },
                        ]}
                      >
                        {severity.icon}
                      </View>
                      <View style={styles.alertContent}>
                        <View style={styles.alertHeader}>
                          <Text
                            style={[
                              styles.alertSeverity,
                              { color: severity.color },
                            ]}
                          >
                            {severity.label}
                          </Text>
                          <Text style={styles.alertTime}>
                            {timeAgo(alert.timestamp)}
                          </Text>
                        </View>
                        <Text style={styles.alertLocation}>
                          {alert.storeroomName}
                        </Text>
                        <Text style={styles.alertMessage}>{alert.message}</Text>
                      </View>
                    </View>
                  );
                })}

                {hasMoreAlerts && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setExpandedAlerts(!expandedAlerts)}
                  >
                    <Text style={styles.showMoreText}>
                      {expandedAlerts
                        ? "Show Less"
                        : `Show ${alerts.length - 3} More Alerts`}
                    </Text>
                    <Ionicons
                      name={expandedAlerts ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#0891b2"
                    />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyAlerts}>
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                <Text style={styles.emptyAlertsTitle}>All Systems Normal</Text>
                <Text style={styles.emptyAlertsText}>
                  No active alerts at this time. All storerooms are operating
                  within normal temperature ranges.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Bottom Nav */}
      <Navbar
        onRefresh={handleRefresh}
        onNavigateProfile={() => router.push("/screens/profile")}
        onNavigateHome={() => router.replace("/screens/dashboard")}
        onNavigateAlerts={() => router.push("/screens/alerts")}
        alerts={alerts}
        activeTab="home"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // Light slate background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b", // Slate-500
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#f8fafc",
  },
  welcomeText: {
    fontSize: 14,
    color: "#64748b", // Slate-500
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a", // Slate-900
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9", // Slate-100
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summaryCard: {
    width: "31%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryCardPrimary: {
    backgroundColor: "#e0f2fe", // Light cyan background
  },
  summaryCardSecondary: {
    backgroundColor: "#fef3c7", // Light amber background
  },
  summaryCardTertiary: {
    backgroundColor: "#ede9fe", // Light purple background
  },
  summaryIconContainer: {
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a", // Slate-900
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b", // Slate-500
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a", // Slate-900
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9", // Slate-100
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#0891b2", // Cyan-600
    marginRight: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  storeroomItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  storeroomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a", // Slate-900
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#64748b", // Slate-500
  },
  temperatureContainer: {
    alignItems: "flex-end",
  },
  temperatureValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a", // Slate-900
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  statusNormal: {
    backgroundColor: "rgba(16, 185, 129, 0.1)", // Light green
    color: "#10b981", // Green-500
  },
  statusWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.1)", // Light amber
    color: "#f59e0b", // Amber-500
  },
  statusCritical: {
    backgroundColor: "rgba(239, 68, 68, 0.1)", // Light red
    color: "#ef4444", // Red-500
  },
  statusUnknown: {
    backgroundColor: "rgba(107, 114, 128, 0.1)", // Light gray
    color: "#6b7280", // Gray-500
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9", // Slate-100
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartPlaceholder: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  alertItem: {
    flexDirection: "row",
    paddingVertical: 16,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  alertSeverity: {
    fontSize: 14,
    fontWeight: "600",
  },
  alertLocation: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a", // Slate-900
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: "#334155", // Slate-700
    lineHeight: 20,
  },
  alertTime: {
    fontSize: 12,
    color: "#64748b", // Slate-500
  },
  emptyAlerts: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyAlertsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10b981", // Green-500
    marginTop: 12,
    marginBottom: 8,
  },
  emptyAlertsText: {
    fontSize: 14,
    color: "#64748b", // Slate-500
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748b", // Slate-500
    textAlign: "center",
    paddingVertical: 24,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f1f5f9", // Slate-100
    borderRadius: 12,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0891b2", // Cyan-600
    marginRight: 4,
  },
});
