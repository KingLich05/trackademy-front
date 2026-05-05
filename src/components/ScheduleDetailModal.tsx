'use client';

import React, { useEffect, useState } from 'react';
import {
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { ScheduleDetail } from '../types/Schedule';
import { getDayShortName, getDayName, formatTime } from '../types/Schedule';

interface ScheduleDetailModalProps {
  scheduleId: string | null;
  onClose: () => void;
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  Planned:   { label: 'Запланирован', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  Completed: { label: 'Проведён',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  Cancelled: { label: 'Отменён',      cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export default function ScheduleDetailModal({ scheduleId, onClose }: ScheduleDetailModalProps) {
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!scheduleId) return;
    setDetail(null);
    setError(null);
    setLoading(true);
    AuthenticatedApiService.getScheduleById(scheduleId)
      .then(data => {
        if (data === null) setError('Расписание не найдено');
        else setDetail(data);
      })
      .catch(() => setError('Не удалось загрузить расписание'))
      .finally(() => setLoading(false));
  }, [scheduleId]);

  if (!scheduleId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CalendarDaysIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {loading ? 'Загрузка…' : (detail?.group.name ?? 'Расписание')}
              </h2>
              <p className="text-xs text-violet-200">
                {detail?.subject.subjectName ?? ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-700 dark:text-red-300">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {detail && (
            <>
              {/* Archived banner */}
              {detail.isDeleted && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                  <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                  Расписание архивировано
                </div>
              )}

              {/* Main info */}
              <div className="grid grid-cols-2 gap-4">

                {/* Left column */}
                <div className="space-y-3">
                  {/* Teacher */}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <UserIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Преподаватель</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{detail.teacher.name}</p>
                    </div>
                  </div>

                  {/* Period */}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <CalendarDaysIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Период</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(detail.effectiveFrom).toLocaleDateString('ru-RU')}
                        {' — '}
                        {detail.effectiveTo
                          ? new Date(detail.effectiveTo).toLocaleDateString('ru-RU')
                          : 'Бессрочно'}
                      </p>
                    </div>
                  </div>

                  {/* Group info */}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <AcademicCapIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Группа</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{detail.group.name}</p>
                      {(detail.group.code || detail.group.level) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {[detail.group.code, detail.group.level].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column — schedule slots */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Расписание занятий</p>
                  <div className="space-y-2">
                    {detail.scheduleSlots.map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-xs font-semibold text-violet-600 dark:text-violet-400 shrink-0">
                          {getDayShortName(slot.weekDay)}
                        </span>
                        <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                          <span>{formatTime(slot.startTime)}–{formatTime(slot.endTime)}</span>
                        </div>
                        {slot.room && (
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 ml-auto">
                            <BuildingOfficeIcon className="h-3.5 w-3.5" />
                            <span className="text-xs truncate max-w-[100px]">{slot.room.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Students */}
              {detail.group.students.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Студенты ({detail.group.students.length})
                  </p>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                          <th className="px-3 py-2 text-left font-medium">ФИО</th>
                          <th className="px-3 py-2 text-left font-medium">Пакет</th>
                          <th className="px-3 py-2 text-center font-medium">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {detail.group.students.map(st => (
                          <tr key={st.studentId} className="bg-white dark:bg-gray-900">
                            <td className="px-3 py-2 text-gray-900 dark:text-white">{st.studentName}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                              {st.subjectPackage?.packageName ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {st.isFrozen ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                  <XCircleIcon className="h-3 w-3" />
                                  Заморожен
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                  <CheckCircleIcon className="h-3 w-3" />
                                  Активен
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upcoming lessons */}
              {detail.upcomingLessons.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Ближайшие занятия
                  </p>
                  <div className="space-y-2">
                    {detail.upcomingLessons.map(lesson => {
                      const st = statusLabel[lesson.status] ?? { label: lesson.status, cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm"
                        >
                          <span className="text-gray-700 dark:text-gray-300 font-medium w-24 shrink-0">
                            {new Date(lesson.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">
                            {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
                          </span>
                          {lesson.room && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                              <BuildingOfficeIcon className="h-3.5 w-3.5" />
                              {lesson.room.name}
                            </span>
                          )}
                          <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${st.cls}`}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
