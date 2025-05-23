import { getFirestore, doc, setDoc, collection } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

// Initialize Firestore
const db = getFirestore();

// Thresholds for temperature status
const thresholds = [
  { range: [0, 15], status: "Too Cold" },
  { range: [16, 24], status: "Optimal" },
  { range: [25, 30], status: "Warming Up" },
  { range: [31, 40], status: "Too Hot" },
  { range: [41, 100], status: "Critical" },
];

// Get status based on temperature
const getStatus = (temp: number) => {
  for (let t of thresholds) {
    if (temp >= t.range[0] && temp <= t.range[1]) return t.status;
  }
  return "Unknown";
};

// Generate random temperature (0 to 50°C)
const generateRandomTemperature = () => {
  return Math.floor(Math.random() * 51);
};

// Initialize Firestore with four storerooms
export const initializeFirestore = async (userId: string, email: string) => {
  try {
    // Initialize users collection
    await setDoc(doc(db, "users", userId), {
      email,
      createdAt: Timestamp.fromDate(new Date()),
    });

    // Initialize four storerooms
    const storeroomIds = ["room1", "room2", "room3", "room4"];
    const unit = "C";

    for (const roomId of storeroomIds) {
      const temperature = generateRandomTemperature();
      const status = getStatus(temperature);
      const timestamp = Timestamp.fromDate(new Date());

      // Create storeroom document
      await setDoc(doc(db, "storerooms", roomId), {
        name: `Storeroom ${roomId.replace("room", "")}`,
        latestReading: {
          temperature,
          unit,
          timestamp,
          status,
        },
      });

      // Create initial reading in readings subcollection
      await setDoc(doc(db, "storerooms", roomId, "readings", timestamp.toMillis().toString()), {
        temperature,
        unit,
        timestamp,
        status,
      });
    }
  } catch (error) {
    console.error("Error initializing Firestore:", error);
  }
};

// Update storerooms with random temperature data
export const updateStoreroomData = async () => {
  try {
    const storeroomIds = ["room1", "room2", "room3", "room4"];
    const unit = "C";
    const timestamp = Timestamp.fromDate(new Date());

    for (const roomId of storeroomIds) {
      const temperature = generateRandomTemperature();
      const status = getStatus(temperature);

      // Update storerooms collection (latest reading)
      await setDoc(
        doc(db, "storerooms", roomId),
        {
          name: `Storeroom ${roomId.replace("room", "")}`,
          latestReading: {
            temperature,
            unit,
            timestamp,
            status,
          },
        },
        { merge: true }
      );

      // Add to readings subcollection (history)
      await setDoc(doc(db, "storerooms", roomId, "readings", timestamp.toMillis().toString()), {
        temperature,
        unit,
        timestamp,
        status,
      });

      // Generate alert for critical temperatures
      if (status === "Critical") {
        await setDoc(doc(collection(db, "alerts")), {
          storeroomId: roomId,
          message: `Critical temperature (${temperature}°C) in Storeroom ${roomId.replace("room", "")}`,
          timestamp,
          status,
        });
      }
    }
  } catch (error) {
    console.error("Error updating storeroom data:", error);
  }
};