export interface DashboardSummary {
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
  lastUpdated: string;
}

export interface TeacherDashboardLesson {
  lessonId: string;
  startTime: string;
  endTime: string;
  groupName: string;
  subjectName: string;
  roomName: string;
  isPast: boolean;
  attendanceRate: number | null;
  presentCount: number | null;
  totalStudents: number | null;
}

export interface TeacherDashboardSummary {
  totalGroups: number;
  ungradedSubmissions: number;
  lessonsToday: number;
  todaySchedule: TeacherDashboardLesson[];
}

export interface StudentDashboardLesson {
  lessonId: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  groupName: string;
  roomName: string;
  teacherName: string;
}

export interface StudentActiveAssignment {
  assignmentId: string;
  description: string;
  subjectName: string;
  groupName: string;
  dueDate: string;
  status: string;
  isOverdue: boolean;
}

export interface StudentRecentGrade {
  subjectName: string;
  grade: number;
  gradedAt: string;
}

export interface StudentDashboardSummary {
  averageGrade: number;
  attendanceRate: number;
  activeAssignments: number;
  activeAssignmentsList: StudentActiveAssignment[];
  todaySchedule: StudentDashboardLesson[];
  recentGrades: StudentRecentGrade[];
}

export interface DashboardFilters {
  organizationId: string;
  groupIds?: string[];
  subjectIds?: string[];
  includeInactiveStudents?: boolean;
  lowPerformanceThreshold?: number;
}

export interface DashboardStats {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'emerald' | 'orange';
  description?: string;
}