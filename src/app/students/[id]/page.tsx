'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../../services/AuthenticatedApiService';
import { StudentProfile, GroupAttendance, UpcomingLesson, RecentLesson, BalanceHistory, StudentGroup } from '../../../types/StudentProfile';
import { ArrowLeftIcon, CalendarIcon, ChartBarIcon, CreditCardIcon, AcademicCapIcon, ClockIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showError } = useToast();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(studentProfile.currentStatus.status)}`}>
                {studentProfile.currentStatus.statusName}
              </span>
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Основная информация
              </h2>
              
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
                  <div key={group.groupId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
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
    </div>
  );
}