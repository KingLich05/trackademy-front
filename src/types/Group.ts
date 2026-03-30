export interface GroupSubject {
  subjectId: string;
  subjectName: string;
}

export interface GroupStudentPackage {
  packageId: string;
  packageName: string;
}

export interface GroupStudent {
  studentId: string;
  studentName: string;
  subjectPackage?: GroupStudentPackage;
  isFrozen?: boolean;
  freezeStartDate?: string;
  freezeEndDate?: string;
  freezeReason?: string;
}

export interface StudentWithPackageModel {
  studentId: string;
  subjectPackageId: string;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  level: string;
  description?: string;
  subject: GroupSubject | string;
  students: GroupStudent[];
}

export interface GroupFormData {
  name: string;
  code: string;
  level: string;
  description?: string;
  subjectId: string;
  students: StudentWithPackageModel[];
  organizationId: string;
}

export const PaymentType = {
  Monthly: 1,
  OneTime: 2
} as const;

export const getPaymentTypeLabel = (type: number): string => {
  switch (type) {
    case PaymentType.Monthly:
      return 'Ежемесячный';
    case PaymentType.OneTime:
      return 'Единоразовый';
    default:
      return 'Не указан';
  }
};

export interface GroupsResponse {
  items: Group[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}