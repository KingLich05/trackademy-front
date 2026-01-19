'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../../services/AuthenticatedApiService';
import { StudentProfile, GroupAttendance, UpcomingLesson, RecentLesson, BalanceHistory, StudentGroup } from '../../../types/StudentProfile';
import { StudentFlag } from '../../../types/StudentFlag';
import { StudentStatus, getStudentStatusName } from '../../../types/StudentCrm';
import { ArrowLeftIcon, CalendarIcon, ChartBarIcon, CreditCardIcon, AcademicCapIcon, ClockIcon, BanknotesIcon, PencilIcon, FlagIcon, XMarkIcon, PlusCircleIcon, UserMinusIcon, ReceiptPercentIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { BaseModal } from '../../../components/ui/BaseModal';
import { AddBalanceModal } from '../../../components/AddBalanceModal';
import { DiscountModal } from '../../../components/DiscountModal';
import { FreezeStudentModal } from '../../../components/FreezeStudentModal';
import { StudentBalanceApiService, AddBalanceRequest, DiscountRequest } from '../../../services/StudentBalanceApiService';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showError, showSuccess } = useToast();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFlagsModal, setShowFlagsModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus>(StudentStatus.Potential);
  const [statusReason, setStatusReason] = useState('');
  const [availableFlags, setAvailableFlags] = useState<StudentFlag[]>([]);
  const [selectedFlagId, setSelectedFlagId] = useState('');
  const [flagReason, setFlagReason] = useState('');
  
  // Модалка пополнения баланса
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [selectedGroupForBalance, setSelectedGroupForBalance] = useState<StudentGroup | null>(null);
  const [addingBalance, setAddingBalance] = useState(false);
  
  // Модалки скидок и заморозки
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [showRemoveFromGroupModal, setShowRemoveFromGroupModal] = useState(false);
  const [selectedGroupForAction, setSelectedGroupForAction] = useState<StudentGroup | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [removingDiscount, setRemovingDiscount] = useState(false);
  const [freezingStudent, setFreezingStudent] = useState(false);
  const [removingFromGroup, setRemovingFromGroup] = useState(false);
  
  // Модалка редактирования профиля
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    login: '',
    phone: '',
    parentPhone: '',
    comment: '',
    birthDate: ''
  });
  
  // Модалка удаления флага
  const [showRemoveFlagModal, setShowRemoveFlagModal] = useState(false);
  const [flagToRemove, setFlagToRemove] = useState<{id: string, name: string} | null>(null);
  const [flagRemovalReason, setFlagRemovalReason] = useState('');

  const userId = params.id as string;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      router.push('/login');
      return;
    }

    fetchStudentProfile();
  }, [isAuthenticated, userId]);

  const fetchStudentProfile = async () => {
    try {
      setIsLoading(true);
      // При первоначальной загрузке не передаем даты
      const data = await AuthenticatedApiService.getStudentProfile(userId);
      if (data) {
        setStudentProfile(data);
      } else {
        throw new Error('No student profile data received');
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
      showError('Ошибка при загрузке профиля студента');
      router.push('/students');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableFlags = async () => {
    try {
      const flags = await AuthenticatedApiService.getStudentFlags();
      setAvailableFlags(flags);
    } catch (error) {
      console.error('Error loading flags:', error);
      showError('Ошибка при загрузке флагов');
    }
  };

  const handleStatusChange = async () => {
    if (!statusReason.trim()) {
      showError('Введите причину смены статуса');
      return;
    }

    try {
      await AuthenticatedApiService.setStudentStatus({
        studentId: userId,
        status: selectedStatus,
        reason: statusReason.trim()
      });
      showSuccess('Статус студента успешно изменен');
      setShowStatusModal(false);
      setStatusReason('');
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error changing status:', error);
      showError('Ошибка при изменении статуса');
    }
  };

  const handleAddFlag = async () => {
    if (!selectedFlagId) {
      showError('Выберите флаг');
      return;
    }

    if (!flagReason.trim()) {
      showError('Введите причину установки флага');
      return;
    }

    try {
      await AuthenticatedApiService.setStudentFlag({
        studentId: userId,
        studentFlagId: selectedFlagId,
        reason: flagReason.trim(),
        source: 1
      });
      showSuccess('Флаг успешно установлен');
      setShowFlagsModal(false);
      setSelectedFlagId('');
      setFlagReason('');
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error adding flag:', error);
      showError('Ошибка при установке флага');
    }
  };

  const handleRemoveFlag = async (flagId: string, flagName: string) => {
    if (!flagRemovalReason.trim()) {
      showError('Введите причину удаления флага');
      return;
    }

    try {
      await AuthenticatedApiService.removeStudentFlag({
        studentId: userId,
        studentFlagId: flagId,
        reason: flagRemovalReason.trim()
      });
      showSuccess('Флаг успешно удален');
      setShowRemoveFlagModal(false);
      setFlagToRemove(null);
      setFlagRemovalReason('');
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error removing flag:', error);
      showError('Ошибка при удалении флага');
    }
  };

  const openRemoveFlagModal = (flagId: string, flagName: string) => {
    setFlagToRemove({ id: flagId, name: flagName });
    setFlagRemovalReason('');
    setShowRemoveFlagModal(true);
  };

  const openStatusModal = () => {
    if (studentProfile) {
      setSelectedStatus(studentProfile.currentStatus.status as StudentStatus);
      setStatusReason('');
      setShowStatusModal(true);
    }
  };

  const openFlagsModal = () => {
    setSelectedFlagId('');
    setFlagReason('');
    setShowFlagsModal(true);
    loadAvailableFlags();
  };

  const handleAddBalance = async (amount: number, description: string) => {
    if (!selectedGroupForBalance) return;

    setAddingBalance(true);
    try {
      const request: AddBalanceRequest = {
        studentId: userId,
        groupId: selectedGroupForBalance.groupId,
        amount,
        description
      };

      await StudentBalanceApiService.addBalance(request);
      showSuccess(`Баланс пополнен на ${amount.toLocaleString()} ₸`);
      setShowAddBalanceModal(false);
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error adding balance:', error);
      showError('Ошибка при пополнении баланса');
    } finally {
      setAddingBalance(false);
    }
  };

  const handleRemoveFromGroup = async (groupId: string, groupName: string) => {
    setRemovingFromGroup(true);
    try {
      await AuthenticatedApiService.post('/Group/remove-student', {
        groupId,
        studentId: userId
      });
      showSuccess(`Студент удален из группы "${groupName}"`);
      setShowRemoveFromGroupModal(false);
      setSelectedGroupForAction(null);
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error removing from group:', error);
      showError('Ошибка при удалении из группы');
    } finally {
      setRemovingFromGroup(false);
    }
  };

  const openRemoveFromGroupModal = (group: StudentGroup) => {
    setSelectedGroupForAction(group);
    setShowRemoveFromGroupModal(true);
  };

  const openAddBalanceModal = (group: StudentGroup) => {
    setSelectedGroupForBalance(group);
    setShowAddBalanceModal(true);
  };

  const handleApplyDiscount = async (discountType: number, discountValue: number, discountReason: string) => {
    if (!selectedGroupForAction) return;

    setApplyingDiscount(true);
    try {
      const request: DiscountRequest = {
        studentId: userId,
        groupId: selectedGroupForAction.groupId,
        discountType,
        discountValue,
        discountReason
      };

      await StudentBalanceApiService.applyDiscount(request);
      const discountText = discountType === 1 ? `${discountValue}%` : `${discountValue.toLocaleString()} ₸`;
      showSuccess(`Скидка ${discountText} применена`);
      setShowDiscountModal(false);
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error applying discount:', error);
      showError('Ошибка при применении скидки');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = async () => {
    if (!selectedGroupForAction) return;
    
    setRemovingDiscount(true);
    try {
      await StudentBalanceApiService.removeDiscount(userId, selectedGroupForAction.groupId);
      showSuccess('Скидка удалена');
      setShowDiscountModal(false);
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error removing discount:', error);
      showError('Ошибка при удалении скидки');
    } finally {
      setRemovingDiscount(false);
    }
  };

  const handleFreezeStudent = async (startDate: string, endDate: string, reason: string) => {
    if (!selectedGroupForAction) return;

    setFreezingStudent(true);
    try {
      await AuthenticatedApiService.post('/Group/freeze-student', {
        studentId: userId,
        groupId: selectedGroupForAction.groupId,
        frozenFrom: startDate,
        frozenTo: endDate,
        freezeReason: reason
      });
      
      showSuccess(`Студент заморожен в группе "${selectedGroupForAction.groupName}"`);
      setShowFreezeModal(false);
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error freezing student:', error);
      showError('Ошибка при заморозке студента');
    } finally {
      setFreezingStudent(false);
    }
  };

  const handleUnfreezeStudent = async () => {
    if (!selectedGroupForAction) return;

    setFreezingStudent(true);
    try {
      await AuthenticatedApiService.post('/Group/unfreeze-student', {
        studentId: userId,
        groupId: selectedGroupForAction.groupId
      });
      
      showSuccess(`Студент разморожен в группе "${selectedGroupForAction.groupName}"`);
      setShowUnfreezeModal(false);
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error unfreezing student:', error);
      showError('Ошибка при разморозке студента');
    } finally {
      setFreezingStudent(false);
    }
  };

  const openDiscountModal = (group: StudentGroup) => {
    setSelectedGroupForAction(group);
    setShowDiscountModal(true);
  };

  const openFreezeModal = (group: StudentGroup) => {
    setSelectedGroupForAction(group);
    setShowFreezeModal(true);
  };

  const openUnfreezeModal = (group: StudentGroup) => {
    setSelectedGroupForAction(group);
    setShowUnfreezeModal(true);
  };

  const handleSaveProfile = async () => {
    setEditingProfile(true);
    try {
      await AuthenticatedApiService.put(`/User/${userId}`, {
        fullName: profileData.fullName,
        login: profileData.login,
        phone: profileData.phone,
        parentPhone: profileData.parentPhone || null,
        comment: profileData.comment || null,
        birthDate: profileData.birthDate || null
      });
      showSuccess('Профиль студента успешно обновлен');
      setShowEditProfileModal(false);
      fetchStudentProfile(); // Перезагружаем профиль
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Ошибка при обновлении профиля');
    } finally {
      setEditingProfile(false);
    }
  };

  const handleResetPassword = async () => {
    const confirmed = confirm('Вы уверены, что хотите сбросить пароль студента? Новый пароль будет отправлен на email.');
    if (!confirmed) return;

    setResettingPassword(true);
    try {
      await AuthenticatedApiService.post('/User/reset-password', {
        userId: userId
      });
      showSuccess('Пароль успешно сброшен. Новый пароль отправлен на email студента.');
    } catch (error) {
      console.error('Error resetting password:', error);
      showError('Ошибка при сбросе пароля');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleBack = () => {
    router.push('/students');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getStatusColor = (status: number) => {
    const colors: { [key: number]: string } = {
      0: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      1: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      2: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      3: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const getLessonStatusColor = (status: string) => {
    switch (status) {
      case 'Planned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'Attend':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Excused':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTransactionTypeColor = (type: number) => {
    switch (type) {
      case 1: // Пополнение
        return 'text-green-600 dark:text-green-400';
      case 2: // Списание
        return 'text-red-600 dark:text-red-400';
      case 3: // Возврат
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getDayName = (dayNumber: number) => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return days[dayNumber - 1] || dayNumber.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Студент не найден</p>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 page-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Вернуться к списку студентов
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {studentProfile.fullName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Профиль студента • {studentProfile.organizationName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(studentProfile.currentStatus.status)}`}>
                  {studentProfile.currentStatus.statusName}
                </span>
                <button
                  onClick={openStatusModal}
                  className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Изменить статус"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </div>
              
              {studentProfile.activeFlags && studentProfile.activeFlags.length > 0 && (
                <div className="flex items-center gap-1">
                  {studentProfile.activeFlags.map((flag: any) => (
                    <div key={flag.id} className="flex items-center gap-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        <FlagIcon className="h-3 w-3 mr-1" />
                        {flag.name}
                      </span>
                      <button
                        onClick={() => openRemoveFlagModal(flag.id, flag.name)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Удалить флаг"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={openFlagsModal}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                title="Добавить флаг"
              >
                <FlagIcon className="h-3 w-3" />
                Добавить флаг
              </button>
              
              {studentProfile.isArchived && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  Архивирован
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <BanknotesIcon className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Баланс</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(studentProfile.currentBalance)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <CreditCardIcon className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Оплачено</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(studentProfile.totalPaid)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <AcademicCapIcon className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Групп</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {studentProfile.groups.length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <ChartBarIcon className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Средний балл</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {studentProfile.groupScores.length > 0 
                    ? Math.round(studentProfile.groupScores.reduce((acc, score) => acc + score.averageGrade, 0) / studentProfile.groupScores.length)
                    : 'Нет данных'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Основная информация
                </h2>
                <button
                  onClick={() => {
                    setProfileData({
                      fullName: studentProfile.fullName,
                      login: studentProfile.login,
                      phone: studentProfile.phone,
                      parentPhone: studentProfile.parentPhone || '',
                      comment: studentProfile.comment || '',
                      birthDate: studentProfile.birthDate ? new Date(studentProfile.birthDate).toISOString().split('T')[0] : ''
                    });
                    setShowEditProfileModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:border-blue-800 dark:hover:border-blue-700 rounded transition-colors"
                  title="Редактировать профиль"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                  Редактировать
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Логин</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{studentProfile.login}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Телефон</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{studentProfile.phone}</p>
                </div>
                
                {studentProfile.parentPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Телефон родителя</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{studentProfile.parentPhone}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Дата рождения</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {studentProfile.birthDate ? formatDate(studentProfile.birthDate) : 'Не указана'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Дата создания</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(studentProfile.createdAt)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Роль</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{studentProfile.role}</p>
                </div>
                
                {studentProfile.comment && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Комментарий</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{studentProfile.comment}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Groups */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Группы ({studentProfile.groups.length})
              </h2>
              
              <div className="space-y-4">
                {studentProfile.groups.map((group: StudentGroup) => (
                  <div key={group.groupId} className="group border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {group.groupName} ({group.groupCode})
                      </h3>
                      {group.isFrozen && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          Заморожено
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Предмет:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{group.subject.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Учитель:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{group.teacher.name || 'Не назначен'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Стоимость урока:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(group.lessonCost)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Баланс группы:</span>
                        <p className={`font-medium ${group.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(group.balance)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Осталось уроков:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{group.remainingLessons}</p>
                      </div>
                      {group.averageGrade && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Средний балл:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{group.averageGrade}</p>
                        </div>
                      )}
                      {group.discountValue > 0 ? (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Скидка:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {group.discountType === 'Percentage' 
                              ? `${group.discountValue}%`
                              : formatCurrency(group.discountValue)
                            }
                          </p>
                        </div>
                      ) : null}
                    </div>
                    
                    {/* Кнопки действий - показываются только при hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-end gap-1.5 flex-wrap">
                      <button
                        onClick={() => openAddBalanceModal(group)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 dark:text-green-400 dark:border-green-800 dark:hover:border-green-700 rounded transition-colors"
                        title="Пополнить баланс"
                      >
                        <PlusCircleIcon className="h-3.5 w-3.5" />
                        Пополнить
                      </button>
                      
                      <button
                        onClick={() => openDiscountModal(group)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-300 dark:text-purple-400 dark:border-purple-800 dark:hover:border-purple-700 rounded transition-colors"
                        title="Применить скидку"
                      >
                        <ReceiptPercentIcon className="h-3.5 w-3.5" />
                        Скидка
                      </button>
                      
                      {group.isFrozen ? (
                        <button
                          onClick={() => openUnfreezeModal(group)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 dark:text-emerald-400 dark:border-emerald-800 dark:hover:border-emerald-700 rounded transition-colors"
                          title="Разморозить студента"
                        >
                          <LockOpenIcon className="h-3.5 w-3.5" />
                          Разморозить
                        </button>
                      ) : (
                        <button
                          onClick={() => openFreezeModal(group)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300 dark:text-orange-400 dark:border-orange-800 dark:hover:border-orange-700 rounded transition-colors"
                          title="Заморозить студента"
                        >
                          <LockClosedIcon className="h-3.5 w-3.5" />
                          Заморозить
                        </button>
                      )}
                      
                      <button
                        onClick={() => openRemoveFromGroupModal(group)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:border-red-700 rounded transition-colors"
                        title="Удалить из группы"
                      >
                        <UserMinusIcon className="h-3.5 w-3.5" />
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Statistics */}
            {studentProfile.groupAttendance.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Статистика посещаемости
                </h2>
                
                <div className="space-y-4">
                  {studentProfile.groupAttendance.map((attendance: GroupAttendance) => (
                    <div key={attendance.groupId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {attendance.groupName} - {attendance.subjectName}
                        </h3>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {attendance.attendancePercentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-gray-500 dark:text-gray-400">Всего</div>
                          <div className="font-medium text-gray-900 dark:text-white">{attendance.totalLessons}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-600 dark:text-green-400">Присутствовал</div>
                          <div className="font-medium text-gray-900 dark:text-white">{attendance.attendedLessons}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-600 dark:text-yellow-400">Опоздал</div>
                          <div className="font-medium text-gray-900 dark:text-white">{attendance.lateLessons}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-600 dark:text-red-400">Пропустил</div>
                          <div className="font-medium text-gray-900 dark:text-white">{attendance.missedLessons}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upcoming Lessons */}
            {studentProfile.upcomingLessons.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Предстоящие уроки
                </h2>
                
                <div className="space-y-3">
                  {studentProfile.upcomingLessons.slice(0, 5).map((lesson: UpcomingLesson) => (
                    <div key={lesson.lessonId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {lesson.subjectName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {lesson.groupName}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLessonStatusColor(lesson.lessonStatus)}`}>
                          {lesson.lessonStatus}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {formatDate(lesson.date)} {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                        </div>
                        <div>{lesson.roomName}</div>
                        <div>{lesson.teacherName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Lessons */}
            {studentProfile.recentLessons.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Недавние уроки
                </h2>
                
                <div className="space-y-3">
                  {studentProfile.recentLessons.slice(0, 5).map((lesson: RecentLesson) => (
                    <div key={lesson.lessonId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {lesson.subjectName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {lesson.groupName} • {formatDate(lesson.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getAttendanceStatusColor(lesson.attendanceStatus)}`}>
                            {lesson.attendanceStatus}
                          </span>
                          {lesson.grade && (
                            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                              {lesson.grade}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {lesson.comment && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                          &ldquo;{lesson.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flag History */}
            {studentProfile.flagHistory && studentProfile.flagHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FlagIcon className="h-5 w-5" />
                  История флагов
                </h2>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {studentProfile.flagHistory
                    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                    .map((flagRecord: any) => (
                      <div key={flagRecord.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                flagRecord.isActive 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                <FlagIcon className="h-3 w-3 mr-1" />
                                {flagRecord.flagName}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                flagRecord.isActive
                                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {flagRecord.isActive ? 'Установлен' : 'Удален'}
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                              <strong>Причина:</strong> {flagRecord.reason}
                            </p>
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                              <div>
                                {flagRecord.isActive ? 'Установлен' : 'Изменен'}: {formatDate(flagRecord.changedAt)} • {flagRecord.changedByName || 'Система'}
                              </div>
                              <div>
                                Источник: {flagRecord.sourceName}
                              </div>
                              {!flagRecord.isActive && flagRecord.removedAt && (
                                <>
                                  <div>
                                    Удален: {formatDate(flagRecord.removedAt)} • {flagRecord.removedByName}
                                  </div>
                                  {flagRecord.removalReason && (
                                    <div>
                                      <strong>Причина удаления:</strong> {flagRecord.removalReason}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Status History */}
            {studentProfile.statusHistory && studentProfile.statusHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5" />
                  История статусов
                </h2>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {studentProfile.statusHistory
                    .sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime())
                    .map((statusRecord: any, index: number) => (
                      <div key={`${statusRecord.status}-${statusRecord.validFrom}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(statusRecord.status)}`}>
                                {statusRecord.statusName}
                              </span>
                              {!statusRecord.validTo && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                  Текущий
                                </span>
                              )}
                            </div>
                            
                            {statusRecord.reason && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                                <strong>Причина:</strong> {statusRecord.reason}
                              </p>
                            )}
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                              <div>
                                Установлен: {formatDate(statusRecord.validFrom)} • {statusRecord.changedByName || 'Система'}
                              </div>
                              {statusRecord.validTo && (
                                <div>
                                  Действовал до: {formatDate(statusRecord.validTo)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Balance History */}
            {studentProfile.balanceHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  История баланса
                </h2>
                
                <div className="space-y-3">
                  {studentProfile.balanceHistory.slice(0, 5).map((transaction: BalanceHistory) => (
                    <div key={transaction.id} className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.group.name} • {formatDate(transaction.operationDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Баланс: {formatCurrency(transaction.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {studentProfile.currentBalance < 0 && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <strong>Задолженность:</strong> {formatCurrency(Math.abs(studentProfile.currentBalance))}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal для изменения статуса */}
      <BaseModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setStatusReason('');
        }}
        title="Изменить статус студента"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Статус
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(parseInt(e.target.value) as StudentStatus)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.values(StudentStatus).filter(v => typeof v === 'number').map((status) => (
                <option key={status} value={status}>
                  {getStudentStatusName(status as StudentStatus)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Причина изменения
            </label>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Введите причину смены статуса"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowStatusModal(false);
                setStatusReason('');
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={handleStatusChange}
              disabled={!statusReason.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Изменить статус
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal для добавления флага */}
      <BaseModal
        isOpen={showFlagsModal}
        onClose={() => {
          setShowFlagsModal(false);
          setSelectedFlagId('');
          setFlagReason('');
        }}
        title="Добавить флаг студенту"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Флаг
            </label>
            <select
              value={selectedFlagId}
              onChange={(e) => setSelectedFlagId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Выберите флаг</option>
              {availableFlags.map((flag) => (
                <option key={flag.id} value={flag.id}>
                  {flag.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Причина установки
            </label>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Введите причину установки флага"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowFlagsModal(false);
                setSelectedFlagId('');
                setFlagReason('');
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={handleAddFlag}
              disabled={!selectedFlagId || !flagReason.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Добавить флаг
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal для пополнения баланса */}
      <AddBalanceModal
        isOpen={showAddBalanceModal}
        onClose={() => {
          setShowAddBalanceModal(false);
          setSelectedGroupForBalance(null);
        }}
        onConfirm={handleAddBalance}
        studentName={studentProfile?.fullName || ''}
        subjectPrice={selectedGroupForBalance?.lessonCost}
        loading={addingBalance}
      />

      {/* Modal для скидок */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => {
          setShowDiscountModal(false);
          setSelectedGroupForAction(null);
        }}
        onConfirm={handleApplyDiscount}
        onRemove={handleRemoveDiscount}
        studentName={studentProfile?.fullName || ''}
        loading={applyingDiscount || removingDiscount}
        currentDiscountType={selectedGroupForAction?.discountType === 'Percentage' ? 1 : selectedGroupForAction?.discountType === 'FixedAmount' ? 2 : null}
        currentDiscountValue={selectedGroupForAction?.discountValue}
        currentDiscountReason={selectedGroupForAction?.discountReason}
      />

      {/* Modal для заморозки */}
      <FreezeStudentModal
        isOpen={showFreezeModal}
        onClose={() => {
          setShowFreezeModal(false);
          setSelectedGroupForAction(null);
        }}
        studentName={studentProfile?.fullName || ''}
        onConfirm={handleFreezeStudent}
        loading={freezingStudent}
      />

      {/* Modal для разморозки */}
      <BaseModal
        isOpen={showUnfreezeModal}
        onClose={() => {
          setShowUnfreezeModal(false);
          setSelectedGroupForAction(null);
        }}
        title="Разморозка студента"
        subtitle={`Вы уверены, что хотите разморозить студента: ${studentProfile?.fullName}?`}
        icon={<LockOpenIcon className="w-5 h-5" />}
        gradientFrom="from-blue-500"
        gradientTo="to-cyan-600"
        maxWidth="md"
      >
        <div className="p-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowUnfreezeModal(false);
                setSelectedGroupForAction(null);
              }}
              disabled={freezingStudent}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              onClick={handleUnfreezeStudent}
              disabled={freezingStudent}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {freezingStudent ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Разморозка...
                </>
              ) : (
                'Разморозить'
              )}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal для подтверждения удаления из группы */}
      <BaseModal
        isOpen={showRemoveFromGroupModal}
        onClose={() => {
          setShowRemoveFromGroupModal(false);
          setSelectedGroupForAction(null);
        }}
        title="Удаление из группы"
        subtitle={selectedGroupForAction ? `Вы уверены, что хотите удалить студента "${studentProfile?.fullName}" из группы "${selectedGroupForAction.groupName}"?` : ''}
        icon={<UserMinusIcon className="w-5 h-5 text-red-500" />}
        gradientFrom="from-red-500"
        gradientTo="to-red-600"
        maxWidth="md"
      >
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <span className="text-red-600 dark:text-red-400 text-sm">⚠</span>
              </div>
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-medium mb-1">Внимание!</p>
                <p>Студент будет полностью удален из группы. Это действие нельзя отменить.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowRemoveFromGroupModal(false);
                setSelectedGroupForAction(null);
              }}
              disabled={removingFromGroup}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              onClick={() => selectedGroupForAction && handleRemoveFromGroup(selectedGroupForAction.groupId, selectedGroupForAction.groupName)}
              disabled={removingFromGroup}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {removingFromGroup ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Удаление...
                </>
              ) : (
                <>
                  <UserMinusIcon className="w-4 h-4" />
                  Удалить из группы
                </>
              )}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal для редактирования профиля */}
      <BaseModal
        isOpen={showEditProfileModal}
        onClose={() => {
          setShowEditProfileModal(false);
          setProfileData({ fullName: '', login: '', phone: '', parentPhone: '', comment: '', birthDate: '' });
        }}
        title="Редактирование профиля"
        subtitle={`Редактирование данных студента: ${studentProfile?.fullName}`}
        icon={<PencilIcon className="w-5 h-5 text-blue-500" />}
        gradientFrom="from-blue-500"
        gradientTo="to-blue-600"
        maxWidth="lg"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ФИО <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Введите полное имя"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Логин <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profileData.login}
                onChange={(e) => setProfileData(prev => ({ ...prev, login: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Введите логин"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата рождения
              </label>
              <input
                type="date"
                value={profileData.birthDate}
                onChange={(e) => setProfileData(prev => ({ ...prev, birthDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Телефон <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Введите телефон"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Телефон родителя
              </label>
              <input
                type="tel"
                value={profileData.parentPhone}
                onChange={(e) => setProfileData(prev => ({ ...prev, parentPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Введите телефон родителя"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Комментарий
              </label>
              <textarea
                value={profileData.comment}
                onChange={(e) => setProfileData(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Добавьте комментарий о студенте"
              />
            </div>
          </div>

          {/* Кнопка сброса пароля */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Безопасность</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Управление паролем пользователя</p>
              </div>
              <button
                onClick={handleResetPassword}
                disabled={resettingPassword}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resettingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-orange-600/20 border-t-orange-600 rounded-full animate-spin"></div>
                    Сброс...
                  </>
                ) : (
                  'Сбросить пароль'
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowEditProfileModal(false);
                setProfileData({ fullName: '', login: '', phone: '', parentPhone: '', comment: '', birthDate: '' });
              }}
              disabled={editingProfile}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={editingProfile || !profileData.fullName.trim() || !profileData.login.trim() || !profileData.phone.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {editingProfile ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <PencilIcon className="w-4 h-4" />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal для удаления флага */}
      <BaseModal
        isOpen={showRemoveFlagModal}
        onClose={() => {
          setShowRemoveFlagModal(false);
          setFlagToRemove(null);
          setFlagRemovalReason('');
        }}
        title="Удаление флага"
        subtitle={flagToRemove ? `Удаление флага "${flagToRemove.name}" у студента "${studentProfile?.fullName}"` : ''}
        icon={<XMarkIcon className="w-5 h-5 text-red-500" />}
        gradientFrom="from-red-500"
        gradientTo="to-red-600"
        maxWidth="md"
      >
        <div className="p-6 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <XMarkIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-medium mb-1">Внимание!</p>
                <p>Флаг будет удален. Укажите причину удаления для отчетности.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Причина удаления <span className="text-red-500">*</span>
            </label>
            <textarea
              value={flagRemovalReason}
              onChange={(e) => setFlagRemovalReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="Введите причину удаления флага"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowRemoveFlagModal(false);
                setFlagToRemove(null);
                setFlagRemovalReason('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
            >
              Отмена
            </button>
            <button
              onClick={() => flagToRemove && handleRemoveFlag(flagToRemove.id, flagToRemove.name)}
              disabled={!flagRemovalReason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <XMarkIcon className="w-4 h-4" />
              Удалить флаг
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}