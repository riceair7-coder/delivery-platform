export type DeliveryStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'van';

export interface Package {
  id: string;
  trackingNumber: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  addressDetail: string;
  lat: number;
  lng: number;
  weight: number; // kg
  volume: number; // cm³
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  pinCode?: string;
}

export interface DeliveryItem {
  id: string;
  package: Package;
  status: DeliveryStatus;
  order: number; // delivery sequence
  estimatedArrival?: string;
  actualArrival?: string;
  completedAt?: string;
  proofType?: 'photo' | 'signature' | 'pin';
  proofData?: string;
  failureReason?: string;
  distanceFromPrev?: number; // meters
  durationFromPrev?: number; // seconds
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  currentLat?: number;
  currentLng?: number;
  // 종점 (Open TSP용 퇴근지)
  homeAddress?: string;
  homeLat?: number;
  homeLng?: number;
  isOnline: boolean;
  todayCompleted: number;
  todayFailed: number;
  estimatedEarnings: number;
}

export interface Route {
  id: string;
  driverId: string;
  date: string;
  deliveries: DeliveryItem[];
  totalDistance: number; // meters
  estimatedDuration: number; // seconds
  optimized: boolean;
  startTime?: string;
  endTime?: string;
}

export interface CustomerNotification {
  packageId: string;
  type: 'departed' | 'nearby' | 'delivered' | 'failed';
  message: string;
  eta?: string;
  timestamp: string;
}

export interface TrafficAlert {
  type: 'accident' | 'construction' | 'closure' | 'weather';
  description: string;
  lat: number;
  lng: number;
  severity: 'low' | 'medium' | 'high';
  affectedArea: number; // radius in meters
}
