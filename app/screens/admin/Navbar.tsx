import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated } from 'react-native';
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

  const NavItem = ({ 
    path, 
    iconName, 
    label 
  }: { 
    path: string; 
    iconName: keyof typeof Ionicons.glyphMap; 
    label: string; 
  }) => {
    const active = isActive(path);
    
    return (
      <TouchableOpacity
        style={[styles.navItem, active && styles.activeNavItem]}
        onPress={() => navigateTo(path)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, active && styles.activeIconContainer]}>
          <Ionicons
            name={iconName}
            size={22}
            color={active ? '#ffffff' : '#6b7280'}
          />
        </View>
        <Text style={[styles.navLabel, active && styles.activeNavLabel]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navbar}>
      <NavItem 
        path="/screens/admin/dashboard" 
        iconName="home" 
        label="Dashboard" 
      />
      <NavItem 
        path="/screens/admin/rooms" 
        iconName="business" 
        label="Rooms" 
      />
      <NavItem 
        path="/screens/admin/users" 
        iconName="people" 
        label="Users" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 80,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 70,
    minHeight: 60,
  },
  activeNavItem: {
    backgroundColor: '#f8fafc',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  activeIconContainer: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  activeNavLabel: {
    color: '#2563eb',
    fontWeight: '600',
  },
});

