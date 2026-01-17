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
    
    if (!onSave || !validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (mode === 'edit' && data && 'id' in data) {
        await onSave(formData, data.id as string);
      } else {
        await onSave(formData);
      }
      handleClose();
    } catch (error) {
      // Ошибка уже обработана toast системой, не выводим в консоль
      // console.error(`Error ${mode === 'create' ? 'creating' : 'updating'}:`, error);
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