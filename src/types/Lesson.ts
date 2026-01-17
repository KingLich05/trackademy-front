export interface Lesson {
  id: string;
  date: string; // "2025-10-18" format
  startTime: string; // "09:00:00" format
  endTime: string; // "10:30:00" format
  lessonStatus: 'Planned' | 'Completed' | 'Cancelled' | 'Moved';
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
  };
  room: {
    id: string;
    name: string;
  };
  students: LessonStudent[];
  cancelReason: string | null;
  note: string | null;
}

export interface LessonStudent {
  id: string;
  fullName: string;
  photoPath: string | null;
  attendanceStatus: AttendanceStatus | null;
  grade: number | null; // 1-100, nullable
  comment: string | null; // макс 500 символов, nullable
  isFrozen: boolean; // новое поле для заморозки студента
}

export type AttendanceStatus = 1 | 2 | 3 | 4; // 1 = присутствовал, 2 = отсутствовал, 3 = опоздал, 4 = отсутствовал по уважительной причине

export interface LessonsResponse {
  items: Lesson[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface LessonFilters {
  pageNumber: number;
  pageSize: number;
  scheduleId?: string;
  groupId?: string;
  teacherId?: string;
  roomId?: string;
  subjectId?: string;
  fromDate?: string; // "2025-10-28" format
  toDate?: string; // "2025-10-28" format
}

export type CalendarView = 'day' | 'week' | 'month' | 'list';

// Helper functions
export const getLessonStatusColor = (status: Lesson['lessonStatus']): string => {
  switch (status) {
    case 'Planned':
      return '#3B82F6'; // Blue
    case 'Completed':
      return '#10B981'; // Green
    case 'Cancelled':
      return '#EF4444'; // Red
    case 'Moved':
      return '#1E40AF'; // Dark Blue
    default:
      return '#6B7280'; // Gray
  }
};

export const getLessonStatusText = (status: Lesson['lessonStatus']): string => {
  switch (status) {
    case 'Planned':
      return 'Запланирован';
    case 'Completed':
      return 'Проведен';
    case 'Cancelled':
      return 'Отменен';
    case 'Moved':
      return 'Перенесен';
    default:
      return 'Неизвестно';
  }
};

export const getAttendanceStatusText = (status: AttendanceStatus | null): string => {
  if (status === null) return 'Не отмечено';
  
  switch (status) {
    case 1:
      return 'Присутствовал';
    case 2:
      return 'Отсутствовал';
    case 3:
      return 'Опоздал';
    case 4:
      return 'Отсутствовал по уважительной причине';
    default:
      return 'Не отмечено';
  }
};

export const getAttendanceStatusColor = (status: AttendanceStatus | null): string => {
  if (status === null) return '#6B7280'; // Gray
  
  switch (status) {
    case 1:
      return '#10B981'; // Green - присутствовал
    case 2:
      return '#EF4444'; // Red - отсутствовал
    case 3:
      return '#F59E0B'; // Yellow - опоздал
    case 4:
      return '#8B5CF6'; // Purple - уважительная причина
    default:
      return '#6B7280'; // Gray
  }
};

// Generate subject color (reuse from Schedule.ts)
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

// Time formatting
export const formatTime = (timeString: string): string => {
  // Convert "09:00:00" to "09:00"
  if (!timeString || typeof timeString !== 'string') {
    return '';
  }
  return timeString.substring(0, 5);
};

export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

export const formatDate = (dateString: string): string => {
  // Парсим дату как локальную, избегая UTC конверсии
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const formatDateShort = (dateString: string): string => {
  // Парсим дату как локальную, избегая UTC конверсии
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit'
  });
};

// Calendar navigation helpers
export const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getWeekEnd = (date: Date): Date => {
  const weekStart = getWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const getMonthStart = (date: Date): Date => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getMonthEnd = (date: Date): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const getDayStart = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getDayEnd = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Parse date string from API safely (avoiding UTC conversion)
export const parseApiDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date for API (YYYY-MM-DD) - using local timezone
export const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calendar grid helpers
export const getCalendarGrid = (date: Date): Date[] => {
  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);
  const startDate = getWeekStart(monthStart);
  const endDate = getWeekEnd(monthEnd);
  
  const days: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
};

// Time slots for day/week view (08:00 - 23:00)
export const getTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 23; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
};

// Check if lesson overlaps with time slot
export const isLessonInTimeSlot = (lesson: Lesson, timeSlot: string): boolean => {
  const lessonStart = lesson.startTime.substring(0, 5); // "09:00:00" -> "09:00"
  const lessonEnd = lesson.endTime.substring(0, 5);
  const nextHour = `${(parseInt(timeSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;
  
  return lessonStart < nextHour && lessonEnd > timeSlot;
};

// Get lessons for specific day
export const getLessonsForDay = (lessons: Lesson[], date: Date): Lesson[] => {
  const dateString = formatDateForApi(date);
  return lessons.filter(lesson => lesson.date === dateString);
};

// Get week days
export const getWeekDays = (date: Date): Date[] => {
  const weekStart = getWeekStart(date);
  const days: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  
  return days;
};