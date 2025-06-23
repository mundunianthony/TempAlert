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
import { useAuth } from "../../src/context/AuthContext";
import { useRouter } from "expo-router";
import {
  Feather,
  FontAwesome,
  MaterialIcons,
  Ionicons,
} from "@expo/vector-icons";
import Navbar from "../../src/components/Navbar";
import { isDummyRoom, getDummyRoomData, getFirstRoomId } from "../../src/utils/dummyDataGenerator";

interface Storeroom {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  current_temperature?: number;
  last_reading_time?: string;
  threshold?: {
    min_temperature: number;
    max_temperature: number;
  };
  is_dummy: boolean;
}

interface TemperatureDataPoint {
  value: number;
  timestamp: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
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

    const fetchDashboardData = async () => {
      try {
        // Fetch rooms with thresholds
        const roomsResponse = await fetch('https://tempalert.onensensy.com/api/rooms', {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${user.token || ''}`,
          },
        });
        const roomsData = await roomsResponse.json();
        const rooms = roomsData.data || [];

        // Get the first room ID (real sensor room)
        const firstRoomId = await getFirstRoomId();

        // Fetch thresholds for each room
        const roomsWithThresholds = await Promise.all(
          rooms.map(async (room: any) => {
            try {
              const thresholdResponse = await fetch(`https://tempalert.onensensy.com/api/thresholds?options[room_id]=${room.id}`, {
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${user.token || ''}`,
                },
              });
              const thresholdData = await thresholdResponse.json();
              const threshold = thresholdData.data?.[0] || null;

              // Check if this is a dummy room
              const isDummy = await isDummyRoom(room.id);
              let currentTemperature = null;
              let lastReadingTime = null;
              
              if (isDummy) {
                // Use dummy data for non-first rooms
                const dummyData = await getDummyRoomData(room.id, room.name);
                currentTemperature = dummyData.currentTemperature;
                lastReadingTime = dummyData.lastUpdated;
              } else if (threshold && room.id === firstRoomId) {
                // Use real sensor data for the first room
                try {
                  const sensorsResponse = await fetch(`https://tempalert.onensensy.com/api/sensors?options[room_id]=${room.id}`, {
                    headers: {
                      'Accept': 'application/json',
                      'Authorization': `Bearer ${user.token || ''}`,
                    },
                  });
                  const sensorsData = await sensorsResponse.json();
                  const sensors = sensorsData.data || [];

                  if (sensors.length > 0) {
                    // Get latest temperature reading from any sensor in this room
                    const latestReadings = await Promise.all(
                      sensors.map(async (sensor: any) => {
                        try {
                          const readingsResponse = await fetch(`https://tempalert.onensensy.com/api/temperature-readings?options[sensor_id]=${sensor.id}`, {
                            headers: {
                              'Accept': 'application/json',
                              'Authorization': `Bearer ${user.token || ''}`,
                            },
                          });
                          const readingsData = await readingsResponse.json();
                          return readingsData.data || [];
                        } catch (error) {
                          console.error('Error fetching readings for sensor:', sensor.id, error);
                          return [];
                        }
                      })
                    );

                    // Find the latest reading across all sensors
                    const allReadings = latestReadings.flat();
                    if (allReadings.length > 0) {
                      const latestReading = allReadings.sort((a: any, b: any) => 
                        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                      )[0];
                      currentTemperature = latestReading.temperature_value;
                      lastReadingTime = latestReading.recorded_at;
                    }
                  }
                } catch (error) {
                  console.error('Error fetching temperature readings for room:', room.id, error);
                }
              }

