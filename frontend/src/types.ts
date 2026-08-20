export type Role = "CUSTOMER" | "AGENT" | "ADMIN";
export type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RESCHEDULED"
  | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  agentProfile?: AgentProfile | null;
  customerProfile?: CustomerProfile | null;
}

export interface CustomerProfile {
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
}

export interface AgentProfile {
  id: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  isAvailable: boolean;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  currentZoneId?: string | null;
  locationUpdatedAt?: string | null;
  currentZone?: Zone | null;
  user?: { id: string; name: string; email: string; phone?: string | null };
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  centroidLat?: number | null;
  centroidLng?: number | null;
  areas?: ZoneArea[];
}

export interface ZoneArea {
  id: string;
  pincode?: string | null;
  areaName?: string | null;
  city?: string | null;
}

export interface RateCard {
  id: string;
  name: string;
  orderType: "B2B" | "B2C";
  rateScope: "INTRA_ZONE" | "INTER_ZONE";
  sourceZoneId?: string | null;
  destinationZoneId?: string | null;
  baseRate: string | number;
  perKgRate: string | number;
  minimumChargeableWeight: string | number;
  volumetricDivisor: number;
  codSurcharge: string | number;
  active: boolean;
  sourceZone?: Zone | null;
  destinationZone?: Zone | null;
}

export interface PriceQuote {
  pickupZone: { id: string; code: string; name: string };
  dropZone: { id: string; code: string; name: string };
  pickup?: {
    id: string;
    code: string;
    name: string;
    pincode: string;
    areaName: string | null;
    city: string | null;
    method: string;
  };
  drop?: {
    id: string;
    code: string;
    name: string;
    pincode: string;
    areaName: string | null;
    city: string | null;
    method: string;
  };
  pickupAddress?: string;
  dropAddress?: string;
  length?: number;
  breadth?: number;
  height?: number;
  zoneScope: "INTRA_ZONE" | "INTER_ZONE";
  orderType: "B2B" | "B2C";
  paymentType: "PREPAID" | "COD";
  actualWeight: number;
  volumetricWeight: number;
  billableWeight: number;
  rateCardName: string;
  baseRate: number;
  perKgRate: number;
  shippingCharge: number;
  weightCharge: number;
  codSurcharge: number;
  totalCharge: number;
}

export interface ServiceLocation {
  id: string;
  locality: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  isActive: boolean;
}

export interface StatusHistory {
  id: string;
  status: OrderStatus;
  timestamp: string;
  note?: string | null;
  actor?: { id: string; name: string; role: Role } | null;
}

export interface DeliveryAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  reason?: string | null;
  notes?: string | null;
  attemptedAt: string;
  rescheduledDate?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  pickupAddress: string;
  dropAddress: string;
  pickupPincode?: string | null;
  dropPincode?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  length: string | number;
  breadth: string | number;
  height: string | number;
  actualWeight: string | number;
  volumetricWeight: string | number;
  billableWeight: string | number;
  orderType: "B2B" | "B2C";
  paymentType: "PREPAID" | "COD";
  baseCharge: string | number;
  perKgRate: string | number;
  shippingCharge: string | number;
  codSurcharge: string | number;
  totalCharge: string | number;
  scheduledDeliveryDate?: string | null;
  createdAt: string;
  customer?: User;
  assignedAgent?: AgentProfile | null;
  pickupZone?: Zone | null;
  dropZone?: Zone | null;
  statusHistory?: StatusHistory[];
  attempts?: DeliveryAttempt[];
}

export interface NotificationItem {
  id: string;
  eventType: string;
  subject?: string | null;
  body: string;
  status: string;
  recipient: string;
  createdAt: string;
  order?: { orderNumber: string } | null;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ path: string; message: string }>;
}
