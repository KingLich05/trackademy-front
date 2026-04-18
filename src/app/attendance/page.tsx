'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ClipboardDocumentCheckIcon, DocumentArrowDownIcon, UserGroupIcon, CalendarDaysIcon, UserIcon, PlusIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { ExportAttendanceModal } from '@/components/ExportAttendanceModal';
import { LessonDetailsModal } from '@/components/attendance/LessonDetailsModal';
import { GroupDetailsModal } from '@/components/attendance/GroupDetailsModal';
import CreateMakeUpLessonModal from '@/components/CreateMakeUpLessonModal';
import { attendanceApi } from '@/services/AttendanceApiService';
import { AttendanceRecord, AttendanceFilters, AttendanceStatus, getAttendanceStatusText, getAttendanceStatusColor, getAttendanceStatusIcon } from '@/types/Attendance';
import { useApiToast } from '@/hooks/useApiToast';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { Group } from '@/types/Group';

type TabType = 'groups' | 'lessons' | 'students';

interface GroupStatsItem {
  groupId: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  totalStudents: number;
  totalLessons: number;
  attendedCount: number;
  missedCount: number;
  attendanceRate: number;
  previousPeriodRate: number;
  trend: number;
}

interface GroupStatsResponse {
  items: GroupStatsItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface LessonMonitoringItem {
  lessonId: string;
  date: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  statusConfigId: string;
  statusName: string;
  statusColor: string;
  statusDescription: string;
}

interface LessonMonitoringResponse {
  items: LessonMonitoringItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface Subject {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Toast уведомления для API операций
  const { loadOperation } = useApiToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filters, setFilters] = useState<AttendanceFilters>({
    organizationId: user?.organizationId || '',
    pageNumber: 1,
    pageSize: 20
  });
  
  // Get current month dates
  const getCurrentMonthDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    
    return {
      fromDate: firstDay.toISOString().split('T')[0],
      toDate: today.toISOString().split('T')[0]
    };
  };

  // Group stats state
  const [groupStats, setGroupStats] = useState<GroupStatsItem[]>([]);
  const [groupStatsTotal, setGroupStatsTotal] = useState(0);
  const [groupStatsLoading, setGroupStatsLoading] = useState(false);
  const [groupStatsFilters, setGroupStatsFilters] = useState({
    pageNumber: 1,
    pageSize: 20,
    ...getCurrentMonthDates()
  });

  // Lesson monitoring state
  const [lessonMonitoring, setLessonMonitoring] = useState<LessonMonitoringItem[]>([]);
  const [lessonMonitoringTotal, setLessonMonitoringTotal] = useState(0);
  const [lessonMonitoringLoading, setLessonMonitoringLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessonFilters, setLessonFilters] = useState({
    pageNumber: 1,
    pageSize: 20,
    subjectId: '',
    groupId: '',
    ...getCurrentMonthDates()
  });
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Makeup lesson modal state
  const [showMakeUpModal, setShowMakeUpModal] = useState(false);
  
