export interface TempRecord {
  timestamp: number;     // Unix ms
  temperature: number;   // °C
}

export interface Storeroom {
  id: string;            // '1', '2', etc.
  name: string;          // e.g. 'Storeroom 1'
  lastTemperature?: TempRecord;
}