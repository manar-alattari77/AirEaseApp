import "./src/firebase";
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, ActivityIndicator, Switch, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import useSettings from 'src/hooks/useSettings';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { ThemeProvider, useTheme } from 'src/contexts/ThemeContext';
import { ThemedText } from 'src/components/ThemedText';
import { ThemedCard } from 'src/components/ThemedCard';
import { ThemedScreen } from 'src/components/ThemedScreen';
import luggageService from 'src/services/luggageService';
import { Luggage } from 'src/types/Luggage';
import { subscribeFlight, getFlightDocId, formatFlightStatus, formatTime, shouldNotifyStatusChange, hasGateChanged } from 'src/services/flightService';
import { Flight } from 'src/types/Flight';
import TestBleScreen from 'src/screens/TestBle';
import ttsService from 'src/services/ttsService';

type TabParamList = {
  Home: undefined;
  Navigate: undefined;
  Luggage: undefined;
  Flight: undefined;
  TestBle: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function HomeScreen() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTTSTest = async () => {
    try {
      setIsPlaying(true);
      await ttsService.synthesizeText("Welcome to Airport Assistant App!");
    } catch (error) {
      console.error('TTS Error:', error);
      Alert.alert('Error', 'Failed to play audio. Please check your internet connection.');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <ThemedScreen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText variant="title">Home</ThemedText>
      <View style={{ marginTop: 20, width: '80%' }}>
        <Button 
          title={isPlaying ? "Playing Audio..." : "Test Text-to-Speech"} 
          onPress={handleTTSTest}
          disabled={isPlaying}
        />
      </View>
    </ThemedScreen>
  );
}


function NavigateScreen() {
  const steps = [
    'Walk 120m then turn right to Security A.',
    'Pass the security, follow signs to Gate B.',
    'Boarding starts in 10 minutes at Gate B12.',
  ];
  const [currentStep, setCurrentStep] = useState<number>(0);

  const onMockScan = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCurrentStep((prev) => (prev + 1) % steps.length);
  };

  return (
    <ThemedScreen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: '90%', alignItems: 'stretch' }}>
        <ThemedCard variant="elevated" style={{ marginBottom: 16, padding: 16 }}>
          <ThemedText variant="subtitle" style={{ textAlign: 'center' }}>
            {steps[currentStep]}
          </ThemedText>
        </ThemedCard>
        <Button title="Scan QR Waypoint (mock)" onPress={onMockScan} />
      </View>
    </ThemedScreen>
  );
}


// Using Luggage type from the imported interface

function LuggageTab() {
  const [luggage, setLuggage] = useState<Luggage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeLuggage = async () => {
      try {
        // Set up real-time subscription
        unsubscribe = luggageService.subscribeToLuggageUpdates((luggageList: Luggage[]) => {
          setLuggage(luggageList);
          setIsLoading(false);
        });
      } catch (err: any) {
        console.error('Error initializing luggage:', err);
        Alert.alert('Error', err?.message ?? 'Failed to initialize luggage service');
        setIsLoading(false);
      }
    };

    initializeLuggage();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleMockScan = React.useCallback(async () => {
    try {
      const qrCode = `bag:${Date.now()}`;
      const name = `Bag ${Math.floor(10000 + Math.random() * 90000)}`;
      
      await luggageService.registerLuggageFromQR(qrCode);

      // Show success feedback
      try {
        await Notifications.requestPermissionsAsync();
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Luggage Added', body: name },
          trigger: null,
        });
      } catch {}
      
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (err: any) {
      console.error('Error adding luggage:', err);
      Alert.alert('Error', err?.message ?? 'Failed to add luggage');
    }
  }, []);

  const handleDeleteLuggage = React.useCallback(async (id: string) => {
    try {
      // Note: The luggageService doesn't have a delete method in the current implementation
      // You would need to add this method to the service
      console.log('Delete luggage:', id);
      Alert.alert('Info', 'Delete functionality not implemented in luggageService');
    } catch (err: any) {
      console.error('Error deleting luggage:', err);
      Alert.alert('Error', err?.message ?? 'Failed to delete luggage');
    }
  }, []);

  if (isLoading) {
    return (
      <ThemedScreen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText variant="body">Loading luggage...</ThemedText>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: '90%' }}>
        <Button title="Mock Scan: Add Luggage" onPress={handleMockScan} />

        <ThemedText variant="subtitle" style={{ marginTop: 16, marginBottom: 8 }}>
          My Luggage
        </ThemedText>
        
        {luggage.length === 0 ? (
          <ThemedText variant="caption">No luggage added yet.</ThemedText>
        ) : (
          luggage.map((item) => (
            <ThemedCard key={item.id} variant="outlined" style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body">Luggage ID: {item.luggageId}</ThemedText>
                  <ThemedText variant="caption" style={{ marginTop: 4 }}>
                    Status: {item.proximityStatus}
                  </ThemedText>
                  <ThemedText variant="caption">
                    Added: {new Date(item.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
                <Button 
                  title="Delete" 
                  onPress={() => handleDeleteLuggage(item.id)}
                  color="#FF3B30"
                />
              </View>
            </ThemedCard>
          ))
        )}
      </View>
    </ThemedScreen>
  );
}


