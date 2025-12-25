'use client';

import { useState, useEffect } from 'react';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { User } from '@/types/User';

interface ReplaceTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  currentTeacherId: string;
  currentTeacherName: string;
  onUpdate?: () => void;
}

export default function ReplaceTeacherModal({ 
  isOpen, 
  onClose, 
  lessonId, 
  currentTeacherId, 
  currentTeacherName, 
  onUpdate 
}: ReplaceTeacherModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [replaceReason, setReplaceReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
      setSelectedTeacherId('');
      setReplaceReason('');
    }
  }, [isOpen]);

  const loadTeachers = async () => {
    console.log('loadTeachers called, user:', user?.organizationId);
    if (!user?.organizationId) return;
    
    setIsLoading(true);
    try {
      // Load teachers (role 3 = teacher)
      const response = await AuthenticatedApiService.getUsers({
        organizationId: user.organizationId,
        pageNumber: 1,
        pageSize: 1000,
        roleIds: [3] // 3 = teacher role
      });
      
      // Исключаем текущего преподавателя из списка
      const availableTeachers = response.items.filter(teacher => teacher.id !== currentTeacherId);
      console.log('Available teachers:', availableTeachers.length, availableTeachers);
      setTeachers(availableTeachers);
    } catch (error) {
      console.error('Error loading teachers:', error);
      showToast('Ошибка при загрузке списка преподавателей', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplaceTeacher = async () => {
    console.log('handleReplaceTeacher called:', { selectedTeacherId, replaceReason });
    if (!selectedTeacherId || !replaceReason.trim()) {
      showToast('Пожалуйста, выберите преподавателя и укажите причину замены', 'error');
      return;
    }

    setIsReplacing(true);
    try {
      await AuthenticatedApiService.replaceTeacher(lessonId, selectedTeacherId, replaceReason);
      
      showToast('Преподаватель успешно заменен', 'success');
      
      if (onUpdate) {
        onUpdate();
      }
      
      handleClose();
    } catch (error) {
      console.error('Error replacing teacher:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Ошибка при замене преподавателя';
      showToast(errorMessage, 'error');
    } finally {
      setIsReplacing(false);
    }
  };

  const handleClose = () => {
    setSelectedTeacherId('');
    setReplaceReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Замена преподавателя
        </h3>
        
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Текущий преподаватель:</strong> {currentTeacherName}
          </p>
        </div>
        
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Новый преподаватель <span className="text-red-500">*</span>
            </label>
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-gray-500 dark:text-gray-400">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Загрузка преподавателей...
              </div>
            ) : teachers.length === 0 ? (
              <div className="p-3 text-amber-700 dark:text-amber-300 text-center bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <strong>Нет доступных преподавателей</strong>
                </div>
                <p className="text-sm">
                  Все остальные преподаватели уже заняты или недоступны для замены
                </p>
              </div>
            ) : (
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Выберите преподавателя</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Причина замены <span className="text-red-500">*</span>
            </label>
            <textarea
              value={replaceReason}
              onChange={(e) => setReplaceReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Укажите причину замены преподавателя..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isReplacing}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleReplaceTeacher}
            disabled={isReplacing || !selectedTeacherId || !replaceReason.trim() || teachers.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isReplacing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Заменяем...
              </>
            ) : (
              'Подтвердить замену'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}