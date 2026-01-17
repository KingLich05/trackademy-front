export interface StudentSubmission {
  studentId: string;
  studentName: string;
  studentLogin: string;
  submission: {
    id: string;
    status: number;
    statusName: string;
    score: number | null;
    submittedAt: string | null;
    gradedAt: string | null;
  } | null;
}

export interface Assignment {
  id: string;
  description: string;
  groupId: string;
  assignedDate: string;
  dueDate: string;
  createdAt: string;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentSize?: number;
  group: {
    id: string;
    name: string;
    code?: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  subjectName?: string; // Добавляем поле subjectName из API
  studentSubmissions?: StudentSubmission[];
}

export enum SubmissionStatus {
  Submitted = 1,
  Graded = 2,
  Returned = 3,
  Overdue = 4
}

export const getSubmissionStatusText = (status: number): string => {
  switch (status) {
    case SubmissionStatus.Submitted:
      return 'Отправлено на проверку';
    case SubmissionStatus.Graded:
      return 'Проверено и оценено';
    case SubmissionStatus.Returned:
      return 'Возвращено на доработку';
    case SubmissionStatus.Overdue:
      return 'Просрочено';
    default:
      return 'Не сдано';
  }
};

export const getSubmissionStatusColor = (status: number | null): string => {
  if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  
  switch (status) {
    case SubmissionStatus.Submitted:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case SubmissionStatus.Graded:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case SubmissionStatus.Returned:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case SubmissionStatus.Overdue:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

export interface AssignmentFormData {
  description: string;
  groupId: string;
  assignedDate: string;
  dueDate: string;
  attachmentFile?: File;
}

export interface AssignmentsResponse {
  items: Assignment[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AssignmentFilters {
  organizationId: string;
  groupId?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber: number;
  pageSize: number;
}
