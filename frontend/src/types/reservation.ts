export interface Reservation {
  id: number;
  user: {
    email: string;
  };
  user_email: string;
  parking_slot: number;
  location: number;
  location_name: string;
  slot_number: string;
  start_time: string;
  end_time: string;
  vehicle_plate: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  created_at: string;
  can_be_cancelled: boolean;
}

export interface ReservationsResponse {
  results: Reservation[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
