// WhatsApp Provider Types
export interface WhatsAppProvider {
  value: number;
  name: string;
  description: string;
}

export const WHATSAPP_PROVIDERS: WhatsAppProvider[] = [
  { value: 1, name: 'UltraMsg', description: 'UltraMsg WhatsApp API' },
  { value: 2, name: 'Twilio', description: 'Twilio WhatsApp Business API' },
  { value: 3, name: 'Meta', description: 'Meta Cloud API' },
  { value: 4, name: 'Dialog360', description: 'Dialog360 WhatsApp API' },
];

// WhatsApp Configuration 
export interface WhatsAppConfig {
  id?: string;
  organizationId: string;
  provider: number;
  apiUrl: string;
  token?: string; // не возвращается в GET запросах
  instanceId: string;
  isEnabled: boolean;
  retryAttempts: number;
  retryDelaySeconds: number;
  hasToken?: boolean; // индикатор наличия токена
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppConfigRequest {
  provider: number;
  apiUrl: string;
  token: string;
  instanceId: string;
  isEnabled: boolean;
  retryAttempts: number;
  retryDelaySeconds: number;
}

export interface WhatsAppTestResponse {
  isConnected: boolean;
  message: string;
}

// Notification Types
export interface NotificationType {
  value: number;
  name: string;
  displayName: string;
}

export const NOTIFICATION_TYPES: NotificationType[] = [
  { value: 1, name: 'PasswordReset', displayName: 'Сброс пароля' },
  { value: 2, name: 'PasswordChanged', displayName: 'Пароль изменен' },
  { value: 3, name: 'AttendanceAbsent', displayName: 'Отсутствие на уроке' },
  { value: 4, name: 'AttendanceNotMarked', displayName: 'Посещаемость не отмечена' },
  { value: 5, name: 'BalanceLow', displayName: 'Низкий баланс' },
  { value: 6, name: 'BalanceNegative', displayName: 'Отрицательный баланс' },
  { value: 7, name: 'TrialLesson', displayName: 'Пробный урок' },
  { value: 8, name: 'PaymentDue', displayName: 'Платеж к оплате' },
];

// Languages
export interface Language {
  value: number;
  name: string;
  displayName: string;
}

export const LANGUAGES: Language[] = [
  { value: 1, name: 'Russian', displayName: 'Русский' },
  { value: 2, name: 'English', displayName: 'Английский' },
  { value: 3, name: 'Kazakh', displayName: 'Казахский' },
];

// Message Templates
export interface WhatsAppTemplate {
  id?: string;
  organizationId: string;
  type: number;
  language: number;
  templateText: string;
  variables: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppTemplateRequest {
  type: number;
  language: number;
  templateText: string;
}

// Message Logs
export interface MessageStatus {
  value: number;
  name: string;
  displayName: string;
}

export const MESSAGE_STATUSES: MessageStatus[] = [
  { value: 1, name: 'Pending', displayName: 'Ожидает отправки' },
  { value: 2, name: 'Sent', displayName: 'Отправлено' },
  { value: 3, name: 'Delivered', displayName: 'Доставлено' },
  { value: 4, name: 'Failed', displayName: 'Ошибка отправки' },
  { value: 5, name: 'Skipped', displayName: 'Пропущено' },
];

export interface WhatsAppLog {
  id: string;
  organizationId: string;
  userId: string;
  type: number;
  phoneNumber: string;
  messageText: string;
  status: number;
  externalMessageId?: string;
  errorMessage?: string;
  attemptCount: number;
  createdAt: string;
  sentAt?: string;
  lastAttemptAt?: string;
}

// Notification Channels
export interface NotificationChannel {
  value: number;
  name: string;
  displayName: string;
}

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  { value: 1, name: 'WhatsApp', displayName: 'WhatsApp сообщения' },
  { value: 2, name: 'SMS', displayName: 'SMS сообщения' },
  { value: 3, name: 'Email', displayName: 'Электронная почта' },
  { value: 4, name: 'PushNotification', displayName: 'Push уведомления' },
];

// Send Notification Request
export interface SendNotificationRequest {
  userId: string;
  organizationId: string;
  type: number;
  channel: number;
  variables: Record<string, string>;
  customMessage?: string;
  preferredLanguage: number;
}

// User Notification Settings
export interface UserNotificationSettings {
  id?: string;
  userId: string;
  organizationId: string;
  whatsAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  preferredLanguage: number;
  receivePasswordNotifications: boolean;
  receiveAttendanceNotifications: boolean;
  receiveBalanceNotifications: boolean;
  receivePaymentNotifications: boolean;
  parentPhoneEnabled: boolean;
  parentPhone?: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

// Organization Notification Settings
export interface OrganizationNotificationSettings {
  id?: string;
  organizationId: string;
  whatsAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  attendanceCheckDelayMinutes: number;
  notifyTeacherOnMissed: boolean;
  balanceLowThreshold: number;
  notifyOnNegativeBalance: boolean;
  balanceCheckFrequencyHours: number;
  allowNightNotifications: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

// Check Notification Response
export interface CheckNotificationResponse {
  shouldSend: boolean;
  userId: string;
  type: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  message: string;
}

export interface ApiError {
  message: string;
}