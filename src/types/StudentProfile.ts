// Типы для student-profile API
export interface StudentStatus {
  status: number;
  statusName: string;
  reason: string | null;
  changedAt: string | null;
  changedByName: string | null;
}

export interface StudentFlag {
  id: string;
  name: string;
  reason: string;
  source: number;
  sourceName: string;
  changedAt: string;
  changedByName: string | null;
}

export interface StudentFlagHistory {
  id: string;
  studentFlagId: string;
  flagName: string;
  isActive: boolean;
  reason: string;
  source: number;
  sourceName: string;
  changedAt: string;
  changedByName: string | null;
  removedAt: string | null;
  removalReason: string | null;
  removedByName: string | null;
}

export interface StudentStatusHistory {
  status: number;
  statusName: string;
  reason: string | null;
  validFrom: string;
  validTo: string | null;
  changedByName: string | null;
}

export interface StudentGroupSubject {
  id: string;
  name: string;
}

export interface StudentGroupTeacher {
  id: string;
  name: string;
}

export interface StudentGroup {
  groupId: string;
  groupName: string;
  groupCode: string;
  subject: StudentGroupSubject;
  teacher: StudentGroupTeacher;
  joinedAt: string;
  isFrozen: boolean;
  frozenFrom: string | null;
  frozenTo: string | null;
  freezeReason: string | null;
  discountValue: number | null;
  discountType: string | null;
  discountReason: string | null;
  remainingLessons: number;
  lessonCost: number;
  balance: number;
  averageGrade: number | null;
}

export interface GroupScore {
  groupId: string;
  groupName: string;
  subjectName: string;
  averageGrade: number;
  totalScores: number;
}

export interface GroupAttendance {
  groupId: string;
  groupName: string;
  subjectName: string;
  totalLessons: number;
  attendedLessons: number;
  lateLessons: number;
  missedLessons: number;
  excusedLessons: number;
  attendancePercentage: number;
}

export interface StudentSchedule {
  scheduleId: string;
  groupId: string;
  groupName: string;
  subjectName: string;
  teacherName: string;
  roomName: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface RecentLesson {
  lessonId: string;
  date: string;
  subjectName: string;
  groupName: string;
  teacherName: string;
  lessonStatus: string;
  attendanceStatus: string;
  grade: number | null;
  comment: string | null;
}

export interface UpcomingLesson {
  lessonId: string;
  date: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  groupName: string;
  teacherName: string;
  roomName: string;
  lessonStatus: string;
}

export interface BalanceHistoryStudent {
  id: string;
  name: string;
  phone: string;
}

export interface BalanceHistoryGroup {
  id: string;
  name: string;
  code: string;
}

export interface BalanceHistory {
  id: string;
  student: BalanceHistoryStudent;
  group: BalanceHistoryGroup;
  type: number;
  typeDisplayName: string;
  amount: number;
  balanceAfter: number;
  description: string;
  operationDate: string;
  processedBy: string | null;
  processedByName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface StudentProfile {
  id: string;
  login: string;
  fullName: string;
  phone: string;
  parentPhone: string | null;
  birthday: string | null;
  createdAt: string;
  isArchived: boolean;
  role: string;
  organizationName: string;
  comment: string | null;
  currentStatus: StudentStatus;
  activeFlags: StudentFlag[];
  flagHistory: StudentFlagHistory[];
  statusHistory: StudentStatusHistory[];
  groups: StudentGroup[];
  groupScores: GroupScore[];
  groupAttendance: GroupAttendance[];
  schedule: StudentSchedule[];
  recentLessons: RecentLesson[];
  upcomingLessons: UpcomingLesson[];
  balanceHistory: BalanceHistory[];
  currentBalance: number;
  totalPaid: number;
  totalDebt: number;
}