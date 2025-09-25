import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Generate a Firestore document ID for a flight
 * @param flightNumber - The flight number (e.g., "RJ112")
 * @param date - The date in YYYY-MM-DD format (e.g., "2025-12-20")
 * @returns Document ID in format "flightNumber-date"
 */
export function getFlightDocId(flightNumber: string, date: string): string {
  return `${flightNumber}-${date}`;
}

/**
 * Subscribe to real-time updates for a flight document
 * @param flightId - The flight document ID
 * @param callback - Function to call when data changes
 * @returns Unsubscribe function to stop listening
 */
export function subscribeFlight(flightId: string, callback: (data: any) => void): Unsubscribe {
  const flightRef = doc(db, 'flights', flightId);
  
  return onSnapshot(flightRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      console.log("📡 Flight update:", data);
      callback(data);
    } else {
      console.log("❌ Flight document not found:", flightId);
      callback(null);
    }
  }, (error) => {
    console.error("❌ Error listening to flight updates:", error);
    callback(null);
  });
}

/**
 * Format flight status for display
 * @param status - The flight status
 * @returns Formatted status string
 */
export function formatFlightStatus(status: string): string {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/**
 * Format time for display
 * @param timeString - ISO time string
 * @returns Formatted time string
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '—';
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return '—';
  }
}

/**
 * Check if status change should trigger notification
 * @param status - The new status
 * @returns True if notification should be sent
 */
export function shouldNotifyStatusChange(status: string): boolean {
  const importantStatuses = ['boarding', 'departed', 'arrived', 'delayed', 'cancelled'];
  return importantStatuses.includes(status?.toLowerCase());
}

/**
 * Check if gate has changed
 * @param oldGate - Previous gate
 * @param newGate - New gate
 * @returns True if gate changed
 */
export function hasGateChanged(oldGate: string | null, newGate: string | null): boolean {
  if (!oldGate && !newGate) return false;
  if (!oldGate || !newGate) return true;
  return oldGate !== newGate;
}