'use client';

import { useState, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  MagnifyingGlassIcon, 
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppApiService } from '../../services/WhatsAppApiService';
import { WhatsAppLog } from '../../types/WhatsApp';
import { useToast } from '../../contexts/ToastContext';

export default function WhatsAppLogs() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WhatsAppLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    phoneNumber: '',
  });

  // Загрузка логов при монтировании
  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (customFilters?: typeof filters) => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      const activeFilters = customFilters || filters;
      
      const response = await WhatsAppApiService.getLogs(
        user.organizationId,
        activeFilters.fromDate || undefined,
        activeFilters.toDate || undefined
      );
      
      // Фильтрация по номеру телефона на фронте
      let filteredLogs = response;
      if (activeFilters.phoneNumber) {
        filteredLogs = response.filter(log => 
          log.phoneNumber.toLowerCase().includes(activeFilters.phoneNumber.toLowerCase())
        );
      }
      
      setLogs(filteredLogs);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showError('Ошибка загрузки логов: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = (log: WhatsAppLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setSelectedLog(null);
    setIsDetailModalOpen(false);
  };

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    loadLogs(filters);
  };

  const resetFilters = () => {
    const emptyFilters = {
      fromDate: '',
      toDate: '',
      phoneNumber: '',
    };
    setFilters(emptyFilters);
    loadLogs(emptyFilters);
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1: // Pending
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 2: // Sent
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      case 3: // Delivered
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 4: // Failed
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 5: // Skipped
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 2: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 3: return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 4: return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 5: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Сегодняшняя дата в формате YYYY-MM-DD для input[type="date"]
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Дата неделю назад
  const getWeekAgoDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Логи сообщений WhatsApp
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Просмотр истории отправленных WhatsApp сообщений
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Дата от
            </label>
            <div className="relative">
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Дата до
            </label>
            <div className="relative">
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Номер телефона
            </label>
            <div className="relative">
              <input
                type="tel"
                value={filters.phoneNumber}
                onChange={(e) => handleFilterChange('phoneNumber', e.target.value)}
                placeholder="+77777777777"
                className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 
                       rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 
                       focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-all duration-200 transform hover:scale-105 flex-1"
            >
              Поиск
            </button>
            <button
              onClick={resetFilters}
              disabled={loading}
              className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                       border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const newFilters = { ...filters, fromDate: getTodayDate(), toDate: getTodayDate() };
              setFilters(newFilters);
              loadLogs(newFilters);
            }}
            className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 
                     rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Сегодня
          </button>
          <button
            onClick={() => {
              const newFilters = { ...filters, fromDate: getWeekAgoDate(), toDate: getTodayDate() };
              setFilters(newFilters);
              loadLogs(newFilters);
            }}
            className="px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 
                     rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            Последняя неделя
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <ClockIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Нет сообщений
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Логи сообщений появятся здесь после первой отправки
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Дата/Время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Номер телефона
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Тип уведомления
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Попытки
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div className="font-medium">
                          {new Date(log.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString('ru-RU')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {log.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {WhatsAppApiService.getNotificationTypeDisplayName(log.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                          {WhatsAppApiService.getMessageStatusDisplayName(log.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {log.attemptCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openDetailModal(log)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 
                                 transition-colors flex items-center space-x-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Детали</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedLog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
            onClick={closeDetailModal}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all w-full max-w-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                  <h3 className="text-lg font-medium text-white">
                    Детали сообщения
                  </h3>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-6">
                  {/* Основная информация */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Дата создания
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(selectedLog.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Дата отправки
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedLog.sentAt ? new Date(selectedLog.sentAt).toLocaleString('ru-RU') : 'Не отправлено'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Номер телефона
                      </label>
                      <p className="text-sm font-mono text-gray-900 dark:text-white">
                        {selectedLog.phoneNumber}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Тип уведомления
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {WhatsAppApiService.getNotificationTypeDisplayName(selectedLog.type)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Статус
                      </label>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(selectedLog.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedLog.status)}`}>
                          {WhatsAppApiService.getMessageStatusDisplayName(selectedLog.status)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Попытки отправки
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedLog.attemptCount}
                      </p>
                    </div>
                  </div>

                  {/* Внешний ID */}
                  {selectedLog.externalMessageId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Внешний ID сообщения
                      </label>
                      <p className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {selectedLog.externalMessageId}
                      </p>
                    </div>
                  )}

                  {/* Текст сообщения */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Текст сообщения
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {selectedLog.messageText}
                      </p>
                    </div>
                  </div>

                  {/* Ошибка */}
                  {selectedLog.errorMessage && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Сообщение об ошибке
                      </label>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                        <p className="text-sm text-red-700 dark:text-red-400">
                          {selectedLog.errorMessage}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end">
                  <button
                    onClick={closeDetailModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 
                             border border-gray-300 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
          </div>
        </>
      )}
    </div>
  );
}