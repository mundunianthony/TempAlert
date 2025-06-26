import AsyncStorage from '@react-native-async-storage/async-storage';

interface DummyDataConfig {
    baseTemperature: number;
    variationRange: number;
    updateInterval: number;
    lastUpdate: string;
}

interface DummyRoomData {
    currentTemperature: number;
    lastUpdated: string;
    history: Array<{
        temperature: number;
        timestamp: string;
    }>;
}

// Generate realistic temperature variations
const generateTemperatureVariation = (baseTemp: number, roomId: number): number => {
    // Room-specific temperature profiles
    const roomProfiles = {
        'storage': { offset: -3, variation: 2 }, // Storage rooms cooler
        'processing': { offset: 2, variation: 3 }, // Processing rooms warmer
        'default': { offset: 0, variation: 2 }
    };

    // Determine room profile based on room ID (simple hash)
    const profileKey = roomId % 3 === 0 ? 'storage' : roomId % 3 === 1 ? 'processing' : 'default';
    const profile = roomProfiles[profileKey];

    // Add time-based variation (simulate day/night cycle)
    const now = new Date();
    const hour = now.getHours();
    const timeVariation = Math.sin((hour - 6) * Math.PI / 12) * 1.5; // ±1.5°C day/night cycle

    // Add random noise
    const randomNoise = (Math.random() - 0.5) * profile.variation;

    return baseTemp + profile.offset + timeVariation + randomNoise;
};

// Generate historical data for a room
const generateHistoricalData = (roomId: number, baseTemp: number, hours: number = 24): Array<{ temperature: number, timestamp: string }> => {
    const history = [];
    const now = new Date();

    for (let i = hours; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const temp = generateTemperatureVariation(baseTemp, roomId);

        history.push({
            temperature: Math.round(temp * 10) / 10, // Round to 1 decimal
            timestamp: timestamp.toISOString()
        });
    }

    return history;
};

// Get or create dummy data for a room
export const getDummyRoomData = async (roomId: number, roomName: string): Promise<DummyRoomData> => {
    try {
        const storageKey = `dummyData_${roomId}`;
        const existingData = await AsyncStorage.getItem(storageKey);

        if (existingData) {
            const data: DummyRoomData = JSON.parse(existingData);
            const now = new Date();
            const lastUpdate = new Date(data.lastUpdated);

            // Only update temperature if at least 1 hour has passed
            if (now.getTime() - lastUpdate.getTime() > 60 * 60 * 1000) {
                const baseTemp = 22; // Base temperature for dummy rooms
                const newTemp = Math.round(generateTemperatureVariation(baseTemp, roomId) * 10) / 10;

                // Only update lastUpdated if temperature actually changes
                if (newTemp !== data.currentTemperature) {
                    data.currentTemperature = newTemp;
                    data.lastUpdated = now.toISOString();

                    // Add to history (keep last 24 hours)
                    data.history.push({
                        temperature: data.currentTemperature,
                        timestamp: now.toISOString()
                    });

                    // Keep only last 24 hours of history
                    if (data.history.length > 24) {
                        data.history = data.history.slice(-24);
                    }

                    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
                }
            }

            return data;
        } else {
            // Create new dummy data
            const baseTemp = 22;
            const currentTemp = Math.round(generateTemperatureVariation(baseTemp, roomId) * 10) / 10;
            const history = generateHistoricalData(roomId, baseTemp);

            const newData: DummyRoomData = {
                currentTemperature: currentTemp,
                lastUpdated: new Date().toISOString(),
                history
            };

            await AsyncStorage.setItem(storageKey, JSON.stringify(newData));

            // Also create default threshold for this dummy room
            try {
                const { saveDemoRoomThreshold } = await import('./localThresholds');
                await saveDemoRoomThreshold(roomId, { min_temperature: 18, max_temperature: 25 });
                console.log(`🎯 Created default threshold for dummy room ${roomId}`);
            } catch (thresholdError) {
                console.log(`⚠️ Could not create default threshold for room ${roomId}:`, thresholdError);
            }

            return newData;
        }
    } catch (error) {
        console.error('Error getting dummy room data:', error);
        // Return fallback data
        return {
            currentTemperature: 22,
            lastUpdated: new Date().toISOString(),
            history: []
        };
    }
};

// Get room configuration
export const getRoomConfiguration = async () => {
    try {
        const config = await AsyncStorage.getItem('roomConfiguration');
        if (config) {
            return JSON.parse(config);
        }

        // If no configuration exists, create a default one
        console.log('⚠️ No room configuration found, creating default...');
        const defaultConfig = { firstRoomId: null, roomOrder: [], roomTypes: {} };
        await AsyncStorage.setItem('roomConfiguration', JSON.stringify(defaultConfig));
        return defaultConfig;
    } catch (error) {
        console.error('Error getting room configuration:', error);
        return { firstRoomId: null, roomOrder: [], roomTypes: {} };
    }
};

// Check if a room is dummy
export const isDummyRoom = async (roomId: number): Promise<boolean> => {
    try {
        const config = await getRoomConfiguration();
        const isDummy = config.roomTypes[roomId] === 'dummy';
        console.log(`🎲 Room ${roomId} dummy check:`, isDummy, 'Config:', config.roomTypes[roomId]);

        // If room type is not defined, treat it as dummy (except the first room)
        if (config.roomTypes[roomId] === undefined) {
            if (config.firstRoomId === null) {
                // First room should be real
                config.firstRoomId = roomId;
                config.roomTypes[roomId] = 'real';
                await AsyncStorage.setItem('roomConfiguration', JSON.stringify(config));
                console.log(`🏠 Auto-assigned room ${roomId} as first real room`);
                return false;
            } else {
                // Other rooms should be dummy
                config.roomTypes[roomId] = 'dummy';
                await AsyncStorage.setItem('roomConfiguration', JSON.stringify(config));
                console.log(`🎲 Auto-assigned room ${roomId} as dummy room`);
                return true;
            }
        }

        return isDummy;
    } catch (error) {
        console.error('Error checking if room is dummy:', error);
        // Fallback: treat as dummy room
        return true;
    }
};

// Get the first room ID (real sensor room)
export const getFirstRoomId = async (): Promise<number | null> => {
    try {
        const config = await getRoomConfiguration();
        console.log('🏠 First room ID from config:', config.firstRoomId);
        return config.firstRoomId;
    } catch (error) {
        console.error('Error getting first room ID:', error);
        return null;
    }
};

// Utility: Get human-readable relative time from a timestamp
export function getTimeAgo(timestamp: string): string {
    if (!timestamp) return "Unknown time";
    const now = new Date();
    const date = new Date(timestamp);
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) {
        return "Just now";
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes} ${diffMinutes === 1 ? "min" : "mins"} ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
} 