              return {
                ...room,
                threshold: threshold ? {
                  min_temperature: threshold.min_temperature,
                  max_temperature: threshold.max_temperature,
                } : null,
                current_temperature: currentTemperature,
                last_reading_time: lastReadingTime,
                is_dummy: isDummy,
              };
            } catch (error) {
              console.error('Error fetching threshold for room:', room.id, error);
              return room;
            }
          })
        );

        setStorerooms(roomsWithThresholds);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, router, refreshKey]);

  const getStatusColor = (room: Storeroom) => {
    if (!room.current_temperature || !room.threshold) {
      return styles.statusUnknown;
    }

    const temp = room.current_temperature;
    const min = room.threshold.min_temperature;
    const max = room.threshold.max_temperature;

    if (temp < min) {
      return styles.statusLow;
    } else if (temp > max) {
      return styles.statusHigh;
    } else {
      return styles.statusNormal;
    }
  };

  const getStatusIcon = (room: Storeroom) => {
    if (!room.current_temperature || !room.threshold) {
      return <Ionicons name="help-circle" size={18} color="#6b7280" />;
    }

    const temp = room.current_temperature;
    const min = room.threshold.min_temperature;
    const max = room.threshold.max_temperature;

    if (temp < min) {
      return <Ionicons name="thermometer-outline" size={18} color="#3b82f6" />;
    } else if (temp > max) {
      return <Ionicons name="flame" size={18} color="#ef4444" />;
    } else {
      return <Ionicons name="checkmark-circle" size={18} color="#10b981" />;
    }
  };

  const getStatusText = (room: Storeroom) => {
    if (!room.current_temperature || !room.threshold) {
      return "Unknown";
    }

    const temp = room.current_temperature;
    const min = room.threshold.min_temperature;
    const max = room.threshold.max_temperature;

    if (temp < min) {
      return "Low";
    } else if (temp > max) {
      return "High";
    } else {
      return "Normal";
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
      .filter((room) => {
        if (!room.current_temperature || !room.threshold) return false;
        const temp = room.current_temperature;
        const min = room.threshold.min_temperature;
        const max = room.threshold.max_temperature;
        return temp < min || temp > max;
      })
      .map((room) => ({
        message: getAlertMessage(room.current_temperature!, room.name),
        timestamp: room.last_reading_time || "",
        temperature: room.current_temperature!,
        storeroomName: room.name,
        isDummy: room.is_dummy || false,
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
            {user.name || user.displayName || "User"} {'\u{1F44B}'}
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
                <View
                  key={room.id}
                  style={[
                    styles.storeroomItem,
                    index < storerooms.length - 1 && styles.divider,
                  ]}
                >
                  <View style={styles.storeroomInfo}>
                    <View style={styles.storeroomHeader}>
                      <Text style={styles.storeroomName}>{room.name}</Text>
                      <View style={styles.statusContainer}>
                        {getStatusIcon(room)}
                        <Text style={[styles.statusText, getStatusColor(room)]}>
                          {getStatusText(room)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.storeroomDetails}>
                      <Text style={styles.temperatureText}>
                        {room.current_temperature !== null && room.current_temperature !== undefined
                          ? `${room.current_temperature}°C`
                          : "No data"}
                      </Text>
                      <Text style={styles.lastUpdatedText}>
                        Updated {room.last_reading_time ? timeAgo(room.last_reading_time) : "Unknown time"}
                      </Text>
                    </View>

                    {room.threshold && (
                      <Text style={styles.thresholdText}>
                        Range: {room.threshold.min_temperature}°C - {room.threshold.max_temperature}°C
                      </Text>
                    )}

                    {room.is_dummy && (
                      <View style={styles.dummyBadge}>
                        <Text style={styles.dummyBadgeText}>Demo Data</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
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
  storeroomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  storeroomName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a", // Slate-900
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  storeroomDetails: {
    marginBottom: 4,
  },
  temperatureText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a", // Slate-900
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "#64748b", // Slate-500
  },
  thresholdText: {
    fontSize: 12,
    color: "#64748b", // Slate-500
  },
  dummyBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 4,
    padding: 4,
  },
  dummyBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
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
  statusNormal: {
    color: "#10b981",
  },
  statusLow: {
    color: "#3b82f6",
  },
  statusHigh: {
    color: "#ef4444",
  },
  statusUnknown: {
    color: "#6b7280",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
});

