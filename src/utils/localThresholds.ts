import AsyncStorage from '@react-native-async-storage/async-storage';

const DEMO_THRESHOLD_KEY = 'demoRoomThresholds';

export async function saveDemoRoomThreshold(roomId: number, threshold: { min_temperature: number, max_temperature: number }) {
    try {
        const existing = await AsyncStorage.getItem(DEMO_THRESHOLD_KEY);
        const thresholds = existing ? JSON.parse(existing) : {};
        thresholds[roomId] = threshold;
        await AsyncStorage.setItem(DEMO_THRESHOLD_KEY, JSON.stringify(thresholds));
    } catch (e) {
        console.error('Failed to save demo room threshold', e);
    }
}

export async function getDemoRoomThreshold(roomId: number): Promise<{ min_temperature: number, max_temperature: number } | null> {
    try {
        const existing = await AsyncStorage.getItem(DEMO_THRESHOLD_KEY);
        if (!existing) return null;
        const thresholds = JSON.parse(existing);
        return thresholds[roomId] || null;
    } catch (e) {
        console.error('Failed to get demo room threshold', e);
        return null;
    }
} 