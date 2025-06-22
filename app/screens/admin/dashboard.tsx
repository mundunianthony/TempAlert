import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useAuth } from "../../../src/context/AuthContext";
import { useRouter } from "expo-router";
import {
  Feather,
  FontAwesome,
  MaterialIcons,
  Ionicons,
} from "@expo/vector-icons";
// import { getFirestore } from "../../../src/lib/firebase";
// import { collection, onSnapshot, Timestamp, doc, setDoc, getDoc } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminNavbar from './Navbar';

// const database = getFirestore();

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
}

export default function AdminDashboard() {
  const { user, logout, isAdmin, token } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalSensors: 0,
    activeAlerts: 0,
    roomsWithThresholds: 0,
  });

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
      }));
  }, [storerooms]);

  function getAlertMessage(temperature: number, storeroomName: string) {
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
  }

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((prevKey) => prevKey + 1);
  };

  useEffect(() => {
    if (!user || !isAdmin) {
      router.replace("/login");
      return;
    }

    setLoading(true);

    const fetchAdminDashboardData = async () => {
      try {
        // Fetch ALL rooms in the system (admin has access to everything)
        const roomsResponse = await fetch('https://tempalert.onensensy.com/api/rooms', {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const roomsData = await roomsResponse.json();
        const rooms = roomsData.data || [];

        // Fetch admin statistics
        const [usersResponse, sensorsResponse] = await Promise.all([
          fetch('https://tempalert.onensensy.com/api/users', {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }),
          fetch('https://tempalert.onensensy.com/api/sensors', {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }),
        ]);

        const usersData = await usersResponse.json();
        const sensorsData = await sensorsResponse.json();
        const totalUsers = usersData.data?.length || 0;
        const totalSensors = sensorsData.data?.length || 0;

        // Fetch thresholds for each room
        const roomsWithThresholds = await Promise.all(
          rooms.map(async (room: any) => {
            try {
              const thresholdResponse = await fetch(`https://tempalert.onensensy.com/api/thresholds?options[room_id]=${room.id}`, {
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              });
              const thresholdData = await thresholdResponse.json();
              const threshold = thresholdData.data?.[0] || null;

              // Fetch latest temperature reading for this room
              let currentTemperature = null;
              let lastReadingTime = null;
              
              try {
                const sensorsResponse = await fetch(`https://tempalert.onensensy.com/api/sensors?options[room_id]=${room.id}`, {
                  headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
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
                            'Authorization': `Bearer ${token}`,
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

              return {
                ...room,
                threshold: threshold ? {
                  min_temperature: threshold.min_temperature,
                  max_temperature: threshold.max_temperature,
                } : null,
                current_temperature: currentTemperature,
                last_reading_time: lastReadingTime,
              };
            } catch (error) {
              console.error('Error fetching threshold for room:', room.id, error);
              return room;
            }
          })
        );

        // Calculate admin statistics
        const roomsWithThresholdsCount = roomsWithThresholds.filter(room => room.threshold).length;
        const activeAlertsCount = alerts.length;

        setAdminStats({
          totalUsers,
          totalSensors,
          activeAlerts: activeAlertsCount,
          roomsWithThresholds: roomsWithThresholdsCount,
        });

        setStorerooms(roomsWithThresholds);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        setLoading(false);
      }
    };

    fetchAdminDashboardData();
  }, [user, router, refreshKey, isAdmin]);

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

  if (!user || !isAdmin) {
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
          <Text style={styles.welcomeText}>Welcome back, Admin</Text>
          <Text style={styles.greeting}>
            {user.name || "Administrator"} 👋
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
        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="people" size={24} color="#0891b2" />
                </View>
                <Text style={styles.summaryValue}>{adminStats.totalUsers}</Text>
                <Text style={styles.summaryLabel}>Total Users</Text>
              </View>
              <TouchableOpacity
                style={[styles.summaryCard, styles.summaryCardSecondary]}
                onPress={() => router.push("/screens/alerts")}
                activeOpacity={0.8}
              >
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="alert-circle" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.summaryValue}>{adminStats.activeAlerts}</Text>
                <Text style={styles.summaryLabel}>Active Alerts</Text>
              </TouchableOpacity>

              <View style={[styles.summaryCard, styles.summaryCardTertiary]}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="cube" size={24} color="#8b5cf6" />
                </View>
                <Text style={styles.summaryValue}>{storerooms.length}</Text>
                <Text style={styles.summaryLabel}>Total Rooms</Text>
              </View>
            </View>

            {/* Admin Controls */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Admin Controls</Text>
            </View>
            <View style={styles.adminControls}>
              <TouchableOpacity 
                style={styles.adminButton}
                onPress={() => router.push("/screens/admin/users")}
              >
                <Ionicons name="people-outline" size={24} color="#0891b2" />
                <Text style={styles.adminButtonText}>Manage Users</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adminButton}
                onPress={() => router.push("/screens/admin/rooms")}
              >
                <Ionicons name="business-outline" size={24} color="#0891b2" />
                <Text style={styles.adminButtonText}>Manage Rooms</Text>
              </TouchableOpacity>
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
                  <View
                    key={room.id}
                    style={[
                      styles.storeroomItem,
                      index < storerooms.length - 1 && styles.divider,
                    ]}
                  >
                    <View style={styles.storeroomInfo}>
                      <Text style={styles.roomName}>{room.name}</Text>
                      <Text style={styles.lastUpdated}>
                        {room.last_reading_time 
                          ? `Updated ${timeAgo(room.last_reading_time)}`
                          : "No recent readings"
                        }
                      </Text>
                    </View>

                    <View style={styles.temperatureContainer}>
                      <Text style={styles.temperatureValue}>
                        {room.current_temperature ? `${room.current_temperature}°C` : "N/A"}
                      </Text>
                      <View
                        style={[styles.statusBadge, getStatusColor(room)]}
                      >
                        {getStatusIcon(room)}
                        <Text
                          style={[styles.statusText, getStatusColor(room)]}
                        >
                          {getStatusText(room)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Fixed Bottom Navbar */}
          <View style={styles.navbarContainer}>
            <AdminNavbar />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
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
    color: "#64748b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  welcomeText: {
    fontSize: 14,
    color: "#64748b",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  logoutButton: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100, // Add padding to account for fixed navbar
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
    backgroundColor: "#e0f2fe",
  },
  summaryCardSecondary: {
    backgroundColor: "#fef3c7",
  },
  summaryCardTertiary: {
    backgroundColor: "#ede9fe",
  },
  summaryIconContainer: {
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  adminControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 24,
    backgroundColor: "#ffffff",
    marginBottom: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adminButton: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    width: "30%",
  },
  adminButtonText: {
    marginTop: 8,
    fontSize: 12,
    color: "#0f172a",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
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
    color: "#0f172a",
  },
  editButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: "#0891b2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  thresholdsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thresholdItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  thresholdLabel: {
    fontSize: 16,
    color: "#0f172a",
  },
  thresholdValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0891b2",
  },
  thresholdInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: "center",
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
    color: "#0f172a",
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#64748b",
  },
  temperatureContainer: {
    alignItems: "flex-end",
  },
  temperatureValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
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
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    color: "#10b981",
  },
  statusLow: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    color: "#3b82f6",
  },
  statusHigh: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "#ef4444",
  },
  statusUnknown: {
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    color: "#6b7280",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 24,
  },
  navbarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
