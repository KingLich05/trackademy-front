export interface ScheduleSlot {
  id: string;
  weekDay: number; // 1=Пн ... 7=Вс
  startTime: string; // "HH:mm:ss"
  endTime: string;   // "HH:mm:ss"
  room?: { id: string; name: string };
}

export interface Schedule {
  id: string;
  scheduleSlots: ScheduleSlot[];
  effectiveFrom: string; // "2025-10-18" format
  effectiveTo: string | null; // null means indefinite
  subject: {
    subjectId: string;
    subjectName: string;
  };
  group: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    name: string;
    hasPhoto?: boolean;
  };
  room?: {
    id: string;
    name: string;
  };
}

export interface ScheduleSlotInput {
  weekDay: number;
  startTime: string; // "HH:mm:ss"
  endTime: string;   // "HH:mm:ss"
  roomId: string;
}

export interface ScheduleFormData {
  scheduleSlots: ScheduleSlotInput[];
  effectiveFrom: string | null;
  effectiveTo?: string | null;
  groupId: string | null;
  teacherId: string | null;
  organizationId: string;
}

export interface ScheduleSlotUpdate {
  id: string; // existing slot GUID or "00000000-0000-0000-0000-000000000000" for new
  weekDay: number;
  startTime: string;
  endTime: string;
  roomId: string;
}

export interface ScheduleUpdateData {
  scheduleSlots: ScheduleSlotUpdate[];
  effectiveFrom: string | null;
  effectiveTo?: string | null;
  groupId: string | null;
  teacherId: string | null;
}

export interface SchedulesResponse {
  items: Schedule[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ScheduleFilters {
  pageNumber: number;
  pageSize: number;
  organizationId: string;
  groupId?: string;
  teacherId?: string;
  roomId?: string;
  subjectId?: string;
  includeDeleted?: boolean;
}

// Helper functions for days of week
export const getDayName = (dayNumber: number): string => {
  const days = {
    1: 'Понедельник',
    2: 'Вторник', 
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница',
    6: 'Суббота',
    7: 'Воскресенье'
  };
  return days[dayNumber as keyof typeof days] || 'Неизвестный день';
};

export const getDayShortName = (dayNumber: number): string => {
  const days = {
    1: 'Пн',
    2: 'Вт',
    3: 'Ср', 
    4: 'Чт',
    5: 'Пт',
    6: 'Сб',
    7: 'Вс'
  };
  return days[dayNumber as keyof typeof days] || '??';
};

export const formatDaysOfWeek = (daysOfWeek: number[]): string => {
  return daysOfWeek
    .sort((a, b) => a - b)
    .map(day => getDayShortName(day))
    .join(', ');
};

export const formatTime = (timeString: string): string => {
  // Convert "09:00:00" to "09:00"
  if (!timeString || typeof timeString !== 'string') {
    return '';
  }
  return timeString.substring(0, 5);
};

export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
};

// Get unique sorted week days from slots
export const getSlotDays = (slots: ScheduleSlot[]): number[] => {
  return [...new Set(slots.map(s => s.weekDay))].sort((a, b) => a - b);
};

// Format slots for compact display: "Пн, Ср 10:00–11:00" or "Пн 10:00 • Ср 14:00"
export const formatScheduleSlots = (slots: ScheduleSlot[]): string => {
  if (!slots || slots.length === 0) return '—';
  const firstKey = `${slots[0].startTime}|${slots[0].endTime}`;
  const allSameTime = slots.every(s => `${s.startTime}|${s.endTime}` === firstKey);
  if (allSameTime) {
    const days = slots.map(s => getDayShortName(s.weekDay)).join(', ');
    return `${days} ${formatTime(slots[0].startTime)}–${formatTime(slots[0].endTime)}`;
  }
  return slots
    .map(s => `${getDayShortName(s.weekDay)} ${formatTime(s.startTime)}–${formatTime(s.endTime)}`)
    .join(' • ');
};


export const formatEffectivePeriod = (effectiveFrom: string, effectiveTo: string | null): string => {
  const fromDate = new Date(effectiveFrom).toLocaleDateString('ru-RU');
  if (!effectiveTo) {
    return `с ${fromDate} (Бессрочно)`;
  }
  const toDate = new Date(effectiveTo).toLocaleDateString('ru-RU');
  return `${fromDate} - ${toDate}`;
};

// Helper to convert time string to TimeSpan ticks for API
export const timeStringToTicks = (timeString: string): number => {
  const [hours, minutes, seconds = 0] = timeString.split(':').map(Number);
  return (hours * 3600 + minutes * 60 + seconds) * 10000000; // .NET ticks
};

// Generate random colors for subjects
export const generateSubjectColor = (subjectName: string): string => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6366F1', // Indigo
  ];
  
  // Generate consistent color based on subject name hash
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
