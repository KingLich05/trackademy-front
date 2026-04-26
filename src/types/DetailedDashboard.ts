export interface SubjectRef {
  subjectId: string;
  subjectName: string;
}

export interface TeacherRef {
  id: string;
  name: string | null;
  hasPhoto: boolean;
}

export interface GroupRef {
  id: string;
  name: string;
}

export interface SubjectIncomeStats {
  subject: SubjectRef;
  incomeAmountForPeriod: number;
  incomeAmountForPreviousPeriod: number;
  incomeTrend: number;
}

export interface TeacherIncomeStats {
  teacher: TeacherRef;
  incomeAmountForPeriod: number;
  incomeAmountForPreviousPeriod: number;
  incomeTrend: number;
}

export interface FinancialStats {
  totalIncomeForPeriod: number;
  subjectIncomeStats: SubjectIncomeStats[];
  teacherIncomeStats: TeacherIncomeStats[];
  averageStudentIncome: number;
  totalIncomeForPreviousPeriod: number;
  incomeTrend: number;
}

export interface StudentStats {
  totalStudentsCount: number;
  activeStudentsCount: number;
  newStudentsForPeriodCount: number;
  studentsChurnForPeriodCount: number;
  churnForPeriodRate: number;
  newStudentsForPreviousPeriodCount: number;
  studentsChurnForPreviousPeriodCount: number;
  churnForPreviousPeriodRate: number;
}

export interface GroupAttendanceStats {
  group: GroupRef;
  groupCode: string;
  groupAttendanceRateForPeriod: number;
  groupAbsentRateForPeriod: number;
  groupAttendanceRateForPreviousPeriod: number;
  groupAbsentRateForPreviousPeriod: number;
}

export interface AttendanceStats {
  totalAttendanceMarksCountForPeriod: number;
  overallAttendanceRateForPeriod: number;
  presentAttendancesCountForPeriod: number;
  absentAttendancesCountForPeriod: number;
  absentRateForPeriod: number;
  totalAttendanceMarksCountForPreviousPeriod: number;
  overallAttendanceRateForPreviousPeriod: number;
  presentAttendancesCountForPreviousPeriod: number;
  absentAttendancesCountForPreviousPeriod: number;
  absentRateForPreviousPeriod: number;
  groupAttendanceStats: GroupAttendanceStats[];
}

export interface TeacherStat {
  teacher: TeacherRef;
  studentCount: number;
  groupCount: number;
  lessonsForPeriod: number;
  averageAttendanceRateForPeriod: number;
  lessonsForPreviousPeriod: number;
  averageAttendanceRateForPreviousPeriod: number;
  rating: number;
}

export interface ConversionStats {
  conversionRateForPeriod: number;
  leadsCountForPeriod: number;
  convertedStudentsCountForPeriod: number;
  conversionRateForPreviousPeriod: number;
  leadsCountForPreviousPeriod: number;
  convertedStudentsCountForPreviousPeriod: number;
}

export interface RetentionStats {
  longTermStudentsCount: number;
  averageStudentLifetime: string;
}

export interface LowPerformanceGroup {
  groupId: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  attendanceRate: number;
  totalStudents: number;
  activeStudents: number;
  performanceIssue: string;
}

export interface DetailedDashboard {
  financialStats: FinancialStats;
  studentStats: StudentStats;
  attendanceStats: AttendanceStats;
  teacherStats: TeacherStat[];
  conversionStats: ConversionStats;
  retentionStats: RetentionStats;
  lowPerformanceGroups: LowPerformanceGroup[];
  generatedAt: string;
  reportPeriodFrom: string;
  reportPeriodTo: string;
}
