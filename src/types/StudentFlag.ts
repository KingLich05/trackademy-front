export interface StudentFlag {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  activeUsersCount: number;
}

export interface CreateStudentFlagRequest {
  name: string;
}

export interface UpdateStudentFlagRequest {
  id: string;
  name: string;
}