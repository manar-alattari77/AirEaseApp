# BLE Setup Commands - Complete Guide

## 🚀 Quick Start Commands

Run these commands in order to get BLE working in your Expo app:

### 1. Install Dependencies
```bash
npm install react-native-ble-plx react-native-permissions expo-dev-client expo-notifications expo-haptics
```

### 2. Prebuild for Development Client
```bash
npx expo prebuild --clean
```

### 3. Install iOS Dependencies (iOS only)
```bash
cd ios && pod install && cd ..
```

### 4. Start Development Server
```bash
npx expo start --dev-client
```

### 5. Run on Device/Simulator

**For Android:**
```bash
npx expo run:android
```

**For iOS:**
```bash
npx expo run:ios
```

## 📱 Testing the BLE Feature

1. **Open the app** on your physical device (BLE doesn't work in simulators)
2. **Navigate to the "TestBle" tab** in the bottom navigation
3. **Grant permissions** when prompted (Bluetooth, Location, Camera, Notifications)
4. **Tap "Start Scan"** to begin scanning for BLE devices
5. **Watch the countdown** - scanning will automatically stop after 10 seconds
6. **View discovered devices** with their names, IDs, RSSI values, and connection status

## 🔧 What Each Command Does

### `npm install` - Install Dependencies
- **react-native-ble-plx**: Core BLE functionality
- **react-native-permissions**: Handle platform-specific permissions
- **expo-dev-client**: Custom development client for native modules
- **expo-notifications**: Push notifications (already installed)
- **expo-haptics**: Haptic feedback (already installed)

### `npx expo prebuild --clean` - Generate Native Code
- Generates `ios/` and `android/` folders with native code
- Configures permissions from `app.json`
- Sets up BLE plugins and Info.plist entries
- The `--clean` flag ensures a fresh build

### `pod install` (iOS only) - Install iOS Dependencies
- Installs CocoaPods dependencies for iOS
- Required for BLE and permission libraries
- Only needed on macOS for iOS development

### `npx expo start --dev-client` - Start with Dev Client
- Starts the development server with dev client support
- Enables native modules like BLE
- Required for testing BLE functionality

## 🐛 Troubleshooting

### If BLE doesn't work:

1. **Check device requirements:**
   - BLE only works on physical devices, not simulators
   - Ensure Bluetooth is enabled on your device
   - Location services must be enabled (required for BLE on Android)

2. **Permission issues:**
   - Go to device Settings > Apps > Your App > Permissions
   - Enable Bluetooth, Location, Camera, and Notifications
   - On iOS: Settings > Privacy & Security > Bluetooth

3. **Build issues:**
   ```bash
   # Clean and rebuild
   npx expo prebuild --clean
   cd ios && pod install && cd ..  # iOS only
   npx expo run:android  # or npx expo run:ios
   ```

4. **BLE scan not finding devices:**
   - Ensure other BLE devices are nearby and discoverable
   - Check that the other device is in pairing/discoverable mode
   - Try moving closer to the BLE device
   - Some devices only advertise for a limited time

### Common Error Solutions:

**"Bluetooth is not available"**
- Enable Bluetooth on your device
- Restart the app after enabling Bluetooth

**"Permission denied"**
- Go to device settings and manually grant permissions
- Restart the app after granting permissions

**"No devices found"**
- Ensure other BLE devices are nearby and discoverable
- Try with a known BLE device like AirPods, smartwatch, or BLE beacon
- Check that the other device is in pairing mode

## 📋 Pre-flight Checklist

Before running the commands, ensure:

- [ ] You have a physical device (BLE doesn't work in simulators)
- [ ] Bluetooth is enabled on your device
- [ ] Location services are enabled (required for BLE on Android)
- [ ] You're using Expo SDK 54+ (already configured)
- [ ] You have the latest Expo CLI: `npm install -g @expo/cli`

## 🎯 Expected Results

After running all commands successfully:

1. **App builds and installs** on your device
2. **TestBle tab appears** in the bottom navigation
3. **Permissions are requested** when you first open the TestBle screen
4. **BLE scanning works** and shows nearby devices
5. **Device information displays** including name, ID, RSSI, and connection status
6. **Auto-stop after 10 seconds** with haptic feedback

## 🔄 Development Workflow

For ongoing development:

1. **Make code changes** to your React Native files
2. **Save the files** - hot reload will update the app
3. **For native changes** (like adding new permissions), run:
   ```bash
   npx expo prebuild --clean
   npx expo run:android  # or npx expo run:ios
   ```

## 📱 Device-Specific Notes

### Android
- Requires location permission for BLE scanning
- May need to enable "Location" in device settings
- Some devices require "Allow location access" for Bluetooth

### iOS
- Requires Bluetooth permission in Info.plist (already configured)
- May prompt for location permission when using BLE
- Works best on iOS 13+ devices

## 🚨 Important Notes

- **BLE only works on physical devices** - simulators don't support BLE
- **Location services must be enabled** for BLE scanning on Android
- **Some BLE devices** only advertise for a few seconds at a time
- **Distance matters** - BLE has limited range (typically 10-30 meters)
- **Interference** from other devices can affect scanning

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ App installs without errors
2. ✅ TestBle tab is visible and accessible
3. ✅ Permissions are granted without issues
4. ✅ "Start Scan" button works and shows countdown
5. ✅ Nearby BLE devices appear in the list
6. ✅ Device information shows correctly (name, ID, RSSI)
7. ✅ Scan automatically stops after 10 seconds
8. ✅ Haptic feedback works on scan start/stop

If you see all these indicators, your BLE setup is complete and working! 🎊
