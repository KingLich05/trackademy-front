export interface Document {
  id: string;
  type: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
}

export interface DocumentUploadData {
  name: string;
  type: 'PrivacyPolicy' | 'TermsOfService' | 'PublicOffer';
  file: File;
}

export const DOCUMENT_TYPES: Record<number, string> = {
  1: 'Политика конфиденциальности',
  2: 'Условия использования',
  3: 'Публичная оферта'
};

export const DOCUMENT_TYPE_LABELS = {
  PrivacyPolicy: 'Политика конфиденциальности',
  TermsOfService: 'Условия использования',
  PublicOffer: 'Публичная оферта'
} as const;