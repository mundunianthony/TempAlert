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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveDemoRoomThreshold } from '../../../src/utils/localThresholds';
import { isDummyRoom } from '../../../src/utils/dummyDataGenerator';

interface Room {
  id: number;
  farm_id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Threshold {
  id: number;
  room_id: number;
  min_temperature: number;
  max_temperature: number;
  created_at: string;
  updated_at: string;
}

interface Farm {
  id: number;
  name: string;
  location: string;
  owner_user_id: number;
}

export default function RoomsScreen() {
  const { user, token, isAdmin } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [thresholdLoading, setThresholdLoading] = useState(false);

  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
  });

  const [newThreshold, setNewThreshold] = useState({
    min_temperature: '',
    max_temperature: '',
  });

  const [createWithThreshold, setCreateWithThreshold] = useState(true);

  // Room configuration management
  const getRoomConfiguration = async () => {
    try {
      const config = await AsyncStorage.getItem('roomConfiguration');
      return config ? JSON.parse(config) : { firstRoomId: null, roomOrder: [], roomTypes: {} };
    } catch (error) {
      console.error('Error getting room configuration:', error);
      return { firstRoomId: null, roomOrder: [], roomTypes: {} };
    }
  };

  const saveRoomConfiguration = async (config: any) => {
    try {
      await AsyncStorage.setItem('roomConfiguration', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving room configuration:', error);
    }
  };

  const assignRoomType = async (roomId: number, roomName: string) => {
    const config = await getRoomConfiguration();
    
    if (config.roomOrder.length === 0) {
      config.firstRoomId = roomId;
      config.roomTypes[roomId] = 'real';
    } else {
      config.roomTypes[roomId] = 'dummy';
    }
    
    config.roomOrder.push({
      id: roomId,
      name: roomName,
      createdAt: new Date().toISOString()
    });
    
    await saveRoomConfiguration(config);
    return config.roomTypes[roomId];
  };

  useEffect(() => {
    if (!user || !isAdmin) {
      router.replace('/login');
      return;
    }
    fetchData();
  }, [user, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch farms
      const farmsResponse = await fetch('https://tempalert.onensensy.com/api/farms', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const farmsData = await farmsResponse.json();
      setFarms(farmsData.data || []);

      // Fetch rooms
      const roomsResponse = await fetch('https://tempalert.onensensy.com/api/rooms', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const roomsData = await roomsResponse.json();
      setRooms(roomsData.data || []);

      // Fetch thresholds
      const thresholdsResponse = await fetch('https://tempalert.onensensy.com/api/thresholds', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const thresholdsData = await thresholdsResponse.json();
      setThresholds(thresholdsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!newThreshold.min_temperature || !newThreshold.max_temperature) {
      Alert.alert('Error', 'Please fill in all threshold fields');
      return;
    }

    const minTemp = parseFloat(newThreshold.min_temperature);
    const maxTemp = parseFloat(newThreshold.max_temperature);

    if (minTemp >= maxTemp) {
      Alert.alert('Error', 'Minimum temperature must be less than maximum temperature');
      return;
    }

    setCreateLoading(true);
    try {
      let farmId = 1;
      
      if (farms.length === 0) {
        try {
          const farmResponse = await fetch('https://tempalert.onensensy.com/api/farms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: 'Default Farm',
              location: 'Main Location',
              owner_user_id: (user?.id || 1).toString(),
            }),
          });
          
          if (farmResponse.ok) {
            const farmData = await farmResponse.json();
            farmId = farmData.data?.id || 1;
          }
        } catch (farmError) {
          console.error('Error creating default farm:', farmError);
        }
      } else {
        farmId = farms[0].id;
      }

      const roomRequestData = {
        farm_id: farmId.toString(),
        name: newRoom.name.trim(),
        description: newRoom.description.trim(),
      };
      
      const roomResponse = await fetch('https://tempalert.onensensy.com/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(roomRequestData),
      });

      const roomData = await roomResponse.json();
      if (roomResponse.ok && roomData.data) {
        const createdRoom = roomData.data;
        
        const thresholdRequestData = {
          room_id: createdRoom.id.toString(),
          min_temperature: minTemp.toString(),
          max_temperature: maxTemp.toString(),
        };
        
        const thresholdResponse = await fetch('https://tempalert.onensensy.com/api/thresholds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(thresholdRequestData),
        });

        const thresholdData = await thresholdResponse.json();
        if (!thresholdResponse.ok) {
          console.error('Threshold creation error:', thresholdData);
          Alert.alert('Error', `Room created but threshold creation failed: ${thresholdData.message || 'Unknown error'}`);
          return;
        }

        Alert.alert('Success', 'Room created successfully');
        setShowCreateModal(false);
        setNewRoom({ name: '', description: '' });
        setNewThreshold({ min_temperature: '', max_temperature: '' });
        setCreateWithThreshold(true);
        
        const roomType = await assignRoomType(createdRoom.id, createdRoom.name);
        console.log(`Room ${createdRoom.name} assigned as ${roomType} room`);
        
        fetchData();
      } else {
        console.error('Room creation error:', roomData);
        Alert.alert('Error', roomData.message || 'Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      Alert.alert('Error', 'Failed to create room');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteRoom = (room: Room) => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`https://tempalert.onensensy.com/api/rooms/${room.id}`, {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Room deleted successfully');
                fetchData();
              } else {
                Alert.alert('Error', 'Failed to delete room');
              }
            } catch (error) {
              console.error('Error deleting room:', error);
              Alert.alert('Error', 'Failed to delete room');
            }
          },
        },
      ]
    );
  };

  const handleCreateThreshold = async () => {
    if (!selectedRoom || !newThreshold.min_temperature || !newThreshold.max_temperature) {
      Alert.alert('Error', 'Please fill in all threshold fields');
      return;
    }
    const minTemp = parseFloat(newThreshold.min_temperature);
    const maxTemp = parseFloat(newThreshold.max_temperature);
    if (minTemp >= maxTemp) {
      Alert.alert('Error', 'Minimum temperature must be less than maximum temperature');
      return;
    }
    setThresholdLoading(true);
    try {
      // Check if threshold already exists for this room
      const existingThreshold = getThresholdForRoom(selectedRoom.id);
      const isDummy = await isDummyRoom(selectedRoom.id);
      
      console.log(`🔧 Threshold operation for room ${selectedRoom.id}:`, {
        roomName: selectedRoom.name,
        isDummy,
        existingThreshold: existingThreshold ? `ID: ${existingThreshold.id}` : 'None',
        operation: existingThreshold ? 'UPDATE' : 'CREATE'
      });
      
      if (isDummy) {
        // For dummy rooms, always use local storage
        await saveDemoRoomThreshold(selectedRoom.id, { min_temperature: minTemp, max_temperature: maxTemp });
        Alert.alert('Success', 'Threshold set successfully.');
        setShowThresholdModal(false);
        setNewThreshold({ min_temperature: '', max_temperature: '' });
        setSelectedRoom(null);
        fetchData();
        return;
      }

      if (existingThreshold) {
        // Update existing threshold - use PUT
        const thresholdRequestData = {
          room_id: selectedRoom.id.toString(),
          min_temperature: minTemp.toString(),
          max_temperature: maxTemp.toString(),
        };
        
        const response = await fetch(`https://tempalert.onensensy.com/api/thresholds/${existingThreshold.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(thresholdRequestData),
        });
        
        const data = await response.json();
        if (response.ok && data.data) {
          Alert.alert('Success', 'Threshold updated successfully');
          setShowThresholdModal(false);
          setNewThreshold({ min_temperature: '', max_temperature: '' });
          setSelectedRoom(null);
          fetchData();
        } else {
          Alert.alert('Error', data.message || 'Failed to update threshold');
        }
      } else {
        // Create new threshold - use POST
        const thresholdRequestData = {
          room_id: selectedRoom.id.toString(),
          min_temperature: minTemp.toString(),
          max_temperature: maxTemp.toString(),
        };
        
        const response = await fetch('https://tempalert.onensensy.com/api/thresholds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(thresholdRequestData),
        });
        
        const data = await response.json();
        if (response.ok && data.data) {
          Alert.alert('Success', 'Threshold created successfully');
          setShowThresholdModal(false);
          setNewThreshold({ min_temperature: '', max_temperature: '' });
          setSelectedRoom(null);
          fetchData();
        } else {
          Alert.alert('Error', data.message || 'Failed to create threshold');
        }
      }
    } catch (error) {
      console.error('Error handling threshold:', error);
      Alert.alert('Error', 'Failed to save threshold');
    } finally {
      setThresholdLoading(false);
    }
  };

  const getThresholdForRoom = (roomId: number) => {
    return thresholds.find(t => t.room_id === roomId);
  };

  const getFarmName = (farmId: number) => {
    const farm = farms.find(f => f.id === farmId);
    return farm ? farm.name : 'Unknown Farm';
  };

  const LoadingState = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="business-outline" size={64} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyStateTitle}>No rooms found</Text>
      <Text style={styles.emptyStateSubtext}>Create your first room to get started</Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={20} color="#ffffff" />
        <Text style={styles.emptyStateButtonText}>Create Room</Text>
      </TouchableOpacity>
    </View>
  );

  const RoomCard = ({ room }: { room: Room }) => {
    const threshold = getThresholdForRoom(room.id);
    
    return (
      <View style={styles.roomCard}>
        <View style={styles.roomCardHeader}>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{room.name}</Text>
            <View style={styles.farmBadge}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.farmName}>{getFarmName(room.farm_id)}</Text>
            </View>
            {room.description && (
              <Text style={styles.roomDescription}>{room.description}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRoom(room)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.thresholdSection}>
          <View style={styles.thresholdHeader}>
            <Ionicons name="thermometer-outline" size={16} color="#6b7280" />
            <Text style={styles.thresholdTitle}>Temperature Thresholds</Text>
          </View>
          
          {threshold ? (
            <View style={styles.thresholdDisplay}>
              <View style={styles.thresholdValues}>
                <View style={styles.thresholdValue}>
                  <Text style={styles.thresholdLabel}>Min</Text>
                  <Text style={styles.thresholdNumber}>{threshold.min_temperature}°C</Text>
                </View>
                <View style={styles.thresholdDivider} />
                <View style={styles.thresholdValue}>
                  <Text style={styles.thresholdLabel}>Max</Text>
                  <Text style={styles.thresholdNumber}>{threshold.max_temperature}°C</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editThresholdButton}
                onPress={() => {
                  setSelectedRoom(room);
                  setNewThreshold({
                    min_temperature: threshold.min_temperature.toString(),
                    max_temperature: threshold.max_temperature.toString(),
                  });
                  setShowThresholdModal(true);
                }}
              >
                <Ionicons name="pencil" size={16} color="#2563eb" />
                <Text style={styles.editThresholdText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addThresholdButton}
              onPress={() => {
                setSelectedRoom(room);
                setNewThreshold({ min_temperature: '', max_temperature: '' });
                setShowThresholdModal(true);
              }}
            >
              <Ionicons name="add" size={16} color="#2563eb" />
              <Text style={styles.addThresholdText}>Add Threshold</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Rooms</Text>
          <Text style={styles.subtitle}>Manage your monitoring rooms</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {rooms.length === 0 ? (
          <EmptyState />
        ) : (
          rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))
        )}
      </ScrollView>

      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Room</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Room Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newRoom.name}
                  onChangeText={(text) => setNewRoom({ ...newRoom, name: text })}
                  placeholder="Enter room name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newRoom.description}
                  onChangeText={(text) => setNewRoom({ ...newRoom, description: text })}
                  placeholder="Enter room description"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.thresholdInputs}>
                <Text style={styles.sectionTitle}>Temperature Thresholds *</Text>
                <View style={styles.thresholdRow}>
                  <View style={styles.thresholdInput}>
                    <Text style={styles.inputLabel}>Min Temperature (°C)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newThreshold.min_temperature}
                      onChangeText={(text) => setNewThreshold({ ...newThreshold, min_temperature: text })}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.thresholdInput}>
                    <Text style={styles.inputLabel}>Max Temperature (°C)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newThreshold.max_temperature}
                      onChangeText={(text) => setNewThreshold({ ...newThreshold, max_temperature: text })}
                      placeholder="100"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
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
                onPress={handleCreateRoom}
                disabled={createLoading}
              >
                {createLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Create Room</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Threshold Modal */}
      <Modal
        visible={showThresholdModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowThresholdModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {getThresholdForRoom(selectedRoom?.id || 0) ? 'Edit' : 'Add'} Threshold
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowThresholdModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedRoom && (
                <View style={styles.roomInfo}>
                  <Text style={styles.selectedRoomName}>{selectedRoom.name}</Text>
                </View>
              )}

              <View style={styles.thresholdRow}>
                <View style={styles.thresholdInput}>
                  <Text style={styles.inputLabel}>Min Temperature (°C)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newThreshold.min_temperature}
                    onChangeText={(text) => setNewThreshold({ ...newThreshold, min_temperature: text })}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.thresholdInput}>
                  <Text style={styles.inputLabel}>Max Temperature (°C)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newThreshold.max_temperature}
                    onChangeText={(text) => setNewThreshold({ ...newThreshold, max_temperature: text })}
                    placeholder="100"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowThresholdModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, thresholdLoading && styles.submitButtonDisabled]}
                onPress={handleCreateThreshold}
                disabled={thresholdLoading}
              >
                {thresholdLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                    <Text style={styles.submitButtonText}>
                      {getThresholdForRoom(selectedRoom?.id || 0) ? 'Update' : 'Add'} Threshold
                    </Text>
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
  roomCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  roomInfo: {
    flex: 1,
    marginRight: 12,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  farmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  farmName: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  roomDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  thresholdSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  thresholdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  thresholdDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdValues: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  thresholdValue: {
    alignItems: 'center',
    flex: 1,
  },
  thresholdLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  thresholdNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  thresholdDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  editThresholdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editThresholdText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 4,
  },
  addThresholdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderStyle: 'dashed',
  },
  addThresholdText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 6,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  thresholdInputs: {
    marginBottom: 20,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thresholdInput: {
    flex: 1,
  },
  selectedRoomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 16,
    textAlign: 'center',
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

