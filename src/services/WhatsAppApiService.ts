import { AuthenticatedApiService } from './AuthenticatedApiService';
import {
  WhatsAppConfig,
  WhatsAppConfigRequest,
  WhatsAppTestResponse,
  WhatsAppTemplate,
  WhatsAppTemplateRequest,
  WhatsAppLog,
  SendNotificationRequest,
  UserNotificationSettings,
  OrganizationNotificationSettings,
  CheckNotificationResponse,
  NotificationType,
  ApiResponse,
  NOTIFICATION_TYPES,
  LANGUAGES,
  WHATSAPP_PROVIDERS,
  MESSAGE_STATUSES,
  NOTIFICATION_CHANNELS
} from '../types/WhatsApp';

export class WhatsAppApiService {
  // Configuration endpoints
  static async getConfig(organizationId: string): Promise<WhatsAppConfig | null> {
    try {
      const response = await AuthenticatedApiService.get<WhatsAppConfig>(
        `/whatsapp/config/${organizationId}`
      );
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async saveConfig(organizationId: string, config: WhatsAppConfigRequest): Promise<ApiResponse> {
    return AuthenticatedApiService.post<ApiResponse>(
      `/whatsapp/config/${organizationId}`,
      config
    );
  }

  static async testConnection(organizationId: string): Promise<WhatsAppTestResponse> {
    return AuthenticatedApiService.post<WhatsAppTestResponse>(
      `/whatsapp/config/${organizationId}/test`,
      {}
    );
  }

  // Templates endpoints
  static async getTemplates(organizationId: string): Promise<WhatsAppTemplate[]> {
    return AuthenticatedApiService.get<WhatsAppTemplate[]>(
      `/whatsapp/templates/${organizationId}`
    );
  }

  static async getTemplate(organizationId: string, type: number, language: number): Promise<WhatsAppTemplate | null> {
    try {
      const response = await AuthenticatedApiService.get<WhatsAppTemplate>(
        `/whatsapp/templates/${organizationId}/${type}/${language}`
      );
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async saveTemplate(organizationId: string, template: WhatsAppTemplateRequest): Promise<ApiResponse> {
    return AuthenticatedApiService.post<ApiResponse>(
      `/whatsapp/templates/${organizationId}`,
      template
    );
  }

  static async getNotificationTypes(): Promise<NotificationType[]> {
    // Возвращаем локальные данные, так как это статичные справочники
    return NOTIFICATION_TYPES;
  }

  // Notifications endpoints
  static async sendNotification(request: SendNotificationRequest): Promise<ApiResponse> {
    return AuthenticatedApiService.post<ApiResponse>(
      `/notifications/send`,
      request
    );
  }

  static async getUserNotificationSettings(userId: string, organizationId: string): Promise<UserNotificationSettings | null> {
    try {
      const response = await AuthenticatedApiService.get<UserNotificationSettings>(
        `/notifications/settings/${userId}?organizationId=${organizationId}`
      );
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async getOrganizationNotificationSettings(organizationId: string): Promise<OrganizationNotificationSettings | null> {
    try {
      const response = await AuthenticatedApiService.get<OrganizationNotificationSettings>(
        `/notifications/org-settings/${organizationId}`
      );
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async checkNotification(userId: string, type: number): Promise<CheckNotificationResponse> {
    return AuthenticatedApiService.get<CheckNotificationResponse>(
      `/notifications/check/${userId}?type=${type}`
    );
  }

  // Logs endpoints
  static async getLogs(
    organizationId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<WhatsAppLog[]> {
    let url = `/whatsapp/logs/${organizationId}`;
    const params = new URLSearchParams();
    
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return AuthenticatedApiService.get<WhatsAppLog[]>(url);
  }

  static async getLogDetails(logId: string): Promise<WhatsAppLog | null> {
    try {
      const response = await AuthenticatedApiService.get<WhatsAppLog>(
        `/whatsapp/logs/details/${logId}`
      );
      return response;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Utility methods for working with template variables
  static extractVariablesFromTemplate(templateText: string): string[] {
    const regex = /{([^}]+)}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(templateText)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  static interpolateTemplate(templateText: string, variables: Record<string, string>): string {
    let result = templateText;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, value);
    });
    
    return result;
  }

  // Helper methods for lookups
  static getNotificationTypeDisplayName(type: number): string {
    const notificationType = NOTIFICATION_TYPES.find(t => t.value === type);
    return notificationType?.displayName || `Тип ${type}`;
  }

  static getLanguageDisplayName(language: number): string {
    const lang = LANGUAGES.find(l => l.value === language);
    return lang?.displayName || `Язык ${language}`;
  }

  static getProviderDisplayName(provider: number): string {
    const prov = WHATSAPP_PROVIDERS.find(p => p.value === provider);
    return prov?.name || `Провайдер ${provider}`;
  }

  static getMessageStatusDisplayName(status: number): string {
    const statusObj = MESSAGE_STATUSES.find(s => s.value === status);
    return statusObj?.displayName || `Статус ${status}`;
  }

  static getChannelDisplayName(channel: number): string {
    const channelObj = NOTIFICATION_CHANNELS.find(c => c.value === channel);
    return channelObj?.displayName || `Канал ${channel}`;
  }

  // Validation helpers
  static validatePhoneNumber(phone: string): boolean {
    // Проверяем международный формат: +77771234567
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  static validateTemplateText(text: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!text || text.trim().length === 0) {
      errors.push('Текст шаблона не может быть пустым');
    }
    
    if (text.length > 4096) {
      errors.push('Текст шаблона не может превышать 4096 символов');
    }
    
    // Проверяем корректность переменных {variableName}
    const regex = /{([^}]+)}/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const variableName = match[1];
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
        errors.push(`Неверное имя переменной: {${variableName}}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRetryAttempts(attempts: number): boolean {
    return Number.isInteger(attempts) && attempts >= 0 && attempts <= 10;
  }

  static validateRetryDelay(delay: number): boolean {
    return Number.isInteger(delay) && delay >= 1 && delay <= 300;
  }

  static validateApiUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}