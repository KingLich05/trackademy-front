'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { BranchOwnerApiService } from '../../services/BranchOwnerApiService';
import { isBranchOwner } from '../../types/Role';
import {
  BranchOwnerAggregatedDashboardDto,
  BranchOwnerOrgDashboardDto,
} from '../../types/BranchOwner';
import {
  BuildingOfficeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

function formatMoney(n: number) {
  return n.toLocaleString('ru-RU');
}

function AttendanceBadge({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    rate >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {rate >= 80 ? (
        <ArrowTrendingUpIcon className="h-3 w-3" />
      ) : (
        <ArrowTrendingDownIcon className="h-3 w-3" />
      )}
      {rate.toFixed(1)}%
    </span>
  );
}

export default function BranchOwnerDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showError } = useToast();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<BranchOwnerAggregatedDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await BranchOwnerApiService.getDashboard();
      setDashboard(data);
    } catch {
      showError('Ошибка при загрузке дашборда');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!isBranchOwner(user?.role ?? '')) { router.push('/'); return; }
    loadDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!dashboard) return null;

  const summaryCards = [
    { label: 'Организации', value: dashboard.totalOrganizations, icon: BuildingOfficeIcon, color: 'indigo' },
    { label: 'Студентов', value: dashboard.totalStudents, icon: AcademicCapIcon, color: 'blue' },
    { label: 'Групп', value: dashboard.totalGroups, icon: UserGroupIcon, color: 'green' },
    { label: 'Преподавателей', value: dashboard.totalTeachers, icon: AcademicCapIcon, color: 'purple' },
    { label: 'Общий баланс', value: `${formatMoney(dashboard.totalBalance)} ₸`, icon: CurrencyDollarIcon, color: 'emerald' },
    { label: 'Общий долг', value: `${formatMoney(dashboard.totalDebt)} ₸`, icon: ExclamationTriangleIcon, color: dashboard.totalDebt > 0 ? 'red' : 'gray' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    gray: 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
            <BuildingOfficeIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Панель управления</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Добро пожаловать, {user?.fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[card.color]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Organizations list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Мои организации</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Нажмите на организацию для просмотра деталей
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {dashboard.organizations.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              Организации не найдены
            </div>
          ) : (
            dashboard.organizations.map((org: BranchOwnerOrgDashboardDto) => (
              <Link
                key={org.organizationId}
                href={`/branch-owner/${org.organizationId}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                    <BuildingOfficeIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {org.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <AcademicCapIcon className="h-3.5 w-3.5" />
                        {org.studentsCount} студ.
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <UserGroupIcon className="h-3.5 w-3.5" />
                        {org.groupsCount} групп
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                        {org.lessonsToday} ур. сег.
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Посещ.:</span>
                      <AttendanceBadge rate={org.averageAttendanceRate} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Долг:</span>
                      <span className={`text-xs font-medium ${org.totalDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatMoney(org.totalDebt)} ₸
                      </span>
                    </div>
                    {org.unpaidStudentsCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                        {org.unpaidStudentsCount} должн.
                      </span>
                    )}
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
