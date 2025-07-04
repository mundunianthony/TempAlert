import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useRouter } from "expo-router";
import Navbar from "../../src/components/Navbar";
import { Ionicons } from "@expo/vector-icons";
import { fetchAllAlertsWithDummy, fetchAllAlertsWithDummyCached, fetchAllAlertsWithDummyPersistent, AlertLog } from '../../src/utils/alertsFetcher';

interface Room {
  id: number;
  name: string;
  description: string;
}

export default function Alerts() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    fetchAlertsData(false);
  }, [user, router, refreshKey]);

  const fetchAlertsData = async (forceRefresh = false) => {
    try {
      const allAlerts = await fetchAllAlertsWithDummyPersistent(user.token || '');
      setAlertLogs(allAlerts);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching alerts data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getAlertMessage = (alert: AlertLog) => {
    const temperature = alert.temperature_value;
    const roomName = alert.room?.name || `Room ${alert.room_id}`;
    
    if (alert.alert_type === 'low' || temperature <= 15) {
      return `Temperature too low in ${roomName} (${temperature}°C)! Risk of freezing—check cooling system.`;
    } else if (alert.alert_type === 'high' || temperature >= 25) {
      if (temperature <= 30) {
        return `Temperature warming up in ${roomName} (${temperature}°C)—monitor to prevent spoilage.`;
      } else if (temperature <= 40) {
        return `Temperature too hot in ${roomName} (${temperature}°C)! Risk of spoilage—take action now.`;
      } else {
        return `Critical heat in ${roomName} (${temperature}°C)! Immediate intervention required.`;
      }
    }
    return `Temperature alert in ${roomName} (${temperature}°C)`;
  };

  type IoniconName =
    | "snow-outline"
    | "alert-circle-outline"
    | "flame-outline"
    | "warning-outline"
    | "information-circle-outline";
  
  const getAlertSeverity = (alert: AlertLog) => {
    const temperature = alert.temperature_value;
    
    if (alert.alert_type === 'low' || temperature <= 15) {
      return {
        icon: "snow-outline" as IoniconName,
        color: "#3b82f6", // Blue
        bgColor: "#dbeafe", // Light blue
        label: "Too Cold",
        priority: 2
      };
    } else if (alert.alert_type === 'high' || temperature >= 25) {
      if (temperature <= 30) {
        return {
          icon: "alert-circle-outline" as IoniconName,
          color: "#f59e0b", // Amber
          bgColor: "#fef3c7", // Light amber
          label: "Warning",
          priority: 3
        };
      } else if (temperature <= 40) {
        return {
          icon: "flame-outline" as IoniconName,
          color: "#f97316", // Orange
          bgColor: "#ffedd5", // Light orange
          label: "Too Hot",
          priority: 4
        };
      } else {
        return {
          icon: "warning-outline" as IoniconName,
          color: "#ef4444", // Red
          bgColor: "#fee2e2", // Light red
          label: "Critical",
          priority: 5
        };
      }
    }
    return {
      icon: "information-circle-outline" as IoniconName,
      color: "#6b7280", // Gray
      bgColor: "#f3f4f6", // Light gray
      label: "Info",
      priority: 1
    };
  };

  const processedAlerts = useMemo(() => {
    return alertLogs.map((alert) => ({
      ...alert,
      message: getAlertMessage(alert),
      severity: getAlertSeverity(alert),
    })).sort((a, b) => {
      // First sort by priority (highest first), then by time (most recent first)
      if (a.severity.priority !== b.severity.priority) {
        return b.severity.priority - a.severity.priority;
      }
      return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime();
    });
  }, [alertLogs]);

  const timeAgo = (timestamp: string) => {
    if (!timestamp) return "";
    
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

  const handleRefresh = () => {
    setRefreshing(true);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true
    }).start(() => {
      rotateAnim.setValue(0);
    });
    fetchAlertsData(true);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (!user) {
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Alerts</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons 
                name="refresh" 
                size={22} 
                color={refreshing ? "#0891b2" : "#64748b"} 
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0891b2" />
            <Text style={styles.loadingText}>Loading alerts...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            {processedAlerts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                <Text style={styles.emptyTitle}>All Systems Normal</Text>
                <Text style={styles.emptyText}>
                  No active alerts at this time. All storerooms are operating within normal temperature ranges.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.alertsHeader}>
                  <Text style={styles.alertCount}>
                    {processedAlerts.length} {processedAlerts.length === 1 ? 'Alert' : 'Alerts'} Found
                  </Text>
                  <Text style={styles.sortedByText}>Sorted by priority & time</Text>
                </View>
                
                {processedAlerts.map((alert, index) => {
                  const severity = alert.severity;
                  
                  return (
                    <View
                      key={alert.id}
                      style={[
                        styles.alertCard,
                        { borderLeftColor: severity.color, borderLeftWidth: 4 }
                      ]}
                    >
                      <View style={[styles.alertIconContainer, { backgroundColor: severity.bgColor }]}>
                        <Ionicons name={severity.icon} size={24} color={severity.color} />
                      </View>
                      <View style={styles.alertContent}>
                        <View style={styles.alertHeader}>
                          <Text style={[styles.alertSeverity, { color: severity.color }]}>
                            {severity.label}
                          </Text>
                          <Text style={styles.alertTime}>{timeAgo(alert.triggered_at)}</Text>
                        </View>
                        <Text style={styles.alertStoreroom}>
                          {alert.room?.name || `Room ${alert.room_id}`}
                        </Text>
                        <Text style={styles.alertMessage}>{alert.message}</Text>
                        
                        <View style={styles.alertFooter}>
                          <Text style={styles.alertStatus}>
                            Status: {alert.status || 'Active'}
                          </Text>
                          <TouchableOpacity 
                            style={styles.viewDetailsButton}
                            onPress={() => router.push({
                              pathname: "./storeroom-details",
                              params: { 
                                storeroomId: alert.room_id.toString(),
                                storeroomName: alert.room?.name || `Room ${alert.room_id}`
                              },
                            })}
                          >
                            <Text style={styles.viewDetailsText}>View Details</Text>
                            <Ionicons name="chevron-forward" size={14} color="#0891b2" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}

        <Navbar
          onRefresh={handleRefresh}
          onNavigateProfile={() => router.push("/screens/profile")}
          onNavigateHome={() => {
            if (isAdmin) {
              router.replace("/screens/admin/dashboard");
            } else {
              router.replace("/screens/dashboard");
            }
          }}
          onNavigateAlerts={() => router.replace("/screens/alerts")}
          alerts={processedAlerts.map(alert => ({
            message: alert.message,
            timestamp: alert.triggered_at
          }))}
          activeTab="alerts"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc", // Light slate background
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  outerContainer: {
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0f172a", 
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 100, 
    backgroundColor: "#f8fafc",
    flexGrow: 1,
  },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  alertCount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
  },
  sortedByText: {
    fontSize: 12,
    color: "#94a3b8", 
    fontStyle: "italic",
  },
  alertCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  alertIconContainer: {
    width: 48,
    height: "auto",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  alertContent: {
    flex: 1,
    padding: 16,
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
  alertStoreroom: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a", // Slate-900
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: "#334155", // Slate-700
    lineHeight: 20,
    marginBottom: 12,
  },
  alertTime: {
    fontSize: 12,
    color: "#64748b", // Slate-500
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertStatus: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f1f5f9", // Slate-100
    borderRadius: 16,
  },
  viewDetailsText: {
    fontSize: 12,
    color: "#0891b2", // Cyan-600
    fontWeight: "500",
    marginRight: 4,
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
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#10b981", // Green-500
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b", // Slate-500
    textAlign: "center",
    lineHeight: 24,
  },
});

