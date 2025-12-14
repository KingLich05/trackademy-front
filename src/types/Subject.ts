export interface Subject {
  id: string;
  name: string;
  description?: string;
  price: number;
  paymentType: PaymentType;
  lessonsPerMonth: number;
  totalLessons: number;
  pricePerLesson: number;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectFormData extends Record<string, unknown> {
  name: string;
  description?: string;
  price: number;
  paymentType: PaymentType;
  lessonsPerMonth: number;
  totalLessons: number;
  pricePerLesson?: number;
  organizationId: string;
}

export interface SubjectAddModel {
  name: string;              // Обязательно, макс 200 символов
  description?: string;      // Опционально, макс 1000 символов  
  price: number;            // Обязательно, >= 0
  paymentType: PaymentType; // Enum: Monthly/OneTime
  lessonsPerMonth?: number; // Для ежемесячного типа, > 0
  totalLessons?: number;    // Для единоразового типа, > 0
  organizationId: string;   // Обязательно (UUID)
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