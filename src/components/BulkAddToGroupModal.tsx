'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../types/User';
import { SubjectPackage } from '../types/Subject';
import { StudentWithPackageModel } from '../types/Group';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { XMarkIcon, UserGroupIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BulkAddToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (students: StudentWithPackageModel[]) => void;
  selectedStudents: User[];
  groupName: string;
  subjectId: string;
  organizationId: string;
  isLoading?: boolean;
  onRemoveStudent: (studentId: string) => void;
}

export const BulkAddToGroupModal: React.FC<BulkAddToGroupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedStudents,
  groupName,
  subjectId,
  organizationId,
  isLoading = false,
  onRemoveStudent
}) => {
  const [packages, setPackages] = useState<SubjectPackage[]>([]);
  const [packageSelections, setPackageSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && subjectId && organizationId) {
      loadPackages();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, subjectId, organizationId]);

  // Auto-select when only one package available
  useEffect(() => {
    if (packages.length === 1) {
      const singleId = packages[0].id || '';
      const initial: Record<string, string> = {};
      selectedStudents.forEach(s => { initial[s.id] = singleId; });
      setPackageSelections(initial);
    }
  }, [packages, selectedStudents]);

  const loadPackages = async () => {
    try {
      const response = await AuthenticatedApiService.post<{ items: Array<{ id: string; name: string; subjectPackages: SubjectPackage[] }> }>(
        '/Subject/GetAllSubjects',
        { pageNumber: 1, pageSize: 1000, organizationId }
      );
      const subject = (response.items || []).find(s => s.id === subjectId);
      setPackages(subject?.subjectPackages || []);
    } catch {
      setPackages([]);
    }
  };

  if (!isOpen) return null;

  const studentsAlreadyInGroup = selectedStudents.filter(s => s.groups?.some(g => g.name === groupName));
  const studentsToAdd = selectedStudents.filter(s => !s.groups?.some(g => g.name === groupName));
  const allPackagesSelected = studentsToAdd.every(s => !!packageSelections[s.id]);
  const canConfirm = !isLoading && studentsToAdd.length > 0 && allPackagesSelected;

  const handleConfirm = () => {
    const students: StudentWithPackageModel[] = studentsToAdd.map(s => ({
      studentId: s.id,
      subjectPackageId: packageSelections[s.id] || ''
    }));
    onConfirm(students);
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md transition-opacity"
          onClick={!isLoading ? onClose : undefined}
          aria-hidden="true"
        />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-lime-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Массовое добавление в группу</h3>
                  <p className="text-sm text-white/80 mt-0.5">Подтвердите добавление студентов</p>
                </div>
              </div>
              {!isLoading && (
                <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Добавление в группу:</p>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mt-1">{groupName}</p>
            </div>

            {studentsToAdd.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Будут добавлены ({studentsToAdd.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {studentsToAdd.map(student => (
                    <div key={student.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-lime-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">{student.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.name}</p>
                          {student.groups && student.groups.length > 0 ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Текущие группы: {student.groups.map(g => g.name).join(', ')}</p>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Без групп</p>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveStudent(student.id)}
                          disabled={isLoading}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Убрать из списка"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mt-2 ml-13">
                        <select
                          value={packageSelections[student.id] || ''}
                          onChange={e => setPackageSelections(prev => ({ ...prev, [student.id]: e.target.value }))}
                          disabled={isLoading}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">— Выберите абонемент —</option>
                          {packages.map(pkg => (
                            <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                          ))}
                        </select>
                        {!packageSelections[student.id] && (
                          <p className="text-xs text-red-500 mt-0.5">Выберите абонемент</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {studentsAlreadyInGroup.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Уже в этой группе ({studentsAlreadyInGroup.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {studentsAlreadyInGroup.map(student => (
                    <div key={student.id} className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 group">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{student.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.name}</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">Будет пропущен</p>
                      </div>
                      <button
                        onClick={() => onRemoveStudent(student.id)}
                        disabled={isLoading}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Убрать из списка"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedStudents.length === 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Нет студентов для добавления</p>
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
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-lime-600 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Добавление...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Добавить ({studentsToAdd.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
