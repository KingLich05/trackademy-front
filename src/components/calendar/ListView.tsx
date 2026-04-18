'use client';

import { Lesson, formatDate, formatTimeRange, generateSubjectColor, getLessonStatusColor, getLessonStatusText } from '@/types/Lesson';
import { useState } from 'react';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface ListViewProps {
  lessons: Lesson[];
  onLessonClick: (lesson: Lesson) => void;
}

export default function ListView({ lessons, onLessonClick }: ListViewProps) {
  const [sortBy, setSortBy] = useState<'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Group lessons by date
  const groupedLessons = lessons.reduce((groups, lesson) => {
    const dateKey = lesson.date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(lesson);
    return groups;
  }, {} as Record<string, Lesson[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedLessons).sort((a, b) => {
    return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
  });

  // Filter lessons by status
  const filterLessons = (lessons: Lesson[]): Lesson[] => {
    if (filterStatus === 'all') return lessons;
    return lessons.filter(lesson => lesson.lessonStatus === filterStatus);
  };

  // Sort lessons within each day (by time by default)
  const sortLessonsInDay = (lessons: Lesson[]): Lesson[] => {
    return [...lessons].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-10">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Список занятий
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все статусы</option>
              <option value="Planned">Запланировано</option>
              <option value="Completed">Проведено</option>
              <option value="Cancelled">Отменено</option>
              <option value="Moved">Перенесено</option>
            </select>

            {/* Sort controls */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => handleSort('date')}
                className="px-3 py-1 rounded text-sm font-medium transition-all bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              >
                Дата
                <span className="ml-1">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="flex-1 overflow-y-auto relative">
        {sortedDates.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">
                📅
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                Занятий не найдено
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 p-4 pb-8">
            {sortedDates.map((dateKey) => {
              const dayLessons = filterLessons(groupedLessons[dateKey]);
              if (dayLessons.length === 0) return null;
              
              const sortedDayLessons = sortLessonsInDay(dayLessons);
              
              return (
                <div key={dateKey} className="space-y-4">
                  {/* Date header */}
                  <div className="sticky top-0 bg-gray-50/95 dark:bg-gray-700/95 backdrop-blur-sm p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm z-10">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(dateKey)}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {sortedDayLessons.length} занятий
                    </p>
                  </div>

                  {/* Lessons for this day */}
                  <div className="space-y-3 mt-2">
                    {sortedDayLessons.map((lesson) => (
                      <ListLessonCard
                        key={lesson.id}
                        lesson={lesson}
                        onClick={() => onLessonClick(lesson)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ListLessonCardProps {
  lesson: Lesson;
  onClick: () => void;
}

function ListLessonCard({ lesson, onClick }: ListLessonCardProps) {
  const subjectColor = generateSubjectColor(lesson.subject.subjectName);
  const statusColor = getLessonStatusColor(lesson.lessonStatus);
  const attendedStudents = lesson.students.filter(s => s.attendanceStatus === 1).length;
  const absentStudents = lesson.students.filter(s => s.attendanceStatus === 2).length;

  return (
    <div
      onClick={onClick}
      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                 hover:shadow-md transition-all cursor-pointer border-l-4"
      style={{ borderLeftColor: subjectColor }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h5 className="font-semibold text-gray-900 dark:text-white">
              {lesson.subject.subjectName}
            </h5>
            {lesson.note && (
              <ChatBubbleLeftIcon 
                className="w-4 h-4 text-blue-500 dark:text-blue-400" 
                title="Есть комментарий преподавателя"
              />
            )}
            <div
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: statusColor }}
            >
              {getLessonStatusText(lesson.lessonStatus)}
            </div>
            {lesson.isMakeUp && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700/50">
                ↩ Отработка
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <span className="font-medium">Группа:</span> {lesson.group.name}
            </div>
            <div>
              <span className="font-medium">Время:</span> {formatTimeRange(lesson.startTime, lesson.endTime)}
            </div>
            <div>
              <span className="font-medium">Преподаватель:</span> {lesson.teacher.name}
            </div>
            <div>
              <span className="font-medium">Аудитория:</span> {lesson.room.name}
            </div>
          </div>

          {lesson.lessonStatus === 'Completed' && (
            <div className="mt-2 text-sm">
              <span className="text-gray-600 dark:text-gray-300">Посещаемость:</span>
              <span className="ml-2 text-green-600 dark:text-green-400">
                ✓ {attendedStudents}
              </span>
              <span className="ml-2 text-red-600 dark:text-red-400">
                ✗ {absentStudents}
              </span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">
                / {lesson.students.length}
              </span>
            </div>
          )}

          {lesson.note && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Примечание:</span> {lesson.note}
            </div>
          )}

          {lesson.cancelReason && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              <span className="font-medium">Причина:</span> {lesson.cancelReason}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {lesson.students.length} студентов
          </div>
          
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}