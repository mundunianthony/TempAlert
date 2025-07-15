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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getDemoRoomThreshold } from '../../src/utils/localThresholds';
import { fetchAllAlertsWithDummyPersistent, AlertLog } from '../../src/utils/alertsFetcher';
import { resetRoomConfiguration, initializeRoomConfiguration } from '../../src/utils/roomConfigReset';

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
  const { user, logout, token } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
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
    // Fetch rooms and alerts
    const fetchDashboardData = async () => {
      try {
        console.log('🔄 Fetching dashboard data...');
        
        // Fetch rooms with thresholds (keep this for storeroom overview)
        const roomsResponse = await fetch('https://tempalert.onensensy.com/api/rooms', {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const roomsData = await roomsResponse.json();
        const rooms = roomsData.data || [];
        console.log('📋 Fetched rooms:', rooms.length);
        
        // Auto-initialize room configuration if needed
        if (rooms.length > 0) {
          const config = await AsyncStorage.getItem('roomConfiguration');
          if (!config) {
            console.log('🏗️ Auto-initializing room configuration...');
            await initializeRoomConfiguration(rooms);
          }
        }
        
        const firstRoomId = await getFirstRoomId();
        console.log('🏠 First room ID:', firstRoomId);
        
        const roomsWithThresholds = await Promise.all(
          rooms.map(async (room: any) => {
            try {
              console.log(`🔍 Processing room ${room.id}: ${room.name}`);
              
              const thresholdResponse = await fetch(`https://tempalert.onensensy.com/api/thresholds?options[room_id]=${room.id}`, {
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              });
              let threshold = (await thresholdResponse.json()).data?.[0] || null;
              console.log(`📊 Room ${room.id} threshold:`, threshold);
              
              const isDummy = await isDummyRoom(room.id);
              console.log(`🎲 Room ${room.id} is dummy:`, isDummy);
              
              let currentTemperature = null;
              let lastReadingTime = null;
              
              if (isDummy) {
                const dummyData = await getDummyRoomData(room.id, room.name);
                console.log(`🌡️ Room ${room.id} dummy data:`, dummyData);
                currentTemperature = dummyData.currentTemperature;
                lastReadingTime = dummyData.lastUpdated;
                const localThreshold = await getDemoRoomThreshold(room.id);
                if (localThreshold) {
                  threshold = localThreshold;
                  console.log(`🎯 Room ${room.id} local threshold:`, localThreshold);
                }
              } else if (threshold && room.id === firstRoomId) {
                try {
                  const sensorsResponse = await fetch(`https://tempalert.onensensy.com/api/sensors?options[room_id]=${room.id}`, {
                    headers: {
                      'Accept': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                  });
                  const sensorsData = await sensorsResponse.json();
                  const sensors = sensorsData.data || [];
                  console.log(`📡 Room ${room.id} sensors:`, sensors.length);
                  
                  if (sensors.length > 0) {
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
                    const allReadings = latestReadings.flat();
                    console.log(`📈 Room ${room.id} total readings:`, allReadings.length);
                    
                    if (allReadings.length > 0) {
                      const latestReading = allReadings.sort((a: any, b: any) => 
                        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                      )[0];
                      currentTemperature = latestReading.temperature_value;
                      lastReadingTime = latestReading.recorded_at;
                      console.log(`🌡️ Room ${room.id} real temperature:`, currentTemperature);
                    }
                  }
                } catch (error) {
                  console.error('Error fetching temperature readings for room:', room.id, error);
                }
              }
              
              const roomData = {
                ...room,
                threshold: threshold ? {
                  min_temperature: threshold.min_temperature,
                  max_temperature: threshold.max_temperature,
                } : null,
                current_temperature: currentTemperature,
                last_reading_time: lastReadingTime,
                is_dummy: isDummy,
              };
              
              console.log(`✅ Room ${room.id} final data:`, {
                name: roomData.name,
                temperature: roomData.current_temperature,
                threshold: roomData.threshold,
                isDummy: roomData.is_dummy,
                hasTemp: !!roomData.current_temperature,
                hasThreshold: !!roomData.threshold,
                tempType: typeof roomData.current_temperature,
                thresholdType: typeof roomData.threshold
              });
              
              return roomData;
            } catch (error) {
              console.error('Error fetching threshold for room:', room.id, error);
              return room;
            }
          })
        );
        
        console.log('📊 Final rooms data:', roomsWithThresholds);
        setStorerooms(roomsWithThresholds);
        
        // Fetch alerts (real + dummy)
        const allAlerts = await fetchAllAlertsWithDummyPersistent(token);
        console.log('🚨 Fetched alerts:', allAlerts.length);
        setAlerts(allAlerts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user, router, refreshKey]);

  const getStatusColor = (room: Storeroom) => {
    // For real rooms without sensor data, show gray
    if (!room.is_dummy && (!room.current_temperature || !room.threshold)) {
      return styles.statusUnknown;
    }
    
    // For dummy rooms without data, show gray
    if (room.is_dummy && !room.current_temperature) {
      return styles.statusUnknown;
    }

    // For dummy rooms with temperature but no threshold, use default thresholds
    if (room.is_dummy && room.current_temperature && !room.threshold) {
      const temp = room.current_temperature;
      const defaultMin = 18;
      const defaultMax = 25;
      
      if (temp < defaultMin) {
        return styles.statusLow;
      } else if (temp > defaultMax) {
        return styles.statusHigh;
      } else {
        return styles.statusNormal;
      }
    }

    // For rooms with both temperature and threshold
    if (room.current_temperature && room.threshold) {
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
    }

    return styles.statusUnknown;
  };

  const getStatusIcon = (room: Storeroom) => {
    // For real rooms without sensor data, show sensor icon
    if (!room.is_dummy && (!room.current_temperature || !room.threshold)) {
      return <Ionicons name="help-circle-outline" size={18} color="#6b7280" />;
    }
    
    // For dummy rooms without data, show help icon
    if (room.is_dummy && !room.current_temperature) {
      return <Ionicons name="help-circle" size={18} color="#6b7280" />;
    }

    // For dummy rooms with temperature but no threshold, use default thresholds
    if (room.is_dummy && room.current_temperature && !room.threshold) {
      const temp = room.current_temperature;
      const defaultMin = 18;
      const defaultMax = 25;
      
      if (temp < defaultMin) {
        return <Ionicons name="thermometer-outline" size={18} color="#3b82f6" />;
      } else if (temp > defaultMax) {
        return <Ionicons name="flame" size={18} color="#ef4444" />;
      } else {
        return <Ionicons name="checkmark-circle" size={18} color="#10b981" />;
      }
    }

    // For rooms with both temperature and threshold
    if (room.current_temperature && room.threshold) {
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
    }

    return <Ionicons name="help-circle" size={18} color="#6b7280" />;
  };

  const getStatusText = (room: Storeroom) => {
    console.log(`🔍 Status check for room ${room.id} (${room.name}):`, {
      isDummy: room.is_dummy,
      temperature: room.current_temperature,
      threshold: room.threshold,
      hasTemp: !!room.current_temperature,
      hasThreshold: !!room.threshold
    });

    // For real rooms without sensor data, show "No Sensor"
    if (!room.is_dummy && (!room.current_temperature || !room.threshold)) {
      console.log(`📡 Room ${room.id}: No Sensor`);
      return "No Sensor";
    }
    
    // For dummy rooms without data, show "No Data"
    if (room.is_dummy && !room.current_temperature) {
      console.log(`❓ Room ${room.id}: No Data`);
      return "No Data";
    }

    // For dummy rooms with temperature but no threshold, use default thresholds
    if (room.is_dummy && room.current_temperature && !room.threshold) {
      const temp = room.current_temperature;
      const defaultMin = 18; // Default minimum temperature
      const defaultMax = 25; // Default maximum temperature
      
      console.log(`🎲 Room ${room.id}: Using default thresholds (${defaultMin}-${defaultMax}°C), temp: ${temp}°C`);
      
      if (temp < defaultMin) {
        console.log(`❄️ Room ${room.id}: Low (${temp}°C < ${defaultMin}°C)`);
        return "Low";
      } else if (temp > defaultMax) {
        console.log(`🔥 Room ${room.id}: High (${temp}°C > ${defaultMax}°C)`);
        return "High";
      } else {
        console.log(`✅ Room ${room.id}: Normal (${defaultMin}°C ≤ ${temp}°C ≤ ${defaultMax}°C)`);
        return "Normal";
      }
    }

    // For rooms with both temperature and threshold
    if (room.current_temperature && room.threshold) {
      const temp = room.current_temperature;
      const min = room.threshold.min_temperature;
      const max = room.threshold.max_temperature;

      console.log(`📊 Room ${room.id}: Using actual thresholds (${min}-${max}°C), temp: ${temp}°C`);

      if (temp < min) {
        console.log(`❄️ Room ${room.id}: Low (${temp}°C < ${min}°C)`);
        return "Low";
      } else if (temp > max) {
        console.log(`🔥 Room ${room.id}: High (${temp}°C > ${max}°C)`);
        return "High";
      } else {
        console.log(`✅ Room ${room.id}: Normal (${min}°C ≤ ${temp}°C ≤ ${max}°C)`);
        return "Normal";
      }
    }

    console.log(`❓ Room ${room.id}: Unknown status`);
    return "Unknown";
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

  // Helper to generate alert message for dashboard
  function getAlertMessage(alert) {
    const temperature = alert.temperature_value;
    const storeroomName = alert.room?.name || `Room ${alert.room_id}`;
    if (alert.alert_type === 'low' || temperature <= 15) {
      return `Temperature too low in ${storeroomName} (${temperature}°C)! Risk of freezing—check cooling system.`;
    } else if (alert.alert_type === 'high' || temperature >= 25) {
      if (temperature <= 30) {
        return `Temperature warming up in ${storeroomName} (${temperature}°C)—monitor to prevent spoilage.`;
      } else if (temperature <= 40) {
        return `Temperature too hot in ${storeroomName} (${temperature}°C)! Risk of spoilage—take action now.`;
      } else {
        return `Critical heat in ${storeroomName} (${temperature}°C)! Immediate intervention required.`;
      }
    }
    return `Temperature alert in ${storeroomName} (${temperature}°C)`;
  }

  // For displaying alerts in the dashboard, map AlertLog to display format (include all original fields)
  const displayAlerts = alerts.map(alert => ({
    ...alert, // include all original fields
    message: getAlertMessage(alert),
    timestamp: alert.triggered_at,
    temperature: alert.temperature_value,
    storeroomName: alert.room?.name || `Room ${alert.room_id}`,
    isDummy: typeof alert.id === 'string' && String(alert.id).startsWith('dummy-'),
  }));
  const alertsToShow = expandedAlerts ? displayAlerts : displayAlerts.slice(0, 3);
  const hasMoreAlerts = displayAlerts.length > 3;

  // Calculate average temperature
  const averageTemperature = useMemo(() => {
    const roomsWithTemp = storerooms.filter(room => 
      room.current_temperature !== null && room.current_temperature !== undefined
    );
    if (roomsWithTemp.length === 0) return null;
    const avgTemp = roomsWithTemp.reduce((sum, room) => sum + room.current_temperature!, 0) / roomsWithTemp.length;
    return Math.round(avgTemp);
  }, [storerooms]);

  // Calculate the number of rooms with at least one active (unresolved) alert
  const activeAlertCount = useMemo(() => {
    const roomIdsWithActiveAlerts = new Set();
    alerts.forEach(alert => {
      const status = String(alert.status).toLowerCase();
      if ((status === 'triggered' || status === 'active') && !alert.resolved_at) {
        roomIdsWithActiveAlerts.add(String(alert.room_id));
      }
    });
    return roomIdsWithActiveAlerts.size;
  }, [alerts]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  // Add getAlertSeverity for dashboard alerts
  function getAlertSeverity(alert) {
    const temperature = alert.temperature;
    if (alert.alert_type === 'low' || temperature <= 15) {
      return {
        icon: <Ionicons name="snow" size={24} color="#3b82f6" />,
        color: "#3b82f6", // Blue
        bgColor: "#dbeafe", // Light blue
        label: "Too Cold",
      };
    } else if (alert.alert_type === 'high' || temperature >= 25) {
      if (temperature <= 30) {
        return {
          icon: <Ionicons name="alert-circle" size={24} color="#f59e0b" />,
          color: "#f59e0b", // Amber
          bgColor: "#fef3c7", // Light amber
          label: "Warning",
        };
      } else if (temperature <= 40) {
        return {
          icon: <Ionicons name="flame" size={24} color="#f97316" />,
          color: "#f97316", // Orange
          bgColor: "#ffedd5", // Light orange
          label: "Too Hot",
        };
      } else {
        return {
          icon: <Ionicons name="warning" size={24} color="#ef4444" />,
          color: "#ef4444", // Red
          bgColor: "#fee2e2", // Light red
          label: "Critical",
        };
      }
    }
    return {
      icon: <Ionicons name="information-circle" size={24} color="#6b7280" />,
      color: "#6b7280", // Gray
      bgColor: "#f3f4f6", // Light gray
      label: "Info",
    };
  }

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
          <Text style={styles.greeting}>{user?.name || "User"}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
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
                {averageTemperature !== null ? `${averageTemperature}°C` : "N/A"}
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
              <Text style={styles.summaryValue}>{activeAlertCount}</Text>
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
                    <View style={styles.storeroomHeader}>
                      <Text style={styles.storeroomName}>{room.name}</Text>
                      <View style={styles.statusContainer}>
                        {(() => {
                          const statusText = getStatusText(room);
                          const statusIcon = getStatusIcon(room);
                          const statusColor = getStatusColor(room);
                          console.log(`🎨 Rendering status for room ${room.id}:`, {
                            text: statusText,
                            color: statusColor,
                            hasIcon: !!statusIcon
                          });
                          return (
                            <>
                              {statusIcon}
                              <Text style={[styles.statusText, statusColor]}>
                                {statusText}
                              </Text>
                            </>
                          );
                        })()}
                      </View>
                    </View>
                    
                    <View style={styles.storeroomDetails}>
                      <Text style={styles.temperatureText}>
                        {room.current_temperature !== null && room.current_temperature !== undefined
                          ? `${room.current_temperature}°C`
                          : room.is_dummy 
                            ? "22.0°C" // Default dummy temperature
                            : "No Sensor"} {/* Real room without sensor */}
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

                    {!room.is_dummy && (
                      <View style={styles.realBadge}>
                        <Text style={styles.realBadgeText}>Real Sensor</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Recent Alerts Section */}
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
                  const severity = getAlertSeverity(alert);
                  
                  return (
                    <View
                      key={index}
                      style={[
                        styles.alertItem,
                        index < alertsToShow.length - 1 && styles.divider,
                      ]}
                    >
                      <View style={[styles.alertIconContainer, { backgroundColor: severity.bgColor }]}>
                        {severity.icon}
                      </View>
                      <View style={styles.alertContent}>
                        <View style={styles.alertHeader}>
                          <Text style={[styles.alertSeverity, { color: severity.color }]}>
                            {severity.label}
                          </Text>
                          <Text style={styles.alertTime}>{timeAgo(alert.timestamp)}</Text>
                        </View>
                        <Text style={styles.alertLocation}>{alert.storeroomName}</Text>
                        <Text style={styles.alertMessage}>{alert.message}</Text>
                      </View>
                    </View>
                  );
                })}
                
                {hasMoreAlerts && !expandedAlerts && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setExpandedAlerts(true)}
                  >
                    <Text style={styles.showMoreText}>
                      Show {alerts.length - 3} more alerts
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#0891b2" />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyAlerts}>
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                <Text style={styles.emptyAlertsTitle}>All Systems Normal</Text>
                <Text style={styles.emptyAlertsText}>
                  No active alerts at this time. All storerooms are operating within normal temperature ranges.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <Navbar
        onRefresh={handleRefresh}
        onNavigateProfile={() => router.push("/screens/profile")}
        onNavigateHome={() => router.replace("/screens/dashboard")}
        onNavigateAlerts={() => router.push("/screens/alerts")}
        alerts={Array.from({ length: activeAlertCount }, (_, i) => ({ message: '', timestamp: '' }))}
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
    paddingBottom: 100,
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
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
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
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
    alignSelf: "flex-start",
    marginTop: 4,
  },
  dummyBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  realBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 4,
    padding: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  realBadgeText: {
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
