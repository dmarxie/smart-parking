export interface UpdateProfileData {
  first_name: string;
  last_name: string;
  notification_preference: 'ALL' | 'IMPORTANT' | 'NONE';
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  new_password2: string;
}

export interface MessageModalData {
  title: string;
  message: string;
  type: 'success' | 'error';
}

export interface User {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  created_at: string;
  is_admin: boolean;
}
