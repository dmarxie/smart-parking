export interface ParkingSpot {
  id: number;
  slot_number: string;
  is_occupied: boolean;
  is_reserved: boolean;
  location: number;
  current_reservation?: {
    id: number;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
    start_time: string;
    end_time: string;
    user: number;
  };
}

export interface ParkingSpotPaginatedResponse {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: ParkingSpot[];
}
