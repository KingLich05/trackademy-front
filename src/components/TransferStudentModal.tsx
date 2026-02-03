'use client';

import React, { useState, useEffect } from 'react';
import { BaseModal } from './ui/BaseModal';
import { ArrowRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Group } from '../types/Group';

interface TransferStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  currentGroupName: string;
  availableGroups: Group[];
  onConfirm: (toGroupId: string, comment: string, transferBalance: boolean, keepDiscount: boolean) => void;
  loading?: boolean;
}

export const TransferStudentModal: React.FC<TransferStudentModalProps> = ({
  isOpen,
  onClose,
  studentName,
  currentGroupName,
  availableGroups,
  onConfirm,
  loading = false
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [comment, setComment] = useState('');
  const [transferBalance, setTransferBalance] = useState(true);
  const [keepDiscount, setKeepDiscount] = useState(true);
  const [searchGroup, setSearchGroup] = useState('');
  const [errors, setErrors] = useState<{ group?: string }>({});

  // Фильтрация групп по поиску
  const filteredGroups = availableGroups.filter(group => {
    const subjectName = typeof group.subject === 'object' 
      ? group.subject.subjectName 
      : group.subject || 'Без предмета';
    
    const searchTerm = searchGroup.toLowerCase();
    return (
      group.name.toLowerCase().includes(searchTerm) ||
      group.code.toLowerCase().includes(searchTerm) ||
      subjectName.toLowerCase().includes(searchTerm)
    );
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedGroupId('');
      setComment('');
      setTransferBalance(true);
      setKeepDiscount(true);
      setSearchGroup('');
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: { group?: string } = {};

    if (!selectedGroupId) {
      newErrors.group = 'Выберите группу для перевода';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onConfirm(selectedGroupId, comment.trim(), transferBalance, keepDiscount);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Перевод студента"
      subtitle={`Перевод студента: ${studentName}`}
      icon={<ArrowRightIcon className="w-5 h-5 text-indigo-500" />}
      gradientFrom="from-indigo-500"
      gradientTo="to-purple-600"
      maxWidth="lg"
    >
      <div className="p-6 space-y-6">
        {/* Info Section */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-800/50 rounded-lg">
              <ArrowRightIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Информация о переводе</h4>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Студент:</span>
              <span className="font-medium text-gray-900 dark:text-white">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Текущая группа:</span>
              <span className="font-medium text-gray-900 dark:text-white">{currentGroupName}</span>
            </div>
          </div>
        </div>

        {/* Target Group Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Целевая группа <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Найдено: {filteredGroups.length}
            </span>
          </div>
          
          {/* Search Input */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={searchGroup}
              onChange={(e) => setSearchGroup(e.target.value)}
              placeholder="Поиск по названию, коду или предмету..."
              disabled={loading}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Groups List */}
          <div className={`border rounded-lg max-h-48 overflow-y-auto ${
            errors.group
              ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          }`}>
            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                {searchGroup ? 'Группы не найдены' : 'Нет доступных групп'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredGroups.map((group) => {
                  const subjectName = typeof group.subject === 'object' 
                    ? group.subject.subjectName 
                    : group.subject || 'Без предмета';
                  
                  const isSelected = selectedGroupId === group.id;
                  
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        if (errors.group) {
                          setErrors(prev => ({ ...prev, group: undefined }));
                        }
                      }}
                      disabled={loading}
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500' 
                          : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {group.name} ({group.code})
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {subjectName}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0 ml-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {errors.group && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.group}</p>
          )}
        </div>

        {/* Transfer Options */}
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900 dark:text-white">Настройки перевода</h5>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="transferBalance"
                type="checkbox"
                checked={transferBalance}
                onChange={(e) => setTransferBalance(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="transferBalance" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Перенести баланс в новую группу
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="keepDiscount"
                type="checkbox"
                checked={keepDiscount}
                onChange={(e) => setKeepDiscount(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="keepDiscount" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Сохранить скидку в новой группе
              </label>
            </div>
          </div>
        </div>

        {/* Comment Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Комментарий к переводу
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Укажите причину или дополнительную информацию о переводе..."
            disabled={loading}
            rows={3}
            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Перевод...' : 'Перевести студента'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};