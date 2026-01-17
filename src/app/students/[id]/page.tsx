'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../../services/AuthenticatedApiService';
import { User } from '../../../types/User';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showError } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = params.id as string;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      router.push('/login');
      return;
    }

    fetchUserDetails();
  }, [isAuthenticated, userId]);

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true);
      const response = await AuthenticatedApiService.getUserById(userId);
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      showError('Ошибка при загрузке данных пользователя');
      router.push('/students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/students');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Пользователь не найден</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  const getRoleName = (roleId: number) => {
    const roles: { [key: number]: string } = {
      1: 'Студент',
      2: 'Учитель',
      3: 'Администратор',
      4: 'Владелец',
      5: 'Родитель'
    };
    return roles[roleId] || `Роль ${roleId}`;
  };

  const getRoleStyles = (roleId: number) => {
    const styles: { [key: number]: string } = {
      1: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      2: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      3: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      4: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      5: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    };
    return styles[roleId] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Вернуться к списку студентов
          </button>
          
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.name || user.fullName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Детали пользователя
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleStyles(user.role)}`}>
              {getRoleName(user.role)}
            </span>
          </div>
        </div>

        {/* User Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Основная информация
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  ID пользователя
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                  {user.id}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Логин
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user.login}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Полное имя
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user.name || user.fullName}
                </p>
              </div>
              
              {user.birthday && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Дата рождения
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(user.birthday).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Роль
                </label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleStyles(user.role)}`}>
                    {getRoleName(user.role)}
                  </span>
                </div>
              </div>
              
              {user.isTrial && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Статус
                  </label>
                  <div className="mt-1">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                      Пробный период
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Контактная информация
            </h2>
            
            <div className="space-y-3">
              {user.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Телефон
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {user.phone}
                  </p>
                </div>
              )}
              
              {user.parentPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Телефон родителя
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {user.parentPhone}
                  </p>
                </div>
              )}
              
              {user.organizationId && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    ID организации
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                    {user.organizationId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Дополнительная информация
            </h2>
            
            {/* Placeholder for future data - waiting for API response structure */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Статистика (будет добавлена позже)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Здесь будут отображаться подробная статистика посещаемости, 
                история платежей и другие данные пользователя.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}