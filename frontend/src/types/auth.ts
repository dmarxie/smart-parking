export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'USER';
  first_name: string;
  last_name: string;
  notification_preference: 'ALL' | 'IMPORTANT' | 'NONE';
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  notification_preference: 'ALL' | 'IMPORTANT' | 'NONE';
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface LoginFormProps {
  isAdmin?: boolean;
}
