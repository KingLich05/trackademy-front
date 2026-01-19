export enum StudentStatus {
  Potential = 0,
  Active = 1,
  Paused = 2,
  Debtor = 3,
  Completed = 4,
  Dropped = 5
}

export const getStudentStatusName = (status: StudentStatus): string => {
  switch (status) {
    case StudentStatus.Potential:
      return 'Потенциальный';
    case StudentStatus.Active:
      return 'Активный';
    case StudentStatus.Paused:
      return 'Приостановлен';
    case StudentStatus.Debtor:
      return 'Должник';
    case StudentStatus.Completed:
      return 'Завершён';
    case StudentStatus.Dropped:
      return 'Отчислен';
    default:
      return 'Неизвестно';
  }
};

export interface SetStudentStatusRequest {
  studentId: string;
  status: StudentStatus;
  reason: string;
}

export interface SetStudentFlagRequest {
  studentId: string;
  studentFlagId: string;
  reason: string;
  source: number;
}

export interface RemoveStudentFlagRequest {
  studentId: string;
  studentFlagId: string;
  reason: string;
}