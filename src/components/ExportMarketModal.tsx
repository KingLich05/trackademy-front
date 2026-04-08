'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { DateRangePicker } from './ui/DateRangePicker';
import { Group } from '@/types/Group';

export interface ExportMarketParams {
  startDate?: string;
  endDate?: string;
  groupIds?: string[];
  statuses?: number[];
}

const PURCHASE_STATUSES = [
  { value: 1, label: 'Ожидает выдачи' },
  { value: 2, label: 'Выдан / выполнен' },
  { value: 3, label: 'Отменён' },
];

interface ExportMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (params: ExportMarketParams) => void;
  groups: Group[];
  isExporting?: boolean;
}

export function ExportMarketModal({
  isOpen,
  onClose,
  onExport,
  groups,
  isExporting = false,
}: ExportMarketModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStartDate('');
      setEndDate('');
      setSelectedGroups([]);
      setSelectedStatuses([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    const params: ExportMarketParams = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (selectedGroups.length > 0) params.groupIds = selectedGroups;
    if (selectedStatuses.length > 0) params.statuses = selectedStatuses;
    onExport(params);
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const toggleStatus = (value: number) => {
    setSelectedStatuses(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <DocumentArrowDownIcon className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Экспорт маркета</h2>
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
          {/* Date range */}
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

          {/* Statuses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Статус покупок
            </label>
            <div className="flex flex-wrap gap-4">
              {PURCHASE_STATUSES.map(s => (
                <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(s.value)}
                    onChange={() => toggleStatus(s.value)}
                    disabled={isExporting}
                    className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{s.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Оставьте пустым для всех статусов
            </p>
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
                  onClick={() => setSelectedGroups(groups.map(g => g.id))}
                  disabled={isExporting}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                >
                  Выбрать все
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroups([])}
                  disabled={isExporting}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50"
                >
                  Очистить
                </button>
              </div>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Нет доступных групп
                </p>
              ) : (
                <div className="space-y-1">
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
                        className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-900 dark:text-white flex-1">
                        {group.name}{' '}
                        <span className="text-gray-500 dark:text-gray-400">({group.code})</span>
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
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Примечание:</strong> Будет экспортирована статистика покупок в маркете.
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
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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
