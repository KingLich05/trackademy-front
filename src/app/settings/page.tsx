'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { StudentFlag, CreateStudentFlagRequest } from '../../types/StudentFlag';
import { CogIcon, ChevronRightIcon, FlagIcon, PlusIcon, PencilIcon, TrashIcon, SparklesIcon, ServerStackIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { RewardRuleDto, RewardEventType, CreateRewardRuleRequest, UpdateRewardRuleRequest } from '../../types/Market';
import { BaseModal } from '../../components/ui/BaseModal';
import { SettingsForm, DEFAULT_SETTINGS_FORM, mapSettingsToForm, mapFormToSettings } from '../../types/Setting';

export default function SettingsPage() {
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('system-settings');
  const [studentFlags, setStudentFlags] = useState<StudentFlag[]>([]);
  const [isLoadingFlags, setIsLoadingFlags] = useState(false);
  const [showCreateFlagModal, setShowCreateFlagModal] = useState(false);
  const [showEditFlagModal, setShowEditFlagModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<StudentFlag | null>(null);
  const [flagName, setFlagName] = useState('');


  // Reward Rules state
  const [rewardRules, setRewardRules] = useState<RewardRuleDto[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRuleDto | null>(null);
  const [ruleForm, setRuleForm] = useState({ name: '', eventType: RewardEventType.AttendanceMarked as RewardEventType, coinAmount: 5, minScore: '', isActive: true });

  // System settings state
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(DEFAULT_SETTINGS_FORM);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isInitializingSettings, setIsInitializingSettings] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');

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
    } else if (activeTab === 'reward-rules') {
      loadRewardRules();
    } else if (activeTab === 'system-settings') {
      loadSystemSettings();
    }
  }, [isAuthenticated, user, router, activeTab]);

  const loadSystemSettings = async () => {
    if (!user?.organizationId) return;
    setIsLoadingSettings(true);
    try {
      const saved = await AuthenticatedApiService.getOrganizationSettings(user.organizationId);
      setSettingsForm(mapSettingsToForm(saved));
      setIsFormDirty(false);
    } catch {
      showError('Ошибка при загрузке настроек');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSettingChange = (key: keyof SettingsForm, value: unknown) => {
    setSettingsForm(prev => ({ ...prev, [key]: value }));
    setIsFormDirty(true);
  };

  const handleSaveSettings = async () => {
    if (!user?.organizationId) return;
    setIsSavingSettings(true);
    try {
      await AuthenticatedApiService.bulkUpsertSettings(user.organizationId, mapFormToSettings(settingsForm));
      showSuccess('Настройки сохранены');
      setIsFormDirty(false);
    } catch {
      showError('Ошибка при сохранении');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!user?.organizationId) return;
    setIsInitializingSettings(true);
    try {
      await AuthenticatedApiService.initializeDefaultSettings(user.organizationId);
      showSuccess('Дефолтные настройки инициализированы');
      await loadSystemSettings();
    } catch {
      showError('Ошибка при инициализации настроек');
    } finally {
      setIsInitializingSettings(false);
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
      await AuthenticatedApiService.createRewardRule(orgId, {
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
    const orgId = user?.organizationId || localStorage.getItem('userOrganizationId') || '';
    if (!editingRule || !ruleForm.name.trim()) { showError('Заполните обязательные поля'); return; }
    try {
      const minScore = ruleForm.minScore !== '' ? Number(ruleForm.minScore) : null;
      await AuthenticatedApiService.updateRewardRule(editingRule.id, orgId, {
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
    const orgId = user?.organizationId || localStorage.getItem('userOrganizationId') || '';
    if (!confirm(`Удалить правило "${rule.name}"?`)) return;
    try {
      await AuthenticatedApiService.deleteRewardRule(rule.id, orgId);
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
      case RewardEventType.Late: return 'Опоздание';
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
      id: 'system-settings',
      label: 'Настройки системы',
      icon: ServerStackIcon,
      description: 'Расписание, посещаемость, финансы'
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
        <div className="relative mb-8 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-950" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDBoNnY2aC02di02em0tNiAwaDZ2NmgtNnYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
          <div className="relative px-8 py-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                  <CogIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-200 text-xs font-medium uppercase tracking-wider">Панель управления</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white leading-tight">
                    Настройки
                  </h1>
                  <p className="text-blue-100/80 text-sm mt-0.5">
                    Управление параметрами и конфигурацией системы
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-white/60 text-xs">Роль</div>
                  <div className="text-white font-semibold text-sm capitalize">{user?.role}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{user?.name?.charAt(0)?.toUpperCase() ?? 'A'}</span>
                </div>
              </div>
            </div>
          </div>
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

              {activeTab === 'system-settings' && (
                <div className="p-6">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Настройки системы</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Расписание, посещаемость, финансы, уведомления и другие параметры</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleInitializeDefaults}
                        disabled={isInitializingSettings || isLoadingSettings}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
                        title="Записать дефолтные значения в базу данных"
                      >
                        {isInitializingSettings ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowPathIcon className="w-4 h-4" />}
                        Инициализировать
                      </button>
                      {isFormDirty && (
                        <button
                          onClick={handleSaveSettings}
                          disabled={isSavingSettings}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          {isSavingSettings ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
                          Сохранить
                        </button>
                      )}
                    </div>
                  </div>

                  {isLoadingSettings ? (
                    <div className="flex justify-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Switch toggles */}
                      {([
                        { key: 'attendanceAllowBackdate' as const, label: 'Отметка посещаемости задним числом', description: 'Разрешить отмечать посещаемость за прошлые даты' },
                        { key: 'qrAllowTrialRegistration' as const, label: 'Пробные и новые студенты', description: 'Разрешить публичную регистрацию через QR-ссылку' },
                        { key: 'scoresAllowEditAfterGrading' as const, label: 'Изменение оценок', description: 'Разрешить редактировать уже выставленные оценки' },
                        { key: 'notificationsOnAbsent' as const, label: 'Уведомления о пропусках', description: 'Отправлять уведомления при пропуске урока' },
                        { key: 'notificationsOnLowBalance' as const, label: 'Финансовые уведомления', description: 'Отправлять уведомления о низком балансе' },
                        { key: 'attendanceAutoCharge' as const, label: 'Платные/бесплатные уроки', description: 'Автоматически списывать баланс при отметке посещаемости' },
                      ] as const).map(({ key, label, description }) => (
                        <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={settingsForm[key]}
                              onChange={e => handleSettingChange(key, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}

                      {/* org.holidays */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <p className="font-medium text-gray-900 dark:text-white text-sm mb-0.5">Выбор праздничных дней</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Уроки не создаются в эти дни. Формат: ГГГГ-ММ-ДД</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {settingsForm.orgHolidays.map(date => (
                            <span key={date} className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                              {date}
                              <button
                                onClick={() => handleSettingChange('orgHolidays', settingsForm.orgHolidays.filter(d => d !== date))}
                                className="text-gray-400 hover:text-red-500 ml-1"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {settingsForm.orgHolidays.length === 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Праздничные дни не добавлены</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={newHolidayDate}
                            onChange={e => setNewHolidayDate(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => {
                              if (!newHolidayDate) return;
                              const next = settingsForm.orgHolidays.includes(newHolidayDate)
                                ? settingsForm.orgHolidays
                                : [...settingsForm.orgHolidays, newHolidayDate].sort();
                              handleSettingChange('orgHolidays', next);
                              setNewHolidayDate('');
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                          >
                            Добавить
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
              <option value={RewardEventType.Late}>Опоздание</option>
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