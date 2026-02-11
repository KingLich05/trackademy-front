import { AuthenticatedApiService } from './AuthenticatedApiService';

export interface ExportOptions {
  format?: 'xlsx' | 'csv';
  filters?: Record<string, string | number | boolean>;
  dateRange?: {
    start: string;
    end: string;
  };
}

export class ExportApiService {
  /**
   * Экспорт пользователей
   */
  static async exportUsers(options: ExportOptions = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (options.format) {
      params.append('format', options.format);
    }
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    // Используем временную заглушку, пока API не будет реализован
    return new Blob(['Экспорт пользователей'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * Экспорт групп
   */
  static async exportGroups(options: ExportOptions = {}): Promise<Blob> {
    // Заглушка - будет реализовано позже
    return new Blob(['Экспорт групп'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }



  /**
   * Экспорт посещаемости
   */
  static async exportAttendance(options: ExportOptions = {}): Promise<Blob> {
    // Заглушка - будет реализовано позже
    return new Blob(['Экспорт посещаемости'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * Экспорт расписаний
   */
  static async exportSchedules(options: ExportOptions = {}): Promise<Blob> {
    // Заглушка - будет реализовано позже
    return new Blob(['Экспорт расписаний'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * Экспорт платежей
   */
  static async exportPayments(
    organizationId: string,
    startDate?: string,
    endDate?: string,
    groupIds?: string[],
    paymentType?: number
  ): Promise<Blob> {
    const requestBody: {
      organizationId: string;
      startDate?: string;
      endDate?: string;
      groupIds?: string[];
      paymentType?: number;
    } = {
      organizationId
    };

    if (startDate) {
      requestBody.startDate = startDate;
    }
    if (endDate) {
      requestBody.endDate = endDate;
    }
    if (groupIds && groupIds.length > 0) {
      requestBody.groupIds = groupIds;
    }
    if (paymentType) {
      requestBody.paymentType = paymentType;
    }

    const response = await AuthenticatedApiService.postBlob(
      '/Export/payments',
      requestBody
    );

    return response;
  }

  /**
   * Универсальная функция для скачивания файла
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Получение имени файла для экспорта
   */
  static getExportFilename(type: string, format: string = 'xlsx'): string {
    const date = new Date().toISOString().split('T')[0];
    const typeNames: Record<string, string> = {
      users: 'пользователи',
      groups: 'группы',
      attendance: 'посещаемость',
      schedules: 'расписания',
      payments: 'платежи'
    };
    
    const typeName = typeNames[type] || type;
    return `${typeName}_${date}.${format}`;
  }
}