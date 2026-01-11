'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';

interface User {
  id: string; // Changed to string since API returns GUID
  fullName: string;
  login: string;
  role: string; // Changed to string since API returns role names like "Administrator"
  roleId?: number; // Role ID for easier role checking (1=Student, 2=Admin, 3=Teacher, 4=Owner)
  organizationId?: string;
  organizationNames?: string | string[]; // Can be string or array
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  loginWithCredentials: (login: string, password: string, organizationId?: string) => Promise<void>;
  getAuthToken: () => string | null;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  fullName: string;
  login: string;
  password: string;
  phone: string;
  role: number; // Keep as number for registration API
  organizationId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken'); // Also remove the JWT token
    localStorage.removeItem('userLogin'); // Clear saved login
    localStorage.removeItem('userOrganizationId'); // Clear saved org ID
    
    // Redirect to login page after logout
    globalThis.location.href = '/login';
  };

  const register = async (userData: RegisterData) => {
    try {
      // Split fullName into firstName and lastName for API
      const nameParts = userData.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Format the request according to API expectations
      const requestPayload = {
        firstName: firstName,
        lastName: lastName,
        fullName: userData.fullName,
        login: userData.login,
        phone: userData.phone,
        password: userData.password,
        role: userData.role,
        ...(userData.organizationId && { organizationId: userData.organizationId })
      };

      console.log('Sending registration request:', requestPayload);

      const response = await fetch('https://trackademy.kz/api/Auth/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Registration failed:', errorData);
        throw new Error('Registration failed');
      }

      const result = await response.json();
      console.log('Registration success:', result);
      
      // Store login and organizationId in localStorage
      localStorage.setItem('userLogin', userData.login);
      if (userData.organizationId) {
        localStorage.setItem('userOrganizationId', userData.organizationId);
      }
      
      // Redirect to login page instead of auto-login
      globalThis.location.href = '/login';
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Check for stored user on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const loginWithCredentials = useCallback(async (userLogin: string, password: string, organizationId?: string) => {
    try {
      const loginPayload: { login: string; password: string; organizationId?: string } = { login: userLogin, password };
      if (organizationId) {
        loginPayload.organizationId = organizationId;
      }

      const response = await fetch('https://trackademy.kz/api/Auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        throw new Error('Invalid login or password');
      }

      const result = await response.json();
      
      // Extract user data from the API response structure
      const userData: User = {
        id: result.user.id,
        fullName: result.user.fullName,
        login: result.user.login,
        role: result.user.role,
        roleId: result.user.roleId,
        organizationId: result.user.organizationId,
        organizationNames: result.user.organizationNames
      };

      // Store the JWT token separately
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        setToken(result.token);
      }

      login(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [login]);

  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`https://trackademy.kz/api/Auth/me`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        // Мапим roleId в строковое название роли
        const getRoleFromRoleId = (roleId: number): string => {
          switch (roleId) {
            case 1: return 'Student';
            case 2: return 'Administrator';
            case 3: return 'Teacher';
            case 4: return 'Owner';
            default: return 'Student';
          }
        };
        
        const updatedUser: User = {
          id: userData.id,
          fullName: userData.fullName,
          login: userData.login,
          role: typeof userData.role === 'number' ? getRoleFromRoleId(userData.role) : userData.role,
          roleId: userData.roleId || userData.role, // roleId может быть в userData.role
          organizationId: userData.organizationId,
          organizationNames: userData.organizationNames
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [user?.id, getAuthToken]);

  const contextValue = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    loginWithCredentials,
    getAuthToken,
    refreshUser
  }), [user, token, login, logout, register, loginWithCredentials, getAuthToken, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
