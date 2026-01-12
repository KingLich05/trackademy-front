import { User, UserFormData } from '../types/User';
import { Organization, OrganizationFormData } from '../types/Organization';
import { Subject, SubjectFormData } from '../types/Subject';
import { Document } from '../types/Document';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://trackademy.kz/api';

export class ApiService {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check if response has content before trying to parse JSON
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      // If content-length is 0 or there's no content-type indicating JSON, return empty response
      if (contentLength === '0' || (!contentType?.includes('application/json') && !response.body)) {
        return undefined as T;
      }
      
      // Try to get text first to check if there's any content
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }
      
      return JSON.parse(text);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // User API methods
  static async getUsers(
    organizationId: string,
    pageNumber: number = 1,
    pageSize: number = 10,
    roleIds: number[] = [],
    search: string = '',
    groupIds: string[] = []
  ): Promise<{
    users: User[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const requestBody = {
      pageNumber,
      pageSize,
      search,
      groupIds,
      roleIds,
      organizationId
    };

    return this.request<{
      users: User[];
      totalCount: number;
      totalPages: number;
      currentPage: number;
    }>('/User/get-users', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  static async getUserById(id: string): Promise<User> {
    return this.request<User>(`/User/get-user/${id}`);
  }

  static async createUser(userData: UserFormData): Promise<User> {
    return this.request<User>('/User/create-user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async updateUser(id: string, userData: UserFormData): Promise<User | boolean> {
    const response = await this.request<User | boolean>(`/User/update-user/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    
    return response;
  }

  static async deleteUser(id: string): Promise<boolean> {
    const response = await this.request<{ success: boolean } | boolean>(`/User/delete-user/${id}`, {
      method: 'DELETE',
    });
    
    // Handle different response formats
    if (typeof response === 'boolean') {
      return response;
    } else if (response && typeof response === 'object' && 'success' in response) {
      return response.success;
    }
    
    // Default to true if response is undefined (successful deletion)
    return true;
  }

  // Organization API methods
  static async getOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>('/Organization');
  }

  static async getOrganizationById(id: number): Promise<Organization> {
    return this.request<Organization>(`/Organization/get-organization/${id}`);
  }

  static async createOrganization(orgData: OrganizationFormData): Promise<Organization> {
    return this.request<Organization>('/Organization/create', {
      method: 'POST',
      body: JSON.stringify(orgData),
    });
  }

  static async updateOrganization(id: number, orgData: OrganizationFormData): Promise<Organization> {
    return this.request<Organization>(`/Organization/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orgData),
    });
  }

  static async deleteOrganization(id: number): Promise<void> {
    return this.request<void>(`/Organization/${id}`, {
      method: 'DELETE',
    });
  }

  // Subject API methods
  static async getAllSubjects(page: number = 1, pageSize: number = 10): Promise<{
    subjects: Subject[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    return this.request<{
      subjects: Subject[];
      totalCount: number;
      totalPages: number;
      currentPage: number;
    }>('/Subject/GetAllSubjects', {
      method: 'POST',
      body: JSON.stringify({ page, pageSize }),
    });
  }

  static async createSubject(subjectData: SubjectFormData): Promise<Subject> {
    return this.request<Subject>('/Subject/create', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    });
  }

  static async updateSubject(id: string, subjectData: SubjectFormData): Promise<Subject> {
    return this.request<Subject>(`/Subject/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subjectData),
    });
  }

  static async deleteSubject(id: string): Promise<void> {
    return this.request<void>(`/Subject/${id}`, {
      method: 'DELETE',
    });
  }

  // Public Document API methods (no auth required)
  static async getPublicDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/Document/public');
  }

  static async getPublicDocumentById(id: string): Promise<Blob> {
    const url = `${API_BASE_URL}/Document/public/${id}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.blob();
  }
}