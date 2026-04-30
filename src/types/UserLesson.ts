// Создать новый урок-отработку
export interface MakeUpLessonCreateModel {
  groupId: string;
  date: string;         // "2025-04-09"
  startTime: string;    // "14:00:00" — System.TimeOnly requires HH:mm:ss
  endTime: string;      // "15:00:00" — System.TimeOnly requires HH:mm:ss
  teacherId: string;
  roomId: string;
  note?: string;
  studentIds: string[]; // минимум 1
}

// Быстрая отработка (quick-makeup) — создать для одного студента на базе исходного урока
export interface QuickMakeUpRequest {
  originalLessonId: string; // исходный урок (обязательно)
  studentId: string;        // студент (обязательно)
  date?: string;            // DateOnly "YYYY-MM-DD"; по умолчанию из исходного урока
  startTime?: string;       // "HH:mm:ss"; по умолчанию из исходного урока
  endTime?: string;         // "HH:mm:ss"; по умолчанию из исходного урока
  teacherId?: string;       // по умолчанию преподаватель исходного урока
  roomId?: string;          // по умолчанию кабинет исходного урока
  note?: string;            // заметка
}

// Ответ создания урока-отработки
export interface CreateMakeUpResponse {
  lessonId: string;
}

// Добавить студента к существующей отработке
export interface UserLessonAddModel {
  userId: string;
  lessonId: string;
}

// Полная модель записи UserLesson (ответ для всех get/add)
export interface UserLessonDto {
  id: string;
  userId: string;
  studentName: string;
  lessonId: string;
  lessonDate: string;    // "2025-04-09"
  startTime: string;     // "14:00:00"
  endTime: string;       // "15:00:00"
  groupName: string;
  subjectName: string;
  teacherName: string;
  status: number;        // AttendanceStatus: 1=Attend, 2=NotAttend, 3=Late, 4=SpecialReason
}

// Alias for backward compatibility
export type MakeUpStudentDto = UserLessonDto;
