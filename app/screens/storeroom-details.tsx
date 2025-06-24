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
import { isDummyRoom, getDummyRoomData } from "../../src/utils/dummyDataGenerator";
import { getDemoRoomThreshold } from "../../src/utils/localThresholds";
import { fetchAllAlertsWithDummyPersistent, AlertLog as GlobalAlertLog } from '../../src/utils/alertsFetcher';

interface AlertLog {
  id: number | string;
  room_id: number;
  sensor_id: number | null;
  temperature_value: number;
  alert_type: string;
  triggered_at: string;
  resolved_at?: string;
  status: string;
  room?: {
    id: number;
    name: string;
    description?: string;
  };
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
      // Use persistent alerts (all alerts, including previous days)
      const allAlerts: AlertLog[] = await fetchAllAlertsWithDummyPersistent(user.token || '');
      // Filter for this storeroom
      const roomAlerts = allAlerts.filter(alert => String(alert.room_id) === String(storeroomId));
      // Sort by triggered_at (most recent first)
      const sortedAlerts = roomAlerts.sort((a: AlertLog, b: AlertLog) => 
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
        icon: "snow" as const,
        color: "#3b82f6",
        bgColor: "#dbeafe",
        label: "Too Cold",
      };
    } else if (alert.alert_type === 'high' || temperature >= 25) {
      if (temperature <= 30) {
        return {
          icon: "alert-circle" as const,
          color: "#f59e0b",
          bgColor: "#fef3c7",
          label: "Warning",
        };
      } else if (temperature <= 40) {
        return {
          icon: "flame" as const,
          color: "#f97316",
          bgColor: "#ffedd5",
          label: "Too Hot",
        };
      } else {
        return {
          icon: "warning" as const,
          color: "#ef4444",
          bgColor: "#fee2e2",
          label: "Critical",
        };
      }
    }
    return {
      icon: "information-circle" as const,
      color: "#94a3b8",
      bgColor: "#f1f5f9",
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
            <Text style={styles.subtitle}>Alert History & Analytics</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchAlertsHistory}
          >
            <Ionicons name="refresh" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Filter Controls */}
        <View style={styles.filterContainer}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterLabel}>Time Period</Text>
            <View style={styles.filterBadge}>
              <Ionicons name="funnel" size={12} color="#64748b" />
              <Text style={styles.filterBadgeText}>Filter</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            <TouchableOpacity
              style={[styles.filterButton, selectedPeriod === '24h' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('24h')}
            >
              <Ionicons 
                name="time" 
                size={16} 
                color={selectedPeriod === '24h' ? "#ffffff" : "#64748b"} 
              />
              <Text style={[styles.filterButtonText, selectedPeriod === '24h' && styles.filterButtonTextActive]}>
                24 Hours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedPeriod === '7d' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('7d')}
            >
              <Ionicons 
                name="calendar" 
                size={16} 
                color={selectedPeriod === '7d' ? "#ffffff" : "#64748b"} 
              />
              <Text style={[styles.filterButtonText, selectedPeriod === '7d' && styles.filterButtonTextActive]}>
                7 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedPeriod === '30d' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('30d')}
            >
              <Ionicons 
                name="calendar-outline" 
                size={16} 
                color={selectedPeriod === '30d' ? "#ffffff" : "#64748b"} 
              />
              <Text style={[styles.filterButtonText, selectedPeriod === '30d' && styles.filterButtonTextActive]}>
                30 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedPeriod === 'custom' && styles.filterButtonActive]}
              onPress={() => setShowCustomDateModal(true)}
            >
              <Ionicons 
                name="options" 
                size={16} 
                color={selectedPeriod === 'custom' ? "#ffffff" : "#64748b"} 
              />
              <Text style={[styles.filterButtonText, selectedPeriod === 'custom' && styles.filterButtonTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Results Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryContent}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="analytics" size={20} color="#0891b2" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryText}>
                {filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'} found
              </Text>
              <Text style={styles.summarySubtext}>
                for {getPeriodLabel().toLowerCase()}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#0891b2" />
              <Text style={styles.loadingText}>Loading alert history...</Text>
              <Text style={styles.loadingSubtext}>Analyzing temperature data</Text>
            </View>
          </View>
        ) : (
        <ScrollView
            contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert, index) => {
                const severity = getAlertSeverity(alert);
                
                return (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertCard,
                      { 
                        borderLeftColor: severity.color, 
                        borderLeftWidth: 5,
                        marginBottom: index === filteredAlerts.length - 1 ? 20 : 16
                      }
                    ]}
                  >
                    <View style={styles.alertCardContent}>
                      <View style={styles.alertIconWrapper}>
                        <View style={[styles.alertIconContainer, { backgroundColor: severity.bgColor }]}>
                          <Ionicons name={severity.icon} size={28} color={severity.color} />
                        </View>
                      </View>
                      
                      <View style={styles.alertContent}>
                        <View style={styles.alertHeader}>
                          <View style={styles.alertHeaderLeft}>
                            <Text style={[styles.alertSeverity, { color: severity.color }]}>
                              {severity.label}
                            </Text>
                            <View style={styles.alertTimeBadge}>
                              <Ionicons name="time" size={12} color="#94a3b8" />
                              <Text style={styles.alertTime}>{timeAgo(alert.triggered_at)}</Text>
                            </View>
                          </View>
                        </View>
                        
                        <Text style={styles.alertMessage}>{getAlertMessage(alert)}</Text>
                        
                        <View style={styles.alertFooter}>
                          <View style={styles.alertDateContainer}>
                            <Ionicons name="calendar" size={14} color="#94a3b8" />
                            <Text style={styles.alertDate}>{formatDate(alert.triggered_at)}</Text>
                          </View>
                          <View style={styles.alertStatusContainer}>
                            <View style={[styles.statusDot, { backgroundColor: severity.color }]} />
                            <Text style={styles.alertStatus}>
                              {alert.status || 'Active'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="document-text-outline" size={80} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No Alerts Found</Text>
                <Text style={styles.emptyText}>
                  No alerts were recorded for {storeroomName || 'this storeroom'} during the selected time period.
                </Text>
                <View style={styles.emptyBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.emptyBadgeText}>System Normal</Text>
                </View>
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Custom Date Range</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowCustomDateModal(false)}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <View style={styles.dateInputWrapper}>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={customStartDate}
                    onChangeText={setCustomStartDate}
                  />
                </View>
              </View>
              
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>End Date</Text>
                <View style={styles.dateInputWrapper}>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={customEndDate}
                    onChangeText={setCustomEndDate}
                  />
                </View>
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
                  <Text style={styles.modalButtonTextApply}>Apply Filter</Text>
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
    paddingVertical: 20,
    backgroundColor: "#f8fafc",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "400",
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterBadgeText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 4,
    fontWeight: "500",
  },
  filterScrollView: {
    flexDirection: "row",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterButtonActive: {
    backgroundColor: "#0891b2",
    borderColor: "#0891b2",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  summaryContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  summarySubtext: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 24,
  },
  loadingCard: {
    backgroundColor: "#ffffff",
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#0f172a",
    textAlign: "center",
    fontWeight: "600",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 100,
    flexGrow: 1,
  },
  alertCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  alertCardContent: {
    flexDirection: "row",
    padding: 20,
  },
  alertIconWrapper: {
    marginRight: 16,
  },
  alertIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  alertHeaderLeft: {
    flex: 1,
  },
  alertSeverity: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  alertTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  alertTime: {
    fontSize: 12,
    color: "#94a3b8",
    marginLeft: 4,
    fontWeight: "500",
  },
  alertMessage: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 16,
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertDate: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 6,
    fontWeight: "500",
  },
  alertStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  alertStatus: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    backgroundColor: "#f1f5f9",
    padding: 24,
    borderRadius: 40,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyBadgeText: {
    fontSize: 14,
    color: "#10b981",
    marginLeft: 6,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  dateInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
    marginLeft: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalButtonApply: {
    backgroundColor: "#0891b2",
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  modalButtonTextApply: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});

