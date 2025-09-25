import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import * as Haptics from 'expo-haptics';
import { ThemedScreen } from '../components/ThemedScreen';
import { ThemedText } from '../components/ThemedText';
import { ThemedCard } from '../components/ThemedCard';
import { permissionManager, PermissionResult } from '../utils/permissions';

interface BLEDeviceInfo {
  id: string;
  name: string | null;
  rssi: number | undefined;
  isConnectable: boolean | undefined;
  serviceUUIDs: string[] | null;
  discoveredAt: number;
}

export default function TestBleScreen() {
  const [bleManager] = useState(() => new BleManager());
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BLEDeviceInfo[]>([]);
  const [permissions, setPermissions] = useState<PermissionResult | null>(null);
  const [bluetoothState, setBluetoothState] = useState<State>(State.Unknown);
  const [scanningTimeLeft, setScanningTimeLeft] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const SCAN_DURATION = 10; // 10 seconds

  useEffect(() => {
    initializeBLE();
    checkPermissions();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeBLE = async () => {
    try {
      // Check if BLE is available
      const state = await bleManager.state();
      setBluetoothState(state);
      
      // Set up state change listener
      const subscription = bleManager.onStateChange((state) => {
        setBluetoothState(state);
        if (state === State.PoweredOff) {
          setIsScanning(false);
          setDevices([]);
        }
      });

      return () => subscription.remove();
    } catch (error) {
      console.error('Error initializing BLE:', error);
      Alert.alert('BLE Error', 'Failed to initialize Bluetooth');
    }
  };

  const checkPermissions = async () => {
    try {
      const hasPermissions = await permissionManager.checkAllPermissions();
      if (!hasPermissions) {
        const permissionResults = await permissionManager.requestAllPermissions();
        setPermissions(permissionResults);
      } else {
        setPermissions({
          bluetooth: 'granted' as any,
          location: 'granted' as any,
          camera: 'granted' as any,
          notifications: 'granted' as any,
        });
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      Alert.alert('Permission Error', 'Failed to check permissions');
    }
  };

  const cleanup = () => {
    try {
      if (isScanning) {
        bleManager.stopDeviceScan();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const startScan = async () => {
    try {
      // Check Bluetooth state
      if (bluetoothState !== State.PoweredOn) {
        Alert.alert(
          'Bluetooth Required',
          'Please enable Bluetooth to scan for devices.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // In a real app, you might want to open Bluetooth settings
              console.log('Open Bluetooth settings');
            }}
          ]
        );
        return;
      }

      // Check permissions
      if (!permissions || !permissions.bluetooth || permissions.bluetooth !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Bluetooth permission is required to scan for devices.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Grant Permission', onPress: checkPermissions }
          ]
        );
        return;
      }

      setIsScanning(true);
      setDevices([]);
      setScanningTimeLeft(SCAN_DURATION);

      // Start scanning
      bleManager.startDeviceScan(
        null, // Scan for all devices
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('BLE scan error:', error);
            setIsScanning(false);
            Alert.alert('Scan Error', error.message);
            return;
          }

          if (device) {
            const deviceInfo: BLEDeviceInfo = {
              id: device.id,
              name: device.name,
              rssi: device.rssi ?? undefined,
              isConnectable: device.isConnectable ?? undefined,
              serviceUUIDs: device.serviceUUIDs,
              discoveredAt: Date.now(),
            };

            setDevices(prevDevices => {
              // Update existing device or add new one
              const existingIndex = prevDevices.findIndex(d => d.id === device.id);
              if (existingIndex >= 0) {
                const updatedDevices = [...prevDevices];
                updatedDevices[existingIndex] = deviceInfo;
                return updatedDevices;
              } else {
                return [...prevDevices, deviceInfo];
              }
            });
          }
        }
      );

      // Auto-stop scanning after duration
      const countdown = setInterval(() => {
        setScanningTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdown);
            stopScan();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting scan:', error);
      setIsScanning(false);
      Alert.alert('Scan Error', 'Failed to start scanning');
    }
  };

  const stopScan = () => {
    try {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      setScanningTimeLeft(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkPermissions();
    setRefreshing(false);
  }, []);

  const getBluetoothStateText = (state: State): string => {
    switch (state) {
      case State.PoweredOn:
        return 'Powered On';
      case State.PoweredOff:
        return 'Powered Off';
      case State.Unauthorized:
        return 'Unauthorized';
      case State.Unsupported:
        return 'Unsupported';
      case State.Unknown:
        return 'Unknown';
      default:
        return 'Unknown';
    }
  };

  const getBluetoothStateColor = (state: State): string => {
    switch (state) {
      case State.PoweredOn:
        return '#4CAF50'; // Green
      case State.PoweredOff:
        return '#F44336'; // Red
      case State.Unauthorized:
        return '#FF9800'; // Orange
      case State.Unsupported:
        return '#9E9E9E'; // Gray
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const renderDevice = ({ item }: { item: BLEDeviceInfo }) => (
    <ThemedCard style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <ThemedText style={styles.deviceName}>
          {item.name || 'Unknown Device'}
        </ThemedText>
        <View style={[
          styles.connectableIndicator,
          { backgroundColor: item.isConnectable ? '#4CAF50' : '#F44336' }
        ]} />
      </View>
      
      <ThemedText style={styles.deviceId}>ID: {item.id}</ThemedText>
      
      {item.rssi !== null && (
        <ThemedText style={styles.deviceRSSI}>
          RSSI: {item.rssi} dBm
        </ThemedText>
      )}
      
      {item.serviceUUIDs && item.serviceUUIDs.length > 0 && (
        <ThemedText style={styles.deviceServices}>
          Services: {item.serviceUUIDs.length}
        </ThemedText>
      )}
      
      <ThemedText style={styles.deviceTime}>
        Found: {new Date(item.discoveredAt).toLocaleTimeString()}
      </ThemedText>
    </ThemedCard>
  );

  const renderPermissionStatus = () => {
    if (!permissions) return null;

    return (
      <ThemedCard style={styles.permissionCard}>
        <ThemedText style={styles.permissionTitle}>Permission Status</ThemedText>
        
        {Object.entries(permissions).map(([key, status]) => (
          <View key={key} style={styles.permissionRow}>
            <ThemedText style={styles.permissionLabel}>
              {key.charAt(0).toUpperCase() + key.slice(1)}:
            </ThemedText>
            <View style={[
              styles.permissionStatus,
              { backgroundColor: permissionManager.getPermissionStatusColor(status) }
            ]}>
              <ThemedText style={styles.permissionStatusText}>
                {permissionManager.getPermissionStatusText(status)}
              </ThemedText>
            </View>
          </View>
        ))}
      </ThemedCard>
    );
  };

  return (
    <ThemedScreen style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>BLE Test Screen</ThemedText>
          
          <View style={styles.bluetoothStatus}>
            <ThemedText style={styles.statusLabel}>Bluetooth:</ThemedText>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: getBluetoothStateColor(bluetoothState) }
            ]}>
              <ThemedText style={styles.statusText}>
                {getBluetoothStateText(bluetoothState)}
              </ThemedText>
            </View>
          </View>
        </View>

        {renderPermissionStatus()}

        <View style={styles.scanSection}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              isScanning && styles.scanButtonActive
            ]}
            onPress={isScanning ? stopScan : startScan}
            disabled={bluetoothState !== State.PoweredOn}
          >
            <ThemedText style={styles.scanButtonText}>
              {isScanning ? 'Stop Scan' : 'Start Scan'}
            </ThemedText>
          </TouchableOpacity>

          {isScanning && (
            <View style={styles.scanningInfo}>
              <ActivityIndicator size="small" color="#007AFF" />
              <ThemedText style={styles.scanningText}>
                Scanning... {scanningTimeLeft}s remaining
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.devicesSection}>
          <ThemedText style={styles.sectionTitle}>
            Discovered Devices ({devices.length})
          </ThemedText>
          
          {devices.length === 0 ? (
            <ThemedCard style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                {isScanning 
                  ? 'Scanning for devices...' 
                  : 'No devices found. Tap "Start Scan" to begin.'
                }
              </ThemedText>
            </ThemedCard>
          ) : (
            <FlatList
              data={devices}
              renderItem={renderDevice}
              keyExtractor={(item) => item.id}
              style={styles.deviceList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bluetoothStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  permissionCard: {
    marginBottom: 20,
    padding: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  permissionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scanSection: {
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanButtonActive: {
    backgroundColor: '#F44336',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanningInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    marginLeft: 8,
    color: '#007AFF',
    fontWeight: '500',
  },
  devicesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  deviceList: {
    flex: 1,
  },
  deviceCard: {
    marginBottom: 12,
    padding: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  connectableIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  deviceId: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  deviceRSSI: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  deviceServices: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  deviceTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
  },
});
