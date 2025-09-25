export interface Luggage {
  id: string;
  luggageId: string; // From QR code
  bleId?: string; // BLE UUID, optional at registration
  userId: string; // Firebase UID
  createdAt: number;
  proximityStatus: 'nearby' | 'far' | 'unknown';
  lastSeenRSSI?: number;
  lastSeenAt?: number;
}

export interface LuggageDocument {
  luggageId: string;
  bleId?: string;
  userId: string;
  createdAt: number;
  proximityStatus: 'nearby' | 'far' | 'unknown';
  lastSeenRSSI?: number;
  lastSeenAt?: number;
}

export interface BLEDevice {
  id: string;
  name?: string;
  rssi?: number;
  isConnectable?: boolean;
}

export interface ProximityConfig {
  nearThreshold: number; // RSSI threshold for "nearby" (e.g., -50)
  farThreshold: number; // RSSI threshold for "far" (e.g., -80)
  scanInterval: number; // Scan interval in ms (e.g., 5000)
}
