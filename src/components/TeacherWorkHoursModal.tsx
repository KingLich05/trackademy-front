'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, AcademicCapIcon, ChevronDownIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { useToast } from '@/contexts/ToastContext';

interface TeacherGroup {
  groupId: string;
  groupName: string;
  totalHours: number;
}

interface TeacherWorkHours {
  teacherId: string;
  fullName: string;
  completedLessonsCount: number;
  groups: TeacherGroup[];
}

interface TeacherWorkHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
}

export default function TeacherWorkHoursModal({ isOpen, onClose, organizationId }: TeacherWorkHoursModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherWorkHours[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const formatDateForInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [fromDate, setFromDate] = useState(formatDateForInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateForInput(today));

  useEffect(() => {
    if (isOpen) {
      loadTeacherWorkHours();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fromDate, toDate]);

  const loadTeacherWorkHours = async () => {
    setLoading(true);
    try {
      const data = await AuthenticatedApiService.getTeacherWorkHours(organizationId, fromDate, toDate);
      setTeachers(data);
      setExpandedIds(new Set());
    } catch (error) {
      console.error('Error loading teacher work hours:', error);
      showToast(error instanceof Error ? error.message : 'Ошибка при загрузке данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sortedTeachers = [...teachers].sort((a, b) =>
    sortOrder === 'desc'
      ? b.completedLessonsCount - a.completedLessonsCount
      : a.completedLessonsCount - b.completedLessonsCount
  );

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(teachers.map(t => t.teacherId)));
  const collapseAll = () => setExpandedIds(new Set());

  const formatHours = (h: number) => {
    const rounded = Math.round(h * 100) / 100;
    return rounded % 1 === 0 ? `${rounded}ч` : `${rounded.toFixed(2)}ч`;
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const totalLessons = teachers.reduce((s, t) => s + t.completedLessonsCount, 0);
  const totalHours = teachers.reduce((s, t) => s + t.groups.reduce((gs, g) => gs + g.totalHours, 0), 0);
  const activeTeachers = teachers.filter(t => t.completedLessonsCount > 0).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <AcademicCapIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Учет занятий преподавателей</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Статистика проведённых занятий за период</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Period Selection */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">С даты</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">По дату</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-16">
              <AcademicCapIcon className="mx-auto h-14 w-14 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Нет данных за выбранный период</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center border border-violet-100 dark:border-violet-800">
                  <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">{teachers.length}</div>
                  <div className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">Всего препод.</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totalLessons}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Занятий</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatHours(totalHours)}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Часов всего</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Раскрыть все
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Свернуть все
                  </button>
                </div>
                <button
                  onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
                  className="text-xs px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40 transition-colors font-medium"
                >
                  {sortOrder === 'desc' ? '↓ По убыванию' : '↑ По возрастанию'}
                </button>
              </div>

              {/* Teacher accordion list */}
              <div className="space-y-2">
                {sortedTeachers.map((teacher, index) => {
                  const isExpanded = expandedIds.has(teacher.teacherId);
                  const hasGroups = teacher.groups.length > 0;
                  const teacherTotalHours = teacher.groups.reduce((s, g) => s + g.totalHours, 0);
                  const isActive = teacher.completedLessonsCount > 0;

                  return (
                    <div
                      key={teacher.teacherId}
                      className={`rounded-xl border transition-all duration-200 ${
                        isActive
                          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                          : 'border-gray-100 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-800/40'
                      }`}
                    >
                      {/* Teacher row */}
                      <button
                        onClick={() => hasGroups && toggleExpand(teacher.teacherId)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-colors ${
                          hasGroups ? 'hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {/* Index badge */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Name + subtitle */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className={`text-sm font-semibold truncate ${
                            isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {teacher.fullName}
                          </div>
                          {hasGroups && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {teacher.groups.length} {teacher.groups.length === 1 ? 'группа' : teacher.groups.length < 5 ? 'группы' : 'групп'} · {formatHours(teacherTotalHours)}
                            </div>
                          )}
                        </div>

                        {/* Lessons badge */}
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          teacher.completedLessonsCount === 0
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            : teacher.completedLessonsCount < 5
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {teacher.completedLessonsCount} зан.
                        </span>

                        {/* Chevron */}
                        {hasGroups && (
                          <ChevronDownIcon className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </button>

                      {/* Groups list */}
                      {hasGroups && isExpanded && (
                        <div className="px-4 pb-3">
                          <div className="ml-10 border-l-2 border-violet-200 dark:border-violet-800 pl-4 space-y-1">
                            {teacher.groups.map(group => (
                              <div
                                key={group.groupId}
                                className="flex items-center justify-between gap-2 py-1.5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserGroupIcon className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{group.groupName}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                  <ClockIcon className="h-3 w-3 text-blue-400" />
                                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{formatHours(group.totalHours)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  Активных: <span className="font-semibold text-gray-900 dark:text-white">{activeTeachers}</span> из {teachers.length}
                </span>
                <span>{formatDateForDisplay(fromDate)} — {formatDateForDisplay(toDate)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
