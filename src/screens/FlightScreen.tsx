import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { ThemedScreen } from '../components/ThemedScreen';
import { ThemedCard } from '../components/ThemedCard';
import { ThemedText } from '../components/ThemedText';
import { useTheme } from '../contexts/ThemeContext';
import { getFlightDocId, subscribeFlight, formatFlightStatus, formatTime } from '../services/flightService';

interface FlightData {
  flightNumber: string;
  status: string;
  gate?: string;
  terminal?: string;
  scheduledDeparture?: string;
  actualDeparture?: string;
  updatedAt: string;
}

export default function FlightScreen() {
  const { theme } = useTheme();
  const [flightNumber, setFlightNumber] = useState<string>('RJ112');
  const [date, setDate] = useState<string>('2025-12-20');
  const [loading, setLoading] = useState<boolean>(false);
  const [flight, setFlight] = useState<FlightData | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (isSubscribed && flightNumber && date) {
      const flightId = getFlightDocId(flightNumber, date);
      console.log(`🔍 Subscribing to flight: ${flightId}`);
      
      unsubscribe = subscribeFlight(flightId, (flightData) => {
        if (flightData) {
          console.log("📡 Flight update:", flightData);
          setFlight(flightData);
        } else {
          console.log("❌ Flight not found");
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
  }, [isSubscribed, flightNumber, date]);

  const onSubscribe = async () => {
    if (!flightNumber.trim() || !date.trim()) {
      Alert.alert('Error', 'Please enter both flight number and date');
      return;
    }

    setLoading(true);
    setFlight(null);
    setIsSubscribed(true);
  };

  const onUnsubscribe = () => {
    setIsSubscribed(false);
    setFlight(null);
  };

  const onTestSubscribe = () => {
    setFlightNumber('RJ112');
    setDate('2025-12-20');
    setLoading(true);
    setFlight(null);
    setIsSubscribed(true);
  };

  return (
    <ThemedScreen style={styles.container}>
      <View style={styles.content}>
        <ThemedText variant="title" style={styles.title}>
          Flight Tracker
        </ThemedText>

        <View style={styles.inputContainer}>
          <ThemedText variant="body" style={styles.label}>Flight Number</ThemedText>
          <TextInput
            placeholder="e.g., RJ112"
            placeholderTextColor={theme.colors.text + '99'}
            value={flightNumber}
            onChangeText={setFlightNumber}
            autoCapitalize="characters"
            editable={!isSubscribed}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
                opacity: isSubscribed ? 0.6 : 1,
              }
            ]}
          />

          <ThemedText variant="body" style={styles.label}>Date (YYYY-MM-DD)</ThemedText>
          <TextInput
            placeholder="2025-12-20"
            placeholderTextColor={theme.colors.text + '99'}
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
            editable={!isSubscribed}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
                opacity: isSubscribed ? 0.6 : 1,
              }
            ]}
          />

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator color={theme.colors.accent} size="large" />
            ) : isSubscribed ? (
              <Button title="Unsubscribe" onPress={onUnsubscribe} color="#FF3B30" />
            ) : (
              <View style={styles.buttonRow}>
                <Button title="Subscribe to Flight" onPress={onSubscribe} />
                <View style={styles.buttonSpacer} />
                <Button title="Test (RJ112)" onPress={onTestSubscribe} color="#34C759" />
              </View>
            )}
          </View>
        </View>

        {flight && (
          <ThemedCard variant="elevated" style={styles.flightCard}>
            <ThemedText variant="subtitle" style={styles.flightTitle}>
              Flight {flight.flightNumber}
            </ThemedText>
            
            <View style={styles.flightDetails}>
              <View style={styles.detailRow}>
                <ThemedText variant="body" style={styles.detailLabel}>Status:</ThemedText>
                <ThemedText 
                  variant="body" 
                  style={[
                    styles.detailValue,
                    {
                      color: flight.status === 'delayed' ? '#FF9500' : 
                             flight.status === 'cancelled' ? '#FF3B30' : 
                             flight.status === 'boarding' ? '#34C759' : 
                             flight.status === 'departed' ? '#007AFF' :
                             flight.status === 'arrived' ? '#34C759' : theme.colors.text 
                    }
                  ]}
                >
                  {formatFlightStatus(flight.status)}
                </ThemedText>
              </View>

              {flight.gate && (
                <View style={styles.detailRow}>
                  <ThemedText variant="body" style={styles.detailLabel}>Gate:</ThemedText>
                  <ThemedText variant="body" style={styles.detailValue}>{flight.gate}</ThemedText>
                </View>
              )}

              {flight.terminal && (
                <View style={styles.detailRow}>
                  <ThemedText variant="body" style={styles.detailLabel}>Terminal:</ThemedText>
                  <ThemedText variant="body" style={styles.detailValue}>{flight.terminal}</ThemedText>
                </View>
              )}

              {flight.scheduledDeparture && (
                <View style={styles.detailRow}>
                  <ThemedText variant="body" style={styles.detailLabel}>Scheduled:</ThemedText>
                  <ThemedText variant="body" style={styles.detailValue}>
                    {formatTime(flight.scheduledDeparture)}
                  </ThemedText>
                </View>
              )}

              <View style={styles.detailRow}>
                <ThemedText variant="body" style={styles.detailLabel}>Actual:</ThemedText>
                <ThemedText variant="body" style={styles.detailValue}>
                  {flight.actualDeparture ? formatTime(flight.actualDeparture) : '—'}
                </ThemedText>
              </View>

              <ThemedText variant="caption" style={styles.lastUpdated}>
                Last updated: {new Date(flight.updatedAt).toLocaleString()}
              </ThemedText>
            </View>
          </ThemedCard>
        )}

        {isSubscribed && !flight && !loading && (
          <ThemedCard variant="outlined" style={styles.errorCard}>
            <ThemedText variant="body" style={styles.errorText}>
              Flight not found. Please check the flight number and date.
            </ThemedText>
          </ThemedCard>
        )}
      </View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  label: {
    marginTop: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonSpacer: {
    width: 12,
  },
  flightCard: {
    width: '100%',
    maxWidth: 400,
    marginTop: 24,
    padding: 16,
  },
  flightTitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  flightDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontWeight: '500',
  },
  detailValue: {
    fontWeight: '600',
  },
  lastUpdated: {
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    marginTop: 24,
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    color: '#FF3B30',
  },
});
