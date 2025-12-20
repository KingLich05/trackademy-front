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
  Amount = 0,
  Percentage = 1
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