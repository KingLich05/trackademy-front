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
  BranchOwnerOrganizationDto,
  BranchOwnerAnalyticsDto,
  BranchOwnerOrgAnalyticsDto,
  TopOrgItem,
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
  ChartBarIcon,
  UserIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

function formatMoney(n: number) {
  return n.toLocaleString('ru-RU');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
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

// ─── Dashboard tab ─────────────────────────────────────────────────────────────

function DashboardTab() {
  const { showError } = useToast();
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

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) {
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

// ─── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { showError } = useToast();
  const [organizations, setOrganizations] = useState<BranchOwnerOrganizationDto[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [fromDate, setFromDate] = useState(daysAgo(29));
  const [toDate, setToDate] = useState(today());
  const [analytics, setAnalytics] = useState<BranchOwnerAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgsLoading, setOrgsLoading] = useState(true);

  useEffect(() => {
    BranchOwnerApiService.getOrganizations()
      .then(data => setOrganizations(data))
      .catch(() => showError('Ошибка при загрузке списка организаций'))
      .finally(() => setOrgsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await BranchOwnerApiService.getAnalytics({
        organizationId: selectedOrgId || null,
        reportPeriodFrom: fromDate,
        reportPeriodTo: toDate,
        topOrganizationsCount: 5,
      });
      setAnalytics(data);
    } catch {
      showError('Ошибка при загрузке аналитики');
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, fromDate, toDate, showError]);

  useEffect(() => {
    if (!orgsLoading) loadAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgsLoading]);

  const t = analytics?.totals;

  const kpiCards = t ? [
    { label: 'Студентов', value: t.studentsCount, icon: AcademicCapIcon, color: 'blue' },
    { label: 'Преподавателей', value: t.teachersCount, icon: UserIcon, color: 'indigo' },
    { label: 'Групп', value: t.groupsCount, icon: UserGroupIcon, color: 'purple' },
    { label: 'Новых студентов', value: t.newStudentsCount, icon: SparklesIcon, color: 'green' },
    { label: 'Пробных', value: t.trialStudentsCount, icon: AcademicCapIcon, color: 'orange' },
    { label: 'Лидов', value: t.leadsCount, icon: ChartBarIcon, color: 'teal', sub: `Конверсия: ${t.leadConversionRate.toFixed(1)}%` },
    { label: 'Уроков', value: t.lessonsCount, icon: CalendarDaysIcon, color: 'sky', sub: `Завершено: ${t.completedLessonsCount}` },
    { label: 'Посещаемость', value: `${t.attendanceRate.toFixed(1)}%`, icon: ClipboardDocumentCheckIcon, color: t.attendanceRate >= 80 ? 'emerald' : t.attendanceRate >= 60 ? 'orange' : 'red' },
    { label: 'Пополнения', value: `${formatMoney(t.topUpAmount)} ₸`, icon: CurrencyDollarIcon, color: 'emerald' },
    { label: 'Возвраты', value: `${formatMoney(t.refundAmount)} ₸`, icon: CurrencyDollarIcon, color: 'orange' },
    { label: 'Чистый доход', value: `${formatMoney(t.netIncome)} ₸`, icon: CurrencyDollarIcon, color: t.netIncome >= 0 ? 'green' : 'red' },
    { label: 'Общий долг', value: `${formatMoney(t.totalDebt)} ₸`, icon: ExclamationTriangleIcon, color: t.totalDebt > 0 ? 'red' : 'gray', sub: `Должников: ${t.unpaidStudentsCount}` },
  ] : [];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
    gray: 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Организация</label>
            <select
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Все организации</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Период от</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Период до</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
            >
              {loading ? 'Загрузка...' : 'Применить'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : analytics ? (
        <>
          {/* Period label */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <CalendarDaysIcon className="h-4 w-4" />
            <span>
              {new Date(analytics.reportPeriodFrom).toLocaleDateString('ru-RU')} —{' '}
              {new Date(analytics.reportPeriodTo).toLocaleDateString('ru-RU')}
              {' · '}{analytics.organizationsCount} орг.
            </span>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {kpiCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[card.color] ?? colorMap.blue}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{card.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
                  {'sub' in card && card.sub && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.sub}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Attendance breakdown */}
          {t && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Разбивка посещаемости</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Всего отметок', value: t.attendancesCount, color: 'text-gray-700 dark:text-gray-300' },
                  { label: 'Присутствовали', value: t.presentAttendancesCount, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Опоздали', value: t.lateAttendancesCount, color: 'text-yellow-600 dark:text-yellow-400' },
                  { label: 'Отсутствовали', value: t.absentAttendancesCount, color: 'text-red-600 dark:text-red-400' },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: '🏆 Топ по доходу', items: analytics.topByNetIncome, format: (v: number) => `${formatMoney(v)} ₸` },
              { title: '⚠️ Топ по долгу', items: analytics.topByDebt, format: (v: number) => `${formatMoney(v)} ₸` },
              { title: '📊 Топ по посещаемости', items: analytics.topByAttendance, format: (v: number) => `${v.toFixed(1)}%` },
            ].map(widget => (
              <div key={widget.title} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{widget.title}</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {widget.items.length === 0 ? (
                    <p className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">Нет данных</p>
                  ) : (
                    widget.items.map((item: TopOrgItem, idx: number) => (
                      <div key={item.organizationId} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 shrink-0">{idx + 1}</span>
                          <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 ml-2 shrink-0">
                          {widget.format(item.value)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Per-org breakdown table */}
          {analytics.organizations.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Сравнение организаций</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Организация</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Студ.</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Групп</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Посещ. %</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Новых</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Доход</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Долг</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {analytics.organizations.map((org: BranchOwnerOrgAnalyticsDto) => (
                      <tr key={org.organizationId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <Link
                            href={`/branch-owner/${org.organizationId}`}
                            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {org.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{org.studentsCount}</td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{org.groupsCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            org.attendanceRate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            org.attendanceRate >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {org.attendanceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{org.newStudentsCount}</td>
                        <td className="px-4 py-3 text-center font-medium text-green-600 dark:text-green-400">{formatMoney(org.netIncome)} ₸</td>
                        <td className="px-4 py-3 text-center">
                          <span className={org.totalDebt > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
                            {formatMoney(org.totalDebt)} ₸
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'analytics', label: 'Аналитика' },
];

export default function BranchOwnerDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!isBranchOwner(user?.role ?? '')) { router.push('/'); return; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

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

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}
