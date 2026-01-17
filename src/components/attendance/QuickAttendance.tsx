'use client';

import React, { useState, useMemo } from 'react';
import { Lesson } from '@/types/Lesson';
import { AttendanceStatus, getAttendanceStatusText, getAttendanceStatusColor, getAttendanceStatusIcon } from '@/types/Attendance';
import { attendanceApi } from '@/services/AttendanceApiService';
import { useToast } from '@/contexts/ToastContext';

interface QuickAttendanceProps {
  lesson: Lesson;
  onUpdate: () => void;
}

export default function QuickAttendance({ lesson, onUpdate }: QuickAttendanceProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // Статусы для быстрых кнопок
  const quickStatuses: AttendanceStatus[] = [1, 2, 3, 4];

  const handleStudentToggle = (studentId: string) => {
    const student = lesson.students.find(s => s.id === studentId);
    // Не позволяем выбирать замороженных студентов
    if (student?.isFrozen) return;
    
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    // Фильтруем только незамороженных студентов
    const unfrozenStudents = lesson.students.filter(s => !s.isFrozen);
    
    if (selectedStudents.size === unfrozenStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(unfrozenStudents.map(s => s.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: AttendanceStatus) => {
    if (selectedStudents.size === 0) return;

    // Дополнительная проверка: исключаем замороженных студентов из отправки
    const validStudentIds = Array.from(selectedStudents).filter(studentId => {
      const student = lesson.students.find(s => s.id === studentId);
      return student && !student.isFrozen;
    });

    if (validStudentIds.length === 0) {
      showToast('Выбранные студенты заморожены', 'error');
      return;
    }

    setLoading(true);
    try {
      const attendances = validStudentIds.map(studentId => ({
        studentId,
        status
      }));

      await attendanceApi.markBulkAttendance({
        lessonId: lesson.id,
        attendances
      });

      showToast('Посещаемость успешно обновлена', 'success');
      setSelectedStudents(new Set());
      onUpdate();
    } catch (error) {
      console.error('Ошибка при обновлении посещаемости:', error);
      let errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      // Убираем "API Error: XXX" из сообщения
      errorMessage = errorMessage.replace(/API Error:\s*\d+\s*/gi, '').trim();
      if (errorMessage) {
        showToast(`Ошибка при обновлении посещаемости: ${errorMessage}`, 'error');
      } else {
        showToast('Ошибка при обновлении посещаемости', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIndividualStatusUpdate = async (studentId: string, status: AttendanceStatus) => {
    const student = lesson.students.find(s => s.id === studentId);
    // Не позволяем обновлять статус замороженных студентов
    if (student?.isFrozen) {
      showToast('Студент заморожен, посещаемость недоступна', 'error');
      return;
    }

    setLoading(true);
    try {
      await attendanceApi.updateAttendance({
        studentId,
        lessonId: lesson.id,
        status
      });

      showToast('Посещаемость успешно обновлена', 'success');
      onUpdate();
    } catch (error) {
      console.error('Ошибка при обновлении посещаемости:', error);
      let errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      // Убираем "API Error: XXX" из сообщения
      errorMessage = errorMessage.replace(/API Error:\s*\d+\s*/gi, '').trim();
      if (errorMessage) {
        showToast(`Ошибка при обновлении посещаемости: ${errorMessage}`, 'error');
      } else {
        showToast('Ошибка при обновлении посещаемости', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = useMemo(() => {
    const stats = { attended: 0, absent: 0, late: 0, specialReason: 0, unmarked: 0 };
    
    lesson.students.forEach(student => {
      switch (student.attendanceStatus) {
        case 1:
          stats.attended++;
          break;
        case 2:
          stats.absent++;
          break;
        case 3:
          stats.late++;
          break;
        case 4:
          stats.specialReason++;
          break;
        default:
          stats.unmarked++;
      }
    });

    return stats;
  }, [lesson.students]);

  const stats = getAttendanceStats;

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {stats.attended}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            Присутствовали
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {stats.absent}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">
            Отсутствовали
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
            {stats.late}
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            Опоздали
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {stats.specialReason}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400">
            Уваж. причина
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
            {stats.unmarked}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Не отмечены
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      {selectedStudents.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Выбрано студентов: {selectedStudents.size}
            </span>
            <button
              onClick={() => setSelectedStudents(new Set())}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Очистить выбор
            </button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {quickStatuses.map(status => (
              <button
                key={status}
                onClick={() => handleBulkStatusUpdate(status)}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: getAttendanceStatusColor(status) + '20',
                  color: getAttendanceStatusColor(status),
                  border: `1px solid ${getAttendanceStatusColor(status)}40`
                }}
              >
                <span>{getAttendanceStatusIcon(status)}</span>
                <span>{getAttendanceStatusText(status)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Список студентов */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Список студентов ({lesson.students.length})
          </h3>
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {selectedStudents.size === lesson.students.length ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {lesson.students.map(student => (
            <div
              key={student.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                selectedStudents.has(student.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedStudents.has(student.id)}
                  onChange={() => handleStudentToggle(student.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                
                {student.photoPath ? (
                  <img
                    src={student.photoPath}
                    alt={student.fullName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                      {student.fullName.charAt(0)}
                    </span>
                  </div>
                )}
                
                <span className="font-medium text-gray-900 dark:text-white">
                  {student.fullName}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Текущий статус */}
                {student.attendanceStatus && (
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: getAttendanceStatusColor(student.attendanceStatus) + '20',
                      color: getAttendanceStatusColor(student.attendanceStatus)
                    }}
                  >
                    {getAttendanceStatusIcon(student.attendanceStatus)} {getAttendanceStatusText(student.attendanceStatus)}
                  </span>
                )}
                
                {/* Быстрые кнопки статуса */}
                <div className="flex gap-1">
                  {quickStatuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleIndividualStatusUpdate(student.id, status)}
                      disabled={loading}
                      className="w-8 h-8 rounded-full text-sm font-medium transition-colors hover:scale-110 disabled:opacity-50"
                      style={{
                        backgroundColor: student.attendanceStatus === status 
                          ? getAttendanceStatusColor(status) 
                          : getAttendanceStatusColor(status) + '20',
                        color: student.attendanceStatus === status 
                          ? 'white' 
                          : getAttendanceStatusColor(status)
                      }}
                      title={getAttendanceStatusText(status)}
                    >
                      {getAttendanceStatusIcon(status)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Обновление...</span>
          </div>
        </div>
      )}
    </div>
  );
}