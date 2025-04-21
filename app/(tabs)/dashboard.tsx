import React, { useEffect, useState } from "react";

// Define the User type
interface User {
  id: string;
  email: string;
  displayName?: string;
}
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { database } from "@/src/lib/firebase";
import { ref, onValue } from "firebase/database";

export interface AuthContextProps {
  user: User | null;
  lastName?: string; // Add lastName as an optional property
  logout: () => void;
}

interface Storeroom {
  name: string;
  temperature: number;
  status: "Normal" | "Warning" | "Critical";
}

interface Alert {
  message: string;
  timestamp: string;
}

interface TemperatureDataPoint {
  value: number;
  timestamp: string;
}

export default function Dashboard() {
  const { user, lastName, logout } = useAuth();
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);

  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    // Fetch storerooms
    const storeroomsRef = ref(database, "storerooms");
    const unsubscribeStorerooms = onValue(storeroomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storeroomsArray = Object.values(data) as Storeroom[];
        setStorerooms(storeroomsArray);
      }
    });

    // Fetch alerts
    const alertsRef = ref(database, "alerts");
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const alertsArray = Object.values(data) as Alert[];
        setAlerts(alertsArray);
      }
    });

    // Fetch temperature history for graph (using Storeroom 1 as example)
    const tempRef = ref(database, "temperatureHistory/storeroom1");
    const unsubscribeTemp = onValue(tempRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tempArray = (data as TemperatureDataPoint[]).map(
          (point) => point.value
        );
        setChartData(tempArray);
      }
    });

    return () => {
      unsubscribeStorerooms();
      unsubscribeAlerts();
      unsubscribeTemp();
    };
  }, [user, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal":
        return "text-green-600";
      case "Warning":
        return "text-yellow-600";
      case "Critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diff = Math.floor((now.getTime() - alertTime.getTime()) / 1000 / 60);
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-5 pt-10">
        {/* Welcome */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-black">
            Hello, {lastName || "User"}...
          </Text>
        </View>

        {/* Storeroom Overview */}
        <View className="bg-white rounded-xl p-4 mb-6 border border-gray-300">
          <Text className="text-lg font-semibold mb-3 text-black">
            Storeroom Overview
          </Text>
          {storerooms.map((room, index) => (
            <View
              key={index}
              className="flex-row justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
            >
              <Text className="text-base font-medium text-black">
                {room.name}
              </Text>
              <Text
                className={`text-base font-semibold ${getStatusColor(
                  room.status
                )}`}
              >
                {room.status} {room.temperature}°
              </Text>
            </View>
          ))}
        </View>

        {/* Graph Widget */}
        <View className="bg-white rounded-xl p-4 mb-6 border border-gray-300">
          <Text className="text-lg font-semibold mb-3 text-black">
            Graph Widget
          </Text>
          {chartData.length > 0 ? (
            <LineChart
              data={{
                labels: chartData.map((_, index) => `${index * 5}m`),
                datasets: [{ data: chartData }],
              }}
              width={screenWidth - 40}
              height={150}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "6", strokeWidth: "2", stroke: "#000" },
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
              withInnerLines={true}
              withOuterLines={false}
              withHorizontalLabels={false}
              withVerticalLabels={false}
            />
          ) : (
            <Text className="text-gray-500">Loading graph...</Text>
          )}
        </View>

        {/* Alerts Section */}
        <View className="bg-white rounded-xl p-4 mb-20 border border-gray-300">
          <Text className="text-lg font-semibold mb-3 text-black">Alerts</Text>
          {alerts.map((alert, index) => (
            <View
              key={index}
              className="flex-row justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
            >
              <Text className="text-base text-black">{alert.message}</Text>
              <Text className="text-sm text-gray-500">
                {timeAgo(alert.timestamp)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex-row justify-around items-center">
        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <FontAwesome name="home" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Feather name="clock" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Feather name="bell" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Feather name="settings" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
