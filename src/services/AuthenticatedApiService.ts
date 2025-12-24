/**
 * Authenticated API service that includes JWT token in requests
 */
import { User, UserFormData } from '../types/User';
import { Organization, OrganizationFormData } from '../types/Organization';
import { Room, RoomFormData } from '../types/Room';
import { Subject, SubjectFormData } from '../types/Subject';
import { GroupsResponse } from '../types/Group';
import { Assignment, AssignmentFormData, AssignmentsResponse, AssignmentFilters } from '../types/Assignment';
import { Submission, SubmissionFilters, SubmissionsResponse, GradeSubmissionRequest, ReturnSubmissionRequest } from '../types/Submission';
import { MyAssignmentsRequest, MyAssignmentsResponse } from '../types/MyAssignments';
import { Material, MaterialsResponse, MaterialEditData } from '../types/Material';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface UsersResponse {
  items: User[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface RoomsResponse {
  items: Room[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface StructuredError extends Error {
  status?: number;
  parsedError?: unknown;
}

export class AuthenticatedApiService {
  private static getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private static getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const API_BASE_URL = 'https://trackademy.kz/api';
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    console.log('API Request:', { 
      url, 
      method: config.method || 'GET',
      hasAuthToken: !!this.getAuthToken(),
      headers: config.headers
    });

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication error during API call:', {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            url
          });
          // Token expired or invalid - redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          globalThis.location.href = '/login';
          throw new Error('Authentication expired');
        }
        
        if (response.status === 403) {
          // Forbidden - user doesn't have access, but don't show error toast
          console.warn('Access forbidden:', {
            endpoint,
            status: response.status,
            url
          });
          // Return empty object instead of throwing error
          return {} as T;
        }
        
        // Try to get error details from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        let parsedError = null;
        
        try {
          const errorData = await response.text();
          if (errorData) {
            try {
              parsedError = JSON.parse(errorData);
              // Обрабатываем разные форматы ошибок API
              if (parsedError) {
                if (parsedError.error) {
                  // Простая ошибка
                  errorMessage = parsedError.error;
                } else if (parsedError.errors) {
                  // Ошибки валидации - извлекаем первое сообщение
                  const validationErrors = parsedError.errors;
                  const firstFieldErrors = Object.values(validationErrors)[0];
                  if (Array.isArray(firstFieldErrors) && firstFieldErrors.length > 0) {
                    errorMessage = firstFieldErrors[0] as string;
                  } else {
                    errorMessage = 'Ошибка валидации данных';
                  }
                } else if (parsedError.title) {
                  // Стандартная ошибка с title
                  errorMessage = parsedError.title;
                } else if (parsedError.message) {
                  // Ошибка с message
                  errorMessage = parsedError.message;
                } else {
                  errorMessage += ` - ${errorData}`;
                }
              } else {
                errorMessage += ` - ${errorData}`;
              }
            } catch (parseError) {
              errorMessage += ` - ${errorData}`;
            }
          }
        } catch (e) {
          // Ignore error parsing errors
        }
        
        // Создаем структурированную ошибку для лучшей обработки
  const structuredError = new Error(errorMessage) as StructuredError;
  structuredError.status = response.status;
  structuredError.parsedError = parsedError;
        
        throw structuredError;
      }
      
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      if (contentLength === '0' || !contentType?.includes('application/json')) {
        return {} as T;
      }
      
      return await response.json();
    } catch (error) {
      // Не выводим в консоль ошибки, которые уже обработаны toast системой
      // console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Common HTTP methods
  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Download file with authentication
  static async downloadFile(endpoint: string): Promise<Response> {
    const API_BASE_URL = 'https://trackademy.kz/api';
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        globalThis.location.href = '/login';
        throw new Error('Authentication expired');
      }
      throw new Error(`Failed to download file: ${response.status}`);
    }

    return response;
  }

  static async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // User management methods
  static async updateUser(id: string, userData: UserFormData): Promise<ApiResponse<User>> {
    return this.put(`/User/update-user/${id}`, userData);
  }

  static async deleteUser(id: string): Promise<ApiResponse<boolean>> {
    return this.delete(`/User/${id}`);
  }

  static async createUser(userData: UserFormData): Promise<ApiResponse<User>> {
    return this.post('/User/create', userData);
  }

  static async getUsers(filters: {
    organizationId: string;
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    groupIds?: string[];
    roleIds?: number[];
    isTrial?: boolean;
  }): Promise<UsersResponse> {
    const body = {
      pageNumber: filters.pageNumber || 1,
      pageSize: filters.pageSize || 10,
      organizationId: filters.organizationId,
      ...(filters.search && { search: filters.search }),
      ...(filters.groupIds && filters.groupIds.length > 0 && { groupIds: filters.groupIds }),
      ...(filters.roleIds && filters.roleIds.length > 0 && { roleIds: filters.roleIds }),
      ...(filters.isTrial !== undefined && { isTrial: filters.isTrial })
    };
    
    return this.post('/User/get-users', body);
  }

  // Organization management methods
  static async getOrganizations(): Promise<Organization[]> {
    return this.get('/Organization');
  }

  static async createOrganization(orgData: OrganizationFormData): Promise<ApiResponse<Organization>> {
    return this.post('/Organization/create', orgData);
  }

  static async updateOrganization(id: string, orgData: OrganizationFormData): Promise<ApiResponse<Organization>> {
    return this.put(`/Organization/${id}`, orgData);
  }

  static async deleteOrganization(id: string): Promise<ApiResponse<boolean>> {
    return this.delete(`/Organization/${id}`);
  }

  // Room management methods
  static async getRooms(organizationId: string, pageNumber: number = 1, pageSize: number = 10): Promise<RoomsResponse> {
    const requestBody = {
      pageNumber,
      pageSize,
      organizationId
    };
    return this.post('/Room/GetAllRooms', requestBody);
  }

  static async createRoom(roomData: RoomFormData): Promise<ApiResponse<Room>> {
    return this.post('/Room/create', roomData);
  }

  static async updateRoom(id: string, roomData: RoomFormData): Promise<ApiResponse<Room>> {
    return this.put(`/Room/${id}`, roomData);
  }

  static async deleteRoom(id: string): Promise<ApiResponse<boolean>> {
    return this.delete(`/Room/${id}`);
  }

  // Subject management methods
  static async getSubjects(organizationId: string): Promise<Subject[]> {
    return this.get(`/Subject?organizationId=${organizationId}`);
  }

  static async createSubject(subjectData: SubjectFormData): Promise<ApiResponse<Subject>> {
    return this.post('/Subject', subjectData);
  }

  static async updateSubject(id: string, subjectData: SubjectFormData): Promise<ApiResponse<Subject>> {
    return this.put(`/Subject/${id}`, subjectData);
  }

  static async deleteSubject(id: string): Promise<ApiResponse<boolean>> {
    return this.delete(`/Subject/${id}`);
  }

  // Group management methods
  static async getGroups(organizationId: string, pageSize: number = 1000): Promise<GroupsResponse> {
    const body = {
      pageNumber: 1,
      pageSize: pageSize,
      organizationId: organizationId
    };
    return this.post('/Group/get-groups', body);
  }

  static async freezeStudent(studentId: string, groupId: string, frozenFrom: string, frozenTo: string, freezeReason: string): Promise<ApiResponse<boolean>> {
    return this.post('/Group/freeze-student', {
      StudentId: studentId,
      GroupId: groupId,
      FrozenFrom: frozenFrom,
      FrozenTo: frozenTo,
      FreezeReason: freezeReason
    });
  }

  static async unfreezeStudent(studentId: string, groupId: string): Promise<ApiResponse<boolean>> {
    return this.post('/Group/unfreeze-student', {
      StudentId: studentId,
      GroupId: groupId
    });
  }

  // Payment management methods
  static async updatePaymentDiscount(paymentId: string, discountType: number, discountValue: number, discountReason?: string): Promise<ApiResponse<boolean>> {
    return this.patch(`/Payment/${paymentId}/discount`, {
      discountType,
      discountValue,
      discountReason: discountReason || undefined
    });
  }

  // Profile management methods
  static async getUserById(id: string): Promise<User> {
    return this.get(`/User/GetUserById/${id}`);
  }

  static async changePassword(studentId: string, currentPassword: string, newPassword: string): Promise<ApiResponse<boolean>> {
    return this.put('/User/update-password', {
      studentId,
      currentPassword,
      newPassword
    });
  }

  // Import users from Excel
  static async importUsersFromExcel(file: File, organizationId: string): Promise<import('../types/User').ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('organizationId', organizationId);

    const token = this.getAuthToken();
    const API_BASE_URL = 'https://trackademy.kz/api';
    const url = `${API_BASE_URL}/User/import-excel`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData, browser will set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        globalThis.location.href = '/login';
        throw new Error('Authentication expired');
      }

      let errorMessage = `Ошибка импорта: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore parse error
      }
      
      const error = new Error(errorMessage) as StructuredError;
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  // Lesson note management
  static async updateLessonNote(lessonId: string, note: string): Promise<ApiResponse<boolean>> {
    return this.patch(`/Lesson/${lessonId}/note`, { note });
  }

  // Lesson management
  static async moveLesson(lessonId: string, date: string, startTime: string, endTime: string, cancelReason: string, roomId?: string): Promise<ApiResponse<boolean>> {
    const body: Record<string, unknown> = {
      date,
      startTime,
      endTime,
      cancelReason
    };
    
    if (roomId) {
      body.roomId = roomId;
    }
    
    return this.patch(`/Lesson/${lessonId}/moved`, body);
  }

  static async cancelLesson(lessonId: string, lessonStatus: number, cancelReason: string): Promise<ApiResponse<boolean>> {
    return this.patch(`/Lesson/${lessonId}/cancel`, {
      lessonStatus,
      cancelReason
    });
  }

  // Assignment management
  static async getAssignmentById(id: string): Promise<Assignment> {
    return this.get(`/Assignment/${id}`);
  }

  static async getAssignments(filters: AssignmentFilters): Promise<AssignmentsResponse> {
    return this.post('/Assignment/get-assignments', filters);
  }

  static async getMyAssignments(data: MyAssignmentsRequest): Promise<MyAssignmentsResponse> {
    return this.post('/Assignment/my-assignments', data);
  }

  static async createAssignment(data: AssignmentFormData): Promise<Assignment> {
    return this.post('/Assignment/create', data);
  }

  static async updateAssignment(id: string, data: Partial<AssignmentFormData>): Promise<Assignment> {
    return this.put(`/Assignment/${id}`, data);
  }

  static async deleteAssignment(id: string): Promise<void> {
    return this.delete(`/Assignment/${id}`);
  }

  // Submission API methods
  static async getSubmissions(filters: SubmissionFilters): Promise<SubmissionsResponse> {
    return this.post('/Submission/get-submissions', filters);
  }

  static async getSubmissionById(id: string): Promise<Submission> {
    return this.get(`/Submission/${id}`);
  }

  static async createOrUpdateSubmission(assignmentId: string, formData: FormData): Promise<Submission> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.request(`/Submission/assignment/${assignmentId}`, {
      method: 'POST',
      body: formData,
      headers: headers,
    });
  }

  static async submitSubmission(submissionId: string): Promise<Submission> {
    return this.post(`/Submission/${submissionId}/submit`, {});
  }

  static async gradeSubmission(submissionId: string, data: GradeSubmissionRequest): Promise<Submission> {
    return this.post(`/Submission/${submissionId}/grade`, data);
  }

  static async returnSubmission(submissionId: string, data: ReturnSubmissionRequest): Promise<Submission> {
    return this.post(`/Submission/${submissionId}/return`, data);
  }

  static async downloadSubmissionFile(fileId: string): Promise<Blob> {
    return this.get(`/Submission/file/${fileId}`);
  }

  static async deleteSubmissionFile(fileId: string): Promise<void> {
    return this.delete(`/Submission/file/${fileId}`);
  }

  // Bulk add students to group
  static async bulkAddStudentsToGroup(groupId: string, studentIds: string[]): Promise<string> {
    return this.post('/Group/bulk-add-students', {
      groupId,
      studentIds
    });
  }

  // Teacher work hours
  static async getTeacherWorkHours(organizationId: string, fromDate: string, toDate: string): Promise<Array<{
    teacherId: string;
    fullName: string;
    completedLessonsCount: number;
  }>> {
    return this.post('/User/teacher-work-hours', {
      organizationId,
      fromDate,
      toDate
    });
  }

  // Materials
  static async getMaterials(
    organizationId: string,
    pageNumber: number = 1,
    pageSize: number = 10,
    groupId?: string,
    searchTitle?: string
  ): Promise<MaterialsResponse> {
    const params = new URLSearchParams({
      OrganizationId: organizationId,
      PageNumber: pageNumber.toString(),
      PageSize: pageSize.toString()
    });

    if (groupId) {
      params.append('GroupId', groupId);
    }
    if (searchTitle) {
      params.append('SearchTitle', searchTitle);
    }

    return this.get(`/Material?${params.toString()}`);
  }

  static async getMaterialById(materialId: string): Promise<Material> {
    return this.get(`/Material/${materialId}`);
  }

  static async uploadMaterial(formData: FormData): Promise<Material> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`https://trackademy.kz/api/Material`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to upload material');
    }

    return response.json();
  }

  static async updateMaterial(materialId: string, data: MaterialEditData): Promise<Material> {
    return this.put(`/Material/${materialId}`, data);
  }

  static async deleteMaterial(materialId: string): Promise<void> {
    return this.delete(`/Material/${materialId}`);
  }

  static async downloadMaterial(materialId: string, fileName: string): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`https://trackademy.kz/api/Material/${materialId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download material');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  static async getMaterialBlob(materialId: string): Promise<Blob> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`https://trackademy.kz/api/Material/${materialId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load material');
    }

    return response.blob();
  }
}
