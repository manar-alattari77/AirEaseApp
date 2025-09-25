import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';
import { Luggage, LuggageDocument, BLEDevice, ProximityConfig } from '../types/Luggage';
import { BleManager, Device, State } from 'react-native-ble-plx';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

class LuggageService {
  private bleManager: BleManager;
  private scanSubscription?: any;
  private proximityConfig: ProximityConfig;
  private firestoreUnsubscribe?: Unsubscribe;
  private isScanning: boolean = false;
  private currentLuggage: Luggage[] = [];

  constructor() {
    this.bleManager = new BleManager();
    this.proximityConfig = {
      nearThreshold: -50, // RSSI threshold for "nearby"
      farThreshold: -80,  // RSSI threshold for "far"
      scanInterval: 5000  // Scan every 5 seconds
    };
    
    this.setupNotifications();
  }

  private async setupNotifications() {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
    }

    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Register luggage by scanning QR code
   */
  async registerLuggageFromQR(luggageId: string): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const luggageData: LuggageDocument = {
        luggageId,
        userId: user.uid,
        createdAt: Date.now(),
        proximityStatus: 'unknown'
      };

      const docRef = await addDoc(collection(db, 'luggage'), luggageData);
      
      // Add haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      return docRef.id;
    } catch (error) {
      console.error('Error registering luggage:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  }

  /**
   * Link BLE device to luggage
   */
  async linkBLEDevice(luggageId: string, bleId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Find the luggage document
      const luggageQuery = query(
        collection(db, 'luggage'),
        where('userId', '==', user.uid),
        where('luggageId', '==', luggageId)
      );

      // For now, we'll update the first matching document
      // In a real app, you might want to handle multiple matches
      const luggageDoc = await this.getLuggageByLuggageId(luggageId);
      if (!luggageDoc) {
        throw new Error('Luggage not found');
      }

      await updateDoc(doc(db, 'luggage', luggageDoc.id), {
        bleId,
        proximityStatus: 'unknown'
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error linking BLE device:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  }

  /**
   * Get luggage by luggageId
   */
  private async getLuggageByLuggageId(luggageId: string): Promise<Luggage | null> {
    return new Promise((resolve) => {
      const user = auth.currentUser;
      if (!user) {
        resolve(null);
        return;
      }

      const q = query(
        collection(db, 'luggage'),
        where('userId', '==', user.uid),
        where('luggageId', '==', luggageId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data() as LuggageDocument;
          resolve({
            id: doc.id,
            ...data
          });
        } else {
          resolve(null);
        }
        unsubscribe();
      });
    });
  }

  /**
   * Start BLE scanning for nearby devices
   */
  async startBLEScan(): Promise<BLEDevice[]> {
    try {
      if (this.isScanning) {
        return [];
      }

      this.isScanning = true;
      const devices: BLEDevice[] = [];

      // Check if BLE is available
      const state = await this.bleManager.state();
      if (state !== State.PoweredOn) {
        throw new Error('Bluetooth is not available');
      }

      // Start scanning
      this.scanSubscription = this.bleManager.startDeviceScan(
        null, // Scan for all devices
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('BLE scan error:', error);
            return;
          }

          if (device) {
            devices.push({
              id: device.id,
              name: device.name || 'Unknown Device',
              rssi: device.rssi ?? undefined,
              isConnectable: device.isConnectable ?? undefined
            });
          }
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(() => {
        this.stopBLEScan();
      }, 10000);

      return devices;
    } catch (error) {
      console.error('Error starting BLE scan:', error);
      this.isScanning = false;
      throw error;
    }
  }

  /**
   * Stop BLE scanning
   */
  stopBLEScan(): void {
    if (this.scanSubscription) {
      this.scanSubscription.remove();
      this.scanSubscription = null;
    }
    this.isScanning = false;
  }

  /**
   * Start proximity monitoring for all user's luggage
   */
  async startProximityMonitoring(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Subscribe to user's luggage
      const q = query(
        collection(db, 'luggage'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      this.firestoreUnsubscribe = onSnapshot(q, async (snapshot) => {
        this.currentLuggage = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as LuggageDocument
        }));

        // Start monitoring for luggage with BLE devices
        const luggageWithBLE = this.currentLuggage.filter(l => l.bleId);
        if (luggageWithBLE.length > 0) {
          await this.monitorProximity(luggageWithBLE);
        }
      });
    } catch (error) {
      console.error('Error starting proximity monitoring:', error);
      throw error;
    }
  }

  /**
   * Monitor proximity for specific luggage items
   */
  private async monitorProximity(luggageItems: Luggage[]): Promise<void> {
    try {
      const devices = await this.startBLEScan();
      
      for (const luggage of luggageItems) {
        if (!luggage.bleId) continue;

        const device = devices.find(d => d.id === luggage.bleId);
        if (device && device.rssi !== undefined) {
          await this.updateProximityStatus(luggage, device.rssi);
        }
      }
    } catch (error) {
      console.error('Error monitoring proximity:', error);
    }
  }

  /**
   * Update proximity status based on RSSI
   */
  private async updateProximityStatus(luggage: Luggage, rssi: number): Promise<void> {
    try {
      let newStatus: 'nearby' | 'far' | 'unknown' = 'unknown';
      let shouldNotify = false;
      let notificationMessage = '';

      if (rssi >= this.proximityConfig.nearThreshold) {
        newStatus = 'nearby';
        if (luggage.proximityStatus !== 'nearby') {
          shouldNotify = true;
          notificationMessage = 'Your luggage is nearby!';
        }
      } else if (rssi <= this.proximityConfig.farThreshold) {
        newStatus = 'far';
        if (luggage.proximityStatus !== 'far') {
          shouldNotify = true;
          notificationMessage = 'Your luggage is far away!';
        }
      }

      // Update Firestore if status changed
      if (newStatus !== luggage.proximityStatus) {
        await updateDoc(doc(db, 'luggage', luggage.id), {
          proximityStatus: newStatus,
          lastSeenRSSI: rssi,
          lastSeenAt: Date.now()
        });
      }

      // Send notification if needed
      if (shouldNotify) {
        await this.sendProximityNotification(notificationMessage);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error('Error updating proximity status:', error);
    }
  }

  /**
   * Send proximity notification
   */
  private async sendProximityNotification(message: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Luggage Alert',
          body: message,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Get all user's luggage
   */
  async getUserLuggage(): Promise<Luggage[]> {
    return new Promise((resolve, reject) => {
      const user = auth.currentUser;
      if (!user) {
        reject(new Error('User not authenticated'));
        return;
      }

      const q = query(
        collection(db, 'luggage'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const luggage = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as LuggageDocument
        }));
        resolve(luggage);
        unsubscribe();
      }, (error) => {
        reject(error);
      });
    });
  }

  /**
   * Subscribe to real-time luggage updates
   */
  subscribeToLuggageUpdates(callback: (luggage: Luggage[]) => void): Unsubscribe {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const q = query(
      collection(db, 'luggage'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const luggage = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as LuggageDocument
      }));
      callback(luggage);
    });
  }

  /**
   * Stop all monitoring and cleanup
   */
  stopAllMonitoring(): void {
    this.stopBLEScan();
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = undefined;
    }
  }

  /**
   * Update proximity configuration
   */
  updateProximityConfig(config: Partial<ProximityConfig>): void {
    this.proximityConfig = { ...this.proximityConfig, ...config };
  }

  /**
   * Get current proximity configuration
   */
  getProximityConfig(): ProximityConfig {
    return { ...this.proximityConfig };
  }
}

// Export singleton instance
export const luggageService = new LuggageService();
export default luggageService;