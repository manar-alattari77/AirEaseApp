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
  Switch,
} from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { scanBarcodes } from '@react-native-ml-kit/barcode-scanning';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Luggage, BLEDevice } from '../types/Luggage';
import luggageService from '../services/luggageService';
import { ThemedScreen } from '../components/ThemedScreen';
import { ThemedText } from '../components/ThemedText';
import { ThemedCard } from '../components/ThemedCard';

export default function LuggageScreen() {
  const [luggage, setLuggage] = useState<Luggage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showBLEScanner, setShowBLEScanner] = useState(false);
  const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
  const [scanningBLE, setScanningBLE] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [selectedLuggage, setSelectedLuggage] = useState<Luggage | null>(null);
  
  const devices = useCameraDevices();
  const device = devices.back;

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const barcodes = scanBarcodes(frame);
    if (barcodes.length > 0 && !scanned) {
      runOnJS(handleQRScan)({ type: barcodes[0].format, data: barcodes[0].rawValue });
    }
  }, [scanned]);

  useEffect(() => {
    // Request camera permissions
    requestCameraPermission();
    
    // Load initial luggage data
    loadLuggage();
    
    // Subscribe to real-time updates
    const unsubscribe = luggageService.subscribeToLuggageUpdates(setLuggage);
    
    return () => {
      unsubscribe();
      luggageService.stopAllMonitoring();
    };
  }, []);

  const requestCameraPermission = async () => {
    const status = await Camera.requestCameraPermission();
    setHasPermission(status === 'granted');
    console.log(`Camera permission: ${status}`);
  };

  const loadLuggage = async () => {
    try {
      setLoading(true);
      const userLuggage = await luggageService.getUserLuggage();
      setLuggage(userLuggage);
    } catch (error) {
      console.error('Error loading luggage:', error);
      Alert.alert('Error', 'Failed to load luggage data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLuggage();
    setRefreshing(false);
  }, []);

  const handleQRScan = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setShowQRScanner(false);
    
    // Validate QR code format (you might want to add more validation)
    if (data && data.length > 0) {
      registerLuggage(data);
    } else {
      Alert.alert('Invalid QR Code', 'Please scan a valid luggage QR code');
    }
  };

  const registerLuggage = async (luggageId: string) => {
    try {
      setLoading(true);
      await luggageService.registerLuggageFromQR(luggageId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Luggage registered successfully!');
      await loadLuggage();
    } catch (error) {
      console.error('Error registering luggage:', error);
      Alert.alert('Error', 'Failed to register luggage');
    } finally {
      setLoading(false);
    }
  };

  const startBLEScan = async () => {
    try {
      setScanningBLE(true);
      setBleDevices([]);
      
      const devices = await luggageService.startBLEScan();
      setBleDevices(devices);
      
      // Auto-stop scanning after 10 seconds
      setTimeout(() => {
        setScanningBLE(false);
        luggageService.stopBLEScan();
      }, 10000);
      
    } catch (error) {
      console.error('Error scanning BLE devices:', error);
      Alert.alert('Error', 'Failed to scan for BLE devices');
      setScanningBLE(false);
    }
  };

  const linkBLEDevice = async (bleId: string) => {
    if (!selectedLuggage) {
      Alert.alert('Error', 'Please select a luggage item first');
      return;
    }

    try {
      setLoading(true);
      await luggageService.linkBLEDevice(selectedLuggage.luggageId, bleId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'BLE device linked successfully!');
      setShowBLEScanner(false);
      setSelectedLuggage(null);
      await loadLuggage();
    } catch (error) {
      console.error('Error linking BLE device:', error);
      Alert.alert('Error', 'Failed to link BLE device');
    } finally {
      setLoading(false);
    }
  };

  const toggleProximityMonitoring = async (enabled: boolean) => {
    try {
      if (enabled) {
        await luggageService.startProximityMonitoring();
        setMonitoringEnabled(true);
        Alert.alert('Monitoring Started', 'Proximity monitoring is now active');
      } else {
        luggageService.stopAllMonitoring();
        setMonitoringEnabled(false);
        Alert.alert('Monitoring Stopped', 'Proximity monitoring has been stopped');
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      Alert.alert('Error', 'Failed to toggle proximity monitoring');
    }
  };

  const getProximityStatusColor = (status: string) => {
    switch (status) {
      case 'nearby':
        return '#4CAF50'; // Green
      case 'far':
        return '#F44336'; // Red
      default:
        return '#FF9800'; // Orange
    }
  };

  const getProximityStatusText = (status: string) => {
    switch (status) {
      case 'nearby':
        return 'Nearby';
      case 'far':
        return 'Far Away';
      default:
        return 'Unknown';
    }
  };

  const renderLuggageItem = ({ item }: { item: Luggage }) => (
    <ThemedCard style={styles.luggageCard}>
      <View style={styles.luggageHeader}>
        <ThemedText style={styles.luggageId}>ID: {item.luggageId}</ThemedText>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: getProximityStatusColor(item.proximityStatus) }
        ]} />
      </View>
      
      <ThemedText style={styles.proximityStatus}>
        Status: {getProximityStatusText(item.proximityStatus)}
      </ThemedText>
      
      {item.bleId && (
        <ThemedText style={styles.bleId}>BLE: {item.bleId.substring(0, 8)}...</ThemedText>
      )}
      
      {item.lastSeenRSSI && (
        <ThemedText style={styles.rssi}>RSSI: {item.lastSeenRSSI} dBm</ThemedText>
      )}
      
      <View style={styles.luggageActions}>
        {!item.bleId && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setSelectedLuggage(item);
              setShowBLEScanner(true);
            }}
          >
            <ThemedText style={styles.linkButtonText}>Link BLE Device</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ThemedCard>
  );

  const renderBLEDevice = ({ item }: { item: BLEDevice }) => (
    <TouchableOpacity
      style={styles.bleDeviceItem}
      onPress={() => linkBLEDevice(item.id)}
    >
      <View style={styles.bleDeviceInfo}>
        <ThemedText style={styles.bleDeviceName}>{item.name}</ThemedText>
        <ThemedText style={styles.bleDeviceId}>ID: {item.id}</ThemedText>
        {item.rssi && (
          <ThemedText style={styles.bleDeviceRSSI}>RSSI: {item.rssi} dBm</ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );

  if (hasPermission === null) {
    return (
      <ThemedScreen style={styles.container}>
        <ThemedText>Requesting camera permission...</ThemedText>
      </ThemedScreen>
    );
  }

  if (hasPermission === false) {
    return (
      <ThemedScreen style={styles.container}>
        <ThemedText>Camera permission is required to scan QR codes</ThemedText>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <ThemedText style={styles.buttonText}>Grant Permission</ThemedText>
        </TouchableOpacity>
      </ThemedScreen>
    );
  }

  if (showQRScanner) {
    if (device == null) return <Text>Loading camera...</Text>;

    return (
      <View style={styles.scannerContainer}>
        <Camera
          style={{ flex: 1 }}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
        />
        <View style={styles.scannerOverlay}>
          <ThemedText style={styles.scannerText}>Scan QR Code on Luggage</ThemedText>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowQRScanner(false)}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ThemedScreen style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Luggage Tracking</ThemedText>
        
        <View style={styles.monitoringToggle}>
          <ThemedText>Proximity Monitoring</ThemedText>
          <Switch
            value={monitoringEnabled}
            onValueChange={toggleProximityMonitoring}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={monitoringEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowQRScanner(true)}
          disabled={loading}
        >
          <ThemedText style={styles.primaryButtonText}>Scan QR Code</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={startBLEScan}
          disabled={scanningBLE || loading}
        >
          <ThemedText style={styles.secondaryButtonText}>
            {scanningBLE ? 'Scanning...' : 'Scan BLE Devices'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {scanningBLE && (
        <View style={styles.scanningIndicator}>
          <ActivityIndicator size="small" color="#007AFF" />
          <ThemedText style={styles.scanningText}>Scanning for BLE devices...</ThemedText>
        </View>
      )}

      {showBLEScanner && (
        <View style={styles.bleScannerContainer}>
          <ThemedText style={styles.bleScannerTitle}>Select BLE Device to Link</ThemedText>
          <FlatList
            data={bleDevices}
            renderItem={renderBLEDevice}
            keyExtractor={(item) => item.id}
            style={styles.bleDeviceList}
          />
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowBLEScanner(false);
              setSelectedLuggage(null);
            }}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.luggageSection}>
        <ThemedText style={styles.sectionTitle}>Your Luggage ({luggage.length})</ThemedText>
        
        {loading && luggage.length === 0 ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <FlatList
            data={luggage}
            renderItem={renderLuggageItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>
                  No luggage registered yet. Scan a QR code to get started!
                </ThemedText>
              </View>
            }
          />
        )}
      </View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
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
  monitoringToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  primaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  scanningText: {
    marginLeft: 8,
    color: '#007AFF',
  },
  scannerContainer: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  bleScannerContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  bleScannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  bleDeviceList: {
    maxHeight: 200,
  },
  bleDeviceItem: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  bleDeviceInfo: {
    flex: 1,
  },
  bleDeviceName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  bleDeviceId: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  bleDeviceRSSI: {
    fontSize: 12,
    opacity: 0.7,
  },
  luggageSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  luggageCard: {
    marginBottom: 12,
    padding: 16,
  },
  luggageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  luggageId: {
    fontWeight: '600',
    fontSize: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  proximityStatus: {
    fontSize: 14,
    marginBottom: 4,
  },
  bleId: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  rssi: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  luggageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  linkButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  linkButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
