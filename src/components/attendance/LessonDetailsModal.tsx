'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon, UserGroupIcon, AcademicCapIcon, UserIcon } from '@heroicons/react/24/outline';
import { LessonDetails, getAttendanceStatusColor } from '@/types/Attendance';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { useToast } from '@/contexts/ToastContext';

interface LessonDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
}

export const LessonDetailsModal = ({ isOpen, onClose, lessonId }: LessonDetailsModalProps) => {
  const [lessonDetails, setLessonDetails] = useState<LessonDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    if (isOpen && lessonId) {
      loadLessonDetails();
    }
  }, [isOpen, lessonId]);

  const loadLessonDetails = async () => {
    setLoading(true);
    try {
      const response = await AuthenticatedApiService.get<LessonDetails>(
        `/Attendance/monitoring/lessons/${lessonId}/details`
      );
      setLessonDetails(response);
    } catch (error) {
      console.error('Ошибка загрузки деталей урока:', error);
      showError('Не удалось загрузить детали урока');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Remove seconds
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Детали урока
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : lessonDetails ? (
            <div className="space-y-6">
              {/* Lesson Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Дата и время</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(lessonDetails.date)} {formatTime(lessonDetails.startTime)} - {formatTime(lessonDetails.endTime)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <UserGroupIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Группа</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {lessonDetails.groupName} ({lessonDetails.groupCode})
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <AcademicCapIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Предмет</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {lessonDetails.subjectName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Преподаватель</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {lessonDetails.teacherName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {lessonDetails.presentStudents.length}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">Присутствующие</p>
                  </div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {lessonDetails.absentStudents.length}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">Отсутствующие</p>
                  </div>
                </div>
              </div>

              {/* Present Students */}
              {lessonDetails.presentStudents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    Присутствующие студенты ({lessonDetails.presentStudents.length})
                  </h3>
                  <div className="space-y-2">
                    {lessonDetails.presentStudents.map((student) => (
                      <div
                        key={student.studentId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {student.studentName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.studentName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{student.studentLogin}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              student.status === 1
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : student.status === 2
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : student.status === 3
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : student.status === 4
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}
                          >
                            {student.statusName}
                          </span>
                          {student.grade && (
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                              {student.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Absent Students */}
              {lessonDetails.absentStudents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    Отсутствующие студенты ({lessonDetails.absentStudents.length})
                  </h3>
                  <div className="space-y-2">
                    {lessonDetails.absentStudents.map((student) => (
                      <div
                        key={student.studentId}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {student.studentName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.studentName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{student.studentLogin}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              student.status === 1
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : student.status === 2
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : student.status === 3
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : student.status === 4
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}
                          >
                            {student.statusName}
                          </span>
                          {student.comment && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                              {student.comment}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Не удалось загрузить детали урока</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};