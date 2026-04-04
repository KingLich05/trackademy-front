export enum SettingType {
  String = 1,
  Integer = 2,
  Decimal = 3,
  Boolean = 4,
  Json = 5,
}

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

export const SETTING_GROUPS: Record<string, { title: string }> = {
  general:       { title: 'Общие' },
  schedule:      { title: 'Расписание' },
  attendance:    { title: 'Посещаемость' },
  finance:       { title: 'Финансы' },
  scores:        { title: 'Оценки' },
  crm:           { title: 'CRM / Воронка' },
  qr:            { title: 'QR-регистрация' },
  notifications: { title: 'Уведомления' },
};

export const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
];
