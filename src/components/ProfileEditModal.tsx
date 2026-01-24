'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { BaseModal } from './ui/BaseModal';
import { User, UserFormData } from '../types/User';
import { usePhoneFormatter } from '../hooks/usePhoneFormatter';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
  profileData?: User | null;
  fallbackData?: {
    id: string;
    fullName: string;
    login: string;
    role: string;
  } | null;
  isDataLoading?: boolean;
}

interface ProfileFormData {
  login: string;
  fullName: string;
  phone: string;
  parentPhone: string;
  birthday: string;
  role: number;
  isTrial: boolean;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profileData,
  fallbackData,
  isDataLoading = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useToast();
  const { formatPhoneDisplay } = usePhoneFormatter();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    login: '',
    fullName: '',
    phone: '',
    parentPhone: '',
    birthday: '',
    role: 0,
    isTrial: false
  });

  // Заполняем форму данными профиля при открытии модалки
  useEffect(() => {
    if (isOpen) {
      const dataToUse = profileData || fallbackData;
      if (dataToUse) {
        const typedData = dataToUse as User & { fullName?: string };
        setFormData({
          login: typedData.login || '',
          fullName: typedData.name || typedData.fullName || '',
          phone: typedData.phone || '',
          parentPhone: typedData.parentPhone || '',
          birthday: typedData.birthday ? typedData.birthday.split('T')[0] : '', // Преобразуем в YYYY-MM-DD
          role: typeof typedData.role === 'string' ? parseInt(typedData.role) || 1 : typedData.role || 1,
          isTrial: typedData.isTrial || false
        });
      }
    }
  }, [profileData, fallbackData, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Специальная обработка для телефонных полей
    if (name === 'phone' || name === 'parentPhone') {
      const formattedValue = formatPhoneDisplay(value);
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.login.trim() || !formData.fullName.trim()) {
      showError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setIsLoading(true);
    try {
      // Преобразуем ProfileFormData в UserFormData
      const userFormData: UserFormData = {
        login: formData.login,
        fullName: formData.fullName,
        phone: formData.phone,
        parentPhone: formData.role === 1 ? (formData.parentPhone || null) : null,
        birthday: formData.birthday || null,
        role: formData.role,
        isTrial: formData.isTrial
      };
      
      await onSave(userFormData);
      showSuccess('Профиль успешно обновлен');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Ошибка при обновлении профиля');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleText = (role: number): string => {
    switch (role) {
      case 1: return 'Студент';
      case 2: return 'Администратор';
      case 3: return 'Преподаватель';
      case 4: return 'Владелец системы';
      default: return 'Неизвестная роль';
    }
  };

  // Показываем поле родительского телефона только для студентов
  const isStudent = formData.role === 1;

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Редактирование профиля"
      customBackground="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Индикатор загрузки данных */}
        {isDataLoading && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-blue-700 dark:text-blue-300">Загружаем дополнительные данные...</span>
          </div>
        )}
        
        {/* Роль (только для отображения) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Роль
          </label>
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-xl px-4 py-3 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
            <p className="text-sm font-medium flex items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center shadow-sm ${
                formData.role === 4 
                  ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300'
                  : formData.role === 2
                  ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-300'
                  : formData.role === 3
                  ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-300'
                  : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300'
              }`}>
                {getRoleText(formData.role)}
              </span>
            </p>
          </div>
        </div>

          {/* Логин */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Логин <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="login"
              value={formData.login}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white shadow-sm transition-all duration-200 hover:shadow-md"
              required
            />
          </div>

          {/* Полное имя */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Полное имя <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white shadow-sm transition-all duration-200 hover:shadow-md"
              required
            />
          </div>

          {/* Телефон */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Телефон
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+7XXXXXXXXXX"
              className="w-full px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white shadow-sm transition-all duration-200 hover:shadow-md"
            />
          </div>

          {/* Телефон родителя (только для студентов) */}
          {isStudent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Телефон родителя
              </label>
              <input
                type="tel"
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handleInputChange}
                placeholder="+7XXXXXXXXXX"
                className="w-full px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white shadow-sm transition-all duration-200 hover:shadow-md"
              />
            </div>
          )}

          {/* День рождения */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              День рождения
            </label>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white shadow-sm transition-all duration-200 hover:shadow-md"
            />
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] transform"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Сохранение...
                </span>
              ) : 'Сохранить изменения'}
            </button>
          </div>
        </form>
    </BaseModal>
  );
};

export default ProfileEditModal;