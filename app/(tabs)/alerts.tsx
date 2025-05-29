import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { firestoreInstance } from '@/src/lib/firebase';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    message: string;
    timestamp: string;
  }>>([]);
  const [limitCount, setLimitCount] = useState(10);

  useEffect(() => {
    const alertsQuery = query(
      collection(firestoreInstance, 'alerts'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const alertsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as { message: string; timestamp: string }
      }));
      setAlerts(alertsList);
    });

    return () => unsubscribe();
  }, [limitCount]);

  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 604800)}w ago`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alert History</Text>
      
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

      <ScrollView style={styles.alertsList}>
        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertItem}>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.timestamp}>{timeAgo(alert.timestamp)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
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
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  filterText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  alertsList: {
    flex: 1,
  },
  alertItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertMessage: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 14,
    color: '#666666',
  },
});