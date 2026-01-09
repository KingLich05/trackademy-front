export interface Document {
  id: string;
  name: string;
  type: 'PublicOffer' | 'PrivacyPolicy' | 'Other';
  fileName: string;
  uploadDate: string;
  fileSize: number;
  contentType: string;
}

export interface DocumentUploadData {
  name: string;
  type: 'PublicOffer' | 'PrivacyPolicy' | 'Other';
  file: File;
}

export const DOCUMENT_TYPES = {
  PublicOffer: 'Публичная оферта',
  PrivacyPolicy: 'Политика конфиденциальности',
  Other: 'Другое'
} as const;