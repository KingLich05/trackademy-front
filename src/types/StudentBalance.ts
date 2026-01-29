export interface Student {
  id: string;
  name: string;
  phone: string;
}

export interface GroupBalance {
  groupId: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  balance: number;
  remainingLessons: number;
  discountType: number | null;
  discountValue: number | null;
  discountReason: string | null;
  isFrozen: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface StudentBalanceItem {
  student: Student;
  groupBalances: GroupBalance[];
}

// Flattened structure for table display
export interface FlattenedBalance {
  studentId: string;
  studentName: string;
  studentPhone: string;
  groupId: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  balance: number;
  remainingLessons: number;
  discountType: number | null;
  discountValue: number | null;
  discountReason: string | null;
  isFrozen: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export enum DiscountType {
  Percentage = 1,
  Amount = 2
}

export interface StudentBalanceRequest {
  pageNumber: number;
  pageSize: number;
  organizationId: string;
  subjectId?: string;
  groupId?: string;
  studentSearch?: string;
}

export interface StudentBalanceResponse {
  items: StudentBalanceItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const getDiscountTypeLabel = (type: number | null): string => {
  if (type === null) return 'Без скидки';
  switch (type) {
    case DiscountType.Amount:
      return 'Фиксированная сумма';
    case DiscountType.Percentage:
      return 'Процент';
    default:
      return 'Неизвестно';
  }
};

export const formatBalance = (balance: number): string => {
  return new Intl.NumberFormat('ru-RU').format(balance) + ' тенге';
};

export const formatDiscount = (type: number | null, value: number | null): string => {
  if (type === null || value === null) return 'Без скидки';
  
  switch (type) {
    case DiscountType.Amount:
      return formatBalance(value);
    case DiscountType.Percentage:
      return `${value}%`;
    default:
      return 'Неизвестно';
  }
};

// Детальная информация о балансе студента в группе
export interface StudentGroupBalanceDetail {
  id: string;
  student: {
    id: string;
    name: string;
    phone: string;
  };
  group: {
    id: string;
    name: string;
    code: string;
  };
  balance: number;
  discountType: number;
  discountTypeName: string;
  discountValue: number;
  discountReason: string | null;
  createdAt: string;
  updatedAt: string;
  recentAttendances: RecentAttendance[];
  transactionHistory: TransactionHistory[];
}

export interface RecentAttendance {
  id: string;
  studentId: string;
  studentName: string;
  studentLogin: string;
  groupId: string;
  lessonId: string;
  date: string;
  plannedLessonDate: string;
  status: number;
  statusName: string;
  isPaid: boolean;
  grade: number | null;
  comment: string | null;
  subjectName: string;
  groupName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
}

export interface TransactionHistory {
  id: string;
  student: {
    id: string;
    name: string;
    phone: string;
  };
  group: {
    id: string;
    name: string;
    code: string;
  };
  type: number;
  typeDisplayName: string;
  amount: number;
  balanceAfter: number;
  description: string;
  operationDate: string;
  processedBy: string | null;
  processedByName: string | null;
  metadata: unknown;
}