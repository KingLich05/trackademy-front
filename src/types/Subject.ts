export interface SubjectPackage {
  id?: string;
  name: string;
  description?: string;
  price: number;
  paymentType: PaymentType;
  lessonsPerMonth: number;
  totalLessons: number;
  hasFreezeOption: boolean;
  hasMakeUpLessons: boolean;
  pricePerLesson?: number;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  subjectPackages: SubjectPackage[];
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectFormData extends Record<string, unknown> {
  name: string;
  description?: string;
  subjectPackages: SubjectPackage[];
  organizationId: string;
}

export enum PaymentType {
  Monthly = 1,      // Ежемесячный
  OneTime = 2       // Единоразовый
}

export const getPaymentTypeLabel = (type: PaymentType | number): string => {
  switch (type) {
    case PaymentType.Monthly:
    case 1:
      return 'Ежемесячный';
    case PaymentType.OneTime:
    case 2:
      return 'Единоразовый';
    default:
      return 'Не указан';
  }
};

export const getPaymentTypeOptions = () => [
  { value: PaymentType.Monthly, label: getPaymentTypeLabel(PaymentType.Monthly) },
  { value: PaymentType.OneTime, label: getPaymentTypeLabel(PaymentType.OneTime) }
];