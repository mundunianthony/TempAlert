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
import Navbar from "../../../src/components/Navbar";
import AsyncStorage from '@react-native-async-storage/async-storage';

// const database = getFirestore();

interface Storeroom {
  id: string;
  name: string;
  temperature: number;
  status: "Normal" | "Warning" | "Critical";
  lastUpdated: Timestamp;
}

interface TemperatureThresholds {
  tooCold: number;
  warmingUp: number;
  tooHot: number;
  critical: number;
}

export default function AdminDashboard() {
  const { user, lastName, logout, isAdmin, token } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [thresholds, setThresholds] = useState<TemperatureThresholds>({
    tooCold: 15,
    warmingUp: 25,
    tooHot: 31,
    critical: 40,
  });
  const [isEditingThresholds, setIsEditingThresholds] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'user',
  });
  const [userCreateLoading, setUserCreateLoading] = useState(false);
  const [userCreateError, setUserCreateError] = useState('');
  const [userCreateSuccess, setUserCreateSuccess] = useState('');

  const alerts = useMemo(() => {
    return storerooms
      .filter((room) => room.temperature <= thresholds.tooCold || room.temperature >= thresholds.warmingUp)
      .map((room) => ({
        message: getAlertMessage(room.temperature, room.name),
        timestamp: room.lastUpdated
          ? room.lastUpdated.toDate().toISOString()
          : "",
        temperature: room.temperature,
        storeroomName: room.name,
      }));
  }, [storerooms, thresholds]);

  function getAlertMessage(temperature: number, storeroomName: string) {
    if (temperature <= thresholds.tooCold) {
      return `Temperature too low in ${storeroomName} (${temperature}°C)! Risk of freezing—check cooling system.`;
    } else if (temperature >= thresholds.warmingUp && temperature < thresholds.tooHot) {
      return `Temperature warming up in ${storeroomName} (${temperature}°C)—monitor to prevent spoilage.`;
    } else if (temperature >= thresholds.tooHot && temperature < thresholds.critical) {
      return `Temperature too hot in ${storeroomName} (${temperature}°C)! Risk of spoilage—take action now.`;
    } else if (temperature >= thresholds.critical) {
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

    // Fetch storerooms from API
    fetch('https://tempalert.onensensy.com/api/rooms', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setStorerooms(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        // Optionally handle error
      });
  }, [user, router, refreshKey, isAdmin]);

  const handleSaveThresholds = async () => {
    try {
      // await setDoc(doc(database, "settings", "temperatureThresholds"), thresholds);
      setIsEditingThresholds(false);
      Alert.alert("Success", "Temperature thresholds updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update temperature thresholds");
    }
  };

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

  const handleCreateUser = async () => {
    setUserCreateError('');
    setUserCreateSuccess('');
    // Structured validation
    if (!newUser.name.trim()) {
      setUserCreateError('Full Name is required.');
      return;
    }
    if (!newUser.email.trim()) {
      setUserCreateError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email.trim())) {
      setUserCreateError('Please enter a valid email address.');
      return;
    }
    if (!newUser.password) {
      setUserCreateError('Password is required.');
      return;
    }
    if (newUser.password.length < 6) {
      setUserCreateError('Password must be at least 6 characters.');
      return;
    }
    if (newUser.password !== newUser.password_confirmation) {
      setUserCreateError('Passwords do not match.');
      return;
    }
    if (!newUser.role.trim()) {
      setUserCreateError('Role is required.');
      return;
    }
    setUserCreateLoading(true);
    try {
      const res = await fetch('https://tempalert.onensensy.com/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });
      const contentType = res.headers.get('content-type');
      let data = null;
      if (contentType && contentType.indexOf('application/json') !== -1) {
        data = await res.json();
      } else {
        throw new Error('Server returned an unexpected response.');
      }
      if (!res.ok || !data.data) {
        // Show all validation errors from API
        if (data.errors) {
          const errorMessages = Object.entries(data.errors)
            .map(([field, messages]) => `${field}: ${(Array.isArray(messages) ? messages.join(', ') : messages)}`)
            .join('\n');
          setUserCreateError(errorMessages);
        } else {
          setUserCreateError(data.message || 'User creation failed');
        }
        return;
      }
      setUserCreateSuccess('User created successfully!');
      setNewUser({ name: '', email: '', password: '', password_confirmation: '', role: 'user' });
    } catch (err: any) {
      setUserCreateError(err.message || 'User creation failed');
    } finally {
      setUserCreateLoading(false);
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

      {/* User Creation Form */}
      <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12, margin: 16, elevation: 2 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Create New User</Text>
        {userCreateError ? <Text style={{ color: '#ef4444', marginBottom: 8 }}>{userCreateError}</Text> : null}
        {userCreateSuccess ? <Text style={{ color: '#10b981', marginBottom: 8 }}>{userCreateSuccess}</Text> : null}
        <TextInput
          placeholder="Full Name"
          value={newUser.name}
          onChangeText={text => setNewUser(u => ({ ...u, name: text }))}
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 }}
        />
        <TextInput
          placeholder="Email"
          value={newUser.email}
          onChangeText={text => setNewUser(u => ({ ...u, email: text }))}
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          value={newUser.password}
          onChangeText={text => setNewUser(u => ({ ...u, password: text }))}
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 }}
          secureTextEntry
        />
        <TextInput
          placeholder="Confirm Password"
          value={newUser.password_confirmation}
          onChangeText={text => setNewUser(u => ({ ...u, password_confirmation: text }))}
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 }}
          secureTextEntry
        />
        <TextInput
          placeholder="Role (user, manager, etc.)"
          value={newUser.role}
          onChangeText={text => setNewUser(u => ({ ...u, role: text }))}
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 }}
        />
        <TouchableOpacity
          onPress={handleCreateUser}
          style={{ backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' }}
          disabled={userCreateLoading}
        >
          {userCreateLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Create User</Text>}
        </TouchableOpacity>
      </View>

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

            {/* Admin Controls */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Admin Controls</Text>
            </View>
            <View style={styles.adminControls}>
              <TouchableOpacity style={styles.adminButton}>
                <Ionicons name="people-outline" size={24} color="#0891b2" />
                <Text style={styles.adminButtonText}>Manage Users</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adminButton}
                onPress={() => router.push("/screens/profile")}
              >
                <Ionicons name="settings-outline" size={24} color="#0891b2" />
                <Text style={styles.adminButtonText}>System Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminButton}>
                <Ionicons name="analytics-outline" size={24} color="#0891b2" />
                <Text style={styles.adminButtonText}>Analytics</Text>
              </TouchableOpacity>
            </View>

            {/* Temperature Thresholds Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Temperature Thresholds</Text>
                {!isEditingThresholds ? (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditingThresholds(true)}
                  >
                    <Ionicons name="pencil" size={20} color="#0891b2" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveThresholds}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.thresholdsContainer}>
                <View style={styles.thresholdItem}>
                  <Text style={styles.thresholdLabel}>Too Cold</Text>
                  {isEditingThresholds ? (
                    <TextInput
                      style={styles.thresholdInput}
                      value={thresholds.tooCold.toString()}
                      onChangeText={(text) =>
                        setThresholds({ ...thresholds, tooCold: Number(text) })
                      }
                      keyboardType="numeric"
                      placeholder="°C"
                    />
                  ) : (
                    <Text style={styles.thresholdValue}>{thresholds.tooCold}°C</Text>
                  )}
                </View>
                <View style={styles.thresholdItem}>
                  <Text style={styles.thresholdLabel}>Warming Up</Text>
                  {isEditingThresholds ? (
                    <TextInput
                      style={styles.thresholdInput}
                      value={thresholds.warmingUp.toString()}
                      onChangeText={(text) =>
                        setThresholds({ ...thresholds, warmingUp: Number(text) })
                      }
                      keyboardType="numeric"
                      placeholder="°C"
                    />
                  ) : (
                    <Text style={styles.thresholdValue}>{thresholds.warmingUp}°C</Text>
                  )}
                </View>
                <View style={styles.thresholdItem}>
                  <Text style={styles.thresholdLabel}>Too Hot</Text>
                  {isEditingThresholds ? (
                    <TextInput
                      style={styles.thresholdInput}
                      value={thresholds.tooHot.toString()}
                      onChangeText={(text) =>
                        setThresholds({ ...thresholds, tooHot: Number(text) })
                      }
                      keyboardType="numeric"
                      placeholder="°C"
                    />
                  ) : (
                    <Text style={styles.thresholdValue}>{thresholds.tooHot}°C</Text>
                  )}
                </View>
                <View style={styles.thresholdItem}>
                  <Text style={styles.thresholdLabel}>Critical</Text>
                  {isEditingThresholds ? (
                    <TextInput
                      style={styles.thresholdInput}
                      value={thresholds.critical.toString()}
                      onChangeText={(text) =>
                        setThresholds({ ...thresholds, critical: Number(text) })
                      }
                      keyboardType="numeric"
                      placeholder="°C"
                    />
                  ) : (
                    <Text style={styles.thresholdValue}>{thresholds.critical}°C</Text>
                  )}
                </View>
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
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Fixed Bottom Navbar */}
          <View style={styles.navbarContainer}>
            <Navbar
              onRefresh={handleRefresh}
              onNavigateProfile={() => router.push("/screens/profile")}
              onNavigateHome={() => router.replace("/screens/admin/dashboard")}
              onNavigateAlerts={() => router.push("/screens/alerts")}
              alerts={alerts}
              activeTab="home"
            />
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
  statusWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    color: "#f59e0b",
  },
  statusCritical: {
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
