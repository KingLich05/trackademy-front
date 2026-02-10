'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { UserIcon, BuildingOfficeIcon, IdentificationIcon, ShieldCheckIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import ProfileEditModal from '../../components/ProfileEditModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { User, UserFormData } from '../../types/User';




interface ProfileData {
  id: string;
  login: string;
  fullName: string;
  role: string;
  organizationId: string;
  organizationNames: string;
}

export default function Profile() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoadingFullData, setIsLoadingFullData] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [fullProfileData, setFullProfileData] = useState<User | null>(null);



  useEffect(() => {
    if (isAuthenticated) {
      fetchProfileData();
    }
  }, [isAuthenticated]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await AuthenticatedApiService.get<ProfileData>('/Auth/me');
      setProfileData(data);

      // Загружаем балансы для студентов
      if (user?.role === 'Student' && user?.id) {

      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      setError('Не удалось загрузить данные профиля');
    } finally {
      setLoading(false);
    }
  };



  const handleEditProfile = async () => {
    if (!user?.id) return;
    
    // Если полные данные уже загружены, просто открываем модалку
    if (fullProfileData) {
      setIsEditModalOpen(true);
      return;
    }
    
    // Иначе сначала загружаем данные, потом открываем модалку
    setIsLoadingFullData(true);
    try {
      const userData = await AuthenticatedApiService.getUserById(user.id);
      setFullProfileData(userData);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch full profile data:', error);
      setError('Не удалось загрузить полные данные профиля');
    } finally {
      setIsLoadingFullData(false);
    }
  };

  const handleSaveProfile = async (formData: UserFormData) => {
    if (!user?.id) return;
    try {
      await AuthenticatedApiService.putUpdateUser(user.id, formData);
      // Обновляем данные профиля после сохранения
      await fetchProfileData();
      // Также обновляем полные данные для модалки
      const userData = await AuthenticatedApiService.getUserById(user.id);
      setFullProfileData(userData);
      // Обновляем пользователя в AuthContext с помощью refreshUser
      await refreshUser();
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error; // Пробрасываем ошибку для обработки в модалке
    }
  };

  const getRoleDisplayName = (role: string | number) => {
    // Convert number to string if needed
    const roleStr = typeof role === 'number' ? role.toString() : role;
    
    switch (roleStr) {
      case '1':
        return 'Студент';
      case '2':
        return 'Администратор';
      case '3':
        return 'Преподаватель';
      case '4':
        return 'Владелец системы';
      default:
        return roleStr;
    }
  };

  // const getRoleBadgeColor = (role: string | number) => {
  //   // Convert number to string if needed
  //   const roleStr = typeof role === 'number' ? role.toString() : role;
  //   
  //   switch (roleStr) {
  //     case 'Administrator':
  //     case '2':
  //       return 'bg-red-100 text-red-800';
  //     case 'Teacher':
  //     case '3':
  //       return 'bg-blue-100 text-blue-800';
  //     case 'Student':
  //     case '1':
  //       return 'bg-green-100 text-green-800';
  //     default:
  //       return 'bg-gray-100 text-gray-800';
  //   }

  const getRoleBadgeColor = (role: string | number) => {
    // Convert number to string if needed
    const roleStr = typeof role === 'number' ? role.toString() : role;
    
    switch (roleStr) {
      case '1':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300';
      case '2':
        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-300';
      case '3':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-300';
      case '4':
        return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900/30 dark:to-gray-800/30 dark:text-gray-300';
    }
  };
  // };

  const displayData = profileData || user;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <UserIcon className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mt-1" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Требуется авторизация</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Войдите в систему для просмотра профиля
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка профиля...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl border border-red-200/50 dark:border-red-700/50 p-6">
            <div className="text-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600 dark:text-red-400 mx-auto mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ошибка загрузки</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{error}</p>
              <button
                onClick={fetchProfileData}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-container max-w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Modern Header Card */}
        <PageHeaderWithStats
          title={displayData?.fullName || 'Пользователь'}
          subtitle="Личный профиль и настройки аккаунта"
          icon={UserIcon}
          gradientFrom="cyan-500"
          gradientTo="blue-600"
          stats={[
            { label: "Роль", value: displayData?.role ? getRoleDisplayName(displayData.role) : 'Не определена', color: "blue" },
            { label: "Организация", value: (typeof user?.organizationNames === 'string' ? user.organizationNames : user?.organizationNames?.[0]) || 'Не указана', color: "cyan" }
          ]}
        />

        {/* Profile Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* Personal Information Card */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-3">
                  <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Личная информация
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Полное имя</label>
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg px-4 py-3 border border-gray-200/50 dark:border-gray-600/50">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {displayData?.fullName || 'Не указано'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Логин</label>
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg px-4 py-3 border border-gray-200/50 dark:border-gray-600/50">
                    <p className="text-sm text-gray-900 dark:text-white font-medium flex items-center">
                      <IdentificationIcon className="h-4 w-4 mr-2 text-blue-500" />
                      {displayData?.login || 'Не указано'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Роль</label>
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg px-4 py-3 border border-gray-200/50 dark:border-gray-600/50">
                    <p className="text-sm font-medium flex items-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
                        displayData?.role ? getRoleBadgeColor(displayData.role) : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900/30 dark:to-gray-800/30 dark:text-gray-300'
                      }`}>
                        <ShieldCheckIcon className="h-3 w-3 mr-1" />
                        {displayData?.role ? getRoleDisplayName(displayData.role) : 'Не указано'}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Организация</label>
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg px-4 py-3 border border-gray-200/50 dark:border-gray-600/50">
                    <p className="text-sm text-gray-900 dark:text-white font-medium flex items-center">
                      <BuildingOfficeIcon className="h-4 w-4 mr-2 text-blue-500" />
                      {(typeof user?.organizationNames === 'string' ? user.organizationNames : user?.organizationNames?.[0]) || 'Не указана'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Student Balances Section */}
        {user?.role === 'Student' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balances Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg mr-3">
                    <BanknotesIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  Мои балансы
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Баланс и скидки по группам
                </p>
              </div>
              
              <div className="p-6">
                {false ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Данные баланса недоступны
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Дополнительная информация
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Здесь может быть размещена дополнительная информация профиля.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg mr-3">
                <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              Действия
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleEditProfile}
                disabled={isLoadingFullData}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 transform flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoadingFullData ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                    Загрузка данных...
                  </>
                ) : (
                  <>
                    <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Редактировать профиль
                  </>
                )}
              </button>
              
              <button 
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 transform flex items-center justify-center"
              >
                <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2L4.257 10.257a6 6 0 0111.486-1.486L14 7h1z" />
                </svg>
                Поменять пароль
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
        profileData={fullProfileData}
        fallbackData={user}
        isDataLoading={isLoadingFullData}
      />
      
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </div>
  );
}
