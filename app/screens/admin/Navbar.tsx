import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={styles.navbar}>
      <TouchableOpacity
        style={[styles.navItem, isActive('/screens/admin/dashboard') && styles.activeNavItem]}
        onPress={() => navigateTo('/screens/admin/dashboard')}
      >
        <Ionicons
          name="home"
          size={24}
          color={isActive('/screens/admin/dashboard') ? '#3b82f6' : '#6b7280'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, isActive('/screens/admin/rooms') && styles.activeNavItem]}
        onPress={() => navigateTo('/screens/admin/rooms')}
      >
        <Ionicons
          name="business"
          size={24}
          color={isActive('/screens/admin/rooms') ? '#3b82f6' : '#6b7280'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, isActive('/screens/admin/users') && styles.activeNavItem]}
        onPress={() => navigateTo('/screens/admin/users')}
      >
        <Ionicons
          name="people"
          size={24}
          color={isActive('/screens/admin/users') ? '#3b82f6' : '#6b7280'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  navItem: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  activeNavItem: {
    backgroundColor: '#eff6ff',
  },
}); 