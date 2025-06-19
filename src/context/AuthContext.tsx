import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  isAdmin: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  isAdmin: false,
  token: null,
});

const API_URL = 'https://tempalert.onensensy.com/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Load user and token from storage on mount
    const loadStoredAuth = async () => {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('token');
      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
        setIsAdmin(parsedUser.role === 'sa');
      }
      setLoading(false);
    };
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      console.log('LOGIN REQUEST:', { email: trimmedEmail, password: '***' });
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });
      const contentType = res.headers.get('content-type');
      let data: any = null;
      if (contentType && contentType.indexOf('application/json') !== -1) {
        data = await res.json();
      } else {
        throw new Error('Server returned an unexpected response.');
      }
      console.log('LOGIN RESPONSE:', data);
      if (!res.ok || !data.data) throw new Error(data.message || 'Login failed');
      setUser(data.data.user);
      setToken(data.data.token);
      setIsAdmin(data.data.user.role === 'sa');
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
      await AsyncStorage.setItem('token', data.data.token);
    } catch (err: any) {
      console.log('LOGIN ERROR:', err);
      throw new Error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setIsAdmin(false);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`,
          email,
          password,
          password_confirmation: password,
          role: 'user',
        }),
      });
      const contentType = res.headers.get('content-type');
      let data: any = null;
      if (contentType && contentType.indexOf('application/json') !== -1) {
        data = await res.json();
      } else {
        throw new Error('Server returned an unexpected response.');
      }
      if (!res.ok || !data.data) throw new Error(data.message || 'Registration failed');
      setUser(data.data.user);
      setToken(data.data.token);
      setIsAdmin(data.data.user.role === 'sa');
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
      await AsyncStorage.setItem('token', data.data.token);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, register, isAdmin, token }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);