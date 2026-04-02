// Utility functions for API error handling and toast notifications

/**
 * Throw this when an API error was already shown to the user via toast.
 * UniversalModal catches this and stays open without displaying an additional
 * inline server-error message, preventing duplicate error display.
 */
export class AlreadyHandledError extends Error {
  constructor() {
    super('ALREADY_HANDLED');
    this.name = 'AlreadyHandledError';
  }
}
import { UserFormData } from '../types/User';

export const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage;
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.title || errorData.error || `Ошибка ${response.status}: ${response.statusText}`;
  } catch {
    // Если не удалось распарсить JSON
    errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
  }
  
  // Специальные сообщения для часто встречающихся ошибок
  if (response.status === 401) {
    errorMessage = 'Ошибка аутентификации. Пожалуйста, войдите в систему заново.';
  } else if (response.status === 403) {
    errorMessage = 'Недостаточно прав для выполнения этой операции.';
  } else if (response.status === 404) {
    errorMessage = 'Запрашиваемый ресурс не найден.';
  } else if (response.status === 500) {
    errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.';
  }
  
  throw new Error(errorMessage);
};

export const getSuccessMessage = (action: string, entity?: string): string => {
  switch (action) {
    case 'create':
      return `Запись успешно создана`;
    case 'update':
      return `Запись успешно обновлена`;
    case 'delete':
      return `Запись успешно удалена`;
    case 'save':
      return `Запись успешно сохранена`;
    default:
      return 'Операция выполнена успешно';
  }
};

// Clean user form data: convert empty strings to null for optional fields
export const cleanUserFormData = (formData: UserFormData): UserFormData => {
  const cleaned = { ...formData };
  
  // Omit password if empty so the backend can auto-generate it
  if (!cleaned.password || (typeof cleaned.password === 'string' && cleaned.password.trim() === '')) {
    delete cleaned.password;
  }

  // Convert empty strings to null for optional and nullable fields
  if (!cleaned.phone || cleaned.phone.replace(/\D/g, '').length === 0) {
    cleaned.phone = null;
  }
  if (!cleaned.parentPhone || cleaned.parentPhone.trim() === '') {
    cleaned.parentPhone = null;
  }
  // More robust birthday cleaning
  if (!cleaned.birthday || 
      cleaned.birthday === '' || 
      cleaned.birthday.trim() === '' || 
      cleaned.birthday === 'undefined' || 
      cleaned.birthday === 'null') {
    cleaned.birthday = null;
  }
  
  return cleaned;
};