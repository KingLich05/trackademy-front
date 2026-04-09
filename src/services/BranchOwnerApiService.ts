import { AuthenticatedApiService } from './AuthenticatedApiService';
import {
  BranchOwnerOrganizationDto,
  BranchOwnerOrganizationSummaryDto,
  BranchOwnerOrganizationDetailsDto,
  BranchOwnerAggregatedDashboardDto,
  BranchOwnerDashboardSummaryDto,
  GroupAttendanceStatsRequest,
  GroupAttendanceStatsDto,
  LessonAttendanceMonitoringRequest,
  LessonAttendanceMonitoringDto,
  OrganizationBalancesFilterRequest,
  StudentGroupedBalancesDto,
  SubjectPaymentInfo,
  CreateBranchOwnerUserRequest,
  BranchOwnerCreatedResponse,
  BranchOwnerUserDto,
  BranchOwnerLinkRequest,
  BranchOwnerPagedResult,
} from '../types/BranchOwner';

const BASE = '/branch-owner';

export class BranchOwnerApiService {
  // ── Organizations ──────────────────────────────────────────────────────────

  static async getOrganizations(): Promise<BranchOwnerOrganizationDto[]> {
    return AuthenticatedApiService.get<BranchOwnerOrganizationDto[]>(`${BASE}/organizations`);
  }

  static async getOrganizationsSummary(): Promise<BranchOwnerOrganizationSummaryDto[]> {
    return AuthenticatedApiService.get<BranchOwnerOrganizationSummaryDto[]>(`${BASE}/organizations/summary`);
  }

  static async getOrganizationDetails(organizationId: string): Promise<BranchOwnerOrganizationDetailsDto> {
    return AuthenticatedApiService.get<BranchOwnerOrganizationDetailsDto>(
      `${BASE}/organizations/${organizationId}/details`
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  static async getDashboard(): Promise<BranchOwnerAggregatedDashboardDto> {
    return AuthenticatedApiService.get<BranchOwnerAggregatedDashboardDto>(`${BASE}/dashboard`);
  }

  static async getDashboardSummary(organizationId: string): Promise<BranchOwnerDashboardSummaryDto> {
    return AuthenticatedApiService.get<BranchOwnerDashboardSummaryDto>(
      `${BASE}/organizations/${organizationId}/dashboard/summary`
    );
  }

  // ── Attendance ─────────────────────────────────────────────────────────────

  static async getAttendanceGroupStats(
    organizationId: string,
    request: GroupAttendanceStatsRequest
  ): Promise<BranchOwnerPagedResult<GroupAttendanceStatsDto>> {
    return AuthenticatedApiService.post<BranchOwnerPagedResult<GroupAttendanceStatsDto>>(
      `${BASE}/organizations/${organizationId}/attendance/stats/groups`,
      { ...request, organizationId }
    );
  }

  static async getAttendanceMonitoring(
    organizationId: string,
    request: LessonAttendanceMonitoringRequest
  ): Promise<BranchOwnerPagedResult<LessonAttendanceMonitoringDto>> {
    return AuthenticatedApiService.post<BranchOwnerPagedResult<LessonAttendanceMonitoringDto>>(
      `${BASE}/organizations/${organizationId}/attendance/monitoring/lessons`,
      { ...request, organizationId }
    );
  }

  static async exportAttendance(
    organizationId: string,
    request: {
      groupId?: string;
      subjectId?: string;
      studentIds?: string[];
      fromDate: string;
      toDate: string;
      status?: number;
    }
  ): Promise<Blob> {
    return AuthenticatedApiService.postBlob(
      `${BASE}/organizations/${organizationId}/attendance/export`,
      { ...request, organizationId }
    );
  }

  // ── Balances ───────────────────────────────────────────────────────────────

  static async getBalances(
    organizationId: string,
    request: OrganizationBalancesFilterRequest = {}
  ): Promise<BranchOwnerPagedResult<StudentGroupedBalancesDto>> {
    return AuthenticatedApiService.post<BranchOwnerPagedResult<StudentGroupedBalancesDto>>(
      `${BASE}/organizations/${organizationId}/balances`,
      { ...request, organizationId }
    );
  }

  // ── Payments ───────────────────────────────────────────────────────────────

  static async getPaymentsGrouped(
    organizationId: string,
    request: OrganizationBalancesFilterRequest = {}
  ): Promise<BranchOwnerPagedResult<SubjectPaymentInfo>> {
    return AuthenticatedApiService.post<BranchOwnerPagedResult<SubjectPaymentInfo>>(
      `${BASE}/organizations/${organizationId}/payments-grouped`,
      { ...request, organizationId }
    );
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  static async exportUsers(organizationId: string): Promise<Blob> {
    return AuthenticatedApiService.postBlob(
      `${BASE}/organizations/${organizationId}/export/users`,
      {}
    );
  }

  static async exportGroups(organizationId: string): Promise<Blob> {
    return AuthenticatedApiService.postBlob(
      `${BASE}/organizations/${organizationId}/export/groups`,
      {}
    );
  }

  static async exportPayments(organizationId: string): Promise<Blob> {
    return AuthenticatedApiService.postBlob(
      `${BASE}/organizations/${organizationId}/export/payments`,
      {}
    );
  }

  // ── Management (Owner only) ────────────────────────────────────────────────

  static async getUsers(): Promise<BranchOwnerUserDto[]> {
    return AuthenticatedApiService.get<BranchOwnerUserDto[]>(`${BASE}/users`);
  }

  static async getUserById(userId: string): Promise<BranchOwnerUserDto> {
    return AuthenticatedApiService.get<BranchOwnerUserDto>(`${BASE}/users/${userId}`);
  }

  static async createUser(data: CreateBranchOwnerUserRequest): Promise<BranchOwnerCreatedResponse> {
    return AuthenticatedApiService.post<BranchOwnerCreatedResponse>(`${BASE}/create-user`, data);
  }

  static async assignOrganization(data: BranchOwnerLinkRequest): Promise<void> {
    return AuthenticatedApiService.post<void>(`${BASE}/assign`, data);
  }

  static async unassignOrganization(data: BranchOwnerLinkRequest): Promise<void> {
    return AuthenticatedApiService.request<void>(`${BASE}/assign`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }
}
