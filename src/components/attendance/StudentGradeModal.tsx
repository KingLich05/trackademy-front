'use client';

import { useState, useEffect } from 'react';
import { LessonStudent } from '@/types/Lesson';
import { AttendanceStatus } from '@/types/Attendance';
import { getAttendanceStatusText, getAttendanceStatusColor } from '@/types/Lesson';
import { attendanceApi } from '@/services/AttendanceApiService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface StudentGradeModalProps {
  student: LessonStudent;
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function StudentGradeModal({ student, lessonId, isOpen, onClose, onUpdate }: StudentGradeModalProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<AttendanceStatus | null>(student.attendanceStatus);
  const [grade, setGrade] = useState<number | string>(student.grade || '');
  const [comment, setComment] = useState<string>(student.comment || '');
  const [isLoading, setIsLoading] = useState(false);

  // Check user roles
  const userRole = user?.role || '';
  const roleStr = user?.roleId?.toString() || '';
  const isTeacher = userRole === 'Teacher' || roleStr === '3';
  const isAdministrator = userRole === 'Administrator' || roleStr === '2';
  const isStudent = userRole === 'Student' || roleStr === '1';
  
  // Students can view grades, teachers and admins can view all grades
  const canViewGrades = isTeacher || isAdministrator || isStudent;
  const canEditGrades = isTeacher;

  // Сброс формы при открытии модалки
  useEffect(() => {
    if (isOpen) {
      setStatus(student.attendanceStatus);
      setGrade(student.grade || '');
      setComment(student.comment || '');
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Валидация оценки (только если пользователь - преподаватель)
      let gradeValue = null;
      if (canEditGrades) {
        gradeValue = grade === '' ? null : Number(grade);
        if (gradeValue !== null && (gradeValue < 1 || gradeValue > 100)) {
          showToast('Оценка должна быть в диапазоне от 1 до 100', 'error');
          return;
        }
      }

      // Валидация комментария (только если пользователь - преподаватель)
      let commentValue = '';
      if (canEditGrades) {
        commentValue = comment;
        if (commentValue.length > 500) {
          showToast('Комментарий не должен превышать 500 символов', 'error');
          return;
        }
      }

      // Обновляем статус, оценку и комментарий
      await attendanceApi.updateAttendance({
        studentId: student.id,
        lessonId: lessonId,
        status: status!,
        grade: canEditGrades ? (gradeValue || undefined) : undefined,
        comment: canEditGrades ? (commentValue.trim() || undefined) : undefined
      });

      showToast('Данные студента успешно обновлены', 'success');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Ошибка при обновлении данных студента:', error);
      let errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      errorMessage = errorMessage.replace(/API Error:\s*\d+\s*/gi, '').trim();
      showToast(errorMessage || 'Ошибка при обновлении данных студента', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Запрещаем ввод отрицательных чисел и множественных минусов
    if (value.includes('-') || value.startsWith('-')) {
      return;
    }
    
    // Разрешаем пустое значение или числа от 1 до 100
    if (value === '' || (Number(value) >= 1 && Number(value) <= 100 && !isNaN(Number(value)))) {
      setGrade(value);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {student.fullName}
        </h3>
        
        <div className="space-y-4">
          {/* Статус посещаемости */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Статус посещаемости <span className="text-red-500">*</span>
            </label>
            <select
              value={status || ''}
              onChange={(e) => setStatus(Number(e.target.value) as AttendanceStatus)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Выберите статус</option>
              <option value={1}>Присутствовал</option>
              <option value={2}>Отсутствовал</option>
              <option value={3}>Опоздал</option>
              <option value={4}>Уважительная причина</option>
            </select>
          </div>

          {/* Оценка - для преподавателей, администраторов и самого студента */}
          {canViewGrades && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Оценка (1-100) {!canEditGrades && <span className="text-sm text-gray-500">(только просмотр)</span>}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                step="5"
                value={grade}
                onChange={handleGradeChange}
                onKeyDown={(e) => {
                  // Запрещаем ввод символов минус, плюс, точка, буква e
                  if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder={canEditGrades ? "Введите оценку" : "Оценка не выставлена"}
                disabled={!canEditGrades}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         ${canEditGrades 
                           ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                           : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                         }`}
              />
              {grade && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Оценка: {grade}
                </div>
              )}
            </div>
          )}

          {/* Комментарий - для преподавателей, администраторов и самого студента */}
          {canViewGrades && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Комментарий преподавателя {!canEditGrades && <span className="text-sm text-gray-500">(только просмотр)</span>}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={canEditGrades ? "Комментарий к уроку..." : "Комментарий отсутствует"}
                disabled={!canEditGrades}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none
                         ${canEditGrades 
                           ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                           : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                         }`}
              />
              {canEditGrades && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-right">
                  {comment.length}/500 символов
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !status}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}