export interface UserGroup {
  id: string;
  name: string;
}

export interface User {
  id: string;
  login: string;
  name: string;
  fullName?: string; // Алиас для name для совместимости
  phone: string;
  parentPhone: string | null;
  birthday: string | null;
  groups: UserGroup[];
  role: number;
  organizationId?: string;
  organizationName?: string;
  isTrial: boolean;
  createdDate: string;
}

export interface UserFormData {
  id?: string;
  login: string;
  fullName: string;
  password?: string;
  phone: string | null;
  parentPhone?: string | null;
  birthday?: string | null;
  role: number;
  organizationId?: string;
  isTrial: boolean;
  groupIds?: string[];
  comment?: string;
}

// Типы для импорта пользователей
export interface ImportedUser {
  rowNumber: number;
  userId: string;
  fullName: string;
  login: string;
  generatedPassword: string;
  phone: string;
  role: string;
}

export interface ImportError {
  rowNumber: number;
  fullName: string;
  phone: string;
  errors: string[];
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  createdUsers: ImportedUser[];
  errors: ImportError[];
}