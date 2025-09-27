export interface Flight {
  id?: string; // الـ ID اختياري
  flightNumber: string;
  status: string; // نجعلها string عامة لتجنب الأخطاء
  gate: string | null;
  terminal: string | null;
  scheduledDeparture: string;
  actualDeparture: string | null;
  updatedAt: string;
}