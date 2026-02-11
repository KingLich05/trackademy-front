'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { DateRangePicker } from './ui/DateRangePicker';
import { Group } from '@/types/Group';

interface ExportPaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (params: ExportPaymentsParams) => void;
  groups: Group[];
  isExporting?: boolean;
}

export interface ExportPaymentsParams {
  startDate?: string;
  endDate?: string;
  groupIds?: string[];
  paymentType?: number;
}

const PAYMENT_TYPES = [
  { value: 1, label: 'Пополнение баланса' },
  { value: 2, label: 'Списание за урок' },
  { value: 3, label: 'Возврат средств' },
  { value: 4, label: 'Отмена операции' },
  { value: 5, label: 'Административная корректировка' },
  { value: 6, label: 'Перенос между группами' }
];

export function ExportPaymentsModal({ isOpen, onClose, onExport, groups, isExporting = false }: ExportPaymentsModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [paymentType, setPaymentType] = useState<number | undefined>(undefined);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartDate('');
      setEndDate('');
      setSelectedGroups([]);
      setPaymentType(undefined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    const params: ExportPaymentsParams = {};
    
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (selectedGroups.length > 0) params.groupIds = selectedGroups;
    if (paymentType) params.paymentType = paymentType;

    onExport(params);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const selectAllGroups = () => {
    setSelectedGroups(groups.map(g => g.id));
  };

  const clearAllGroups = () => {
    setSelectedGroups([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <DocumentArrowDownIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Экспорт платежей
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Период
            </label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={(start, end) => {
                setStartDate(start || '');
                setEndDate(end || '');
              }}
              placeholder="Выберите период"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Оставьте пустым для экспорта всех данных
            </p>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Тип операции
            </label>
            <select
              value={paymentType || ''}
              onChange={(e) => setPaymentType(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              disabled={isExporting}
            >
              <option value="">Все типы операций</option>
              {PAYMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Groups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Группы
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllGroups}
                  disabled={isExporting}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  Выбрать все
                </button>
                <button
                  type="button"
                  onClick={clearAllGroups}
                  disabled={isExporting}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50"
                >
                  Очистить
                </button>
              </div>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Нет доступных групп
                </p>
              ) : (
                <div className="space-y-2">
                  {groups.map(group => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        disabled={isExporting}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-900 dark:text-white flex-1">
                        {group.name} <span className="text-gray-500 dark:text-gray-400">({group.code})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Оставьте пустым для экспорта всех групп
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Примечание:</strong> Будут экспортированы все платежи, соответствующие выбранным фильтрам. 
              Файл будет скачан в формате Excel (.xlsx).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Экспорт...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-5 w-5" />
                Экспортировать
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
