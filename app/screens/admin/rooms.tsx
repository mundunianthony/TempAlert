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
    
    // If this is the first room, assign as real
    if (config.roomOrder.length === 0) {
      config.firstRoomId = roomId;
      config.roomTypes[roomId] = 'real';
    } else {
      // All subsequent rooms are dummy
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
      // Ensure we have a valid farm first
      let farmId = 1; // Default farm ID
      
      // Check if farms exist, if not create a default farm
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
          // Continue with farm_id = 1
        }
      } else {
        // Use the first available farm
        farmId = farms[0].id;
      }

      // Create room first
      const roomRequestData = {
        farm_id: farmId.toString(),
        name: newRoom.name.trim(),
        description: newRoom.description.trim(),
      };
      
      console.log('Creating room with data:', roomRequestData);
      
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
        
        // Create threshold (now required)
        const thresholdRequestData = {
          room_id: createdRoom.id.toString(),
          min_temperature: minTemp.toString(),
          max_temperature: maxTemp.toString(),
        };
        
        console.log('Creating threshold with data:', thresholdRequestData);
        
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
        
        // Assign room type after successful creation
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
        // If backend fails, check if dummy room and save locally
        const dummy = await isDummyRoom(selectedRoom.id);
        if (dummy) {
          await saveDemoRoomThreshold(selectedRoom.id, { min_temperature: minTemp, max_temperature: maxTemp });
          Alert.alert('Success', 'Threshold set successfully.');
          setShowThresholdModal(false);
          setNewThreshold({ min_temperature: '', max_temperature: '' });
          setSelectedRoom(null);
          fetchData();
        } else {
          Alert.alert('Error', data.message || 'Failed to create threshold');
        }
      }
    } catch (error) {
      // Network or other error: fallback to local for dummy
      const dummy = await isDummyRoom(selectedRoom.id);
      if (dummy) {
        await saveDemoRoomThreshold(selectedRoom.id, { min_temperature: minTemp, max_temperature: maxTemp });
        Alert.alert('Success', 'Threshold set successfully.');
        setShowThresholdModal(false);
        setNewThreshold({ min_temperature: '', max_temperature: '' });
        setSelectedRoom(null);
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to create threshold');
      }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Manage Rooms</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Room</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No rooms found</Text>
            <Text style={styles.emptyStateSubtext}>Create your first room to get started</Text>
          </View>
        ) : (
          rooms.map((room) => {
            const threshold = getThresholdForRoom(room.id);
            return (
              <View key={room.id} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <View>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.farmName}>{getFarmName(room.farm_id)}</Text>
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
                  <Text style={styles.thresholdTitle}>Temperature Thresholds:</Text>
                  {threshold ? (
                    <View style={styles.thresholdInfo}>
                      <Text style={styles.thresholdText}>
                        Min: {threshold.min_temperature}°C | Max: {threshold.max_temperature}°C
                      </Text>
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
                        <Ionicons name="pencil" size={16} color="#3b82f6" />
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
                      <Ionicons name="add-circle-outline" size={16} color="#3b82f6" />
                      <Text style={styles.addThresholdText}>Add Threshold</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
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
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Room Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter room name"
                value={newRoom.name}
                onChangeText={(text) => setNewRoom({ ...newRoom, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter room description"
                value={newRoom.description}
                onChangeText={(text) => setNewRoom({ ...newRoom, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Minimum Temperature (°C) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                value={newThreshold.min_temperature}
                onChangeText={(text) => setNewThreshold({ ...newThreshold, min_temperature: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Maximum Temperature (°C) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={newThreshold.max_temperature}
                onChangeText={(text) => setNewThreshold({ ...newThreshold, max_temperature: text })}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, createLoading && styles.submitButtonDisabled]}
              onPress={handleCreateRoom}
              disabled={createLoading}
            >
              {createLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Room</Text>
              )}
            </TouchableOpacity>
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
                {selectedRoom ? `Set Threshold for ${selectedRoom.name}` : 'Set Threshold'}
              </Text>
              <TouchableOpacity onPress={() => setShowThresholdModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Minimum Temperature (°C) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                value={newThreshold.min_temperature}
                onChangeText={(text) => setNewThreshold({ ...newThreshold, min_temperature: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Maximum Temperature (°C) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={newThreshold.max_temperature}
                onChangeText={(text) => setNewThreshold({ ...newThreshold, max_temperature: text })}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, thresholdLoading && styles.submitButtonDisabled]}
              onPress={handleCreateThreshold}
              disabled={thresholdLoading}
            >
              {thresholdLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Save Threshold</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdminNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Add padding to account for the navbar
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  farmName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
  },
  thresholdSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  thresholdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  thresholdInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdText: {
    fontSize: 14,
    color: '#6b7280',
  },
  editThresholdButton: {
    padding: 4,
  },
  addThresholdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addThresholdText: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: Dimensions.get('window').width - 40,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 