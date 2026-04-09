'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { BranchOwnerApiService } from '../../../services/BranchOwnerApiService';
import { ExportApiService } from '../../../services/ExportApiService';
import { isBranchOwner } from '../../../types/Role';
import {
  BranchOwnerDashboardSummaryDto,
  GroupAttendanceStatsDto,
  LessonAttendanceMonitoringDto,
  StudentGroupedBalancesDto,
  SubjectPaymentInfo,
  GroupPaymentInfo,
  StudentPaymentInfo,
  BranchOwnerPagedResult,
} from '../../../types/BranchOwner';
import {
  BuildingOfficeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return n.toLocaleString('ru-RU');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function monthAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  sub?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    gray: 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color] ?? colors.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ orgId }: { orgId: string }) {
  const { showError } = useToast();
  const [summary, setSummary] = useState<BranchOwnerDashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await BranchOwnerApiService.getDashboardSummary(orgId);
        setSummary(data);
      } catch {
        showError('Ошибка при загрузке сводки');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-500 rounded-full" /></div>;
  if (!summary) return null;

  const cards = [
    { label: 'Всего студентов', value: summary.totalStudents, icon: AcademicCapIcon, color: 'blue', sub: `Активных: ${summary.activeStudents}` },
    { label: 'Групп', value: summary.totalGroups, icon: UserGroupIcon, color: 'green', sub: `Активных: ${summary.activeGroups}` },
    { label: 'Уроки сегодня', value: summary.lessonsToday, icon: CalendarDaysIcon, color: 'purple', sub: `Завершено: ${summary.completedLessonsToday}` },
    { label: 'Посещаемость', value: `${summary.averageAttendanceRate.toFixed(1)}%`, icon: ClipboardDocumentCheckIcon, color: summary.averageAttendanceRate >= 80 ? 'emerald' : summary.averageAttendanceRate >= 60 ? 'orange' : 'red' },
    { label: 'Должников', value: summary.unpaidStudentsCount, icon: ExclamationTriangleIcon, color: summary.unpaidStudentsCount > 0 ? 'red' : 'gray', sub: `Долг: ${formatMoney(summary.totalDebt)} ₸` },
    { label: 'Пробные', value: summary.trialStudentsCount, icon: AcademicCapIcon, color: 'orange' },
    { label: 'Замороженных', value: summary.frozenStudentsCount, icon: AcademicCapIcon, color: 'indigo', sub: summary.expiredFreezeCount > 0 ? `Истекло: ${summary.expiredFreezeCount}` : undefined },
    { label: 'Проблемных групп', value: summary.lowPerformanceGroupsCount, icon: ExclamationTriangleIcon, color: summary.lowPerformanceGroupsCount > 0 ? 'red' : 'gray' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {summary.upcomingBirthdays.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">🎂 Ближайшие дни рождения</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {summary.upcomingBirthdays.map(b => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-900 dark:text-white">{b.fullName}</span>
                <div className="text-right">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(b.birthday).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}</span>
                  {b.groupName && <p className="text-xs text-gray-400 dark:text-gray-500">{b.groupName}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Attendance tab ───────────────────────────────────────────────────────────

function AttendanceTab({ orgId }: { orgId: string }) {
  const { showError } = useToast();
  const [mode, setMode] = useState<'groups' | 'lessons'>('groups');
  const [fromDate, setFromDate] = useState(monthAgo());
  const [toDate, setToDate] = useState(today());
  const [subjectId, setSubjectId] = useState('');
  const [groupId, setGroupId] = useState('');

  const [groupStats, setGroupStats] = useState<BranchOwnerPagedResult<GroupAttendanceStatsDto> | null>(null);
  const [lessonStats, setLessonStats] = useState<BranchOwnerPagedResult<LessonAttendanceMonitoringDto> | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGroupStats = useCallback(async () => {
    if (!fromDate || !toDate) return;
    try {
      setLoading(true);
      const data = await BranchOwnerApiService.getAttendanceGroupStats(orgId, {
        fromDate,
        toDate,
        subjectId: subjectId || undefined,
        groupId: groupId || undefined,
        pageNumber: 1,
        pageSize: 50,
      });
      setGroupStats(data);
    } catch {
      showError('Ошибка при загрузке статистики посещаемости');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, fromDate, toDate, subjectId, groupId]);

  const loadLessonStats = useCallback(async () => {
    if (!fromDate || !toDate || !subjectId) return;
    try {
      setLoading(true);
      const data = await BranchOwnerApiService.getAttendanceMonitoring(orgId, {
        fromDate,
        toDate,
        subjectId,
        groupId: groupId || undefined,
        pageNumber: 1,
        pageSize: 50,
      });
      setLessonStats(data);
    } catch {
      showError('Ошибка при загрузке мониторинга уроков');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, fromDate, toDate, subjectId, groupId]);

  useEffect(() => {
    if (mode === 'groups') loadGroupStats();
    else loadLessonStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleApply = () => {
    if (mode === 'groups') loadGroupStats();
    else loadLessonStats();
  };

  const handleExportAttendance = async () => {
    try {
      const blob = await BranchOwnerApiService.exportAttendance(orgId, { fromDate, toDate });
      ExportApiService.downloadFile(blob, `посещаемость_${orgId}_${fromDate}_${toDate}.xlsx`);
    } catch {
      showError('Ошибка при экспорте посещаемости');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {(['groups', 'lessons'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {m === 'groups' ? 'По группам' : 'Мониторинг уроков'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">От</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">До</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ID предмета {mode === 'lessons' && '*'}</label>
            <input type="text" value={subjectId} onChange={e => setSubjectId(e.target.value)} placeholder="Опционально"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleApply} disabled={loading || (mode === 'lessons' && !subjectId)}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors font-medium">
              Применить
            </button>
            <button onClick={handleExportAttendance}
              className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-400 transition-colors"
              title="Экспорт в Excel">
              <DocumentArrowDownIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        {mode === 'lessons' && !subjectId && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-2">ID предмета обязателен для мониторинга уроков</p>
        )}
      </div>

      {/* Data */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-500 rounded-full" /></div>
      ) : mode === 'groups' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Группа</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Предмет</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Студент.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Уроков</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Посещ. %</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Тренд</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(groupStats?.items ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">Нет данных</td></tr>
                ) : (
                  (groupStats?.items ?? []).map(row => (
                    <tr key={row.groupId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{row.groupName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.groupCode}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{row.subjectName}</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{row.totalStudents}</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{row.totalLessons}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.attendanceRate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          row.attendanceRate >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {row.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`flex items-center justify-center gap-0.5 text-xs font-medium ${
                          row.trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {row.trend >= 0 ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> : <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
                          {Math.abs(row.trend).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Дата / Урок</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Группа</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Время</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Присутств.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">%</th>
                  <th className="px-4 py-3 text-centre text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(lessonStats?.items ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">Нет данных. Заполните фильтры и нажмите Применить.</td></tr>
                ) : (
                  (lessonStats?.items ?? []).map((row: LessonAttendanceMonitoringDto) => (
                    <tr key={row.lessonId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{new Date(row.date).toLocaleDateString('ru-RU')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.subjectName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 dark:text-white">{row.groupName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.groupCode}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {row.startTime.slice(0, 5)} – {row.endTime.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                        {row.presentCount} / {row.totalStudents}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.attendancePercentage >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          row.attendancePercentage >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {row.attendancePercentage.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${row.statusColor}22`, color: row.statusColor }}
                        >
                          {row.statusName}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Balances tab ─────────────────────────────────────────────────────────────

function BalancesTab({ orgId }: { orgId: string }) {
  const { showError } = useToast();
  const [data, setData] = useState<BranchOwnerPagedResult<StudentGroupedBalancesDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(async (studentSearch?: string) => {
    try {
      setLoading(true);
      const res = await BranchOwnerApiService.getBalances(orgId, { pageNumber: 1, pageSize: 50, studentSearch });
      setData(res);
    } catch {
      showError('Ошибка при загрузке балансов');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => {
    setSearch(searchInput);
    load(searchInput || undefined);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-500 rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск по имени..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors">
          Найти
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Найдено: {data?.totalCount ?? 0} студентов
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {(data?.items ?? []).length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">Нет данных</div>
          ) : (
            (data?.items ?? []).map(row => (
              <div key={row.student.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{row.student.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.student.phone}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  {row.groupBalances.map(gb => (
                    <div key={gb.groupId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{gb.groupName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5">({gb.subjectName})</span>
                        {gb.isFrozen && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">Заморожен</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">{gb.remainingLessons} ур.</span>
                        <span className={`font-semibold ${gb.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatMoney(gb.balance)} ₸
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Payments tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ orgId }: { orgId: string }) {
  const { showError } = useToast();
  const [data, setData] = useState<BranchOwnerPagedResult<SubjectPaymentInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await BranchOwnerApiService.getPaymentsGrouped(orgId, { pageNumber: 1, pageSize: 50 });
        setData(res);
      } catch {
        showError('Ошибка при загрузке платежей');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const toggleSubject = (id: string) =>
    setExpandedSubjects(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-500 rounded-full" /></div>;

  return (
    <div className="space-y-3">
      {(data?.items ?? []).length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">Нет данных</div>
      ) : (
        (data?.items ?? []).map((subject: SubjectPaymentInfo) => (
          <div key={subject.subjectId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Subject header */}
            <button
              onClick={() => toggleSubject(subject.subjectId)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedSubjects.has(subject.subjectId) ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                <span className="font-semibold text-gray-900 dark:text-white">{subject.subjectName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Цена: {formatMoney(subject.price)} ₸</span>
              </div>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {formatMoney(subject.totalPaid)} ₸
              </span>
            </button>

            {expandedSubjects.has(subject.subjectId) && (
              <div className="border-t border-gray-100 dark:border-gray-700">
                {subject.groups.map((group: GroupPaymentInfo) => (
                  <div key={group.groupId}>
                    {/* Group header */}
                    <button
                      onClick={() => toggleGroup(group.groupId)}
                      className="w-full flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedGroups.has(group.groupId) ? <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />}
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{group.groupName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{group.groupCode}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatMoney(group.totalPaid)} ₸
                      </span>
                    </button>

                    {expandedGroups.has(group.groupId) && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {group.students.map((student: StudentPaymentInfo) => (
                          <div key={student.studentId} className="flex items-center justify-between px-8 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">{student.studentName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{student.studentPhone}</p>
                              {student.isFrozen && <span className="text-xs text-blue-500">Заморожен</span>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-right">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Оплачено</p>
                                <p className="font-medium text-gray-900 dark:text-white">{formatMoney(student.totalPaid)} ₸</p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Баланс</p>
                                <p className={`font-medium ${student.currentBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {formatMoney(student.currentBalance)} ₸
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Уроков</p>
                                <p className="font-medium text-gray-900 dark:text-white">{student.remainingLessons}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Export tab ───────────────────────────────────────────────────────────────

function ExportTab({ orgId }: { orgId: string }) {
  const { showSuccess, showError } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  const doExport = async (type: 'users' | 'groups' | 'payments', label: string) => {
    setExporting(type);
    try {
      let blob: Blob;
      if (type === 'users') blob = await BranchOwnerApiService.exportUsers(orgId);
      else if (type === 'groups') blob = await BranchOwnerApiService.exportGroups(orgId);
      else blob = await BranchOwnerApiService.exportPayments(orgId);
      ExportApiService.downloadFile(blob, `${type}_${orgId}_${today()}.xlsx`);
      showSuccess(`${label} успешно экспортирован`);
    } catch {
      showError(`Ошибка при экспорте: ${label}`);
    } finally {
      setExporting(null);
    }
  };

  const items = [
    { type: 'users' as const, label: 'Пользователи', desc: 'Все студенты и преподаватели организации' },
    { type: 'groups' as const, label: 'Группы', desc: 'Список групп с составом и расписанием' },
    { type: 'payments' as const, label: 'Платежи', desc: 'История платежей организации' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map(item => (
        <button
          key={item.type}
          onClick={() => doExport(item.type, item.label)}
          disabled={!!exporting}
          className="flex flex-col items-start p-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
            {exporting === item.type ? (
              <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
            ) : (
              <DocumentArrowDownIcon className="h-5 w-5" />
            )}
          </div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
          <span className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Excel (.xlsx)</span>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'attendance', label: 'Посещаемость' },
  { id: 'balances', label: 'Балансы' },
  { id: 'payments', label: 'Платежи' },
  { id: 'export', label: 'Экспорт' },
];

export default function BranchOwnerOrgPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showError } = useToast();
  const router = useRouter();
  const params = useParams();
  const organizationId = params?.organizationId as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!isBranchOwner(user?.role ?? '')) { router.push('/'); return; }

    // Load org name
    BranchOwnerApiService.getOrganizationDetails(organizationId)
      .then(d => setOrgName(d.name))
      .catch(() => showError('Организация не найдена'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, organizationId]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb + header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm px-6 py-5">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Link href="/branch-owner" className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1">
            <ChevronLeftIcon className="h-4 w-4" />
            Все организации
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
            <BuildingOfficeIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{orgName || 'Организация'}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{organizationId}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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
      {activeTab === 'overview' && <OverviewTab orgId={organizationId} />}
      {activeTab === 'attendance' && <AttendanceTab orgId={organizationId} />}
      {activeTab === 'balances' && <BalancesTab orgId={organizationId} />}
      {activeTab === 'payments' && <PaymentsTab orgId={organizationId} />}
      {activeTab === 'export' && <ExportTab orgId={organizationId} />}
    </div>
  );
}
