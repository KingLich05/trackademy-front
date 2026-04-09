// ─── Organization ────────────────────────────────────────────────────────────

export interface BranchOwnerOrganizationDto {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface BranchOwnerOrganizationSummaryDto {
  organizationId: string;
  name: string;
  studentsCount: number;
  groupsCount: number;
  subjectsCount: number;
}

export interface BranchOwnerStudentInfoDto {
  id: string;
  fullName: string;
  phone: string;
  balanceTotal: number;
}

export interface BranchOwnerGroupInfoDto {
  id: string;
  name: string;
  code: string;
  subjectName: string;
}

export interface BranchOwnerOrganizationDetailsDto {
  organizationId: string;
  name: string;
  phone: string;
  address: string;
  studentsCount: number;
  groupsCount: number;
  totalBalance: number;
  students: BranchOwnerStudentInfoDto[];
  groups: BranchOwnerGroupInfoDto[];
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface BirthdayStudentDto {
  id: string;
  fullName: string;
  birthday: string;
  groupName?: string;
}

export interface BranchOwnerOrgDashboardDto {
  organizationId: string;
  name: string;
  studentsCount: number;
  groupsCount: number;
  teachersCount: number;
  lessonsToday: number;
  averageAttendanceRate: number;
  totalBalance: number;
  totalDebt: number;
  unpaidStudentsCount: number;
}

export interface BranchOwnerAggregatedDashboardDto {
  totalOrganizations: number;
  totalStudents: number;
  totalGroups: number;
  totalTeachers: number;
  totalBalance: number;
  totalDebt: number;
  organizations: BranchOwnerOrgDashboardDto[];
}

export interface BranchOwnerDashboardSummaryDto {
  totalStudents: number;
  activeStudents: number;
  totalGroups: number;
  activeGroups: number;
  lessonsToday: number;
  completedLessonsToday: number;
  averageAttendanceRate: number;
  unpaidStudentsCount: number;
  trialStudentsCount: number;
  lowPerformanceGroupsCount: number;
  totalDebt: number;
  frozenStudentsCount: number;
  expiredFreezeCount: number;
  upcomingBirthdays: BirthdayStudentDto[];
  lastUpdated: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface GroupAttendanceStatsRequest {
  pageNumber?: number;
  pageSize?: number;
  subjectId?: string;
  groupId?: string;
  fromDate: string;
  toDate: string;
}

export interface GroupAttendanceStatsDto {
  groupId: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  totalStudents: number;
  totalLessons: number;
  attendedCount: number;
  missedCount: number;
  attendanceRate: number;
  previousPeriodRate: number;
  trend: number;
}

export interface LessonAttendanceMonitoringRequest {
  pageNumber?: number;
  pageSize?: number;
  fromDate: string;
  toDate: string;
  subjectId: string;
  groupId?: string;
}

export interface LessonAttendanceMonitoringDto {
  lessonId: string;
  date: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  statusConfigId?: string;
  statusName: string;
  statusColor: string;
  statusDescription?: string;
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export interface StudentBalanceInfo {
  id: string;
  name: string;
  phone: string;
}

export interface GroupBalanceInfo {
  groupId: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  balance: number;
  remainingLessons: number;
  discountType?: number;
  discountValue?: number;
  discountReason?: string;
  isFrozen: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentGroupedBalancesDto {
  student: StudentBalanceInfo;
  groupBalances: GroupBalanceInfo[];
}

export interface OrganizationBalancesFilterRequest {
  pageNumber?: number;
  pageSize?: number;
  subjectId?: string;
  groupId?: string;
  studentSearch?: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface StudentPaymentInfo {
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentLogin: string;
  totalPaid: number;
  currentBalance: number;
  remainingLessons: number;
  discountType?: number;
  discountValue?: number;
  discountReason?: string;
  isFrozen: boolean;
  frozenFrom?: string;
  frozenTo?: string;
  freezeReason?: string;
}

export interface GroupPaymentInfo {
  groupId: string;
  groupName: string;
  groupCode: string;
  totalPaid: number;
  students: StudentPaymentInfo[];
}

export interface SubjectPaymentInfo {
  subjectId: string;
  subjectName: string;
  price: number;
  totalPaid: number;
  groups: GroupPaymentInfo[];
}

// ─── Management (Owner only) ──────────────────────────────────────────────────

export interface BranchOwnerUserDto {
  id: string;
  fullName: string;
  login: string;
  phone: string;
  createdDate: string;
  organizations: BranchOwnerOrganizationDto[];
}

export interface CreateBranchOwnerUserRequest {
  login: string;
  fullName: string;
  phone: string;
  organizationId: string;
}

export interface BranchOwnerCreatedResponse {
  id: string;
  fullName: string;
  login: string;
  generatedPassword: string;
  organizationId: string;
}

export interface BranchOwnerLinkRequest {
  ownerUserId: string;
  organizationId: string;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface BranchOwnerPagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
