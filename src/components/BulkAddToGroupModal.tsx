'use client';

import React from 'react';
import { User } from '../types/User';
import { XMarkIcon, UserGroupIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BulkAddToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedStudents: User[];
  groupName: string;
  isLoading?: boolean;
  onRemoveStudent: (studentId: string) => void;
}

export const BulkAddToGroupModal: React.FC<BulkAddToGroupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedStudents,
  groupName,
  isLoading = false,
  onRemoveStudent
}) => {
  console.log('BulkAddToGroupModal render:', { isOpen, selectedStudents: selectedStudents.length, groupName, isLoading });
  console.log('BulkAddToGroupModal onConfirm prop:', typeof onConfirm, onConfirm?.toString().substring(0, 100));
  
  if (!isOpen) return null;

  // Разделяем студентов на тех, кто уже в группе и кто будет добавлен
  // Примечание: дубликаты обрабатываются на сервере автоматически
  const studentsAlreadyInGroup = selectedStudents.filter(student => 
    student.groups?.some(g => g.name === groupName)
  );
  const studentsToAdd = selectedStudents.filter(student => 
    !student.groups?.some(g => g.name === groupName)
  );

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay with blur */}
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md transition-opacity"
          onClick={!isLoading ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal */}
        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-lime-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Массовое добавление в группу
                  </h3>
                  <p className="text-sm text-white/80 mt-0.5">
                    Подтвердите добавление студентов
                  </p>
                </div>
              </div>
              {!isLoading && (
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Group Info */}
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Добавление в группу:
              </p>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                {groupName}
              </p>
            </div>

            {/* Students to Add */}
            {studentsToAdd.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Будут добавлены ({studentsToAdd.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {studentsToAdd.map(student => (
                    <div 
                      key={student.id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-lime-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {student.name}
                        </p>
                        {student.groups && student.groups.length > 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Текущие группы: {student.groups.map(g => g.name).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Без групп
                          </p>
                        )}
                      </div>
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <button
                        onClick={() => onRemoveStudent(student.id)}
                        disabled={isLoading}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Убрать из списка"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Students Already in Group */}
            {studentsAlreadyInGroup.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Уже в этой группе ({studentsAlreadyInGroup.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {studentsAlreadyInGroup.map(student => (
                    <div 
                      key={student.id}
                      className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 group hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          Будет пропущен
                        </p>
                      </div>
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                      <button
                        onClick={() => onRemoveStudent(student.id)}
                        disabled={isLoading}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Убрать из списка"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Students to Add Warning */}
            {selectedStudents.length === 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                      Нет студентов для добавления
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      Не выбрано ни одного студента.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
              <button
              type="button"
              onClick={() => {
                console.log('🔘 BulkAddToGroupModal BUTTON CLICKED');
                console.log('Button state:', { isLoading, selectedStudentsCount: selectedStudents.length, disabled: isLoading || selectedStudents.length === 0 });
                console.log('About to call onConfirm function:', onConfirm);
                console.log('Calling onConfirm now...');
                onConfirm();
                console.log('onConfirm called successfully');
              }}
              disabled={isLoading || selectedStudents.length === 0}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-lime-600 rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Добавление...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Добавить ({selectedStudents.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