function FlightTab() {
  const { theme } = useTheme();
  const [flightNumber, setFlightNumber] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [previousFlight, setPreviousFlight] = useState<Flight | null>(null);

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (isSubscribed && flightNumber && date) {
      const flightId = getFlightDocId(flightNumber, date);
      unsubscribe = subscribeFlight(flightId, (flightData) => {
        if (flightData) {
          // Check for status changes that should trigger notifications
          if (previousFlight && shouldNotifyStatusChange(flightData.status)) {
            showFlightNotification(
              `Flight ${flightData.flightNumber} Status Update`,
              `Status changed to: ${formatFlightStatus(flightData.status)}`
            );
          }

          // Check for gate changes
          if (previousFlight && hasGateChanged(previousFlight.gate ?? null, flightData.gate ?? null)) {
            showFlightNotification(
              `Flight ${flightData.flightNumber} Gate Change`,
              `Gate changed to: ${flightData.gate || 'TBD'}`
            );
          }

          setPreviousFlight(flightData);
          setFlight(flightData);
        } else {
          setFlight(null);
        }
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isSubscribed, flightNumber, date, previousFlight]);

  const showFlightNotification = async (title: string, body: string) => {
    try {
      await Notifications.requestPermissionsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const onSubscribe = async () => {
    if (!flightNumber.trim() || !date.trim()) {
      Alert.alert('Error', 'Please enter both flight number and date');
      return;
    }

    setLoading(true);
    setFlight(null);
    setPreviousFlight(null);
    setIsSubscribed(true);
  };

  const onUnsubscribe = () => {
    setIsSubscribed(false);
    setFlight(null);
    setPreviousFlight(null);
  };

  return (
    <ThemedScreen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: '85%', gap: 12 }}>
        <ThemedText variant="body">Flight Number</ThemedText>
        <TextInput
          placeholder="e.g., RJ112"
          placeholderTextColor={theme.colors.text + '99'}
          value={flightNumber}
          onChangeText={setFlightNumber}
          autoCapitalize="characters"
          editable={!isSubscribed}
          style={{
            color: theme.colors.text,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16 * theme.textScale,
            backgroundColor: theme.colors.background,
            opacity: isSubscribed ? 0.6 : 1,
          }}
        />

        <ThemedText variant="body" style={{ marginTop: 8 }}>Date (YYYY-MM-DD)</ThemedText>
        <TextInput
          placeholder="2025-09-20"
          placeholderTextColor={theme.colors.text + '99'}
          value={date}
          onChangeText={setDate}
          keyboardType="numbers-and-punctuation"
          editable={!isSubscribed}
          style={{
            color: theme.colors.text,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16 * theme.textScale,
            backgroundColor: theme.colors.background,
            opacity: isSubscribed ? 0.6 : 1,
          }}
        />

        <View style={{ marginTop: 12 }}>
          {loading ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : isSubscribed ? (
            <Button title="Unsubscribe" onPress={onUnsubscribe} color="#FF3B30" />
          ) : (
            <Button title="Subscribe to Flight" onPress={onSubscribe} />
          )}
        </View>

        {flight && (
          <ThemedCard variant="elevated" style={{ marginTop: 16 }}>
            <ThemedText variant="subtitle" style={{ marginBottom: 12 }}>
              Flight {flight.flightNumber}
            </ThemedText>
            
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText variant="body">Status:</ThemedText>
                <ThemedText variant="body" style={{ 
                  color: flight.status === 'delayed' ? '#FF9500' : 
                         flight.status === 'cancelled' ? '#FF3B30' : 
                         flight.status === 'boarding' ? '#34C759' : theme.colors.text 
                }}>
                  {formatFlightStatus(flight.status)}
                </ThemedText>
              </View>

              {flight.gate && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText variant="body">Gate:</ThemedText>
                  <ThemedText variant="body">{flight.gate}</ThemedText>
                </View>
              )}

              {flight.terminal && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText variant="body">Terminal:</ThemedText>
                  <ThemedText variant="body">{flight.terminal}</ThemedText>
                </View>
              )}

              {flight.scheduledDeparture && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText variant="body">Scheduled:</ThemedText>
                  <ThemedText variant="body">{formatTime(flight.scheduledDeparture)}</ThemedText>
                </View>
              )}

              {flight.actualDeparture && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText variant="body">Actual:</ThemedText>
                  <ThemedText variant="body">{formatTime(flight.actualDeparture)}</ThemedText>
                </View>
              )}

              <ThemedText variant="caption" style={{ marginTop: 8, textAlign: 'center' }}>
                Last updated: {new Date(flight.updatedAt).toLocaleString()}
              </ThemedText>
            </View>
          </ThemedCard>
        )}

        {isSubscribed && !flight && !loading && (
          <ThemedCard variant="outlined" style={{ marginTop: 16, padding: 16 }}>
            <ThemedText variant="body" style={{ textAlign: 'center' }}>
              Flight not found. Please check the flight number and date.
            </ThemedText>
          </ThemedCard>
        )}
      </View>
    </ThemedScreen>
  );
}


