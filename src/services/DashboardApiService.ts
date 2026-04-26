import { AuthenticatedApiService } from './AuthenticatedApiService';
import { DashboardSummary, DashboardFilters, TeacherDashboardSummary, StudentDashboardSummary } from '../types/Dashboard';
import { DetailedDashboard } from '../types/DetailedDashboard';

export class DashboardApiService {
  private static readonly BASE_URL = '/Dashboard';

  static async getDetailedDashboard(
    organizationId: string,
    from: string,
    to: string
  ): Promise<DetailedDashboard> {
    const params = new URLSearchParams({
      OrganizationId: organizationId,
      ReportPeriodFrom: from,
      ReportPeriodTo: to,
    });
    return AuthenticatedApiService.get<DetailedDashboard>(`${this.BASE_URL}/detailed?${params.toString()}`);
  }

  static async getSummary(filters: DashboardFilters): Promise<DashboardSummary> {
    const params = new URLSearchParams({
      OrganizationId: filters.organizationId
    });

    // Добавляем опциональные параметры
    if (filters.groupIds && filters.groupIds.length > 0) {
      filters.groupIds.forEach(groupId => params.append('GroupIds', groupId));
    }
    if (filters.subjectIds && filters.subjectIds.length > 0) {
      filters.subjectIds.forEach(subjectId => params.append('SubjectIds', subjectId));
    }
    if (filters.includeInactiveStudents !== undefined) {
      params.append('IncludeInactiveStudents', filters.includeInactiveStudents.toString());
    }
    if (filters.lowPerformanceThreshold !== undefined) {
      params.append('LowPerformanceThreshold', filters.lowPerformanceThreshold.toString());
    }

    const url = `${this.BASE_URL}/summary?${params.toString()}`;
    
    return AuthenticatedApiService.get<DashboardSummary>(url);
  }

  static async getTeacherSummary(): Promise<TeacherDashboardSummary> {
    const url = `${this.BASE_URL}/teacher`;
    return AuthenticatedApiService.get<TeacherDashboardSummary>(url);
  }

  static async getStudentSummary(): Promise<StudentDashboardSummary> {
    const url = `${this.BASE_URL}/student`;
    return AuthenticatedApiService.get<StudentDashboardSummary>(url);
  }

  // Получение групп для фильтров
  static async getGroups(organizationId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const requestBody = {
        organizationId: organizationId,
        pageNumber: 1,
        pageSize: 1000 // Получаем все группы для фильтров
      };
      
      const response = await AuthenticatedApiService.post<{
        items: Array<{ id: string; name: string; [key: string]: unknown }>;
        totalCount: number;
        pageNumber: number;
        pageSize: number;
        totalPages: number;
      }>('/Group/get-groups', requestBody);
      
      if (response && response.items && Array.isArray(response.items)) {
        return response.items.map(group => ({
          id: group.id,
          name: group.name
        }));
      }
      
      console.warn('Unexpected groups response structure:', response);
      return [];
    } catch (error) {
      console.warn('Failed to load groups for dashboard filters:', error);
      return [];
    }
  }

  // Получение предметов для фильтров
  static async getSubjects(organizationId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const requestBody = {
        organizationId: organizationId,
        pageNumber: 1,
        pageSize: 1000 // Получаем все предметы для фильтров
      };
      
      const response = await AuthenticatedApiService.post<{
        items: Array<{ id: string; name: string; [key: string]: unknown }>;
        totalCount: number;
        pageNumber: number;
        pageSize: number;
        totalPages: number;
      }>('/Subject/GetAllSubjects', requestBody);
      
      if (response && response.items && Array.isArray(response.items)) {
        return response.items.map(subject => ({
          id: subject.id,
          name: subject.name
        }));
      }
      
      console.warn('Unexpected subjects response structure:', response);
      return [];
    } catch (error) {
      console.warn('Failed to load subjects for dashboard filters:', error);
      return [];
    }
  }
}