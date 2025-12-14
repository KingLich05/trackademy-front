import React, { useState, useEffect } from 'react';
import { BaseModal } from './ui/BaseModal';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { Group } from '../types/Group';
import { UserIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface GroupStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  onPaymentCreate?: (studentId: string, studentName: string) => void;
}

interface GroupStudent {
  studentId: string;
  studentName: string;
}

export const GroupStudentsModal: React.FC<GroupStudentsModalProps> = ({
  isOpen,
  onClose,
  group,
  onPaymentCreate
}) => {
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && group?.id) {
      loadStudents();
    }
  }, [isOpen, group?.id]);

  const loadStudents = async () => {
    if (!group?.id) return;
    
    setLoading(true);
    try {
      const response = await AuthenticatedApiService.get<GroupStudent[]>(
        `/Group/${group.id}/students`
      );
      setStudents(response);
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStudents([]);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Студенты группы "${group?.name || ''}"`}
      customBackground="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
              <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Список студентов
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Всего студентов: {students.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Загрузка студентов...
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4">
              <UserIcon className="w-10 h-10 text-gray-400 mx-auto mt-1" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Нет студентов
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              В этой группе пока нет студентов
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {students.map((student) => (
              <div
                key={student.studentId}
                className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/50 dark:border-gray-600/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg mr-3">
                      <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {student.studentName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ID: {student.studentId}
                      </p>
                    </div>
                  </div>
                  {onPaymentCreate && (
                    <button
                      onClick={() => onPaymentCreate(student.studentId, student.studentName)}
                      className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      Создать платеж
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
};