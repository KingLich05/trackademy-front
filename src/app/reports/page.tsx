'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { ExportApiService } from '../../services/ExportApiService';
import { ChartBarIcon, DocumentArrowDownIcon, UserGroupIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { Group } from '../../types/Group';
import { useApiToast } from '../../hooks/useApiToast';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';

export default function ReportsPage() {
  const { user } = useAuth();
  const apiToast = useApiToast();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isGroupExportModalOpen, setIsGroupExportModalOpen] = useState(false);
  const [exportGroupId, setExportGroupId] = useState<string>('');

  useEffect(() => {
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    if (!user?.organizationId) return;
    
    try {
      const response = await AuthenticatedApiService.get<Group[]>(`/Group/organization/${user.organizationId}`);
      setGroups(response);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const exportReports = [
    {
      id: 'users',
      title: 'Экспорт пользователей',
      description: 'Выгрузка всех пользователей организации',
      icon: AcademicCapIcon,
      color: 'blue',
      exportType: 'users' as const,
    },
    {
      id: 'groups',
      title: 'Экспорт групп',
      description: 'Выгрузка данных по группам с участниками',
      icon: UserGroupIcon,
      color: 'green',
      exportType: 'groups' as const,
    }
  ];

  const handleExport = async (exportType: string) => {
    if (exportType === 'groups') {
      setIsGroupExportModalOpen(true);
      return;
    }

    if (!user?.organizationId) {
      console.error('Ошибка получения данных организации');
      return;
    }

    setIsExporting(exportType);

    try {
      let blob: Blob;
      
      switch (exportType) {
        case 'users':
          blob = await ExportApiService.exportUsers();
          ExportApiService.downloadFile(blob, ExportApiService.getExportFilename('users'));
          console.log('Экспорт пользователей завершен');
          break;
        default:
          console.error('Неизвестный тип экспорта');
          return;
      }
    } catch (error) {
      console.error(`Export ${exportType} failed:`, error);
      console.error(`Ошибка при экспорте: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportGroups = async () => {
    if (!user?.organizationId) {
      console.error('Ошибка получения данных организации');
      return;
    }

    setIsExporting('groups');

    try {
      const blob = await ExportApiService.exportGroups();
      ExportApiService.downloadFile(blob, ExportApiService.getExportFilename('groups'));
      console.log('Экспорт групп завершен');
      setIsGroupExportModalOpen(false);
      setExportGroupId('');
    } catch (error) {
      console.error('Export groups failed:', error);
      console.error(`Ошибка при экспорте групп: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleCloseGroupModal = () => {
    setIsGroupExportModalOpen(false);
    setExportGroupId('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 page-container">
      <div className="w-full space-y-6">
        {/* Header */}
        <PageHeaderWithStats
          title="Отчеты"
          subtitle="Экспорт данных и аналитика"
          icon={ChartBarIcon}
          gradientFrom="purple-500"
          gradientTo="pink-600"
          stats={[
            { label: "Доступных отчетов", value: exportReports.length, color: "purple" },
            { label: "Групп", value: groups.length, color: "pink" }
          ]}
        />

        {/* Export Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {exportReports.map((report) => (
            <div
              key={report.id}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className={`p-3 bg-gradient-to-r from-${report.color}-100 to-${report.color}-200 dark:from-${report.color}-900/30 dark:to-${report.color}-800/30 rounded-lg mr-4`}>
                    <report.icon className={`h-6 w-6 text-${report.color}-600 dark:text-${report.color}-400`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {report.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => handleExport(report.exportType)}
                  disabled={isExporting === report.exportType}
                  className={`w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-${report.color}-500 to-${report.color}-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {isExporting === report.exportType ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Экспортируется...
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                      Экспортировать
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group Export Modal */}
      {isGroupExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Экспорт групп
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Выберите группу (необязательно)
                  </label>
                  <select
                    value={exportGroupId}
                    onChange={(e) => setExportGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Все группы</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCloseGroupModal}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleExportGroups}
                  disabled={isExporting === 'groups'}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isExporting === 'groups' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                      Экспорт...
                    </>
                  ) : (
                    'Экспортировать'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
