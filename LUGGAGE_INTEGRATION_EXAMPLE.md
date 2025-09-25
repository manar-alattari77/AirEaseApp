# Luggage Screen Integration Example

To integrate the LuggageScreen into your existing App.tsx navigation, you can follow this example:

## 1. Import the LuggageScreen

Add this import to your App.tsx:

```typescript
import LuggageScreen from './src/screens/LuggageScreen';
```

## 2. Add to Tab Navigator

In your existing Tab navigator, add the LuggageScreen:

```typescript
<Tab.Screen 
  name="Luggage" 
  component={LuggageScreen}
  options={{
    title: 'Luggage',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="bag-outline" size={size} color={color} />
    ),
  }}
/>
```

## 3. Complete Example

Here's how your Tab navigator section might look:

```typescript
function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Navigate" component={NavigateScreen} />
          <Tab.Screen 
            name="Luggage" 
            component={LuggageScreen}
            options={{
              title: 'Luggage',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="bag-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen name="Flight" component={FlightScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
```

## 4. Required Imports

Make sure you have these imports at the top of your App.tsx:

```typescript
import { Ionicons } from '@expo/vector-icons';
import LuggageScreen from './src/screens/LuggageScreen';
```

## 5. App.json Permissions

Make sure your app.json includes the required permissions:

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

## 6. Testing the Integration

1. Run your app: `npm start`
2. Navigate to the Luggage tab
3. Test QR code scanning with a simple text QR code
4. Test BLE scanning (make sure Bluetooth is enabled)
5. Test proximity monitoring by moving BLE devices closer/farther

## Notes

- The LuggageScreen is fully self-contained and handles all its own state
- It automatically integrates with your existing Firebase setup
- The screen uses your existing ThemedScreen, ThemedText, and ThemedCard components
- All BLE and camera permissions are handled within the screen
- The service automatically cleans up resources when the screen unmounts
