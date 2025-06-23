import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import Navbar from "../../src/components/Navbar";

interface AlertLog {
  id: number;
  room_id: number;
  sensor_id: number;
  temperature_value: number;
  alert_type: string;
  triggered_at: string;
  resolved_at?: string;
  status: string;
}

type FilterPeriod = '24h' | '7d' | '30d' | 'custom';

export default function StoreroomDetails() {
  const router = useRouter();
  const { user } = useAuth();
  const { storeroomId, storeroomName } = useLocalSearchParams<{
    storeroomId: string;
    storeroomName: string;
  }>();
  
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('24h');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (!storeroomId || !user) return;
    fetchAlertsHistory();
  }, [storeroomId, user]);

  useEffect(() => {
    filterAlertsByPeriod();
  }, [alerts, selectedPeriod, customStartDate, customEndDate]);

  const fetchAlertsHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://tempalert.onensensy.com/api/alert-logs?options[room_id]=${storeroomId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${user.token || ''}`,
        },
      });
      const data = await response.json();
      const alertsData = data.data || [];
      
      // Sort by triggered_at (most recent first)
      const sortedAlerts = alertsData.sort((a: AlertLog, b: AlertLog) => 
        new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
      );
      
      setAlerts(sortedAlerts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts history:', error);
      setLoading(false);
    }
  };

  const filterAlertsByPeriod = () => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const filtered = alerts.filter(alert => {
            const alertDate = new Date(alert.triggered_at);
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999); // Include the entire end date
            return alertDate >= start && alertDate <= end;
          });
          setFilteredAlerts(filtered);
          return;
        } else {
          setFilteredAlerts(alerts);
          return;
        }
      default:
        setFilteredAlerts(alerts);
        return;
    }

    const filtered = alerts.filter(alert => {
      const alertDate = new Date(alert.triggered_at);
      return alertDate >= startDate;
    });
    
    setFilteredAlerts(filtered);
  };

  const getAlertMessage = (alert: AlertLog) => {
    const temperature = alert.temperature_value;
    const roomName = storeroomName || `Room ${alert.room_id}`;
    
    if (alert.alert_type === 'low' || temperature <= 15) {
      return `Temperature too low (${temperature}°C)! Risk of freezing—check cooling system.`;
    } else if (alert.alert_type === 'high' || temperature >= 25) {
      if (temperature <= 30) {
        return `Temperature warming up (${temperature}°C)—monitor to prevent spoilage.`;
      } else if (temperature <= 40) {
        return `Temperature too hot (${temperature}°C)! Risk of spoilage—take action now.`;
      } else {
        return `Critical heat (${temperature}°C)! Immediate intervention required.`;
      }
    }
    return `Temperature alert (${temperature}°C)`;
  };

  const getAlertSeverity = (alert: AlertLog) => {
    const temperature = alert.temperature_value;
    
    if (alert.alert_type === 'low' || temperature <= 15) {
      return {
        icon: "snow-outline" as const,
        color: "#3b82f6",
        bgColor: "#dbeafe",
        label: "Too Cold",
      };
    } else if (alert.alert_type === 'high' || temperature >= 25) {
      if (temperature <= 30) {
        return {
          icon: "alert-circle-outline" as const,
          color: "#f59e0b",
          bgColor: "#fef3c7",
          label: "Warning",
        };
      } else if (temperature <= 40) {
        return {
          icon: "flame-outline" as const,
          color: "#f97316",
          bgColor: "#ffedd5",
          label: "Too Hot",
        };
      } else {
        return {
          icon: "warning-outline" as const,
          color: "#ef4444",
          bgColor: "#fee2e2",
          label: "Critical",
        };
      }
    }
    return {
      icon: "information-circle-outline" as const,
      color: "#6b7280",
      bgColor: "#f3f4f6",
      label: "Info",
    };
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

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '24h': return 'Past 24 Hours';
      case '7d': return 'Past 7 Days';
      case '30d': return 'Past 30 Days';
      case 'custom': return 'Custom Range';
      default: return 'All Time';
    }
  };

  const applyCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      setSelectedPeriod('custom');
      setShowCustomDateModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title} numberOfLines={1}>
              {storeroomName || "Storeroom Details"}
            </Text>
            <Text style={styles.subtitle}>Alert History</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchAlertsHistory}
          >
            <Ionicons name="refresh" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Filter Controls */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Time Period:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            <TouchableOpacity
              style={[styles.filterButton, selectedPeriod === '24h' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('24h')}
            >
              <Text style={[styles.filterButtonText, selectedPeriod === '24h' && styles.filterButtonTextActive]}>
                24 Hours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedPeriod === '7d' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('7d')}
            >
              <Text style={[styles.filterButtonText, selectedPeriod === '7d' && styles.filterButtonTextActive]}>
                7 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedPeriod === '30d' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('30d')}
            >
              <Text style={[styles.filterButtonText, selectedPeriod === '30d' && styles.filterButtonTextActive]}>
                30 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedPeriod === 'custom' && styles.filterButtonActive]}
              onPress={() => setShowCustomDateModal(true)}
            >
              <Text style={[styles.filterButtonText, selectedPeriod === 'custom' && styles.filterButtonTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Results Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'} found for {getPeriodLabel().toLowerCase()}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0891b2" />
            <Text style={styles.loadingText}>Loading alert history...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => {
                const severity = getAlertSeverity(alert);
                
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
                      <Text style={styles.alertMessage}>{getAlertMessage(alert)}</Text>
                      <View style={styles.alertFooter}>
                        <Text style={styles.alertDate}>{formatDate(alert.triggered_at)}</Text>
                        <Text style={styles.alertStatus}>
                          Status: {alert.status || 'Active'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Alerts Found</Text>
                <Text style={styles.emptyText}>
                  No alerts were recorded for {storeroomName || 'this storeroom'} during the selected time period.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Custom Date Range Modal */}
        <Modal
          visible={showCustomDateModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCustomDateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Custom Date Range</Text>
              
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Start Date:</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  value={customStartDate}
                  onChangeText={setCustomStartDate}
                />
              </View>
              
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>End Date:</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowCustomDateModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonApply]}
                  onPress={applyCustomDateRange}
                >
                  <Text style={styles.modalButtonTextApply}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Navbar
          onRefresh={fetchAlertsHistory}
          onNavigateProfile={() => router.push("/screens/profile")}
          onNavigateHome={() => router.replace("/screens/dashboard")}
          onNavigateAlerts={() => router.replace("/screens/alerts")}
          alerts={[]}
          activeTab="alerts"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 12,
  },
  filterScrollView: {
    flexDirection: "row",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#0891b2",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  summaryContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  summaryText: {
    fontSize: 14,
    color: "#64748b",
    fontStyle: "italic",
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
    flexGrow: 1,
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
    marginBottom: 8,
  },
  alertSeverity: {
    fontSize: 14,
    fontWeight: "600",
  },
  alertTime: {
    fontSize: 12,
    color: "#64748b",
  },
  alertMessage: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertDate: {
    fontSize: 12,
    color: "#64748b",
  },
  alertStatus: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
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
    color: "#64748b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 20,
    textAlign: "center",
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  modalButtonCancel: {
    backgroundColor: "#f1f5f9",
  },
  modalButtonApply: {
    backgroundColor: "#0891b2",
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
    textAlign: "center",
  },
  modalButtonTextApply: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ffffff",
    textAlign: "center",
  },
});

