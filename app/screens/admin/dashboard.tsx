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
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminNavbar from './Navbar';
import { isDummyRoom, getDummyRoomData, getFirstRoomId, getTimeAgo } from "../../../src/utils/dummyDataGenerator";

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
  is_dummy?: boolean;
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
        isDummy: room.is_dummy || false,
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

        // Get the first room ID (real sensor room)
        const firstRoomId = await getFirstRoomId();

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

        // Calculate admin statistics
        const roomsWithThresholdsCount = roomsWithThresholds.filter(room => room.threshold).length;

        setAdminStats({
          totalUsers,
          totalSensors,
          activeAlerts: 0, // Will be updated after alerts calculation
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

  // Update admin stats when alerts change
  useEffect(() => {
    setAdminStats(prev => ({
      ...prev,
      activeAlerts: alerts.length,
    }));
  }, [alerts]);

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
      return <Ionicons name="snow" size={18} color="#3b82f6" />;
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
              <View style={[styles.summaryCard, styles.summaryCardSecondary]}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="alert-circle" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.summaryValue}>{adminStats.activeAlerts}</Text>
                <Text style={styles.summaryLabel}>Active Alerts</Text>
              </View>
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
                          Updated {room.last_reading_time ? getTimeAgo(room.last_reading_time) : "Unknown time"}
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
          </ScrollView>

          <AdminNavbar />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#f8fafc",
  },
  welcomeText: {
    fontSize: 16,
    color: "#64748b",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
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
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: "#0891b2",
  },
  summaryCardSecondary: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  summaryCardTertiary: {
    borderLeftWidth: 4,
    borderLeftColor: "#8b5cf6",
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  adminControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  adminButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0891b2",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emptyStateText: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    fontSize: 16,
  },
  storeroomItem: {
    padding: 20,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  storeroomInfo: {
    flex: 1,
  },
  storeroomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  storeroomName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
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
  storeroomDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  temperatureText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "#64748b",
  },
  thresholdText: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 8,
  },
  dummyBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dummyBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
});

