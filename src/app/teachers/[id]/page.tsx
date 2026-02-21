'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthenticatedApiService, TeacherProfile } from '../../../services/AuthenticatedApiService';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import {
  ArrowLeftIcon,
  PhoneIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ClockIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  MapPinIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function formatDate(dateString: string): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeString: string): string {
  return timeString?.substring(0, 5) ?? '';
}

function getAttendanceColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getAttendanceBgBar(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500';
  if (rate >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const teacherId = params.id as string;

  useEffect(() => {
    if (!teacherId) {
      router.push('/users');
      return;
    }
    fetchTeacherProfile();
  }, [teacherId]);

  const fetchTeacherProfile = async () => {
    try {
      setIsLoading(true);
      const data = await AuthenticatedApiService.getTeacherProfile(teacherId);
      setTeacherProfile(data);
    } catch {
      router.push('/users');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!teacherProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Преподаватель не найден</p>
      </div>
    );
  }

  const maxGroupHours = teacherProfile.workHoursForGroups?.length
    ? Math.max(...teacherProfile.workHoursForGroups.map((g) => g.workHours))
    : 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 page-container">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back button */}
        <button
          onClick={() => router.push('/users')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-sm font-medium"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Вернуться к пользователям
        </button>

        {/* Hero card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-gray-700 border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {getInitials(teacherProfile.fullName)}
              </span>
            </div>
            {/* Name & meta */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {teacherProfile.fullName}
                </h1>
                {teacherProfile.isArchived && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-medium">
                    Архивирован
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 font-medium">
                  Преподаватель
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5" />
                  @{teacherProfile.login}
                </span>
                <span className="flex items-center gap-1">
                  <BuildingOfficeIcon className="h-3.5 w-3.5" />
                  {teacherProfile.organizationName}
                </span>
                {teacherProfile.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="h-3.5 w-3.5" />
                    {teacherProfile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Attendance rate */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Посещаемость</span>
              <ChartBarIcon className="h-4 w-4 text-gray-400" />
            </div>
            <p className={`text-3xl font-bold ${getAttendanceColor(teacherProfile.attendanceRate)}`}>
              {teacherProfile.attendanceRate.toFixed(1)}%
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className={`h-1.5 rounded-full ${getAttendanceBgBar(teacherProfile.attendanceRate)} transition-all`}
                style={{ width: `${Math.min(teacherProfile.attendanceRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Total work hours */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Часы работы</span>
              <ClockIcon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {teacherProfile.totalWorkHours}
            </p>
            <p className="mt-1 text-xs text-gray-400">академических ч.</p>
          </div>

          {/* Completed lessons */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Проведено</span>
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {teacherProfile.completedLessons}
            </p>
            <p className="mt-1 text-xs text-gray-400">уроков</p>
          </div>

          {/* Cancelled lessons */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Отменено</span>
              <XCircleIcon className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-red-500 dark:text-red-400">
              {teacherProfile.cancelledLessons}
            </p>
            <p className="mt-1 text-xs text-gray-400">уроков</p>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: personal info + hours by group */}
          <div className="lg:col-span-1 space-y-6">
            {/* Personal info card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Личные данные
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Дата рождения</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {teacherProfile.birthday ? formatDate(teacherProfile.birthday) : '—'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <AcademicCapIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Роль</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{teacherProfile.role}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ClockIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Дата регистрации</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {formatDate(teacherProfile.createdAt)}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Hours by group */}
            {teacherProfile.workHoursForGroups && teacherProfile.workHoursForGroups.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <UserGroupIcon className="h-4 w-4" />
                  Часы по группам
                </h2>
                <ul className="space-y-3">
                  {teacherProfile.workHoursForGroups
                    .slice()
                    .sort((a, b) => b.workHours - a.workHours)
                    .map((group) => (
                      <li key={group.groupId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[70%]">
                            {group.groupName}
                          </span>
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 ml-2 flex-shrink-0">
                            {group.workHours} ч.
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${(group.workHours / maxGroupHours) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: upcoming lessons */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 h-full">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4" />
                Ближайшие уроки
                {teacherProfile.upcomingLessons && (
                  <span className="ml-auto text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    {teacherProfile.upcomingLessons.length}
                  </span>
                )}
              </h2>

              {!teacherProfile.upcomingLessons || teacherProfile.upcomingLessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <CalendarDaysIcon className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">Нет запланированных уроков</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {teacherProfile.upcomingLessons.map((lesson, idx) => (
                    <li
                      key={lesson.lessonId}
                      className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      {/* Day bubble */}
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex-shrink-0">
                        <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium leading-none uppercase">
                          {new Date(lesson.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300 leading-tight">
                          {new Date(lesson.date).getDate()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {lesson.subjectName}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 flex items-center gap-1">
                            <ClockIcon className="h-3.5 w-3.5" />
                            {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <UserGroupIcon className="h-3 w-3" />
                            {lesson.groupName}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="h-3 w-3" />
                            {lesson.roomName}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {lesson.studentsNumber} студ.
                          </span>
                        </div>
                      </div>

                      {/* Index */}
                      <div className="flex-shrink-0 flex items-center">
                        <span className="text-xs text-gray-300 dark:text-gray-600 font-mono">
                          {idx + 1}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
