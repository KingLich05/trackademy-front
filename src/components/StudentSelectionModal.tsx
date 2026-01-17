'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { User } from '../types/User';

interface StudentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (students: User[]) => void;
  selectedStudents: User[];
  title?: string;
  groupId?: string; // Для исключения студентов, которые уже в группе
  organizationId: string; // Добавляем обязательный organizationId
}

export const StudentSelectionModal: React.FC<StudentSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedStudents,
  title = 'Выберите студентов',
  groupId,
  organizationId
}) => {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState<User[]>(selectedStudents);

  useEffect(() => {
    if (isOpen) {
      loadStudents();
      setLocalSelected(selectedStudents);
    }
  }, [isOpen, selectedStudents]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // Используем прямой вызов API /User/get-users
      const response = await AuthenticatedApiService.post('/User/get-users', {
        organizationId: organizationId,
        pageNumber: 1,
        pageSize: 1000,
        roleIds: [1] // Роль студента
      }) as { items?: User[] };
      
      let allStudents = response.items || [];
      
      // Если указан groupId, исключаем студентов, которые уже в группе
      if (groupId) {
        const groupDetails = await AuthenticatedApiService.get(`/Group/${groupId}`) as { students?: { studentId?: string; id: string }[] };
        const existingStudentIds = groupDetails.students?.map((s: { studentId?: string; id: string }) => s.studentId || s.id) || [];
        allStudents = allStudents.filter((student: User) => !existingStudentIds.includes(student.id));
      }
      
      setStudents(allStudents);
    } catch (error) {
      console.error('Ошибка при загрузке студентов:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (student: User) => {
    setLocalSelected(prev => {
      const isSelected = prev.some(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredStudents = students.filter(student => {
      const studentName = student.name || student.fullName || '';
      return studentName.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    if (localSelected.length === filteredStudents.length) {
      setLocalSelected([]);
    } else {
      setLocalSelected(filteredStudents);
    }
  };

  const handleConfirm = () => {
    onSelect(localSelected);
    onClose();
  };

  const handleClose = () => {
    setLocalSelected(selectedStudents);
    setSearchTerm('');
    onClose();
  };

  const filteredStudents = students.filter(student => {
    const studentName = student.name || student.fullName || '';
    return studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           student.phone?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal */}
        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white" id="modal-title">
                    {title}
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Выбрано: {localSelected.length} студентов
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-96 overflow-hidden">
            {/* Search */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск студентов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                {localSelected.length === filteredStudents.length ? 'Снять выбор со всех' : 'Выбрать всех'}
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Найдено: {filteredStudents.length}
              </span>
            </div>

            {/* Students List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Загрузка студентов...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <UserIcon className="mx-auto w-12 h-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'Студенты не найдены' : 'Нет доступных студентов'}
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      localSelected.some(s => s.id === student.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => handleStudentToggle(student)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={localSelected.some(s => s.id === student.id)}
                        onChange={() => handleStudentToggle(student)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {student.name || student.fullName}
                        </div>
                        {student.phone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            📱 {student.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={localSelected.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Выбрать ({localSelected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};