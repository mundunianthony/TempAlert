import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { firestoreInstance } from '@/src/lib/firebase';

interface Storeroom {
  id: string;
  name: string;
  temperature: number;
  status: 'Normal' | 'Warning' | 'Critical';
  lastUpdated: Timestamp;
}

export default function Dashboard() {
  const router = useRouter();
  const [storerooms, setStorerooms] = useState<Storeroom[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [alerts, setAlerts] = useState<{ message: string; timestamp: string }[]>([]);

  useEffect(() => {
    const unsubscribeStorerooms = onSnapshot(
      collection(firestoreInstance, 'storerooms'),
      (snapshot) => {
        const rooms = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Storeroom[];
        setStorerooms(rooms);
        
        if (rooms.length > 0) {
          const latest = rooms.reduce((latest, room) => 
            room.lastUpdated > latest.lastUpdated ? room : latest
          );
          setLastUpdate(latest.lastUpdated.toDate().toLocaleString());
        }
      }
    );

    const unsubscribeAlerts = onSnapshot(
      collection(firestoreInstance, 'alerts'),
      (snapshot) => {
        const alertList = snapshot.docs
          .map(doc => doc.data() as { message: string; timestamp: string })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);
        setAlerts(alertList);
      }
    );

    return () => {
      unsubscribeStorerooms();
      unsubscribeAlerts();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal':
        return styles.statusNormal;
      case 'Warning':
        return styles.statusWarning;
      case 'Critical':
        return styles.statusCritical;
      default:
        return {};
    }
  };

  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.appTitle}>TempAlert</Text>
      
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.lastUpdate}>Last updated: {lastUpdate}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storeroom Overview</Text>
        {storerooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={styles.storeroomCard}
            onPress={() => router.push(`/storeroom/${room.id}`)}
          >
            <Text style={styles.storeroomName}>{room.name}</Text>
            <View style={styles.storeroomInfo}>
              <Text style={styles.temperature}>{room.temperature}°C</Text>
              <Text style={[styles.status, getStatusColor(room.status)]}>
                {room.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Temperature Trends</Text>
        <LineChart
          data={{
            labels: storerooms.map(room => room.name),
            datasets: [{
              data: storerooms.map(room => room.temperature)
            }]
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          style={styles.chart}
        />
      </View>

      <View style={[styles.section, styles.lastSection]}>
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        {alerts.map((alert, index) => (
          <View key={index} style={styles.alertItem}>
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
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
    color: '#1a1a1a',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  lastUpdate: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lastSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  storeroomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  storeroomName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  storeroomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  temperature: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  statusNormal: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  statusWarning: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  statusCritical: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alertMessage: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    marginRight: 12,
  },
  alertTime: {
    fontSize: 12,
    color: '#666666',
  },
});