import "./src/firebase";
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TextInput, Button, ActivityIndicator, Switch, Alert, TouchableOpacity, Image } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { FontAwesome, Ionicons } from '@expo/vector-icons';

import useSettings from 'src/hooks/useSettings';
import { ThemeProvider, useTheme } from 'src/contexts/ThemeContext';
import { ThemedText } from 'src/components/ThemedText';
import { ThemedCard } from 'src/components/ThemedCard';
import { ThemedScreen } from 'src/components/ThemedScreen';
import { Flight } from 'src/types/Flight';
import { getFlightStatusFromAPI, formatFlightStatus, formatTime } from 'src/services/flightService';
import TestBleScreen from 'src/screens/TestBle';
import ttsService from 'src/services/ttsService';

type TabParamList = {
  Home: undefined;
  Flight: undefined;
  TestBle: undefined;
  SignLanguage: undefined;
  AirportMap: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function HomeScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const handleTTSTest = async () => {
    try {
      setIsPlaying(true);
      await ttsService.synthesizeText("Welcome! Press the microphone and say a command.");
    } catch (error) { console.error('TTS Error:', error); Alert.alert('Error', 'Failed to play audio.'); }
    finally { setIsPlaying(false); }
  };
  return (
    <ThemedScreen style={styles.screenContainer}>
      <ThemedText variant="title">AirEase</ThemedText>
      <ThemedText variant="subtitle" style={{textAlign: 'center', marginVertical: 15}}>Your Smart Airport Companion</ThemedText>
      <View style={{ width: '80%' }}>
        <Button title={isPlaying ? "Playing Audio..." : "Test Welcome Message"} onPress={handleTTSTest} disabled={isPlaying} />
      </View>
    </ThemedScreen>
  );
}

function FlightTab() {
  const { theme } = useTheme();
  const [flightNumber, setFlightNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const handleSearchFlight = async () => {
    if (!flightNumber.trim()) { Alert.alert('Error', 'Please enter a flight number'); return; }
    setLoading(true); setFlight(null);
    try {
      const flightData = await getFlightStatusFromAPI(flightNumber);
      if (flightData) setFlight(flightData);
      else Alert.alert('Not Found', 'Flight could not be found.');
    } catch (error: any) { Alert.alert('Error', error.message || 'An error occurred.'); }
    finally { setLoading(false); }
  };
  const handleClear = () => { setFlight(null); setFlightNumber(''); };
  return (
    <ThemedScreen style={{padding: 20}}>
      <View style={{ width: '100%', gap: 12 }}>
        <ThemedText variant="body">Flight Number</ThemedText>
        <TextInput placeholder="e.g., RJ112" value={flightNumber} onChangeText={setFlightNumber} autoCapitalize="characters" editable={!flight} style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background, opacity: flight ? 0.6 : 1 }]} />
        <View style={{ marginTop: 12 }}>
          {loading ? <ActivityIndicator /> : flight ? <Button title="Clear Search" onPress={handleClear} color="#FF3B30" /> : <Button title="Search Flight" onPress={handleSearchFlight} />}
        </View>
        {flight && <ThemedCard variant="elevated" style={{ marginTop: 16 }}>
          <ThemedText variant="subtitle" style={{ marginBottom: 12 }}>Flight {flight.flightNumber}</ThemedText>
          <View style={{ gap: 8 }}>
            <View style={styles.row}><ThemedText>Status:</ThemedText><ThemedText>{formatFlightStatus(flight.status)}</ThemedText></View>
            {flight.gate && <View style={styles.row}><ThemedText>Gate:</ThemedText><ThemedText>{flight.gate}</ThemedText></View>}
            {flight.terminal && <View style={styles.row}><ThemedText>Terminal:</ThemedText><ThemedText>{flight.terminal}</ThemedText></View>}
            {flight.scheduledDeparture && <View style={styles.row}><ThemedText>Scheduled:</ThemedText><ThemedText>{formatTime(flight.scheduledDeparture)}</ThemedText></View>}
            <ThemedText variant="caption" style={{ marginTop: 8, textAlign: 'center' }}>Last updated: {new Date(flight.updatedAt).toLocaleTimeString()}</ThemedText>
          </View>
        </ThemedCard>}
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
        <ThemedCard variant="outlined" style={{ marginBottom: 12 }}><View style={styles.row}><ThemedText>High Contrast</ThemedText><Switch value={preferences.highContrast} onValueChange={(v) => updatePreferences({ highContrast: v })} /></View></ThemedCard>
        <ThemedCard variant="outlined"><View style={styles.row}><ThemedText>Large Text</ThemedText><Switch value={preferences.largeText} onValueChange={(v) => updatePreferences({ largeText: v })} /></View></ThemedCard>
      </View>
    </View>
  );
}

