# Luggage Tracking Feature Setup Guide

This guide will help you set up the luggage tracking feature in your React Native Expo app.

## Prerequisites

Make sure you have the following dependencies installed:

```bash
npm install react-native-ble-plx
```

The following dependencies should already be in your package.json:
- `react-native-vision-camera`
- `@react-native-ml-kit/barcode-scanning`
- `expo-haptics`
- `expo-notifications`
- `firebase`

## Firebase Setup

### 1. Firestore Security Rules

Deploy the security rules to your Firebase project:

```bash
firebase deploy --only firestore:rules
```

The rules ensure that:
- Only authenticated users can access luggage data
- Users can only read/write their own luggage
- Data validation for required fields

### 2. Firestore Collection Structure

The luggage collection will have documents with this structure:

```typescript
{
  luggageId: string,        // From QR code
  bleId?: string,           // BLE device UUID (optional)
  userId: string,           // Firebase UID
  createdAt: number,       // Timestamp
  proximityStatus: 'nearby' | 'far' | 'unknown',
  lastSeenRSSI?: number,    // Last RSSI reading
  lastSeenAt?: number       // Last seen timestamp
}
```

## App Configuration

### 1. Permissions Setup

Add the following permissions to your `app.json`:

```json
{
  "expo": {
    "permissions": [
      "CAMERA",
      "BLUETOOTH",
      "BLUETOOTH_ADMIN",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION"
    ],
    "plugins": [
      "expo-notifications",
      "expo-dev-client",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 35,
            "kotlinVersion": "2.0.0"
          }
        }
      ]
    ]
  }
}
```

### 2. BLE Configuration (Android)

For Android, add to your `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

## Usage Examples

### 1. Basic Usage in Your App

```typescript
import LuggageScreen from './src/screens/LuggageScreen';

// Add to your navigation stack
<LuggageScreen />
```

### 2. Programmatic Usage

```typescript
import luggageService from './src/services/luggageService';

// Register luggage from QR code
const luggageId = await luggageService.registerLuggageFromQR('LUGGAGE_123');

// Link BLE device
await luggageService.linkBLEDevice('LUGGAGE_123', 'BLE_DEVICE_UUID');

// Start proximity monitoring
await luggageService.startProximityMonitoring();

// Get user's luggage
const userLuggage = await luggageService.getUserLuggage();

// Subscribe to real-time updates
const unsubscribe = luggageService.subscribeToLuggageUpdates((luggage) => {
  console.log('Luggage updated:', luggage);
});
```

### 3. Custom Proximity Configuration

```typescript
// Update proximity thresholds
luggageService.updateProximityConfig({
  nearThreshold: -45,  // RSSI for "nearby"
  farThreshold: -85,  // RSSI for "far"
  scanInterval: 3000   // Scan every 3 seconds
});
```

## Features

### QR Code Registration
- Scan QR codes on luggage tags
- Automatic registration in Firestore
- Haptic feedback on success/error

### BLE Proximity Tracking
- Scan for nearby BLE devices
- Link BLE tags to luggage
- Continuous RSSI monitoring
- Automatic proximity status updates

### Real-time Notifications
- Local push notifications for proximity changes
- Haptic feedback for status changes
- Configurable thresholds

### Firestore Integration
- Real-time data synchronization
- Offline support with Firebase persistence
- Secure user-based access control

## Troubleshooting

### BLE Issues
- Ensure Bluetooth is enabled on the device
- Check location permissions (required for BLE on Android)
- Verify BLE device is in range and discoverable

### Camera Issues
- Grant camera permissions
- Ensure QR code is well-lit and in focus
- Check QR code format is valid

### Notification Issues
- Request notification permissions
- Check notification settings in device settings
- Verify notification handler is properly configured

### Firestore Issues
- Ensure Firebase is properly configured
- Check security rules are deployed
- Verify user authentication

## Testing

### 1. QR Code Testing
Create test QR codes with simple text like "LUGGAGE_001", "LUGGAGE_002", etc.

### 2. BLE Testing
Use any BLE device or beacon for testing. The app will show all discoverable devices.

### 3. Proximity Testing
- Move BLE device closer/farther to test proximity detection
- Adjust thresholds in `ProximityConfig` for your environment
- Monitor console logs for RSSI values

## Security Considerations

- All luggage data is user-scoped (users can only access their own data)
- BLE device IDs are not sensitive (they're discoverable)
- QR codes should contain non-sensitive identifiers
- Consider implementing additional validation for QR code format

## Performance Notes

- BLE scanning is resource-intensive, so it's limited to 10-second intervals
- Proximity monitoring can be toggled on/off to save battery
- Firestore real-time listeners are automatically cleaned up
- Consider implementing background task limitations for production
