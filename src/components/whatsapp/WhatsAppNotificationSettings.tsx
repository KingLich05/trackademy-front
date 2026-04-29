'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { WhatsAppApiService } from '../../services/WhatsAppApiService';
import {
  UserNotificationSettings,
  OrganizationNotificationSettings,
  UserNotificationSettingsUpdateRequest,
  OrganizationNotificationSettingsUpdateRequest,
  LANGUAGES,
} from '../../types/WhatsApp';

// ─── Toggle component ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">{title}</h4>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
    </div>
  );
}

// ─── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── User Notification Settings tab ───────────────────────────────────────────

function UserSettingsTab({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<UserNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await WhatsAppApiService.getUserNotificationSettings(user.id, orgId);
      setSettings(data);
    } catch {
      showError('Ошибка загрузки настроек пользователя');
    } finally {
      setLoading(false);
    }
  }, [user?.id, orgId, showError]);

  useEffect(() => { load(); }, [load]);

  const update = <K extends keyof UserNotificationSettings>(key: K, value: UserNotificationSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (!settings || !user?.id) return;
    try {
      setSaving(true);
      const payload: UserNotificationSettingsUpdateRequest = {
        whatsAppEnabled: settings.whatsAppEnabled,
        emailEnabled: settings.emailEnabled,
        smsEnabled: settings.smsEnabled,
        preferredLanguage: settings.preferredLanguage,
        receivePasswordNotifications: settings.receivePasswordNotifications,
        receiveAttendanceNotifications: settings.receiveAttendanceNotifications,
        receiveBalanceNotifications: settings.receiveBalanceNotifications,
        receivePaymentNotifications: settings.receivePaymentNotifications,
        receiveTrialLessonNotifications: settings.receiveTrialLessonNotifications,
        receiveUserCreationNotifications: settings.receiveUserCreationNotifications,
        receiveLessonCancellationNotifications: settings.receiveLessonCancellationNotifications,
        receiveLessonMovedNotifications: settings.receiveLessonMovedNotifications,
        receiveBirthdayNotification: settings.receiveBirthdayNotification,
        parentPhoneEnabled: settings.parentPhoneEnabled,
        parentPhone: settings.parentPhone,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
      };
      await WhatsAppApiService.updateUserNotificationSettings(user.id, orgId, payload);
      showSuccess('Настройки сохранены');
    } catch {
      showError('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Настройки пользователя не найдены
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Language */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <SectionHeader title="Язык уведомлений" />
        <select
          value={settings.preferredLanguage}
          onChange={e => update('preferredLanguage', Number(e.target.value))}
          className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.displayName}</option>
          ))}
        </select>
      </div>

      {/* Notification types */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <SectionHeader title="Типы уведомлений" description="Настройте какие события присылать" />
        <ToggleRow label="Сброс / изменение пароля" checked={settings.receivePasswordNotifications} onChange={v => update('receivePasswordNotifications', v)} />
        <ToggleRow label="Посещаемость" description="Уведомления об отсутствии на уроке" checked={settings.receiveAttendanceNotifications} onChange={v => update('receiveAttendanceNotifications', v)} />
        <ToggleRow label="Баланс" description="Низкий или отрицательный баланс" checked={settings.receiveBalanceNotifications} onChange={v => update('receiveBalanceNotifications', v)} />
        <ToggleRow label="Платежи" checked={settings.receivePaymentNotifications} onChange={v => update('receivePaymentNotifications', v)} />
        <ToggleRow label="Пробные уроки" checked={settings.receiveTrialLessonNotifications} onChange={v => update('receiveTrialLessonNotifications', v)} />
        <ToggleRow label="Создание пользователя" description="Уведомление при создании аккаунта" checked={settings.receiveUserCreationNotifications} onChange={v => update('receiveUserCreationNotifications', v)} />
        <ToggleRow label="Отмена урока" checked={settings.receiveLessonCancellationNotifications} onChange={v => update('receiveLessonCancellationNotifications', v)} />
        <ToggleRow label="Перенос урока" checked={settings.receiveLessonMovedNotifications} onChange={v => update('receiveLessonMovedNotifications', v)} />
        <ToggleRow label="День рождения" description="Поздравление в день рождения" checked={settings.receiveBirthdayNotification} onChange={v => update('receiveBirthdayNotification', v)} />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

// ─── Organization Notification Settings tab ────────────────────────────────────

function OrgSettingsTab({ orgId }: { orgId: string }) {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<OrganizationNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await WhatsAppApiService.getOrganizationNotificationSettings(orgId);
      setSettings(data);
    } catch {
      showError('Ошибка загрузки настроек организации');
    } finally {
      setLoading(false);
    }
  }, [orgId, showError]);

  useEffect(() => { load(); }, [load]);

  const update = <K extends keyof OrganizationNotificationSettings>(key: K, value: OrganizationNotificationSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const payload: OrganizationNotificationSettingsUpdateRequest = {
        whatsAppEnabled: settings.whatsAppEnabled,
        emailEnabled: settings.emailEnabled,
        smsEnabled: settings.smsEnabled,
        attendanceCheckDelayMinutes: settings.attendanceCheckDelayMinutes,
        notifyTeacherOnMissed: settings.notifyTeacherOnMissed,
        notifyOnBirthdays: settings.notifyOnBirthdays,
        notifyTrialStudents: settings.notifyTrialStudents,
        balanceLowThreshold: settings.balanceLowThreshold,
        notifyOnNegativeBalance: settings.notifyOnNegativeBalance,
        balanceCheckFrequencyHours: settings.balanceCheckFrequencyHours,
        allowNightNotifications: settings.allowNightNotifications,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
      };
      await WhatsAppApiService.updateOrganizationNotificationSettings(orgId, payload);
      showSuccess('Настройки организации сохранены');
    } catch {
      showError('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Настройки организации не найдены
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attendance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <SectionHeader title="Посещаемость" />
        <ToggleRow label="Уведомлять преподавателя об отсутствующих" checked={settings.notifyTeacherOnMissed} onChange={v => update('notifyTeacherOnMissed', v)} />
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Задержка проверки посещаемости (минуты)
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={settings.attendanceCheckDelayMinutes}
            onChange={e => update('attendanceCheckDelayMinutes', Number(e.target.value))}
            className="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Other notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <SectionHeader title="Прочие уведомления организации" />
        <ToggleRow label="Дни рождения студентов" description="Отправлять поздравления в день рождения" checked={settings.notifyOnBirthdays} onChange={v => update('notifyOnBirthdays', v)} />
        <ToggleRow label="Пробные студенты" description="Уведомлять о пробных уроках" checked={settings.notifyTrialStudents} onChange={v => update('notifyTrialStudents', v)} />
        <ToggleRow label="Отрицательный баланс" checked={settings.notifyOnNegativeBalance} onChange={v => update('notifyOnNegativeBalance', v)} />
      </div>

      {/* Balance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <SectionHeader title="Настройки баланса" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Порог низкого баланса (уроки)
            </label>
            <input
              type="number"
              min={0}
              value={settings.balanceLowThreshold}
              onChange={e => update('balanceLowThreshold', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const SUB_TABS = [
  { id: 'user', label: 'Мои настройки' },
  { id: 'org', label: 'Настройки организации' },
];

export default function WhatsAppNotificationSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'org'>('user');
  const orgId = user?.organizationId ?? '';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Настройки уведомлений</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Управляйте параметрами уведомлений для пользователя и всей организации
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'user' | 'org')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'user' && <UserSettingsTab orgId={orgId} />}
      {activeTab === 'org' && <OrgSettingsTab orgId={orgId} />}
    </div>
  );
}
