export enum SettingType {
  String = 1,
  Integer = 2,
  Decimal = 3,
  Boolean = 4,
  Json = 5,
}

export type AllowedSettingKey =
  | 'attendance.allow_backdate'
  | 'attendance.backdate_limit_days'
  | 'qr.allow_trial_registration'
  | 'scores.allow_edit_after_grading'
  | 'notifications.on_absent'
  | 'notifications.on_low_balance'
  | 'attendance.auto_charge'
  | 'org.holidays';

export interface SettingDto {
  id: string;
  key: string;
  type: SettingType;
  value: unknown;
  updatedAt: string;
}

export interface SettingDefinition {
  key: string;
  type: SettingType;
  label: string;
  description?: string;
  defaultValue: unknown;
  group?: string;
}

export interface UpsertSettingRequest {
  key: string;
  type: SettingType;
  value: unknown;
}

export interface BulkUpsertSettingsRequest {
  settings: UpsertSettingRequest[];
}

export interface SettingsForm {
  attendanceAllowBackdate: boolean;
  attendanceBackdateLimitDays: number;
  qrAllowTrialRegistration: boolean;
  scoresAllowEditAfterGrading: boolean;
  notificationsOnAbsent: boolean;
  notificationsOnLowBalance: boolean;
  attendanceAutoCharge: boolean;
  orgHolidays: string[];
}

export const DEFAULT_SETTINGS_FORM: SettingsForm = {
  attendanceAllowBackdate: false,
  attendanceBackdateLimitDays: 0,
  qrAllowTrialRegistration: true,
  scoresAllowEditAfterGrading: true,
  notificationsOnAbsent: true,
  notificationsOnLowBalance: true,
  attendanceAutoCharge: true,
  orgHolidays: [],
};

export function mapSettingsToForm(settings: SettingDto[]): SettingsForm {
  const byKey = Object.fromEntries(settings.map(item => [item.key, item.value]));
  return {
    attendanceAllowBackdate: Boolean(byKey['attendance.allow_backdate'] ?? false),
    attendanceBackdateLimitDays: Number(byKey['attendance.backdate_limit_days'] ?? 0),
    qrAllowTrialRegistration: Boolean(byKey['qr.allow_trial_registration'] ?? true),
    scoresAllowEditAfterGrading: Boolean(byKey['scores.allow_edit_after_grading'] ?? true),
    notificationsOnAbsent: Boolean(byKey['notifications.on_absent'] ?? true),
    notificationsOnLowBalance: Boolean(byKey['notifications.on_low_balance'] ?? true),
    attendanceAutoCharge: Boolean(byKey['attendance.auto_charge'] ?? true),
    orgHolidays: Array.isArray(byKey['org.holidays']) ? (byKey['org.holidays'] as string[]) : [],
  };
}

export function mapFormToSettings(form: SettingsForm): UpsertSettingRequest[] {
  return [
    { key: 'attendance.allow_backdate', type: SettingType.Boolean, value: form.attendanceAllowBackdate },
    { key: 'attendance.backdate_limit_days', type: SettingType.Integer, value: form.attendanceBackdateLimitDays },
    { key: 'qr.allow_trial_registration', type: SettingType.Boolean, value: form.qrAllowTrialRegistration },
    { key: 'scores.allow_edit_after_grading', type: SettingType.Boolean, value: form.scoresAllowEditAfterGrading },
    { key: 'notifications.on_absent', type: SettingType.Boolean, value: form.notificationsOnAbsent },
    { key: 'notifications.on_low_balance', type: SettingType.Boolean, value: form.notificationsOnLowBalance },
    { key: 'attendance.auto_charge', type: SettingType.Boolean, value: form.attendanceAutoCharge },
    { key: 'org.holidays', type: SettingType.Json, value: form.orgHolidays },
  ];
}
