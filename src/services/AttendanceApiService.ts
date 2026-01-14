import { 
  AttendanceRecord, 
  AttendanceResponse, 
  AttendanceFilters, 
  StudentAttendanceStats, 
  GroupReport, 
  BulkAttendanceRequest, 
  UpdateAttendanceRequest, 
  UpdateGradeRequest,
  ExportAttendanceRequest 
} from '@/types/Attendance';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://trackademy.kz';

class AttendanceApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Если ошибка аутентификации, можем логировать но не перенаправлять
      if (response.status === 401 || response.status === 403) {
        console.warn('Authentication error in AttendanceApiService:', response.status);
        throw new Error(`Ошибка аутентификации: ${response.status}. Возможно, сессия истекла.`);
      }
      
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorData.title || `API Error: ${response.status} ${response.statusText}`;
      } catch {
        errorMessage = `API Error: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Массовая отметка студентов
  async markBulkAttendance(data: BulkAttendanceRequest): Promise<void> {
    await this.makeRequest('/api/Attendance/mark-bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Обновление статуса одного студента
  async updateAttendance(data: UpdateAttendanceRequest): Promise<void> {
    await this.makeRequest('/api/Attendance/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Обновление только оценки и комментария
  async updateGrade(data: UpdateGradeRequest): Promise<void> {
    await this.makeRequest('/api/Attendance/update-grade', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Получение одной записи посещения
  async getAttendanceRecord(id: string): Promise<AttendanceRecord> {
    return this.makeRequest<AttendanceRecord>(`/api/Attendance/${id}`);
  }

  // Получение всех записей посещаемости
  async getAllAttendances(filters: AttendanceFilters): Promise<AttendanceResponse> {
    return this.makeRequest<AttendanceResponse>('/api/Attendance/get-all-attendances', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }

  // Получение статистики студента
  async getStudentStats(
    studentId: string, 
    fromDate?: string, 
    toDate?: string
  ): Promise<StudentAttendanceStats> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    
    const queryString = params.toString();
    const endpoint = `/api/Attendance/stats/student/${studentId}${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<StudentAttendanceStats>(endpoint);
  }

  // Получение отчета по группе
  async getGroupReport(
    groupId: string, 
    fromDate?: string, 
    toDate?: string
  ): Promise<GroupReport> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    
    const queryString = params.toString();
    const endpoint = `/api/Attendance/report/group/${groupId}${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<GroupReport>(endpoint);
  }

  // Экспорт данных посещаемости
  async exportAttendance(data: ExportAttendanceRequest): Promise<Blob> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/Attendance/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Ошибка при экспорте посещаемости';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorData.title || `Ошибка экспорта: ${response.status} ${response.statusText}`;
      } catch {
        errorMessage = `Ошибка экспорта: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    return response.blob();
  }
}

export const attendanceApi = new AttendanceApiService();