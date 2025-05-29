import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { db } from '../../src/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';

const screenWidth = Dimensions.get('window').width;

export default function StoreroomDetails() {
  const { id } = useLocalSearchParams();
  const [storeroom, setStoreroom] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [limitCount, setLimitCount] = useState(10);
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C');
  const [temperatureData, setTemperatureData] = useState<number[]>([]);

  useEffect(() => {
    // Fetch storeroom details
    const storeroomRef = doc(db, 'storerooms', id as string);
    const unsubscribeStoreroom = onSnapshot(storeroomRef, (doc) => {
      if (doc.exists()) {
        setStoreroom({ id: doc.id, ...doc.data() });
      }
    });

    // Fetch alerts for this storeroom
    const alertsQuery = query(
      collection(db, 'alerts'),
      where('storeroomId', '==', id),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const alertsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }));
      setAlerts(alertsList);
    });

    // Fetch temperature history
    const tempHistoryQuery = query(
      collection(db, `storerooms/${id}/temperature_history`),
      orderBy('timestamp', 'desc'),
      limit(24)
    );

    const unsubscribeTemp = onSnapshot(tempHistoryQuery, (snapshot) => {
      const temps = snapshot.docs.map(doc => doc.data().temperature);
      setTemperatureData(temps.reverse());
    });

    return () => {
      unsubscribeStoreroom();
      unsubscribeAlerts();
      unsubscribeTemp();
    };
  }, [id, limitCount]);

  const convertTemperature = (celsius: number): number => {
    return temperatureUnit === 'C' ? celsius : (celsius * 9/5) + 32;
  };

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (!storeroom) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{storeroom.name} History</Text>

      <View style={styles.temperatureCard}>
        <View style={styles.temperatureCircle}>
          <Text style={styles.temperature}>
            {convertTemperature(storeroom.temperature).toFixed(1)}°{temperatureUnit}
          </Text>
          <TouchableOpacity
            onPress={() => setTemperatureUnit(prev => prev === 'C' ? 'F' : 'C')}
            style={styles.unitToggle}
          >
            <Text style={styles.unitToggleText}>Switch to °{temperatureUnit === 'C' ? 'F' : 'C'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Temperature History</Text>
        <LineChart
          data={{
            labels: Array(temperatureData.length).fill(''),
            datasets: [{
              data: temperatureData.map(t => convertTemperature(t))
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

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, limitCount === 10 && styles.filterButtonActive]}
          onPress={() => setLimitCount(10)}
        >
          <Text style={[styles.filterText, limitCount === 10 && styles.filterTextActive]}>
            Last 10
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, limitCount === 50 && styles.filterButtonActive]}
          onPress={() => setLimitCount(50)}
        >
          <Text style={[styles.filterText, limitCount === 50 && styles.filterTextActive]}>
            Last 50
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, limitCount === 100 && styles.filterButtonActive]}
          onPress={() => setLimitCount(100)}
        >
          <Text style={[styles.filterText, limitCount === 100 && styles.filterTextActive]}>
            Last 100
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.alertsContainer}>
        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertItem}>
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
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  temperatureCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  temperatureCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  unitToggle: {
    marginTop: 10,
  },
  unitToggleText: {
    color: '#6b7280',
    fontSize: 14,
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    color: '#4b5563',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  alertsContainer: {
    flex: 1,
  },
  alertItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  alertMessage: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 12,
    color: '#6b7280',
  },
});