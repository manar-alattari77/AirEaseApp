// --- الجزء الجديد الخاص بـ API ---

const API_KEY = process.env.EXPO_PUBLIC_AERODATABOX_API_KEY;
const API_BASE_URL = 'https://aerodatabox.p.rapidapi.com/flights/number';

export async function getFlightStatusFromAPI(flightNumber: string) {
  if (!API_KEY) {
    throw new Error("AeroDataBox API key is missing from .env file!");
  }
  
  // ننظف رقم الرحلة من أي مسافات
  const cleanedFlightNumber = flightNumber.replace(/\s/g, '');
  const url = `${API_BASE_URL}/${cleanedFlightNumber}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error('Flight not found or API error. Try a different flight number.');
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const flight = data[0];
      // نقوم بتحويل البيانات إلى الشكل الذي يتوقعه تطبيقك
      return {
        flightNumber: flight.number,
        status: flight.status,
        gate: flight.departure?.gate,
        terminal: flight.departure?.terminal,
        scheduledDeparture: flight.departure?.scheduledTimeLocal,
        actualDeparture: flight.departure?.actualTimeLocal,
        updatedAt: new Date().toISOString() // نضيف وقت التحديث
      } as import('src/types/Flight').Flight; // نؤكد على النوع
    } else {
      return null; // لم يتم العثور على الرحلة
    }

  } catch (error) {
    console.error("Error in getFlightStatusFromAPI:", error);
    throw error;
  }
}


// --- الدوال المساعدة القديمة (يمكنك تركها لأنها مفيدة) ---

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

// الدوال التالية لم نعد نستخدمها مباشرة مع الـ API ولكن يمكن تركها
export function getFlightDocId(flightNumber: string, date: string): string {
  return `${flightNumber}-${date}`;
}

export function shouldNotifyStatusChange(status: string): boolean {
  const importantStatuses = ['boarding', 'departed', 'arrived', 'delayed', 'cancelled'];
  return importantStatuses.includes(status?.toLowerCase());
}

export function hasGateChanged(oldGate: string | null, newGate: string | null): boolean {
  if (!oldGate && !newGate) return false;
  if (!oldGate || !newGate) return true;
  return oldGate !== newGate;
}