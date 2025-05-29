import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { db } from '../src/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [limitCount, setLimitCount] = useState(10);

  useEffect(() => {
    const alertsQuery = query(
      collection(db, 'alerts'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const alertsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }));
      setAlerts(alertsList);
    });

    return () => unsubscribe();
  }, [limitCount]);

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

      <ScrollView style={styles.alertsContainer}>
        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertItem}>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.alertTime}>{timeAgo(alert.timestamp)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
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