'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { Document } from '../types/Document';

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
  hasAgreedToTerms: boolean;
  needsAgreement: boolean;
  login: (user: User) => void;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  loginWithCredentials: (login: string, password: string, organizationId?: string) => Promise<void>;
  getAuthToken: () => string | null;
  refreshUser: () => Promise<void>;
  agreeToTerms: () => void;
  checkAgreementStatus: () => void;
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
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean>(false);
  const [needsAgreement, setNeedsAgreement] = useState<boolean>(false);

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

  const checkAgreementStatus = useCallback(async () => {
    if (!user) {
      setHasAgreedToTerms(false);
      setNeedsAgreement(false);
      // Очищаем localStorage если нет пользователя
      localStorage.removeItem('termsAgreement');
      return;
    }

    // Сначала проверяем localStorage для быстрой проверки
    const storedAgreement = localStorage.getItem('termsAgreement');
    let localData = null;
    if (storedAgreement) {
      try {
        localData = JSON.parse(storedAgreement);
        // Если данные для текущего пользователя, используем их временно
        if (localData.userId === user.id) {
          setHasAgreedToTerms(localData.hasAgreedToTerms || false);
          setNeedsAgreement(localData.needsAgreement !== false);
        }
      } catch {
        localStorage.removeItem('termsAgreement');
      }
    }

    try {
      // Получаем актуальную информацию с сервера
      const response = await fetch(`https://trackademy.kz/api/Auth/me`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User agreement status from API:', userData);
        
        // Проверяем статус согласия из API - используем правильное поле hasAcceptedTerms
        const hasAgreed = userData.hasAcceptedTerms === true;
        const needsAgreement = !hasAgreed;
        
        // Обновляем состояние
        setHasAgreedToTerms(hasAgreed);
        setNeedsAgreement(needsAgreement);
        
        // Сохраняем актуальные данные в localStorage
        const agreementData = {
          userId: user.id,
          hasAgreedToTerms: hasAgreed,
          needsAgreement: needsAgreement,
          lastUpdated: new Date().toISOString(),
          fromApi: true
        };
        localStorage.setItem('termsAgreement', JSON.stringify(agreementData));
        
        console.log('Agreement status updated from API:', { hasAgreed, needsAgreement, apiField: userData.hasAcceptedTerms });
      } else {
        console.error('Failed to get user agreement status from API');
        // Если не можем получить с сервера, используем localStorage или по умолчанию требуем согласие
        if (!localData || localData.userId !== user.id) {
          setHasAgreedToTerms(false);
          setNeedsAgreement(true);
        }
      }
    } catch (error) {
      console.error('Error checking agreement status:', error);
      // В случае ошибки API используем localStorage или по умолчанию требуем согласие  
      if (!localData || localData.userId !== user.id) {
        setHasAgreedToTerms(false);
        setNeedsAgreement(true);
      }
    }
  }, [user, getAuthToken]);

  // Быстрая проверка из localStorage для инициализации
  const checkLocalAgreementStatus = useCallback(() => {
    if (!user) {
      setHasAgreedToTerms(false);
      setNeedsAgreement(false);
      return;
    }

    const storedAgreement = localStorage.getItem('termsAgreement');
    if (storedAgreement) {
      try {
        const agreement = JSON.parse(storedAgreement);
        if (agreement.userId === user.id) {
          setHasAgreedToTerms(agreement.hasAgreedToTerms || false);
          setNeedsAgreement(agreement.needsAgreement !== false);
          return;
        }
      } catch {
        localStorage.removeItem('termsAgreement');
      }
    }
    
    // По умолчанию требуем согласие
    setHasAgreedToTerms(false);
    setNeedsAgreement(true);
  }, [user]);

  const agreeToTerms = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Получаем список документов
      const documents: Document[] = await AuthenticatedApiService.getDocuments();
      
      // Находим публичную оферту (тип 3) и политику конфиденциальности (тип 1)
      const publicOfferDoc = documents.find(doc => doc.type === 3);
      const privacyPolicyDoc = documents.find(doc => doc.type === 1);

      console.log('Found documents:', { publicOfferDoc, privacyPolicyDoc, allDocs: documents });

      if (!publicOfferDoc || !privacyPolicyDoc) {
        console.warn('Required documents not found:', { 
          hasPublicOffer: !!publicOfferDoc, 
          hasPrivacyPolicy: !!privacyPolicyDoc 
        });
      }

      // Получаем информацию о браузере
      const userAgent = navigator.userAgent;
      
      // Записываем согласие для публичной оферты (если найден)
      if (publicOfferDoc) {
        const publicOfferConsent = {
          userId: user.id,
          consentType: 1, // Публичная оферта
          documentId: publicOfferDoc.id,
          ipAddress: "unknown", // IP будет получен на сервере
          userAgent: userAgent,
          documentVersion: "1.0"
        };

        const response1 = await fetch('https://trackademy.kz/api/Consent/record', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(publicOfferConsent),
        });

        if (!response1.ok) {
          console.error('Failed to record public offer consent');
        }
      }

      // Записываем согласие для политики конфиденциальности (если найден)
      if (privacyPolicyDoc) {
        const privacyPolicyConsent = {
          userId: user.id,
          consentType: 2, // Политика конфиденциальности
          documentId: privacyPolicyDoc.id,
          ipAddress: "unknown", // IP будет получен на сервере
          userAgent: userAgent,
          documentVersion: "1.0"
        };

        const response2 = await fetch('https://trackademy.kz/api/Consent/record', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(privacyPolicyConsent),
        });

        if (!response2.ok) {
          console.error('Failed to record privacy policy consent');
        }
      }

      // После успешной записи согласий обновляем статус пользователя
      // Сначала принудительно обновляем данные пользователя
      await refreshUser();
      // Затем проверяем статус согласия
      await checkAgreementStatus();

    } catch (error) {
      console.error('Error recording consent:', error);
      // В случае ошибки все равно обновляем статус
      await refreshUser();
      await checkAgreementStatus();
    }
  }, [user?.id, getAuthToken, checkAgreementStatus]);

  // Check agreement status when user changes
  useEffect(() => {
    if (user) {
      // Сначала быстро проверяем localStorage для мгновенной инициализации
      checkLocalAgreementStatus();
      // Затем обновляем из API
      checkAgreementStatus();
    } else {
      setHasAgreedToTerms(false);
      setNeedsAgreement(false);
    }
  }, [user, checkLocalAgreementStatus, checkAgreementStatus]);

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
    hasAgreedToTerms,
    needsAgreement,
    login,
    logout,
    register,
    loginWithCredentials,
    getAuthToken,
    refreshUser,
    agreeToTerms,
    checkAgreementStatus
  }), [user, token, hasAgreedToTerms, needsAgreement, login, logout, register, loginWithCredentials, getAuthToken, refreshUser, agreeToTerms, checkAgreementStatus]);

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
