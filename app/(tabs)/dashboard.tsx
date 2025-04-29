import React, { useEffect, useState } from "react";
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
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { getFirestore } from "@/src/lib/firebase";

const database = getFirestore();
import { collection, onSnapshot } from "firebase/firestore";

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

    const unsubscribeStorerooms = onSnapshot(
      collection(database, "storerooms"),
      (snapshot) => {
        const rooms = snapshot.docs.map((doc) => doc.data() as Storeroom);
        setStorerooms(rooms);
      }
    );

    const unsubscribeAlerts = onSnapshot(
      collection(database, "alerts"),
      (snapshot) => {
        const alertList = snapshot.docs.map((doc) => doc.data() as Alert);
        setAlerts(alertList);
      }
    );

    const unsubscribeTemp = onSnapshot(
      collection(database, "temperatureHistory/storeroom1/points"),
      (snapshot) => {
        const temps = snapshot.docs.map(
          (doc) => doc.data() as TemperatureDataPoint
        );
        setChartData(temps.map((point) => point.value));
      }
    );

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
    const diff = Math.floor((now.getTime() - alertTime.getTime()) / 60000);
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
        <View className="mb-6 flex-row justify-between items-center">
          <Text className="text-3xl font-bold text-black">
            Hello, {lastName || user.displayName || "User"} 👋
          </Text>
          <TouchableOpacity onPress={logout}>
            <MaterialIcons name="logout" size={24} color="#000" />
          </TouchableOpacity>
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
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
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
