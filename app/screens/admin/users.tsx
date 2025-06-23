import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import AdminNavbar from './Navbar';

interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export default function UsersScreen() {
  const { user, token, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirmation: '',
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    if (!user || !isAdmin) {
      router.replace('/login');
      return;
    }
    fetchUsers();
  }, [user, isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://tempalert.onensensy.com/api/users', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.data || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    // Validation
    if (!newUser.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!newUser.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!newUser.password) {
      Alert.alert('Error', 'Password is required');
      return;
    }
    if (newUser.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newUser.password !== newUser.password_confirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch('https://tempalert.onensensy.com/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newUser.name.trim(),
          email: newUser.email.trim().toLowerCase(),
          phone_number: newUser.phone_number.trim() || null,
          password: newUser.password,
          password_confirmation: newUser.password_confirmation,
          role: 'manager',
        }),
      });
      const data = await response.json();
      if (response.ok && data.data) {
        Alert.alert('Success', 'User created successfully');
        setShowCreateModal(false);
        setNewUser({
          name: '',
          email: '',
          phone_number: '',
          password: '',
          password_confirmation: '',
        });
        fetchUsers();
      } else {
        let errorMsg = data.message || 'Failed to create user';
        if (data.errors && typeof data.errors === 'object') {
          errorMsg = Object.entries(data.errors)
            .map(([field, msgs]) => `${field}: ${(Array.isArray(msgs) ? msgs.join(', ') : msgs)}`)
            .join('\n');
        }
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteUser = (userToDelete: User) => {
    if (userToDelete.id === user?.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${userToDelete.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`https://tempalert.onensensy.com/api/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'User deleted successfully');
                fetchUsers();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.message || 'Failed to delete user');
              }
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleUpdatePassword = async () => {
    if (!selectedUser) return;

    if (!passwordData.old_password || !passwordData.password || !passwordData.password_confirmation) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (passwordData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (passwordData.password !== passwordData.password_confirmation) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('https://tempalert.onensensy.com/api/users/update-pwd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          old_password: passwordData.old_password,
          password: passwordData.password,
          password_confirmation: passwordData.password_confirmation,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Password updated successfully');
        setShowPasswordModal(false);
        setPasswordData({
          old_password: '',
          password: '',
          password_confirmation: '',
        });
        setSelectedUser(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'sa':
        return '#dc2626';
      case 'admin':
        return '#ea580c';
      case 'manager':
        return '#2563eb';
      case 'user':
        return '#059669';
      default:
        return '#6b7280';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role.toLowerCase()) {
      case 'sa':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'user':
        return 'User';
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const LoadingState = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="people-outline" size={64} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyStateTitle}>No users found</Text>
      <Text style={styles.emptyStateSubtext}>Create your first user to get started</Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="person-add" size={20} color="#ffffff" />
        <Text style={styles.emptyStateButtonText}>Create User</Text>
      </TouchableOpacity>
    </View>
  );

  const UserCard = ({ userItem, isFirst }: { userItem: User, isFirst?: boolean }) => (
    <View style={styles.userCard}>
      <View style={styles.userCardHeader}>
        <View style={styles.userAvatarSection}>
          <View style={[
            styles.userAvatar,
            isFirst && styles.userAvatarSmall,
            { backgroundColor: getRoleColor(userItem.role) }
          ]}>
            <Text style={styles.userInitials}>{getInitials(userItem.name)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userItem.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">{userItem.email}</Text>
            {userItem.phone_number && (
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={12} color="#6b7280" />
                <Text style={styles.userPhone}>{userItem.phone_number}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.userActions}>
          <View style={[
            styles.roleBadge,
            isFirst && styles.roleBadgeSmall,
            { backgroundColor: getRoleColor(userItem.role) }
          ]}>
            <Text style={[styles.roleText, isFirst && styles.roleTextSmall]}>{getRoleDisplayName(userItem.role)}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedUser(userItem);
                setPasswordData({
                  old_password: '',
                  password: '',
                  password_confirmation: '',
                });
                setShowPasswordModal(true);
              }}
            >
              <Ionicons name="key-outline" size={isFirst ? 15 : 18} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => handleDeleteUser(userItem)}
            >
              <Ionicons name="trash-outline" size={isFirst ? 15 : 18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.userFooter}>
        <View style={styles.createdInfo}>
          <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
          <Text style={styles.userCreated}>
            Created {new Date(userItem.created_at).toLocaleDateString()}
          </Text>
        </View>
        {userItem.id === user?.id && (
          <View style={styles.currentUserBadge}>
            <Text style={styles.currentUserText}>You</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return <LoadingState />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Users</Text>
          <Text style={styles.subtitle}>Manage system users and permissions</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="person-add" size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {users.length === 0 ? (
          <EmptyState />
        ) : (
          users.map((userItem, idx) => (
            <UserCard key={userItem.id} userItem={userItem} isFirst={idx === 0} />
          ))
        )}
      </ScrollView>

      {/* Create User Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New User</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter full name"
                  placeholderTextColor="#9ca3af"
                  value={newUser.name}
                  onChangeText={(text) => setNewUser({ ...newUser, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter email address"
                  placeholderTextColor="#9ca3af"
                  value={newUser.email}
                  onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9ca3af"
                  value={newUser.phone_number}
                  onChangeText={(text) => setNewUser({ ...newUser, phone_number: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter password"
                    placeholderTextColor="#9ca3af"
                    value={newUser.password}
                    onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                      size={20} 
                      color="#6b7280" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm password"
                    placeholderTextColor="#9ca3af"
                    value={newUser.password_confirmation}
                    onChangeText={(text) => setNewUser({ ...newUser, password_confirmation: text })}
                    secureTextEntry={!showPasswordConfirmation}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                  >
                    <Ionicons 
                      name={showPasswordConfirmation ? 'eye-off-outline' : 'eye-outline'} 
                      size={20} 
                      color="#6b7280" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, createLoading && styles.submitButtonDisabled]}
                onPress={handleCreateUser}
                disabled={createLoading}
              >
                {createLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Create User</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Update Password
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedUser && (
                <View style={styles.selectedUserInfo}>
                  <View style={[styles.selectedUserAvatar, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                    <Text style={styles.selectedUserInitials}>{getInitials(selectedUser.name)}</Text>
                  </View>
                  <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
                  <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter current password"
                  placeholderTextColor="#9ca3af"
                  value={passwordData.old_password}
                  onChangeText={(text) => setPasswordData({ ...passwordData, old_password: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  value={passwordData.password}
                  onChangeText={(text) => setPasswordData({ ...passwordData, password: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9ca3af"
                  value={passwordData.password_confirmation}
                  onChangeText={(text) => setPasswordData({ ...passwordData, password_confirmation: text })}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, passwordLoading && styles.submitButtonDisabled]}
                onPress={handleUpdatePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdminNavbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '100%',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userAvatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 6,
  },
  userInitials: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
    flexShrink: 1,
    flexWrap: 'nowrap',
    width: '100%',
    includeFontPadding: false,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhone: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  userActions: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  roleBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleTextSmall: {
    fontSize: 9,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  deleteActionButton: {
    backgroundColor: '#fef2f2',
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  createdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userCreated: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  currentUserBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentUserText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  selectedUserInfo: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  selectedUserAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedUserInitials: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  selectedUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedUserEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  passwordToggle: {
    padding: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
});

