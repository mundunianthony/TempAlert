import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { db } from '../src/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const screenWidth = Dimensions.get('window').width;

interface Storeroom {
  id: string;
  name: string;
  temperature: number;
  status: 'Normal' | 'Warning' | 'Critical';
  lastUpdated: Date;
}

export default function Dashboard() {
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<{ message: string; timestamp: Date }[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Subscribe to storerooms updates
    const storeroomsUnsubscribe = onSnapshot(
      collection(db, 'storerooms'),
      (snapshot) => {
        const rooms = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastUpdated: doc.data().lastUpdated.toDate(),
        })) as Storeroom[];
        setStorerooms(rooms);
        
        if (rooms.length > 0) {
          setLastUpdate(new Date(Math.max(...rooms.map(r => r.lastUpdated.getTime()))));
        }
      }
    );

    // Subscribe to alerts
    const alertsUnsubscribe = onSnapshot(
      query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(5)),
      (snapshot) => {
        const alertsList = snapshot.docs.map(doc => ({
          message: doc.data().message,
          timestamp: doc.data().timestamp.toDate(),
        }));
        setAlerts(alertsList);
      }
    );

    return () => {
      storeroomsUnsubscribe();
      alertsUnsubscribe();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal':
        return '#22c55e';
      case 'Warning':
        return '#eab308';
      case 'Critical':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>TempAlert</Text>
      <Text style={styles.welcome}>Welcome, User</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Storeroom Overview</Text>
        {storerooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={styles.storeroom}
            onPress={() => router.push(`/storeroom/${room.id}`)}
          >
            <Text style={styles.storeroomName}>{room.name}</Text>
            <View style={styles.storeroomInfo}>
              <Text style={[styles.storeroomTemp, { color: getStatusColor(room.status) }]}>
                {room.temperature}°C
              </Text>
              <Text style={[styles.storeroomStatus, { color: getStatusColor(room.status) }]}>
                {room.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Temperature Trends</Text>
        <LineChart
          data={{
            labels: ['12am', '6am', '12pm', '6pm', '12am'],
            datasets: [{
              data: [20, 22, 25, 23, 21]
            }]
          }}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {lastUpdate && (
        <Text style={styles.lastUpdate}>
          Last updated: {lastUpdate.toLocaleString()}
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Alerts</Text>
        {alerts.map((alert, index) => (
          <View key={index} style={styles.alert}>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.alertTime}>{timeAgo(alert.timestamp)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 10,
    color: '#1f2937',
  },
  welcome: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4b5563',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  storeroom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  storeroomName: {
    fontSize: 16,
    color: '#1f2937',
  },
  storeroomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeroomTemp: {
    fontSize: 16,
    fontWeight: '500',
  },
  storeroomStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  lastUpdate: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 20,
  },
  alert: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  alertMessage: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#6b7280',
  },
});