'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ClipboardDocumentCheckIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { PageHeaderWithStats } from '@/components/ui/PageHeaderWithStats';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { ExportAttendanceModal } from '@/components/ExportAttendanceModal';
import { attendanceApi } from '@/services/AttendanceApiService';
import { AttendanceRecord, AttendanceFilters, AttendanceStatus, getAttendanceStatusText, getAttendanceStatusColor, getAttendanceStatusIcon } from '@/types/Attendance';
import { useApiToast } from '@/hooks/useApiToast';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { Group } from '@/types/Group';

export default function AttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Toast уведомления для API операций
  const { loadOperation } = useApiToast();
  
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filters, setFilters] = useState<AttendanceFilters>({
    organizationId: user?.organizationId || '',
    pageNumber: 1,
    pageSize: 20
  });
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Check authorization
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // Load groups
  useEffect(() => {
    if (user?.organizationId) {
      loadGroups();
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

  if (!user) {
    return null;
  }

  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 page-container pt-20 md:pt-24">
      <div className="w-full space-y-6">
        {/* Page Header */}
        <PageHeaderWithStats
        title="Посещаемость"
        subtitle="Отслеживание и анализ посещаемости студентов"
        icon={ClipboardDocumentCheckIcon}
        gradientFrom="emerald-500"
        gradientTo="teal-600"
        stats={[
          { 
            label: "Общая посещаемость", 
            value: `${stats.attendancePercentage}%`, 
            color: "emerald" as const
          },
          { 
            label: "Присутствовали", 
            value: stats.attended, 
            color: "green" as const
          },
          { 
            label: "Пропустили", 
            value: stats.absent, 
            color: "red" as const
          },
          { 
            label: "Всего записей", 
            value: stats.total, 
            color: "blue" as const
          }
        ]}
      />

      {/* Content Section */}
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
              <div className="flex gap-3">
                {user?.role !== 'Teacher' && (
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Экспорт Excel
                  </button>
                )}
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Сбросить фильтры
                </button>
              </div>
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
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: getAttendanceStatusColor(record.status) + '20',
                            color: getAttendanceStatusColor(record.status)
                          }}
                          title={getAttendanceStatusText(record.status)}
                        >
                          <span>{getAttendanceStatusIcon(record.status)}</span>
                          <span className="hidden lg:inline truncate max-w-[80px]">{getAttendanceStatusText(record.status)}</span>
                          <span className="lg:hidden">{getAttendanceStatusText(record.status) === 'Отсутствовал по уважительной причине' ? 'Ув. причина' : getAttendanceStatusText(record.status)}</span>
                        </span>
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
          {totalCount > filters.pageSize! && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Показано {Math.min(filters.pageSize!, totalCount)} из {totalCount} записей
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
                    Страница {filters.pageNumber}
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
      </div>
      
      {/* Export Modal */}
      {user?.organizationId && (
        <ExportAttendanceModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          organizationId={user.organizationId}
        />
      )}
    </div>
  );
}