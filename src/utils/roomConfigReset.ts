import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility to reset and reinitialize room configuration
 * This can help fix issues where temperature values are not displaying
 */
export const resetRoomConfiguration = async () => {
    try {
        console.log('🔄 Resetting room configuration...');

        // Clear existing configuration
        await AsyncStorage.removeItem('roomConfiguration');

        // Clear all dummy data
        const allKeys = await AsyncStorage.getAllKeys();
        const dummyKeys = allKeys.filter(key => key.startsWith('dummyData_'));
        if (dummyKeys.length > 0) {
            await AsyncStorage.multiRemove(dummyKeys);
            console.log('🗑️ Cleared dummy data keys:', dummyKeys);
        }

        // Clear alerts cache
        await AsyncStorage.removeItem('alerts_cache_v1');
        await AsyncStorage.removeItem('alerts_persistent_log_v1');

        // Clear demo thresholds
        await AsyncStorage.removeItem('demoRoomThresholds');

        console.log('✅ Room configuration reset complete');
        return true;
    } catch (error) {
        console.error('❌ Error resetting room configuration:', error);
        return false;
    }
};

/**
 * Initialize room configuration for existing rooms
 * This should be called after resetting to re-establish the configuration
 */
export const initializeRoomConfiguration = async (rooms: any[]) => {
    try {
        console.log('🏗️ Initializing room configuration for', rooms.length, 'rooms');

        const config = {
            firstRoomId: rooms.length > 0 ? rooms[0].id : null,
            roomOrder: [],
            roomTypes: {}
        };

        // Assign room types
        rooms.forEach((room, index) => {
            if (index === 0) {
                config.roomTypes[room.id] = 'real';
            } else {
                config.roomTypes[room.id] = 'dummy';
            }

            config.roomOrder.push({
                id: room.id,
                name: room.name,
                createdAt: new Date().toISOString()
            });
        });

        await AsyncStorage.setItem('roomConfiguration', JSON.stringify(config));
        console.log('✅ Room configuration initialized:', config);
        return config;
    } catch (error) {
        console.error('❌ Error initializing room configuration:', error);
        return null;
    }
};

/**
 * Debug function to check current room configuration state
 */
export const debugRoomConfiguration = async () => {
    try {
        console.log('🔍 Debugging room configuration...');

        const config = await AsyncStorage.getItem('roomConfiguration');
        console.log('📋 Room Configuration:', config ? JSON.parse(config) : 'NOT FOUND');

        const allKeys = await AsyncStorage.getAllKeys();
        const tempKeys = allKeys.filter(key =>
            key.startsWith('dummyData_') ||
            key.startsWith('alerts_') ||
            key === 'roomConfiguration' ||
            key === 'demoRoomThresholds'
        );
        console.log('🗂️ Temperature-related keys:', tempKeys);

        for (const key of tempKeys) {
            const data = await AsyncStorage.getItem(key);
            console.log(`📊 ${key}:`, data ? JSON.parse(data) : 'NOT FOUND');
        }

    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}; 