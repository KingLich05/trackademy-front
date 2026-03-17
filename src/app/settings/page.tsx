'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { StudentFlag, CreateStudentFlagRequest } from '../../types/StudentFlag';
import { OrganizationDetail } from '../../types/Organization';
import { CogIcon, BuildingOfficeIcon, ChevronRightIcon, FlagIcon, PlusIcon, PencilIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { RewardRuleDto, RewardEventType, CreateRewardRuleRequest, UpdateRewardRuleRequest } from '../../types/Market';
import { BaseModal } from '../../components/ui/BaseModal';

export default function SettingsPage() {
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [studentFlags, setStudentFlags] = useState<StudentFlag[]>([]);
  const [isLoadingFlags, setIsLoadingFlags] = useState(false);
  const [showCreateFlagModal, setShowCreateFlagModal] = useState(false);
  const [showEditFlagModal, setShowEditFlagModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<StudentFlag | null>(null);
  const [flagName, setFlagName] = useState('');
  const [organizationData, setOrganizationData] = useState<OrganizationDetail | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);

  // Reward Rules state
  const [rewardRules, setRewardRules] = useState<RewardRuleDto[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRuleDto | null>(null);
  const [ruleForm, setRuleForm] = useState({ name: '', eventType: RewardEventType.AttendanceMarked as RewardEventType, coinAmount: 5, minScore: '', isActive: true });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Проверяем что пользователь администратор или владелец
    if (user?.role !== 'Administrator' && user?.role !== 'Owner') {
      router.push('/');
      return;
    }

    if (activeTab === 'student-flags') {
      loadStudentFlags();
    } else if (activeTab === 'organization') {
      loadOrganizationData();
    } else if (activeTab === 'reward-rules') {
      loadRewardRules();
    }
  }, [isAuthenticated, user, router, activeTab]);

  const loadOrganizationData = async () => {
    if (!user?.organizationId) {
      showError('Организация не найдена');
      return;
    }

    try {
      setIsLoadingOrganization(true);
      const orgData = await AuthenticatedApiService.getOrganizationById(user.organizationId);
      setOrganizationData(orgData);
    } catch (error) {
      console.error('Error loading organization data:', error);
      showError('Ошибка при загрузке данных организации');
    } finally {
      setIsLoadingOrganization(false);
    }
  };

  const loadStudentFlags = async () => {
    try {
      setIsLoadingFlags(true);
      const flags = await AuthenticatedApiService.getStudentFlags();
      setStudentFlags(flags);
    } catch (error) {
      console.error('Error loading student flags:', error);
      showError('Ошибка при загрузке флагов студентов');
    } finally {
      setIsLoadingFlags(false);
    }
  };

  const handleCreateFlag = async () => {
    if (!flagName.trim()) {
      showError('Введите название флага');
      return;
    }

    try {
      await AuthenticatedApiService.createStudentFlag({ name: flagName.trim() });
      showSuccess('Флаг успешно создан');
      setShowCreateFlagModal(false);
      setFlagName('');
      loadStudentFlags();
    } catch (error) {
      console.error('Error creating flag:', error);
      showError('Ошибка при создании флага');
    }
  };

  const handleEditFlag = async () => {
    if (!editingFlag || !flagName.trim()) {
      showError('Введите название флага');
      return;
    }

    try {
      await AuthenticatedApiService.updateStudentFlag(editingFlag.id, {
        id: editingFlag.id,
        name: flagName.trim()
      });
      showSuccess('Флаг успешно обновлен');
      setShowEditFlagModal(false);
      setEditingFlag(null);
      setFlagName('');
      loadStudentFlags();
    } catch (error) {
      console.error('Error updating flag:', error);
      showError('Ошибка при обновлении флага');
    }
  };

  const handleDeleteFlag = async (flag: StudentFlag) => {
    if (!confirm(`Вы уверены, что хотите удалить флаг "${flag.name}"?`)) {
      return;
    }

    try {
      await AuthenticatedApiService.deleteStudentFlag(flag.id);
      showSuccess('Флаг успешно удален');
      loadStudentFlags();
    } catch (error) {
      console.error('Error deleting flag:', error);
      showError('Ошибка при удалении флага');
    }
  };

  const loadRewardRules = async () => {
    const orgId = user?.organizationId || localStorage.getItem('userOrganizationId') || '';
    if (!orgId) return;
    try {
      setIsLoadingRules(true);
      const rules = await AuthenticatedApiService.getRewardRules(orgId);
      setRewardRules(rules);
    } catch (error) {
      console.error('Error loading reward rules:', error);
      showError('Ошибка при загрузке правил начисления');
    } finally {
      setIsLoadingRules(false);
    }
  };

  const handleCreateRule = async () => {
    const orgId = user?.organizationId || localStorage.getItem('userOrganizationId') || '';
    if (!ruleForm.name.trim() || !ruleForm.coinAmount) { showError('Заполните обязательные поля'); return; }
    try {
      const minScore = ruleForm.minScore !== '' ? Number(ruleForm.minScore) : null;
      await AuthenticatedApiService.createRewardRule({
        organizationId: orgId,
        name: ruleForm.name.trim(),
        eventType: Number(ruleForm.eventType) as RewardEventType,
        coinAmount: Number(ruleForm.coinAmount),
        minScore,
      });
      showSuccess('Правило создано');
      setShowCreateRuleModal(false);
      setRuleForm({ name: '', eventType: RewardEventType.AttendanceMarked, coinAmount: 5, minScore: '', isActive: true });
      loadRewardRules();
    } catch (error) {
      console.error('Error creating rule:', error);
      showError('Ошибка при создании правила');
    }
  };

  const handleEditRule = async () => {
    if (!editingRule || !ruleForm.name.trim()) { showError('Заполните обязательные поля'); return; }
    try {
      const minScore = ruleForm.minScore !== '' ? Number(ruleForm.minScore) : null;
      await AuthenticatedApiService.updateRewardRule(editingRule.id, {
        name: ruleForm.name.trim(),
        coinAmount: Number(ruleForm.coinAmount),
        minScore,
        isActive: ruleForm.isActive,
      });
      showSuccess('Правило обновлено');
      setShowEditRuleModal(false);
      setEditingRule(null);
      setRuleForm({ name: '', eventType: RewardEventType.AttendanceMarked, coinAmount: 5, minScore: '', isActive: true });
      loadRewardRules();
    } catch (error) {
      console.error('Error updating rule:', error);
      showError('Ошибка при обновлении правила');
    }
  };

  const handleDeleteRule = async (rule: RewardRuleDto) => {
    if (!confirm(`Удалить правило "${rule.name}"?`)) return;
    try {
      await AuthenticatedApiService.deleteRewardRule(rule.id);
      showSuccess('Правило удалено');
      loadRewardRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      showError('Ошибка при удалении правила');
    }
  };

  const openEditRuleModal = (rule: RewardRuleDto) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      eventType: rule.eventType,
      coinAmount: rule.coinAmount,
      minScore: rule.minScore !== null ? String(rule.minScore) : '',
      isActive: rule.isActive,
    });
    setShowEditRuleModal(true);
  };

  function eventLabel(t: RewardEventType) {
    switch (t) {
      case RewardEventType.AttendanceMarked: return 'Посещение урока';
      case RewardEventType.ScoreReceived: return 'Получение оценки';
      case RewardEventType.SubmissionCompleted: return 'Сдача задания';
      case RewardEventType.BonusManual: return 'Ручное начисление';
      default: return 'Неизвестно';
    }
  }

  const openEditModal = (flag: StudentFlag) => {
    setEditingFlag(flag);
    setFlagName(flag.name);
    setShowEditFlagModal(true);
  };

  const tabs = [
    {
      id: 'general',
      label: 'Общие настройки',
      icon: CogIcon,
      description: 'Основные параметры системы'
    },
    {
      id: 'organization',
      label: 'Организация',
      icon: BuildingOfficeIcon,
      description: 'Настройки организации и брендинга'
    },
    {
      id: 'student-flags',
      label: 'Флаги студентов',
      icon: FlagIcon,
      description: 'Управление флагами и метками'
    },
    {
      id: 'reward-rules',
      label: 'Правила маркета',
      icon: SparklesIcon,
      description: 'Начисление монет за действия'
    }
  ];

  if (!isAuthenticated || (user?.role !== 'Administrator' && user?.role !== 'Owner')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 page-container">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-md">
              <div className="text-red-500 text-4xl mb-4">
                🚫
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Доступ запрещен
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Настройки доступны только администраторам
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-container max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CogIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Настройки системы
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Управление основными параметрами и конфигурацией системы
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar с вкладками */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">Разделы</h2>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 mb-1 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">{tab.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tab.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Основной контент */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {activeTab === 'general' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Общие настройки
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Основные параметры работы системы
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Пример настройки */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Автоматические уведомления
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Включить автоматическую отправку уведомлений пользователям
                      </p>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Максимальный размер файла
                      </h4>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          defaultValue="10"
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-600 dark:text-gray-400">МБ</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Максимальный размер загружаемых файлов
                      </p>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Часовой пояс по умолчанию
                      </h4>
                      <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500">
                        <option value="UTC+6">UTC+6 (Алматы)</option>
                        <option value="UTC+3">UTC+3 (Москва)</option>
                        <option value="UTC+0">UTC+0 (GMT)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'organization' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Настройки организации
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Информация об организации и брендинг
                    </p>
                  </div>

                  {isLoadingOrganization ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">Загрузка данных организации...</p>
                    </div>
                  ) : organizationData ? (
                    <div className="space-y-6">
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Название организации
                        </h4>
                        <input
                          type="text"
                          value={organizationData.name}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                        />
                      </div>

                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Контактная информация
                        </h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Телефон
                          </label>
                          <input
                            type="text"
                            value={organizationData.phone || ''}
                            readOnly
                            placeholder="Не указан"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Адрес
                        </h4>
                        <textarea
                          rows={3}
                          value={organizationData.address || ''}
                          readOnly
                          placeholder="Не указан"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-gray-600 dark:text-gray-400">Не удалось загрузить данные организации</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'student-flags' && (
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Флаги студентов
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Управление системой флагов и меток для студентов
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setFlagName('');
                          setShowCreateFlagModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Добавить флаг
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Список существующих флагов */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Активные флаги ({studentFlags.length})
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Управляйте флагами, доступными для назначения студентам
                        </p>
                      </div>
                      
                      {isLoadingFlags ? (
                        <div className="p-8 text-center">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <p className="text-gray-600 dark:text-gray-400 mt-2">Загрузка флагов...</p>
                        </div>
                      ) : studentFlags.length > 0 ? (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {studentFlags.map((flag) => (
                            <div key={flag.id} className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                                <div>
                                  <h5 className="font-medium text-gray-900 dark:text-white">{flag.name}</h5>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Активных пользователей: {flag.activeUsersCount}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>
                                  {flag.name}
                                </span>
                                <button 
                                  onClick={() => openEditModal(flag)}
                                  className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteFlag(flag)}
                                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <FlagIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">
                            Флаги не найдены
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            Создайте первый флаг для студентов
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Настройки флагов */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Настройки системы флагов
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              Автоматическое назначение флагов
                            </h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Автоматически назначать флаги на основе поведения студентов
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              Показывать флаги в списке студентов
                            </h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Отображать флаги рядом с именами студентов
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reward-rules' && (
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Правила маркета
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Автоматическое начисление монет студентам за действия в системе
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setRuleForm({ name: '', eventType: RewardEventType.AttendanceMarked, coinAmount: 5, minScore: '', isActive: true });
                          setShowCreateRuleModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Добавить правило
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Активные правила ({rewardRules.length})
                      </h4>
                    </div>
                    {isLoadingRules ? (
                      <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Загрузка правил...</p>
                      </div>
                    ) : rewardRules.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {rewardRules.map((rule) => (
                          <div key={rule.id} className="p-4 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h5 className="font-medium text-gray-900 dark:text-white">{rule.name}</h5>
                                {!rule.isActive && (
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">Отключено</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <span>{eventLabel(rule.eventType)}</span>
                                {rule.minScore !== null && <span>Мин. оценка: {rule.minScore}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-sm">
                                <SparklesIcon className="w-4 h-4" />+{rule.coinAmount}
                              </span>
                              <button
                                onClick={() => openEditRuleModal(rule)}
                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule)}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400">Правил пока нет</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          Создайте первое правило начисления монет
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Кнопки сохранения */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                <div className="flex justify-end gap-3">
                  <button className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Отменить
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Сохранить изменения
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal для создания флага */}
      <BaseModal
        isOpen={showCreateFlagModal}
        onClose={() => {
          setShowCreateFlagModal(false);
          setFlagName('');
        }}
        title="Создать новый флаг"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название флага
            </label>
            <input
              type="text"
              value={flagName}
              onChange={(e) => setFlagName(e.target.value)}
              placeholder="Введите название флага"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowCreateFlagModal(false);
                setFlagName('');
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={handleCreateFlag}
              disabled={!flagName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Создать флаг
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal для редактирования флага */}
      <BaseModal
        isOpen={showEditFlagModal}
        onClose={() => {
          setShowEditFlagModal(false);
          setEditingFlag(null);
          setFlagName('');
        }}
        title="Редактировать флаг"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название флага
            </label>
            <input
              type="text"
              value={flagName}
              onChange={(e) => setFlagName(e.target.value)}
              placeholder="Введите название флага"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowEditFlagModal(false);
                setEditingFlag(null);
                setFlagName('');
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={handleEditFlag}
              disabled={!flagName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Сохранить изменения
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal для создания правила маркета */}
      <BaseModal
        isOpen={showCreateRuleModal}
        onClose={() => {
          setShowCreateRuleModal(false);
          setRuleForm({ name: '', eventType: RewardEventType.AttendanceMarked, coinAmount: 5, minScore: '', isActive: true });
        }}
        title="Создать правило начисления монет"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ruleForm.name}
              onChange={e => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Например: Посещение занятия"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Событие <span className="text-red-500">*</span>
            </label>
            <select
              value={ruleForm.eventType}
              onChange={e => setRuleForm(prev => ({ ...prev, eventType: Number(e.target.value) as RewardEventType }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
            >
              <option value={RewardEventType.AttendanceMarked}>Посещение урока</option>
              <option value={RewardEventType.ScoreReceived}>Получение оценки</option>
              <option value={RewardEventType.SubmissionCompleted}>Сдача задания</option>
              <option value={RewardEventType.BonusManual}>Ручное начисление</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Количество монет <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={ruleForm.coinAmount}
              onChange={e => setRuleForm(prev => ({ ...prev, coinAmount: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          {ruleForm.eventType === RewardEventType.ScoreReceived && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Минимальная оценка (необязательно)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={ruleForm.minScore}
                onChange={e => setRuleForm(prev => ({ ...prev, minScore: e.target.value }))}
                placeholder="Оставьте пустым для любой оценки"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowCreateRuleModal(false);
                setRuleForm({ name: '', eventType: RewardEventType.AttendanceMarked, coinAmount: 5, minScore: '', isActive: true });
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={handleCreateRule}
              disabled={!ruleForm.name.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Создать правило
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal для редактирования правила маркета */}
      <BaseModal
        isOpen={showEditRuleModal}
        onClose={() => {
          setShowEditRuleModal(false);
          setEditingRule(null);
          setRuleForm({ name: '', eventType: RewardEventType.AttendanceMarked, coinAmount: 5, minScore: '', isActive: true });
        }}
        title="Редактировать правило"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ruleForm.name}
              onChange={e => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Количество монет <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={ruleForm.coinAmount}
              onChange={e => setRuleForm(prev => ({ ...prev, coinAmount: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          {editingRule?.eventType === RewardEventType.ScoreReceived && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Минимальная оценка (необязательно)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={ruleForm.minScore}
                onChange={e => setRuleForm(prev => ({ ...prev, minScore: e.target.value }))}
                placeholder="Оставьте пустым для любой оценки"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ruleForm.isActive}
                onChange={e => setRuleForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">Активно</span>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowEditRuleModal(false);
                setEditingRule(null);
                setRuleForm({ name: '', eventType: RewardEventType.AttendanceMarked, coinAmount: 5, minScore: '', isActive: true });
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={handleEditRule}
              disabled={!ruleForm.name.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Сохранить изменения
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}