function SettingsScreen() {
  const { preferences, theme, updatePreferences } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <View style={{ width: '90%' }}>
        <ThemedText variant="title" style={{ marginBottom: 16 }}>Settings</ThemedText>

        <ThemedCard variant="outlined" style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText variant="body">Voice-first mode (TTS stub)</ThemedText>
            <Switch
              value={false} // Placeholder for future voice-first feature
              onValueChange={() => {}} // Placeholder
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              thumbColor={theme.colors.foreground}
            />
          </View>
        </ThemedCard>

        <ThemedCard variant="outlined" style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText variant="body">High Contrast</ThemedText>
            <Switch
              value={preferences.highContrast}
              onValueChange={(value) => updatePreferences({ highContrast: value })}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              thumbColor={preferences.highContrast ? theme.colors.accent : theme.colors.foreground}
            />
          </View>
        </ThemedCard>

        <ThemedCard variant="outlined" style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText variant="body">Large Text</ThemedText>
            <Switch
              value={preferences.largeText}
              onValueChange={(value) => updatePreferences({ largeText: value })}
              trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              thumbColor={preferences.largeText ? theme.colors.accent : theme.colors.foreground}
            />
          </View>
        </ThemedCard>
      </View>
    </View>
  );
}

function AppContent() {
  const { theme, preferences } = useTheme();
  const [settings, , hydrated] = useSettings();
  
  const navTheme = {
    dark: !!preferences.highContrast,
    colors: {
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.accent,
      notification: theme.colors.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: 'normal' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: 'bold' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  } as const;

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ThemedText variant="title">Loading…</ThemedText>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme as any}>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text, fontSize: 18, fontWeight: '600' },
          headerTintColor: theme.colors.text,
          tabBarIcon: () => null,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.secondary,
          tabBarStyle: { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Navigate" component={NavigateScreen} />
        <Tab.Screen name="Luggage" component={LuggageTab} />
        <Tab.Screen name="Flight" component={FlightTab} />
        <Tab.Screen name="TestBle" component={TestBleScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
