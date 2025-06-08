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
} from "react-native";
import { useAuth } from "../../../src/context/AuthContext";
import { useRouter } from "expo-router";
import {
  Feather,
  FontAwesome,
  MaterialIcons,
  Ionicons,
} from "@expo/vector-icons";
import { getFirestore } from "../../../src/lib/firebase";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import Navbar from "../../../src/components/Navbar";

const database = getFirestore();

interface Storeroom {
  id: string;
  name: string;
  temperature: number;
  status: "Normal" | "Warning" | "Critical";
  lastUpdated: Timestamp;
}

export default function AdminDashboard() {
  const { user, lastName, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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

    return () => unsubscribeStorerooms();
  }, [user, router, refreshKey, isAdmin]);

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

      {/* Admin Controls */}
      <View style={styles.adminControls}>
        <TouchableOpacity style={styles.adminButton}>
          <Ionicons name="people-outline" size={24} color="#0891b2" />
          <Text style={styles.adminButtonText}>Manage Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminButton}>
          <Ionicons name="settings-outline" size={24} color="#0891b2" />
          <Text style={styles.adminButtonText}>System Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminButton}>
          <Ionicons name="analytics-outline" size={24} color="#0891b2" />
          <Text style={styles.adminButtonText}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Storeroom Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storeroom Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {storerooms.map((room) => (
            <View key={room.id} style={styles.storeroomCard}>
              <Text style={styles.storeroomName}>{room.name}</Text>
              <Text style={styles.temperature}>{room.temperature}°C</Text>
              <View style={[styles.statusBadge, getStatusColor(room.status)]}>
                <Text style={styles.statusText}>{room.status}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Updated Navbar usage */}
      <Navbar
        onRefresh={handleRefresh}
        onNavigateProfile={() => router.push("/screens/profile")}
        onNavigateHome={() => router.replace("/screens/admin/dashboard")}
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
    backgroundColor: "#f8fafc",
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
  adminControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 24,
    backgroundColor: "#ffffff",
    marginTop: 16,
    borderRadius: 12,
    marginHorizontal: 16,
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
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 16,
  },
  storeroomCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeroomName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  temperature: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0891b2",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ffffff",
  },
  statusNormal: {
    backgroundColor: "#10b981",
  },
  statusWarning: {
    backgroundColor: "#f59e0b",
  },
  statusCritical: {
    backgroundColor: "#ef4444",
  },
  statusUnknown: {
    backgroundColor: "#64748b",
  },
});
