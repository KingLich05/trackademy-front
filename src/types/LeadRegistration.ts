export interface GenerateLinkRequest {
  organizationId: string;
  groupId?: string | null;
  lessonId?: string | null;
  expiresInHours?: number;
}

export interface RegistrationLinkDto {
  id: string;
  code: string;
  organizationId: string;
  groupId: string | null;
  groupName: string | null;
  lessonId: string | null;
  lessonInfo: string | null;
  expiresAt: string;
  isActive: boolean;
  createdByName: string;
  createdAt: string;
}

export interface LinkContextDto {
  organizationName: string;
  groupName: string | null;
  subjectName: string | null;
  teacherName: string | null;
  lessonDate: string | null;
  lessonTime: string | null;
}

export interface RegisterLeadRequest {
  fullName: string;
  phone: string;
}

export interface RegisterLeadResponse {
  id: string;
  fullName: string;
  phone: string;
  stageId: string;
  stageName: string;
  status: string;
  notes: string;
  createdAt: string;
}
