import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, Platform } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import * as Location from 'expo-location'; // <-- العودة للطريقة الصحيحة

const manager = new BleManager();

const TestBleScreen = () => {
  const [bluetoothState, setBluetoothState] = useState<State>(State.Unknown);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const subscription = manager.onStateChange((state) => {
      setBluetoothState(state);
    }, true);
    return () => {
      subscription.remove();
      manager.stopDeviceScan();
    };
  }, []);

  // *** الكود الصحيح والنهائي لطلب الصلاحيات ***
  const requestPermissions = async () => {
    // صلاحية الموقع ضرورية للبحث عن البلوتوث في أندرويد
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Location permission is required for Bluetooth scanning.');
      return false;
    }
    return true;
  };

  const startScan = async () => {
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) return;

    if (bluetoothState !== State.PoweredOn) {
      Alert.alert('Bluetooth is off', 'Please turn on Bluetooth to start scanning.');
      return;
    }

    setIsScanning(true);
    setDevices([]);
    
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        // هذا الخطأ يظهر عادةً إذا لم يتم منح صلاحيات البلوتوث من إعدادات النظام
        if (error.message.includes("is not authorized")) {
            Alert.alert(
                "Permissions Missing", 
                "Please grant Bluetooth permissions to AirEase in your phone's settings."
            );
        } else {
            Alert.alert('Scan Error', error.message);
        }
        setIsScanning(false);
        return;
      }
      if (device && device.name) {
        setDevices((prevDevices) => {
          if (!prevDevices.some(d => d.id === device.id)) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
      }
    });

    setTimeout(() => stopScan(), 10000);
  };

  const stopScan = () => {
    if (isScanning) {
        manager.stopDeviceScan();
        setIsScanning(false);
    }
  };

  const renderItem = ({ item }: { item: Device }) => (
    <View style={styles.deviceContainer}>
      <Text style={styles.deviceName}>{item.name || 'Unnamed Device'}</Text>
      <Text style={styles.deviceId}>ID: {item.id}</Text>
      <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BLE Test Screen</Text>
        <Text style={styles.status}>
          Bluetooth: 
          <Text style={{ color: bluetoothState === State.PoweredOn ? 'green' : 'red' }}>
            {` ${bluetoothState}`}
          </Text>
        </Text>
      </View>
      <Button 
        title={isScanning ? 'Scanning...' : 'Start Scan'} 
        onPress={startScan} 
        disabled={isScanning || bluetoothState !== State.PoweredOn}
      />
      <Text style={styles.listHeader}>Discovered Devices ({devices.length})</Text>
      {devices.length === 0 && !isScanning && (
        <View style={styles.placeholder}>
          <Text>No devices found. Tap "Start Scan" to begin.</Text>
        </View>
      )}
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    header: { marginBottom: 20, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold' },
    status: { fontSize: 18, marginTop: 5 },
    listHeader: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 5 },
    deviceContainer: { padding: 15, marginBottom: 10, backgroundColor: 'white', borderRadius: 8, elevation: 2 },
    deviceName: { fontSize: 16, fontWeight: 'bold' },
    deviceId: { fontSize: 12, color: '#666', marginTop: 5 },
    deviceRssi: { fontSize: 12, color: 'blue', marginTop: 5 },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#fff', borderRadius: 8 },
});

export default TestBleScreen;