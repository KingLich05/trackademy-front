'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface UniversalModalProps<T = Record<string, unknown>> {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  initialData?: T;
  data?: T; // для режима edit/view
  onSave?: (data: T, id?: string) => void | Promise<void>; // Опциональный для view режима
  children: (props: {
    formData: T;
    setFormData: React.Dispatch<React.SetStateAction<T>>;
    errors: Record<string, string>;
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isSubmitting: boolean;
    mode: 'create' | 'edit' | 'view';
  }) => React.ReactNode;
  validate?: (data: T) => Record<string, string>;
  submitText?: string;
  loadingText?: string;
}

const UniversalModal = <T extends Record<string, unknown>>({
  isOpen,
  onClose,
  mode,
  title,
  subtitle,
  icon,
  gradientFrom,
  gradientTo,
  maxWidth = 'lg',
  initialData,
  data,
  onSave,
  children,
  validate,
  submitText,
  loadingText
}: UniversalModalProps<T>) => {
  const [formData, setFormData] = useState<T>(initialData || {} as T);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Update form data when data changes (for edit/view mode)
  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && data) {
      setFormData(data);
    } else if (mode === 'create' && initialData) {
      setFormData(initialData);
    }
  }, [mode, data, initialData]);

  const handleClose = () => {
    if (!isSubmitting) {
      if (mode === 'create' && initialData) {
        setFormData(initialData);
      }
      setErrors({});
      setServerError(null);
      setShowValidationErrors(false);
      onClose();
    }
  };

  const validateForm = (): boolean => {
    if (validate) {
      const newErrors = validate(formData);
      setErrors(newErrors);
      
      const hasErrors = Object.keys(newErrors).length > 0;
      
      // Если есть ошибки, прокручиваем к первому полю с ошибкой
      if (hasErrors) {
        setTimeout(() => {
          const firstErrorField = Object.keys(newErrors)[0];
          const errorElement = document.querySelector(`[name="${firstErrorField}"], [data-field="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            // Подсвечиваем поле с ошибкой
            errorElement.classList.add('shake-animation');
            setTimeout(() => {
              errorElement.classList.remove('shake-animation');
            }, 600);
          }
        }, 100);
      }
      
      return !hasErrors;
    }
    return true;
  };

  // Check if form is valid in real-time (without setting errors)
  const isFormValid = (): boolean => {
    if (validate) {
      const validationErrors = validate(formData);
      return Object.keys(validationErrors).length === 0;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // В режиме view просто закрываем модал
    if (mode === 'view') {
      handleClose();
      return;
    }
    
    if (!onSave || isSubmitting) return;
    
    // Показываем все ошибки валидации при попытке сохранения
    if (!validateForm()) {
      setShowValidationErrors(true);
      return;
    }

    setIsSubmitting(true);
    setServerError(null); // Очищаем предыдущую ошибку
    try {
      if (mode === 'edit' && data && 'id' in data) {
        await onSave(formData, data.id as string);
      } else {
        await onSave(formData);
      }
      handleClose();
    } catch (error) {
      // Извлекаем сообщение об ошибке для отображения в модалке
      let errorMessage = 'Произошла ошибка при выполнении операции';
      
      const apiError = error as {
        parsedError?: { 
          error?: string; 
          errors?: Record<string, string[]>;
          title?: string;
          message?: string;
        };
        message?: string;
      };

      if (apiError?.parsedError?.error) {
        errorMessage = apiError.parsedError.error;
      } else if (apiError?.parsedError?.title) {
        errorMessage = apiError.parsedError.title;
      } else if (apiError?.parsedError?.message) {
        errorMessage = apiError.parsedError.message;
      } else if (apiError?.message) {
        const match = apiError.message.match(/HTTP error! status: \d+ - (.+)$/);
        if (match && match[1]) {
          errorMessage = match[1];
        } else if (!apiError.message.startsWith('HTTP error!')) {
          errorMessage = apiError.message;
        }
      }
      
      setServerError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefaultSubmitText = () => {
    switch (mode) {
      case 'view': return 'Закрыть';
      case 'create': return 'Создать';
      case 'edit': return 'Сохранить изменения';
      default: return 'Создать';
    }
  };

  const getDefaultLoadingText = () => {
    switch (mode) {
      case 'view': return 'Закрытие...';
      case 'create': return 'Создание...';
      case 'edit': return 'Сохранение...';
      default: return 'Создание...';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      gradientFrom={gradientFrom}
      gradientTo={gradientTo}
      maxWidth={maxWidth}
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Validation Errors Banner */}
        {showValidationErrors && Object.keys(errors).length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Заполните обязательные поля
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowValidationErrors(false)}
                className="ml-auto flex-shrink-0 inline-flex text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-200"
              >
                <span className="sr-only">Закрыть</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* le={subtitle}
      icon={icon}
      gradientFrom={gradientFrom}
      gradientTo={gradientTo}
      maxWidth={maxWidth}
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Server Error Banner */}
        {serverError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Ошибка
                </h3>
                <div className="mt00">
                  {serverError}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setServerError(null)}
                className="ml-auto flex-shrink-0 inline-flex text-red-400 hover:text-red-600 dark:hover:text-red-200"
              >
                <span className="sr-only">Закрыть</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Render form fields */}
        {children({
          formData,
          setFormData,
          errors,
          setErrors,
          isSubmitting,
          mode
        })}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
          {mode !== 'view' && (
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Отмена
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || (mode !== 'view' && !isFormValid())}
            className={`px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-${gradientFrom} to-${gradientTo} hover:opacity-90 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105`}
          >
            {isSubmitting ? (loadingText || getDefaultLoadingText()) : (submitText || getDefaultSubmitText())}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UniversalModal;