function SignLanguageScreen() {
  const [activeGif, setActiveGif] = useState<any>(null);
  const [spokenText, setSpokenText] = useState<string>('');
  const handleSignSelection = (sign: 'help' | 'bathroom' | 'thank you') => {
    let gifSource; let textToShow = '';
    if (sign === 'help') { gifSource = require('./assets/help.gif'); textToShow = 'Help'; }
    else if (sign === 'bathroom') { gifSource = require('./assets/bathroom.gif'); textToShow = 'Bathroom'; }
    else if (sign === 'thank you') { gifSource = require('./assets/thankyou.gif'); textToShow = 'Thank You'; }
    setActiveGif(gifSource); setSpokenText(textToShow); ttsService.synthesizeText(textToShow);
  };
  return (
    <ThemedScreen style={styles.screenContainer}>
      <ThemedText variant="title">Text to Sign Language (Demo)</ThemedText>
      <ThemedText variant="body" style={{ textAlign: 'center', marginVertical: 15 }}>Select a phrase to see its translation.</ThemedText>
      <View style={{ width: '90%', gap: 10 }}><Button title="Translate: 'Help'" onPress={() => handleSignSelection('help')} /><Button title="Translate: 'Bathroom'" onPress={() => handleSignSelection('bathroom')} /><Button title="Translate: 'Thank You'" onPress={() => handleSignSelection('thank you')} /></View>
      {activeGif && <View style={{ marginTop: 20, alignItems: 'center' }}><ThemedText variant="subtitle" style={{marginBottom: 10}}>{spokenText}</ThemedText><Image source={activeGif} style={styles.gifImage} /></View>}
    </ThemedScreen>
  );
}

function AirportMapScreen() {
  const [showGate, setShowGate] = useState(false);
  const [gateLocation] = useState({ top: 180, left: 220 });
  const handleFindGate = () => { setShowGate(true); ttsService.synthesizeText("Showing Gate B5 on the map."); };
  return (
    <ThemedScreen style={{ alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 20 }}>
      <ThemedText variant="title" style={{ marginBottom: 15 }}>Airport Map (Demo)</ThemedText>
      <View>
        <Image source={require('./assets/map.png')} style={styles.mapImage} />
        {showGate && <View style={[styles.gateMarker, { top: gateLocation.top, left: gateLocation.left }]}><ThemedText style={{color: 'white', fontWeight: 'bold'}}>B5</ThemedText></View>}
      </View>
      <View style={{marginTop: 20, width: '80%'}}><Button title={showGate ? "Gate B5 Located!" : "Where is my Gate B5?"} onPress={handleFindGate} disabled={showGate} /></View>
    </ThemedScreen>
  );
}

function VoiceAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [demoStep, setDemoStep] = useState(0);
  const demoCommands = [
    { text: "flight status", navigateTo: "Flight" as keyof TabParamList, response: "Navigating to flight status." },
    { text: "track luggage", navigateTo: "TestBle" as keyof TabParamList, response: "Opening luggage tracker." },
    { text: "translate sign language", navigateTo: "SignLanguage" as keyof TabParamList, response: "Opening sign language translator." },
    { text: "show map", navigateTo: "AirportMap" as keyof TabParamList, response: "Showing the airport map." },
  ];
  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Microphone permission is needed.'); return; }
    setIsRecording(true);
  };
  const stopRecording = () => {
    setIsRecording(false); setIsLoading(true);
    setTimeout(() => {
      const commandToExecute = demoCommands[demoStep];
      handleVoiceCommand(commandToExecute);
      setDemoStep((prevStep) => (prevStep + 1) % demoCommands.length);
      setIsLoading(false);
    }, 1500);
  };
  const handleVoiceCommand = (command: { response: string, navigateTo: keyof TabParamList }) => {
    ttsService.synthesizeText(command.response);
    navigation.navigate(command.navigateTo);
  };
  return (
    <TouchableOpacity style={styles.voiceButton} onPress={isRecording ? stopRecording : startRecording} disabled={isLoading}>
      {isLoading ? <ActivityIndicator color="#fff" /> : <FontAwesome name={isRecording ? "stop-circle" : "microphone"} size={28} color="white" />}
    </TouchableOpacity>
  );
}

function AppContent() {
  const { theme, preferences } = useTheme();
  const [, , hydrated] = useSettings();
  const navTheme = {
    dark: !!preferences.highContrast,
    colors: { background: theme.colors.background, card: theme.colors.card, text: theme.colors.text, border: theme.colors.border, primary: theme.colors.accent, notification: theme.colors.accent },
    fonts: {} as any,
  };
  if (!hydrated) return <View style={styles.container}><ActivityIndicator /></View>;
  return (
    <NavigationContainer theme={navTheme as any}>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarStyle: { backgroundColor: theme.colors.background },
          tabBarIcon: ({ color, size }) => {
            let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'alert-circle';
            if (route.name === 'Home') iconName = 'home-outline';
            else if (route.name === 'Flight') iconName = 'airplane-outline';
            else if (route.name === 'TestBle') iconName = 'briefcase-outline';
            else if (route.name === 'SignLanguage') iconName = 'language-outline';
            else if (route.name === 'AirportMap') iconName = 'map-outline';
            else if (route.name === 'Settings') iconName = 'settings-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Flight" component={FlightTab} />
        <Tab.Screen name="TestBle" component={TestBleScreen} options={{title: 'Luggage'}} />
        <Tab.Screen name="SignLanguage" component={SignLanguageScreen} options={{title: 'Sign Language'}}/>
        <Tab.Screen name="AirportMap" component={AirportMapScreen} options={{title: 'Airport Map'}}/>
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <VoiceAssistant />
    </NavigationContainer>
  );
}

export default function App() { return <ThemeProvider><AppContent /></ThemeProvider>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  screenContainer: { alignItems: 'center', justifyContent: 'center', padding: 20, gap: 15 },
  voiceButton: { position: 'absolute', bottom: 80, right: 20, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  textInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gifImage: { width: 250, height: 250, borderRadius: 10, borderWidth: 1, borderColor: '#ccc' },
  mapImage: { width: 380, height: 380, resizeMode: 'contain', borderWidth: 1, borderColor: '#ccc' },
  gateMarker: { position: 'absolute', width: 40, height: 40, backgroundColor: 'rgba(255, 0, 0, 0.7)', borderRadius: 20, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
});