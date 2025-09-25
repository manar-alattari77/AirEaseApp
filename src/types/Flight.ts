export interface Flight {
  id: string; // flightNumber-date format
  flightNumber: string;
  date: string;
  status: 'scheduled' | 'boarding' | 'delayed' | 'cancelled' | 'departed';
  gate?: string;
  terminal?: string;
  scheduledDeparture?: string; // ISO time string
  actualDeparture?: string; // ISO time string
  updatedAt: number; // timestamp
}

export interface FlightDocument {
  flightNumber: string;
  date: string;
  status: 'scheduled' | 'boarding' | 'delayed' | 'cancelled' | 'departed';
  gate?: string;
  terminal?: string;
  scheduledDeparture?: string;
  actualDeparture?: string;
  updatedAt: number;
}
