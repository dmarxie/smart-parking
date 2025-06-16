import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { RegisterData, User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, isAdmin: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider component that provides authentication state and methods
 *
 * @param {AuthProviderProps}
 * @returns {React.ReactNode}
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          try {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          } catch (error) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            delete axios.defaults.headers.common['Authorization'];
          }
        } else {
          setToken(null);
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login function
   *
   * @param email
   * @param password
   * @param isAdmin
   * @returns
   */
  const login = async (email: string, password: string, isAdmin: boolean) => {
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/token/`, {
        email,
        password,
      });

      const { access, refresh } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      const userResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/me/`, {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });

      const userData = userResponse.data;

      if (isAdmin && userData.role !== 'ADMIN') {
        throw new Error('Not authorized as admin');
      }

      localStorage.setItem('user', JSON.stringify(userData));

      setToken(access);
      setUser(userData);

      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid email or password');
        } else if (error.response?.status === 403) {
          throw new Error(isAdmin ? 'Not authorized as admin' : 'Please use admin login');
        }
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout function
   *
   * @returns void
   */
  const logout = () => {
    setLoading(true);
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register function
   *
   * @param data
   * @returns
   */
  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/register/`, data);
      await login(data.email, data.password, false);
    } catch (error) {
      // clear any stored data on registration failure
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          // handle validation errors from the backend
          const errorMessage =
            error.response.data?.detail ||
            error.response.data?.message ||
            'Registration failed. Please check your input.';
          throw new Error(errorMessage);
        }
        throw new Error('Registration failed. Please try again.');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user function
   *
   * @param userData
   * @returns void
   */
  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'ADMIN',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Use auth hook
 *
 * @returns AuthContextType
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