  // Lesson details modal state
  const [lessonDetailsModalOpen, setLessonDetailsModalOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  // Group details modal state
  const [groupDetailsModalOpen, setGroupDetailsModalOpen] = useState(false);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState<GroupStatsItem | null>(null);

  // ── Attendance summary (header) ──
  type AttendanceSummary = {
    attendanceRateThisMonth: number;
    attendanceRatePreviousMonth: number;
    attendanceRateTrend: number;
    totalLessonsThisMonth: number;
    lessonsWithoutAttendanceThisMonth: number;
    attendCountThisMonth: number;
    absentCountThisMonth: number;
    lateCountThisMonth: number;
    specialReasonCountThisMonth: number;
    groupsCount: number;
    activeStudentsCount: number;
    averageGradeThisMonth: number;
    todayTotalLessons: number;
    todayCompletedLessons: number;
  };
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  const loadSummary = useCallback(async () => {
    if (!user?.organizationId) return;
    try {
      const data = await attendanceApi.getAttendanceSummary(user.organizationId);
      setSummary(data);
    } catch { /* non-critical */ }
  }, [user?.organizationId]);

  // Check authorization
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user?.organizationId) loadSummary();
  }, [loadSummary]);

  // Load groups
  useEffect(() => {
    if (user?.organizationId) {
      loadGroups();
      loadSubjects();
    }
  }, [user?.organizationId]);

  const loadGroups = async () => {
    if (!user?.organizationId) return;
    
    try {
      const response = await AuthenticatedApiService.getGroups(user.organizationId);
      setGroups(response.items);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadSubjects = async () => {
    if (!user?.organizationId) return;
    
    try {
      const response = await AuthenticatedApiService.post<{ items: Subject[] }>(
        '/Subject/GetAllSubjects',
        { organizationId: user.organizationId }
      );
      setSubjects(response?.items || []);
      // Set first subject as default
      if (response?.items && response.items.length > 0) {
        setLessonFilters(prev => ({ ...prev, subjectId: response.items[0].id }));
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  // Load group stats
  useEffect(() => {
    if (user?.organizationId && activeTab === 'groups') {
      loadGroupStats();
    }
  }, [user?.organizationId, activeTab, groupStatsFilters]);

  const loadGroupStats = async () => {
    if (!user?.organizationId) return;

    setGroupStatsLoading(true);
    try {
      const response = await AuthenticatedApiService.post<GroupStatsResponse>(
        '/Attendance/stats/groups',
        {
          organizationId: user.organizationId,
          pageNumber: groupStatsFilters.pageNumber,
          pageSize: groupStatsFilters.pageSize,
          fromDate: groupStatsFilters.fromDate,
          toDate: groupStatsFilters.toDate
        }
      );
      
      setGroupStats(response.items);
      setGroupStatsTotal(response.totalCount);
    } catch (error) {
      console.error('Ошибка загрузки статистики по группам:', error);
    } finally {
      setGroupStatsLoading(false);
    }
  };

  // Load lesson monitoring
  useEffect(() => {
    if (user?.organizationId && activeTab === 'lessons' && lessonFilters.subjectId) {
      loadLessonMonitoring();
    }
  }, [user?.organizationId, activeTab, lessonFilters]);

  const loadLessonMonitoring = async () => {
    if (!user?.organizationId || !lessonFilters.subjectId) return;

    setLessonMonitoringLoading(true);
    try {
      const response = await AuthenticatedApiService.post<LessonMonitoringResponse>(
        '/Attendance/monitoring/lessons',
        {
          organizationId: user.organizationId,
          pageNumber: lessonFilters.pageNumber,
          pageSize: lessonFilters.pageSize,
          fromDate: lessonFilters.fromDate,
          toDate: lessonFilters.toDate,
          subjectId: lessonFilters.subjectId,
          ...(lessonFilters.groupId && { groupId: lessonFilters.groupId })
        }
      );
      
      setLessonMonitoring(response.items);
      setLessonMonitoringTotal(response.totalCount);
    } catch (error) {
      console.error('Ошибка загрузки мониторинга уроков:', error);
    } finally {
      setLessonMonitoringLoading(false);
    }
  };

  // Load attendance data
  useEffect(() => {
    if (user?.organizationId) {
      loadAttendanceData();
    }
  }, [user?.organizationId, filters]);

  const loadAttendanceData = async () => {
    if (!user?.organizationId) return;

    setLoading(true);
    try {
      const response = await loadOperation(
        () => attendanceApi.getAllAttendances({
          ...filters,
          organizationId: user.organizationId!
        }),
        'данные посещаемости'
      );
      
      setAttendanceRecords(response.items);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Ошибка загрузки данных посещаемости:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<AttendanceFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters, pageNumber: 1 };
      
      // Если мы очищаем дату, удаляем её из фильтров полностью
      if (newFilters.fromDate === '') {
        delete updated.fromDate;
      }
      if (newFilters.toDate === '') {
        delete updated.toDate;
      }
      if (newFilters.studentSearch === '') {
        delete updated.studentSearch;
      }
      if (newFilters.groupId === undefined || newFilters.groupId === '') {
        delete updated.groupId;
      }
      if (newFilters.status === undefined || newFilters.status === null) {
        delete updated.status;
      }
      
      return updated;
    });
  };

  const resetFilters = () => {
    setFilters({
      organizationId: user?.organizationId || '',
      pageNumber: 1,
      pageSize: 20
    });
  };

  const getAttendanceStats = () => {
    const attended = attendanceRecords.filter(r => r.status === 1).length;
    const absent = attendanceRecords.filter(r => r.status === 2).length;
    const late = attendanceRecords.filter(r => r.status === 3).length;
    const specialReason = attendanceRecords.filter(r => r.status === 4).length;
    
    const total = attendanceRecords.length;
    const attendancePercentage = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { attended, absent, late, specialReason, total, attendancePercentage };
  };

  // Function to open lesson details modal
  const openLessonDetails = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setLessonDetailsModalOpen(true);
  };

  if (!user) {
    return null;
  }

  const stats = getAttendanceStats();

  const tabs = [
    { id: 'groups' as TabType, label: 'По группам', icon: UserGroupIcon },
    { id: 'lessons' as TabType, label: 'По урокам', icon: CalendarDaysIcon },
    { id: 'students' as TabType, label: 'По студентам', icon: UserIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-container pt-16 md:pt-20 max-w-full overflow-x-hidden">
      <div className="w-full space-y-6">

        {/* ══ Beautiful Header ══ */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-emerald-500/20 dark:border-emerald-500/10">

          {/* Gradient banner */}
          <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 px-6 pt-5 pb-5 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/3 w-36 h-36 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full blur-xl pointer-events-none" />

            {/* Title row */}
            <div className="relative flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25 shadow-inner">
                  <ClipboardDocumentCheckIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white leading-tight tracking-tight">Посещаемость</h1>
                  <p className="text-emerald-100 text-sm mt-0.5">Отслеживание и анализ посещаемости студентов</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {user?.role !== 'Teacher' && (
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium text-sm transition-all duration-200 hover:scale-105"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    Экспорт
                  </button>
                )}
                {(user?.role === 'Administrator' || user?.role === 'Owner') && (
                  <button
                    onClick={() => setShowMakeUpModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 shadow-md"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Создать отработку
                  </button>
                )}
              </div>
            </div>

            {/* Stats cards */}
            {summary && (
              <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {/* Rate this month */}
                <div className="col-span-2 sm:col-span-2 bg-white dark:bg-gray-900/85 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardDocumentCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{summary.attendanceRateThisMonth.toFixed(1)}%</span>
                      <span className={`flex items-center text-xs font-semibold ${summary.attendanceRateTrend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {summary.attendanceRateTrend >= 0
                          ? <ArrowTrendingUpIcon className="h-3 w-3 mr-0.5" />
                          : <ArrowTrendingDownIcon className="h-3 w-3 mr-0.5" />}
                        {Math.abs(summary.attendanceRateTrend).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Посещаемость за месяц</p>
                  </div>
                </div>

                {/* Attend count */}
                <div className="bg-white dark:bg-gray-900/85 rounded-xl px-3 py-3 text-center shadow-sm">
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{summary.attendCountThisMonth}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-xs mt-0.5 font-medium">Присутствовали</div>
                  <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">за месяц</div>
                </div>

                {/* Absent count */}
                <div className="bg-white dark:bg-gray-900/85 rounded-xl px-3 py-3 text-center shadow-sm">
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">{summary.absentCountThisMonth}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-xs mt-0.5 font-medium">Отсутствовали</div>
                  <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">за месяц</div>
                </div>

                {/* Late */}
                <div className="bg-white dark:bg-gray-900/85 rounded-xl px-3 py-3 text-center shadow-sm">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary.lateCountThisMonth}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-xs mt-0.5 font-medium">Опоздали</div>
                  <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">за месяц</div>
                </div>

                {/* Average grade */}
                <div className="bg-white dark:bg-gray-900/85 rounded-xl px-3 py-3 text-center shadow-sm">
                  <div className="text-xl font-bold text-teal-700 dark:text-teal-300">{summary.averageGradeThisMonth ?? '—'}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-xs mt-0.5 font-medium">Ср. оценка</div>
                  <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">за месяц</div>
                </div>

                {/* Today */}
                <div className="bg-white dark:bg-gray-900/85 rounded-xl px-3 py-3 text-center shadow-sm">
                  <div className="text-xl font-bold text-cyan-700 dark:text-cyan-300">{summary.todayCompletedLessons}/{summary.todayTotalLessons}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-xs mt-0.5 font-medium">Уроков сегодня</div>
                  <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">проведено / всего</div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs strip */}
          <div className="bg-white dark:bg-gray-800 px-4 pt-1 pb-0">
            <div className="flex gap-0.5 overflow-x-auto scrollbar-none border-b border-gray-100 dark:border-gray-700">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                      activeTab === tab.id
                        ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      {/* Tab Content */}
      {activeTab === 'students' && (
        <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Attendance Card */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.attended}</div>
                <div className="text-green-100">Присутствовали</div>
                <div className="text-sm text-green-200 mt-1">
                  {stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0}% от общего числа
                </div>
              </div>
              <div className="text-4xl opacity-80">✓</div>
            </div>
          </div>

          {/* Absent Card */}
          <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.absent}</div>
                <div className="text-red-100">Отсутствовали</div>
                <div className="text-sm text-red-200 mt-1">
                  {stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}% от общего числа
                </div>
              </div>
              <div className="text-4xl opacity-80">✗</div>
            </div>
          </div>

          {/* Late Card */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.late}</div>
                <div className="text-yellow-100">Опоздали</div>
                <div className="text-sm text-yellow-200 mt-1">
                  {stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}% от общего числа
                </div>
              </div>
              <div className="text-4xl opacity-80">⏰</div>
            </div>
          </div>

          {/* Special Reason Card */}
          <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.specialReason}</div>
                <div className="text-purple-100">Уваж. причина</div>
                <div className="text-sm text-purple-200 mt-1">
                  {stats.total > 0 ? Math.round((stats.specialReason / stats.total) * 100) : 0}% от общего числа
                </div>
              </div>
              <div className="text-4xl opacity-80">📋</div>
            </div>
          </div>
        </div>

        {/* Filters and Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-end justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Фильтры</h3>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Сбросить фильтры
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Поиск студента
                </label>
                <input
                  type="text"
                  value={filters.studentSearch || ''}
                  onChange={(e) => updateFilters({ studentSearch: e.target.value })}
                  placeholder="Имя студента..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-gray-900 dark:text-white"
                />
              </div>

              {/* Group Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Группа
                </label>
                <select
                  value={filters.groupId || ''}
                  onChange={(e) => updateFilters({ groupId: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Все группы</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => updateFilters({ status: e.target.value ? Number(e.target.value) as AttendanceStatus : undefined })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Все статусы</option>
                  <option value="1">Присутствовал</option>
                  <option value="2">Отсутствовал</option>
                  <option value="3">Опоздал</option>
                  <option value="4">Уважительная причина</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Период
                </label>
                <DateRangePicker
                  startDate={filters.fromDate}
                  endDate={filters.toDate}
                  onDateChange={(startDate, endDate) => updateFilters({ fromDate: startDate, toDate: endDate })}
                  placeholder="Выберите период"
                />
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="w-full">
            {loading ? (
              <div className="flex justify-center items-center h-64 p-8">
                <div className="text-center">
                  <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto mt-2"></div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">Загрузка данных...</p>
                </div>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Данные не найдены
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Нет записей посещаемости по выбранным критериям
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                      №
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Студент
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Предмет
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Группа
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Дата
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                      Время
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider max-w-[120px]">
                      Статус
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                      Оценка
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                      Комментарий
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Преподаватель
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {attendanceRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-2 py-4 whitespace-nowrap text-center w-12">
                        <div className="inline-flex items-center justify-center w-7 h-7 text-white text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600">
                          {(filters.pageNumber! - 1) * filters.pageSize! + index + 1}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {record.studentName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {record.studentLogin}
                        </div>
                      </td>
                      <td className="px-2 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="truncate max-w-24" title={record.subjectName}>
                          {record.subjectName}
                        </div>
                      </td>
                      <td className="px-2 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="truncate max-w-20" title={record.groupName}>
                          {record.groupName}
                        </div>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                        {new Date(record.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                        {record.startTime.slice(0, 5)}-{record.endTime.slice(0, 5)}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap max-w-[120px]">
                        <div className="flex justify-center">
                          <div
                            className="w-4 h-4 rounded-full cursor-help flex items-center justify-center"
                            style={{
                              backgroundColor: getAttendanceStatusColor(record.status)
                            }}
                            title={getAttendanceStatusText(record.status)}
                          >
                            {/* Кружок без дополнительных элементов */}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        {record.grade ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                            {record.grade}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        {record.comment ? (
                          <div 
                            className="text-xs text-gray-600 dark:text-gray-400 max-w-32 truncate cursor-help" 
                            title={record.comment}
                          >
                            💬 {record.comment}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="truncate max-w-32" title={record.teacherName}>
                          {record.teacherName}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(filters.pageNumber! - 1) * filters.pageSize! + 1}–{Math.min(filters.pageNumber! * filters.pageSize!, totalCount)} из {totalCount} записей
                  </span>
                  <select
                    value={filters.pageSize}
                    onChange={e => setFilters(prev => ({ ...prev, pageSize: Number(e.target.value), pageNumber: 1 }))}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500"
                  >
                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / стр.</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, pageNumber: Math.max(1, prev.pageNumber! - 1) }))}
                    disabled={filters.pageNumber === 1}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    {filters.pageNumber} / {Math.ceil(totalCount / filters.pageSize!)}
                  </span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, pageNumber: prev.pageNumber! + 1 }))}
                    disabled={filters.pageNumber! * filters.pageSize! >= totalCount}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Groups Tab Content */}
      {activeTab === 'groups' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Период
              </label>
              <DateRangePicker
                startDate={groupStatsFilters.fromDate}
                endDate={groupStatsFilters.toDate}
                onDateChange={(startDate, endDate) => 
                  setGroupStatsFilters(prev => ({ 
                    ...prev, 
                    fromDate: startDate || prev.fromDate, 
                    toDate: endDate || prev.toDate, 
                    pageNumber: 1 
                  }))
                }
                placeholder="Выберите период"
              />
            </div>
          </div>

          {/* Table */}
          <div className="p-6">
            {groupStatsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {groupStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    Нет данных по группам
                  </div>
                ) : (
                  groupStats.map((stat) => (
                    <div 
                      key={stat.groupId}
                      onClick={() => { setSelectedGroupForDetails(stat); setGroupDetailsModalOpen(true); }}
                      className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 cursor-pointer"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Информация о группе и предмете */}
                        <div className="lg:col-span-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                {stat.groupCode}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {stat.groupName}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {stat.subjectName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {stat.totalStudents}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                студентов
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {stat.totalLessons}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                уроков
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Статистика посещений */}
                        <div className="lg:col-span-1">
                          <div className="text-center mb-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                              Статистика посещений
                            </div>
                            <div className="flex justify-center space-x-6">
                              <div className="text-center">
                                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                                  {stat.attendedCount}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Посещено
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                                  {stat.missedCount}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Пропущено
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Процент посещаемости */}
                        <div className="lg:col-span-1">
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="relative w-20 h-20 mb-3">
                              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="32"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="6"
                                  className="text-gray-200 dark:text-gray-600"
                                />
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="32"
                                  fill="none"
                                  strokeWidth="6"
                                  strokeDasharray={`${stat.attendanceRate * 2.01} 201`}
                                  strokeLinecap="round"
                                  className={
                                    stat.attendanceRate >= 90 
                                      ? 'text-green-500'
                                      : stat.attendanceRate >= 70
                                      ? 'text-yellow-500'
                                      : 'text-red-500'
                                  }
                                  stroke="currentColor"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-lg font-bold ${
                                  stat.attendanceRate >= 90 
                                    ? 'text-green-600 dark:text-green-400'
                                    : stat.attendanceRate >= 70
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {stat.attendanceRate.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              Посещаемость
                            </div>
                          </div>
                        </div>

                        {/* Тренд */}
                        <div className="lg:col-span-1">
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                              Тренд
                            </div>
                            {stat.trend > 0 ? (
                              <div className="flex items-center space-x-1">
                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-green-600 dark:text-green-400 font-semibold text-lg">
                                  +{stat.trend.toFixed(1)}%
                                </span>
                              </div>
                            ) : stat.trend < 0 ? (
                              <div className="flex items-center space-x-1">
                                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-red-600 dark:text-red-400 font-semibold text-lg">
                                  {stat.trend.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-400 dark:text-gray-500 text-lg">—</span>
                              </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                              по сравнению с предыдущим периодом
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {groupStatsTotal > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(groupStatsFilters.pageNumber - 1) * groupStatsFilters.pageSize + 1}–{Math.min(groupStatsFilters.pageNumber * groupStatsFilters.pageSize, groupStatsTotal)} из {groupStatsTotal} групп
                  </span>
                  <select
                    value={groupStatsFilters.pageSize}
                    onChange={e => setGroupStatsFilters(prev => ({ ...prev, pageSize: Number(e.target.value), pageNumber: 1 }))}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500"
                  >
                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / стр.</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGroupStatsFilters(prev => ({ ...prev, pageNumber: Math.max(1, prev.pageNumber - 1) }))}
                    disabled={groupStatsFilters.pageNumber === 1}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    {groupStatsFilters.pageNumber} / {Math.ceil(groupStatsTotal / groupStatsFilters.pageSize)}
                  </span>
                  <button
                    onClick={() => setGroupStatsFilters(prev => ({ ...prev, pageNumber: prev.pageNumber + 1 }))}
                    disabled={groupStatsFilters.pageNumber * groupStatsFilters.pageSize >= groupStatsTotal}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lessons Tab Content */}
      {activeTab === 'lessons' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Период
                </label>
                <DateRangePicker
                  startDate={lessonFilters.fromDate}
                  endDate={lessonFilters.toDate}
                  onDateChange={(startDate, endDate) => 
                    setLessonFilters(prev => ({ 
                      ...prev, 
                      fromDate: startDate || prev.fromDate, 
                      toDate: endDate || prev.toDate, 
                      pageNumber: 1 
                    }))
                  }
                  placeholder="Выберите период"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Предмет <span className="text-red-500">*</span>
                </label>
                <select
                  value={lessonFilters.subjectId}
                  onChange={(e) => setLessonFilters(prev => ({ ...prev, subjectId: e.target.value, pageNumber: 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Группа
                </label>
                <select
                  value={lessonFilters.groupId}
                  onChange={(e) => setLessonFilters(prev => ({ ...prev, groupId: e.target.value, pageNumber: 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Все группы</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {lessonMonitoringLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : !lessonFilters.subjectId ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Выберите предмет для просмотра уроков
              </div>
            ) : (
              <div className="space-y-4">
                {lessonMonitoring.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    Нет уроков за выбранный период
                  </div>
                ) : (
                  lessonMonitoring.map((lesson) => (
                    <div 
                      key={lesson.lessonId}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-all duration-200"
                      onClick={() => openLessonDetails(lesson.lessonId)}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Основная информация об уроке */}
                        <div className="lg:col-span-2">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {new Date(lesson.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {lesson.subjectName}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {lesson.startTime.slice(0, 5)} - {lesson.endTime.slice(0, 5)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {lesson.groupName}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                                {lesson.groupCode}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span 
                              className="inline-flex px-3 py-1 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: `${lesson.statusColor}20`,
                                color: lesson.statusColor
                              }}
                              title={lesson.statusDescription}
                            >
                              {lesson.statusName}
                            </span>
                          </div>
                        </div>

                        {/* Статистика посещаемости */}
                        <div className="lg:col-span-1">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                              {lesson.totalStudents}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Всего студентов
                            </div>
                          </div>
                          
                          <div className="flex justify-center space-x-4 mt-4">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                                {lesson.presentCount}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Присутств.
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                                {lesson.absentCount}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Отсутств.
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Процент посещаемости */}
                        <div className="lg:col-span-1">
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="relative w-16 h-16 mb-2">
                              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                                <circle
                                  cx="32"
                                  cy="32"
                                  r="28"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-gray-200 dark:text-gray-700"
                                />
                                <circle
                                  cx="32"
                                  cy="32"
                                  r="28"
                                  fill="none"
                                  strokeWidth="4"
                                  strokeDasharray={`${lesson.attendancePercentage * 1.759} 175.9`}
                                  strokeLinecap="round"
                                  className={
                                    lesson.attendancePercentage >= 90 
                                      ? 'text-green-500'
                                      : lesson.attendancePercentage >= 70
                                      ? 'text-yellow-500'
                                      : 'text-red-500'
                                  }
                                  stroke="currentColor"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-sm font-bold ${
                                  lesson.attendancePercentage >= 90 
                                    ? 'text-green-600 dark:text-green-400'
                                    : lesson.attendancePercentage >= 70
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {lesson.attendancePercentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              Посещаемость
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {lessonMonitoringTotal > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(lessonFilters.pageNumber - 1) * lessonFilters.pageSize + 1}–{Math.min(lessonFilters.pageNumber * lessonFilters.pageSize, lessonMonitoringTotal)} из {lessonMonitoringTotal} уроков
                  </span>
                  <select
                    value={lessonFilters.pageSize}
                    onChange={e => setLessonFilters(prev => ({ ...prev, pageSize: Number(e.target.value), pageNumber: 1 }))}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500"
                  >
                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / стр.</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLessonFilters(prev => ({ ...prev, pageNumber: Math.max(1, prev.pageNumber - 1) }))}
                    disabled={lessonFilters.pageNumber === 1}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    {lessonFilters.pageNumber} / {Math.ceil(lessonMonitoringTotal / lessonFilters.pageSize)}
                  </span>
                  <button
                    onClick={() => setLessonFilters(prev => ({ ...prev, pageNumber: prev.pageNumber + 1 }))}
                    disabled={lessonFilters.pageNumber * lessonFilters.pageSize >= lessonMonitoringTotal}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
      
      {/* Export Modal */}
      {user?.organizationId && (
        <ExportAttendanceModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          organizationId={user.organizationId}
        />
      )}
      
      {/* Lesson Details Modal */}
      <LessonDetailsModal
        isOpen={lessonDetailsModalOpen}
        onClose={() => setLessonDetailsModalOpen(false)}
        lessonId={selectedLessonId}
      />

      {/* Group Details Modal */}
      {selectedGroupForDetails && (
        <GroupDetailsModal
          isOpen={groupDetailsModalOpen}
          onClose={() => { setGroupDetailsModalOpen(false); setSelectedGroupForDetails(null); }}
          groupId={selectedGroupForDetails.groupId}
          groupName={selectedGroupForDetails.groupName}
        />
      )}

      {/* Makeup Lesson Modal */}
      <CreateMakeUpLessonModal
        isOpen={showMakeUpModal}
        onClose={() => setShowMakeUpModal(false)}
        onCreated={() => setShowMakeUpModal(false)}
      />
    </div>
  );
}