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
  type: 'PublicOffer' | 'PrivacyPolicy' | 'Other';
  file: File;
}

export const DOCUMENT_TYPES: Record<number, string> = {
  1: 'Публичная оферта',
  2: 'Политика конфиденциальности',
  3: 'Другое'
};

export const DOCUMENT_TYPE_LABELS = {
  PublicOffer: 'Публичная оферта',
  PrivacyPolicy: 'Политика конфиденциальности',
  Other: 'Другое'
} as const;