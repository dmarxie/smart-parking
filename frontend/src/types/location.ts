export interface Location {
  id: number;
  name: string;
  address: string;
  total_slots: number;
  available_slots: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddLocationData {
  name: string;
  address: string;
  total_slots: number;
  is_active: boolean;
}

export interface LocationsResponse {
  results: Location[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LocationsPaginatedResponse extends PaginatedResponse<Location> {}
