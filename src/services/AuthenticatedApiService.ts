/**
 * Authenticated API service that includes JWT token in requests
 */
import { API_BASE_URL } from '../lib/api-config';
import { User, UserFormData } from '../types/User';
// TeacherProfile type (можно вынести в types/TeacherProfile.ts)
export type TeacherProfile = {
  id: string;
  login: string;
  fullName: string;
  phone: string;
  createdAt: string;
  isArchived: boolean;
  role: string;
  organizationName: string;
  birthday: string;
  attendanceRate: number;
  totalWorkHours: number;
  completedLessons: number;
  cancelledLessons: number;
  workHoursForGroups: Array<{
    groupId: string;
    groupName: string;
    workHours: number;
  }>;
  upcomingLessons: Array<{
    lessonId: string;
    date: string;
    startTime: string;
    endTime: string;
    groupName: string;
    roomName: string;
    subjectName: string;
    studentsNumber: number;
  }>;
};
import { Organization, OrganizationDetail, OrganizationFormData } from '../types/Organization';
import { Room, RoomFormData } from '../types/Room';
import { Subject, SubjectFormData } from '../types/Subject';
import { GroupsResponse } from '../types/Group';
import { StudentProfile } from '../types/StudentProfile';
import { Assignment, AssignmentFormData, AssignmentsResponse, AssignmentFilters } from '../types/Assignment';
import { Submission, SubmissionFilters, SubmissionsResponse, GradeSubmissionRequest, ReturnSubmissionRequest } from '../types/Submission';
import { MyAssignmentsRequest, MyAssignmentsResponse } from '../types/MyAssignments';
import { Material, MaterialsResponse, MaterialEditData } from '../types/Material';
import { Document, DocumentUploadData } from '../types/Document';
import { StudentFlag, CreateStudentFlagRequest, UpdateStudentFlagRequest } from '../types/StudentFlag';
import { SetStudentStatusRequest, SetStudentFlagRequest, RemoveStudentFlagRequest } from '../types/StudentCrm';
import { LibraryMaterial, LibraryMaterialsResponse, LibraryMaterialEditData } from '../types/LibraryMaterial';

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
    static async getTeacherProfile(id: string, dateFrom?: string, dateTo?: string): Promise<TeacherProfile> {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const query = params.toString();
      const url = query ? `/User/teacher-profile/${id}?${query}` : `/User/teacher-profile/${id}`;
      return this.get(url);
    }
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

  static async postBlob(endpoint: string, data: unknown): Promise<Blob> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login';
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.blob();
  }

  static async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async putFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'PUT',
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
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

  static async deleteWithBody<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  // Download file with authentication
  static async downloadFile(endpoint: string): Promise<Response> {
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

  static async putUpdateUser(id: string, userData: UserFormData): Promise<ApiResponse<User>> {
    return this.put(`/User/update-user/${id}`, userData);
  }

  static async deleteUser(id: string): Promise<ApiResponse<boolean>> {
    return this.delete(`/User/${id}`);
  }

  static async restoreUser(id: string): Promise<ApiResponse<boolean>> {
    return this.patch(`/User/${id}/restore`, {});
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
    isDeleted?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<UsersResponse> {
    const body = {
      pageNumber: filters.pageNumber || 1,
      pageSize: filters.pageSize || 10,
      organizationId: filters.organizationId,
      ...(filters.search && { search: filters.search }),
      ...(filters.groupIds && filters.groupIds.length > 0 && { groupIds: filters.groupIds }),
      ...(filters.roleIds && filters.roleIds.length > 0 && { roleIds: filters.roleIds }),
      ...(filters.isTrial !== undefined && { isTrial: filters.isTrial }),
      ...(filters.isDeleted !== undefined && { isDeleted: filters.isDeleted }),
      ...(filters.sortBy && { sortBy: filters.sortBy }),
      ...(filters.sortOrder && { sortOrder: filters.sortOrder })
    };
    
    return this.post('/User/get-users', body);
  }

  // Organization management methods
  static async getOrganizations(): Promise<Organization[]> {
    return this.get('/Organization');
  }

  static async getOrganizationById(id: string): Promise<OrganizationDetail> {
    return this.get(`/Organization/${id}`);
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
    const data = await this.post<{ items: Subject[] }>('/Subject/GetAllSubjects', {
      pageNumber: 1,
      pageSize: 1000,
      organizationId,
    });
    return data.items ?? [];
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

  static async restoreLesson(lessonId: string, restoreReason: string): Promise<ApiResponse<boolean>> {
    return this.patch(`/Lesson/${lessonId}/restore-lesson`, {
      lessonStatus: 1,
      cancelReason: restoreReason
    });
  }

  static async replaceTeacher(lessonId: string, newTeacherId: string, replaceReason: string): Promise<ApiResponse<boolean>> {
    return this.patch(`/Lesson/${lessonId}/replace-teacher`, {
      newTeacherId,
      replaceReason
    });
  }

  static async createCustomLesson(data: {
    date: string;
    startTime: string;
    endTime: string;
    groupId: string;
    teacherId: string;
    roomId: string;
    scheduleId?: string;
    note?: string;
  }): Promise<ApiResponse<boolean>> {
    // Форматируем время в нужный формат HH:MM:SS
    const formatTime = (time: string): string => {
      if (time.includes(':') && time.split(':').length === 2) {
        return `${time}:00`;
      }
      return time;
    };

    const requestBody = {
      date: data.date,
      startTime: formatTime(data.startTime),
      endTime: formatTime(data.endTime),
      groupId: data.groupId,
      teacherId: data.teacherId,
      roomId: data.roomId,
      scheduleId: data.scheduleId,
      note: data.note || ""
    };

    return this.post('/Lesson/custom', requestBody);
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
    if (data.attachmentFile) {
      // Если есть файл, используем FormData и новый эндпоинт
      const formData = new FormData();
      formData.append('Description', data.description);
      formData.append('GroupId', data.groupId);
      formData.append('AssignedDate', data.assignedDate);
      formData.append('DueDate', data.dueDate);
      formData.append('attachmentFile', data.attachmentFile);
      return this.postFormData('/Assignment/create-with-file', formData);
    } else {
      // Без файла - обычный JSON
      return this.post('/Assignment/create', {
        description: data.description,
        groupId: data.groupId,
        assignedDate: data.assignedDate,
        dueDate: data.dueDate
      });
    }
  }

  static async updateAssignment(id: string, data: Partial<AssignmentFormData>): Promise<Assignment> {
    if (data.attachmentFile) {
      // Если есть файл, используем FormData
      const formData = new FormData();
      if (data.description) formData.append('Description', data.description);
      if (data.groupId) formData.append('GroupId', data.groupId);
      if (data.assignedDate) formData.append('AssignedDate', data.assignedDate);
      if (data.dueDate) formData.append('DueDate', data.dueDate);
      formData.append('attachmentFile', data.attachmentFile);
      
      return this.putFormData(`/Assignment/${id}`, formData);
    } else {
      // Без файла - обычный JSON
      return this.put(`/Assignment/${id}`, data);
    }
  }

  static async deleteAssignment(id: string): Promise<void> {
    return this.delete(`/Assignment/${id}`);
  }

  static async downloadAssignmentFile(id: string): Promise<Blob> {
    const token = this.getAuthToken();
    const url = `${API_BASE_URL}/Assignment/${id}/download`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        globalThis.location.href = '/login';
        throw new Error('Authentication expired');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
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
  static async bulkAddStudentsToGroup(groupId: string, students: { studentId: string; subjectPackageId: string }[]): Promise<string> {
    return this.post('/Group/bulk-add-students', {
      groupId,
      students
    });
  }

  // Teacher work hours
  static async getTeacherWorkHours(organizationId: string, fromDate: string, toDate: string): Promise<Array<{
    teacherId: string;
    fullName: string;
    completedLessonsCount: number;
    groups: Array<{
      groupId: string;
      groupName: string;
      totalHours: number;
    }>;
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

    const response = await fetch(`${API_BASE_URL}/Material`, {
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

    const response = await fetch(`${API_BASE_URL}/Material/${materialId}/download`, {
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

    const response = await fetch(`${API_BASE_URL}/Material/${materialId}/download`, {
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

  // Library Materials methods
  static async getLibraryMaterials(
    pageNumber: number = 1,
    pageSize: number = 20,
    searchTitle?: string,
    sortByDateDescending: boolean = true
  ): Promise<LibraryMaterialsResponse> {
    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      pageSize: pageSize.toString(),
      sortByDateDescending: sortByDateDescending.toString()
    });
    if (searchTitle) params.append('searchTitle', searchTitle);
    return this.get(`/library-materials?${params.toString()}`);
  }

  static async uploadLibraryMaterial(formData: FormData): Promise<LibraryMaterial> {
    const token = this.getAuthToken();
    if (!token) throw new Error('No authentication token found');
    const response = await fetch(`${API_BASE_URL}/library-materials`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to upload library material');
    }
    return response.json();
  }

  static async updateLibraryMaterial(materialId: string, data: LibraryMaterialEditData): Promise<LibraryMaterial> {
    return this.put(`/library-materials/${materialId}`, data);
  }

  static async deleteLibraryMaterial(materialId: string): Promise<void> {
    return this.delete(`/library-materials/${materialId}`);
  }

  static async downloadLibraryMaterial(materialId: string, fileName: string): Promise<void> {
    const token = this.getAuthToken();
    if (!token) throw new Error('No authentication token found');
    const response = await fetch(`${API_BASE_URL}/library-materials/${materialId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to download library material');
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

  static async getLibraryMaterialBlob(materialId: string): Promise<Blob> {
    const token = this.getAuthToken();
    if (!token) throw new Error('No authentication token found');
    const response = await fetch(`${API_BASE_URL}/library-materials/${materialId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to load library material');
    return response.blob();
  }

  // Document management methods
  static async getDocuments(): Promise<Document[]> {
    return this.get('/Document');
  }

  static async getDocumentById(documentId: string): Promise<Blob> {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/Document/${documentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load document');
    }

    return response.blob();
  }

  static async uploadDocument(documentData: DocumentUploadData): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('name', documentData.name);
    formData.append('type', documentData.type);
    formData.append('file', documentData.file);

    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/Document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    return response.json();
  }

  static async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    return this.delete(`/Document/${documentId}`);
  }

  static async getUserById(userId: string): Promise<User> {
    return this.get(`/User/GetUserById/${userId}`);
  }

  static async getStudentProfile(userId: string, dateFrom?: string, dateTo?: string): Promise<StudentProfile> {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    
    const queryString = params.toString();
    const url = `/User/student-profile/${userId}${queryString ? `?${queryString}` : ''}`;
    
    return this.get<StudentProfile>(url);
  }

  // Student Flags API
  static async getStudentFlags(): Promise<StudentFlag[]> {
    return this.get<StudentFlag[]>('/StudentFlag');
  }

  static async createStudentFlag(data: CreateStudentFlagRequest): Promise<StudentFlag> {
    return this.post<StudentFlag>('/StudentFlag', data);
  }

  static async updateStudentFlag(id: string, data: UpdateStudentFlagRequest): Promise<StudentFlag> {
    return this.put<StudentFlag>(`/StudentFlag/${id}`, data);
  }

  static async deleteStudentFlag(id: string): Promise<void> {
    return this.delete(`/StudentFlag/${id}`);
  }

  // Student CRM API
  static async setStudentStatus(data: SetStudentStatusRequest): Promise<void> {
    return this.post<void>('/StudentCrm/status', data);
  }

  static async setStudentFlag(data: SetStudentFlagRequest): Promise<void> {
    return this.post<void>('/StudentCrm/flag', data);
  }

  static async removeStudentFlag(data: RemoveStudentFlagRequest): Promise<void> {
    return this.deleteWithBody('/StudentCrm/flag', data);
  }

  // ── Market / Coin API ──────────────────────────────────────────────────
  static async getMyBalance(studentId: string, organizationId: string): Promise<import('../types/Market').CoinAccountDetailedDto> {
    return this.get(`/Coin/${studentId}/organization/${organizationId}/detailed`);
  }

  static async getAllCoinBalances(organizationId: string): Promise<import('../types/Market').CoinAccountDto[]> {
    return this.get(`/Coin/organization/${organizationId}`);
  }

  static async getStudentTransactions(studentId: string, organizationId: string, limit = 50): Promise<import('../types/Market').CoinTransactionDto[]> {
    return this.get(`/Coin/${studentId}/organization/${organizationId}/transactions?limit=${limit}`);
  }

  static async adminAdjustCoins(organizationId: string, data: import('../types/Market').AdminAdjustCoinRequest): Promise<void> {
    return this.post<void>(`/Coin/organization/${organizationId}/adjust`, data);
  }

  // ── Reward Rules ───────────────────────────────────────────────────────
  static async getRewardRules(organizationId: string): Promise<import('../types/Market').RewardRuleDto[]> {
    return this.get(`/RewardRule/organization/${organizationId}`);
  }

  static async createRewardRule(organizationId: string, data: import('../types/Market').CreateRewardRuleRequest): Promise<import('../types/Market').RewardRuleDto> {
    return this.post<import('../types/Market').RewardRuleDto>(`/RewardRule/organization/${organizationId}`, data);
  }

  static async updateRewardRule(ruleId: string, organizationId: string, data: import('../types/Market').UpdateRewardRuleRequest): Promise<void> {
    return this.put<void>(`/RewardRule/${ruleId}/organization/${organizationId}`, data);
  }

  static async deleteRewardRule(ruleId: string, organizationId: string): Promise<void> {
    return this.delete(`/RewardRule/${ruleId}/organization/${organizationId}`);
  }

  // ── Market Items ───────────────────────────────────────────────────────
  static async getMarketItems(organizationId: string): Promise<import('../types/Market').MarketItemDto[]> {
    return this.get(`/MarketItem/organization/${organizationId}`);
  }

  static async createMarketItem(organizationId: string, data: import('../types/Market').CreateMarketItemRequest): Promise<import('../types/Market').MarketItemDto> {
    return this.post<import('../types/Market').MarketItemDto>(`/MarketItem/organization/${organizationId}`, data);
  }

  static async updateMarketItem(itemId: string, organizationId: string, data: import('../types/Market').UpdateMarketItemRequest): Promise<void> {
    return this.put<void>(`/MarketItem/${itemId}/organization/${organizationId}`, data);
  }

  static async deleteMarketItem(itemId: string, organizationId: string): Promise<void> {
    return this.delete(`/MarketItem/${itemId}/organization/${organizationId}`);
  }

  // ── Purchases ──────────────────────────────────────────────────────────
  static async purchaseItem(organizationId: string, data: import('../types/Market').PurchaseItemRequest): Promise<import('../types/Market').PurchaseDto> {
    return this.post<import('../types/Market').PurchaseDto>(`/Purchase/organization/${organizationId}`, data);
  }

  static async getMyPurchases(studentId: string, organizationId: string): Promise<import('../types/Market').PurchaseDto[]> {
    return this.get(`/Purchase/student/${studentId}/organization/${organizationId}`);
  }

  static async getAllPurchases(organizationId: string, status?: number): Promise<import('../types/Market').PurchaseDto[]> {
    const query = status !== undefined ? `?status=${status}` : '';
    return this.get(`/Purchase/organization/${organizationId}${query}`);
  }

  static async fulfillPurchase(purchaseId: string, organizationId: string): Promise<import('../types/Market').PurchaseDto> {
    return this.put<import('../types/Market').PurchaseDto>(`/Purchase/${purchaseId}/organization/${organizationId}/fulfill`, {});
  }

  static async cancelPurchase(purchaseId: string, organizationId: string): Promise<import('../types/Market').PurchaseDto> {
    return this.put<import('../types/Market').PurchaseDto>(`/Purchase/${purchaseId}/organization/${organizationId}/cancel`, {});
  }

  // ── Sales Funnel: Stages ───────────────────────────────────────────────────
  static async getFunnelStages(organizationId: string): Promise<import('../types/SalesFunnel').FunnelStageDto[]> {
    return this.get(`/FunnelStage/organization/${organizationId}`);
  }

  static async createFunnelStage(organizationId: string, data: import('../types/SalesFunnel').CreateFunnelStageRequest): Promise<import('../types/SalesFunnel').FunnelStageDto> {
    return this.post<import('../types/SalesFunnel').FunnelStageDto>(`/FunnelStage/organization/${organizationId}`, data);
  }

  static async updateFunnelStage(stageId: string, organizationId: string, data: import('../types/SalesFunnel').UpdateFunnelStageRequest): Promise<void> {
    return this.put<void>(`/FunnelStage/${stageId}/organization/${organizationId}`, data);
  }

  static async deleteFunnelStage(stageId: string, organizationId: string): Promise<void> {
    return this.delete(`/FunnelStage/${stageId}/organization/${organizationId}`);
  }

  static async reorderFunnelStages(organizationId: string, stageIds: string[]): Promise<void> {
    return this.put<void>(`/FunnelStage/reorder/organization/${organizationId}`, stageIds);
  }

  static async initializeFunnelDefaults(organizationId: string): Promise<void> {
    return this.post<void>(`/FunnelStage/initialize-defaults/organization/${organizationId}`, {});
  }

  // ── Sales Funnel: Sources ──────────────────────────────────────────────────
  static async getLeadSources(organizationId: string): Promise<import('../types/SalesFunnel').LeadSourceDto[]> {
    return this.get(`/FunnelStage/sources/organization/${organizationId}`);
  }

  static async createLeadSource(organizationId: string, data: import('../types/SalesFunnel').CreateLeadSourceRequest): Promise<import('../types/SalesFunnel').LeadSourceDto> {
    return this.post<import('../types/SalesFunnel').LeadSourceDto>(`/FunnelStage/sources/organization/${organizationId}`, data);
  }

  static async updateLeadSource(sourceId: string, organizationId: string, data: import('../types/SalesFunnel').UpdateLeadSourceRequest): Promise<void> {
    return this.put<void>(`/FunnelStage/sources/${sourceId}/organization/${organizationId}`, data);
  }

  static async deleteLeadSource(sourceId: string, organizationId: string): Promise<void> {
    return this.delete(`/FunnelStage/sources/${sourceId}/organization/${organizationId}`);
  }

  // ── Sales Funnel: Leads ────────────────────────────────────────────────────
  static async getLeads(organizationId: string, filters?: { stageId?: string; sourceId?: string; assignedToId?: string }): Promise<import('../types/SalesFunnel').LeadDto[]> {
    const params = new URLSearchParams();
    if (filters?.stageId) params.set('stageId', filters.stageId);
    if (filters?.sourceId) params.set('sourceId', filters.sourceId);
    if (filters?.assignedToId) params.set('assignedToId', filters.assignedToId);
    const qs = params.toString();
    return this.get(`/Lead/organization/${organizationId}${qs ? `?${qs}` : ''}`);
  }

  static async getLeadById(leadId: string, organizationId: string): Promise<import('../types/SalesFunnel').LeadDetailDto> {
    return this.get(`/Lead/${leadId}/organization/${organizationId}`);
  }

  static async createLead(organizationId: string, data: import('../types/SalesFunnel').CreateLeadRequest): Promise<import('../types/SalesFunnel').LeadDto> {
    return this.post<import('../types/SalesFunnel').LeadDto>(`/Lead/organization/${organizationId}`, data);
  }

  static async updateLead(leadId: string, organizationId: string, data: import('../types/SalesFunnel').UpdateLeadRequest): Promise<import('../types/SalesFunnel').LeadDto> {
    return this.put<import('../types/SalesFunnel').LeadDto>(`/Lead/${leadId}/organization/${organizationId}`, data);
  }

  static async deleteLead(leadId: string, organizationId: string): Promise<void> {
    return this.delete(`/Lead/${leadId}/organization/${organizationId}`);
  }

  static async moveLeadStage(leadId: string, organizationId: string, data: import('../types/SalesFunnel').MoveLeadStageRequest): Promise<import('../types/SalesFunnel').LeadDto> {
    return this.put<import('../types/SalesFunnel').LeadDto>(`/Lead/${leadId}/move-stage/organization/${organizationId}`, data);
  }

  static async convertLead(leadId: string, organizationId: string, data: import('../types/SalesFunnel').ConvertLeadRequest): Promise<import('../types/SalesFunnel').LeadDto> {
    return this.post<import('../types/SalesFunnel').LeadDto>(`/Lead/${leadId}/convert/organization/${organizationId}`, data);
  }

  static async loseLead(leadId: string, organizationId: string, data: import('../types/SalesFunnel').LoseLeadRequest): Promise<import('../types/SalesFunnel').LeadDto> {
    return this.post<import('../types/SalesFunnel').LeadDto>(`/Lead/${leadId}/lose/organization/${organizationId}`, data);
  }

  static async getFunnelAnalytics(organizationId: string, from?: string, to?: string): Promise<import('../types/SalesFunnel').FunnelAnalyticsDto> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return this.get(`/Lead/analytics/organization/${organizationId}${qs ? `?${qs}` : ''}`);
  }

  static async getLeadStageHistory(leadId: string, organizationId: string): Promise<import('../types/SalesFunnel').LeadStageHistoryDto[]> {
    return this.get(`/Lead/${leadId}/stage-history/organization/${organizationId}`);
  }

  // ── Sales Funnel: Activities ───────────────────────────────────────────────
  static async getLeadActivities(leadId: string, organizationId: string): Promise<import('../types/SalesFunnel').LeadActivityDto[]> {
    return this.get(`/LeadActivity/lead/${leadId}/organization/${organizationId}`);
  }

  static async getUpcomingActivities(organizationId: string, assignedToId?: string): Promise<import('../types/SalesFunnel').LeadActivityDto[]> {
    const qs = assignedToId ? `?assignedToId=${assignedToId}` : '';
    return this.get(`/LeadActivity/upcoming/organization/${organizationId}${qs}`);
  }

  static async createLeadActivity(organizationId: string, data: import('../types/SalesFunnel').CreateLeadActivityRequest): Promise<import('../types/SalesFunnel').LeadActivityDto> {
    return this.post<import('../types/SalesFunnel').LeadActivityDto>(`/LeadActivity/organization/${organizationId}`, data);
  }

  static async updateLeadActivity(activityId: string, organizationId: string, data: import('../types/SalesFunnel').UpdateLeadActivityRequest): Promise<import('../types/SalesFunnel').LeadActivityDto> {
    return this.put<import('../types/SalesFunnel').LeadActivityDto>(`/LeadActivity/${activityId}/organization/${organizationId}`, data);
  }

  static async completeLeadActivity(activityId: string, organizationId: string, data?: { completionNotes?: string }): Promise<import('../types/SalesFunnel').LeadActivityDto> {
    return this.post<import('../types/SalesFunnel').LeadActivityDto>(`/LeadActivity/${activityId}/complete/organization/${organizationId}`, data ?? {});
  }

  static async deleteLeadActivity(activityId: string, organizationId: string): Promise<void> {
    return this.delete(`/LeadActivity/${activityId}/organization/${organizationId}`);
  }

  // ── Lead Registration (QR) ────────────────────────────────────────────────

  static async generateRegistrationLink(data: import('../types/LeadRegistration').GenerateLinkRequest): Promise<import('../types/LeadRegistration').RegistrationLinkDto> {
    return this.post<import('../types/LeadRegistration').RegistrationLinkDto>('/LeadRegistration/generate-link', data);
  }

  static async getRegistrationLinks(organizationId: string): Promise<import('../types/LeadRegistration').RegistrationLinkDto[]> {
    return this.get<import('../types/LeadRegistration').RegistrationLinkDto[]>(`/LeadRegistration/links/organization/${organizationId}`);
  }

  static async deactivateRegistrationLink(linkId: string, organizationId: string): Promise<void> {
    return this.delete(`/LeadRegistration/link/${linkId}/organization/${organizationId}`);
  }
}
