import { isDummyRoom, getDummyRoomData } from './dummyDataGenerator';
import { getDemoRoomThreshold } from './localThresholds';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AlertLog {
    id: number | string;
    room_id: number;
    sensor_id: number | null;
    temperature_value: number;
    alert_type: string;
    triggered_at: string;
    resolved_at?: string;
    status: string;
    room?: {
        id: number;
        name: string;
        description?: string;
    };
}

export interface Room {
    id: number;
    name: string;
    description: string;
}

const ALERTS_CACHE_KEY = 'alerts_cache_v1';
const ALERTS_CACHE_TIME_MS = 2 * 60 * 1000; // 2 minutes
const ALERTS_PERSISTENT_LOG_KEY = 'alerts_persistent_log_v1';
const ALERTS_RETENTION_DAYS = 30;

/**
 * Fetches all alert logs from the API and synthesizes alerts for dummy rooms if needed.
 * @param userToken The user's auth token
 * @returns Array of AlertLog objects (real and synthetic)
 */
export async function fetchAllAlertsWithDummy(userToken: string): Promise<AlertLog[]> {
    // Fetch all rooms
    const roomsResponse = await fetch('https://tempalert.onensensy.com/api/rooms', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${userToken}`,
        },
    });
    const roomsData = await roomsResponse.json();
    const rooms: Room[] = roomsData.data || [];

    // Fetch all alert logs
    const alertsResponse = await fetch('https://tempalert.onensensy.com/api/alert-logs', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${userToken}`,
        },
    });
    const alertsData = await alertsResponse.json();
    const alertsList: AlertLog[] = alertsData.data || [];

    // Combine alert logs with room information
    let alertsWithRooms: AlertLog[] = alertsList.map((alert: AlertLog) => ({
        ...alert,
        room: rooms.find((room: Room) => room.id === alert.room_id),
    }));

    // Generate synthetic alerts for dummy rooms
    for (const room of rooms) {
        const isDummy = await isDummyRoom(room.id);
        if (isDummy) {
            const dummyData = await getDummyRoomData(room.id, room.name);
            let threshold = null;
            try {
                threshold = await getDemoRoomThreshold(room.id);
            } catch { }
            if (threshold && dummyData.currentTemperature !== null && dummyData.currentTemperature !== undefined) {
                const temp = dummyData.currentTemperature;
                const min = threshold.min_temperature;
                const max = threshold.max_temperature;
                if (temp < min || temp > max) {
                    // Synthesize an alert
                    alertsWithRooms.push({
                        id: `dummy-${room.id}-${dummyData.lastUpdated}`,
                        room_id: room.id,
                        sensor_id: null,
                        temperature_value: temp,
                        alert_type: temp < min ? 'low' : 'high',
                        triggered_at: dummyData.lastUpdated,
                        status: 'Active',
                        room: room,
                    });
                }
            }
        }
    }

    // Sort by triggered_at (most recent first)
    const sortedAlerts = alertsWithRooms.sort((a: AlertLog, b: AlertLog) =>
        new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
    );

    return sortedAlerts;
}

export async function fetchAllAlertsWithDummyCached(userToken: string): Promise<AlertLog[]> {
    try {
        // Try to load from cache
        const cacheRaw = await AsyncStorage.getItem(ALERTS_CACHE_KEY);
        if (cacheRaw) {
            const cache = JSON.parse(cacheRaw);
            if (cache.timestamp && Date.now() - cache.timestamp < ALERTS_CACHE_TIME_MS && Array.isArray(cache.data)) {
                return cache.data;
            }
        }
    } catch (e) {
        // Ignore cache errors, proceed to fetch
    }
    // Fetch fresh data
    const freshAlerts = await fetchAllAlertsWithDummy(userToken);
    // Save to cache
    try {
        await AsyncStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: freshAlerts,
        }));
    } catch (e) {
        // Ignore cache write errors
    }
    return freshAlerts;
}

function pruneOldAlerts(alerts: AlertLog[]): AlertLog[] {
    const cutoff = Date.now() - ALERTS_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return alerts.filter(a => new Date(a.triggered_at).getTime() >= cutoff);
}

function mergeAlerts(existing: AlertLog[], incoming: AlertLog[]): AlertLog[] {
    const map = new Map<string | number, AlertLog>();
    for (const alert of existing) {
        map.set(alert.id, alert);
    }
    for (const alert of incoming) {
        map.set(alert.id, alert);
    }
    return Array.from(map.values());
}

export async function fetchAllAlertsWithDummyPersistent(userToken: string): Promise<AlertLog[]> {
    // Fetch new alerts (real + dummy)
    const freshAlerts = await fetchAllAlertsWithDummy(userToken);
    // Load persistent log
    let persistentAlerts: AlertLog[] = [];
    try {
        const raw = await AsyncStorage.getItem(ALERTS_PERSISTENT_LOG_KEY);
        if (raw) {
            persistentAlerts = JSON.parse(raw);
        }
    } catch { }
    // Merge and prune
    let merged = mergeAlerts(persistentAlerts, freshAlerts);
    merged = pruneOldAlerts(merged);
    // Save back to persistent log
    try {
        await AsyncStorage.setItem(ALERTS_PERSISTENT_LOG_KEY, JSON.stringify(merged));
    } catch { }
    // Return sorted by triggered_at
    return merged.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
} 