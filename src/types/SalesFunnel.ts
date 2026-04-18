import { StudentStatus } from './StudentCrm';

export enum LeadActivityType {
  Call = 1,
  Message = 2,
  Meeting = 3,
  Note = 4,
  TrialLesson = 5,
  WhatsApp = 6,
  Task = 7,
}

// ─── Funnel Stages ────────────────────────────────────────────────────────────

export interface FunnelStageDto {
  id: string;
  name: string;
  order: number;
  colorHex: string;
  isClosedWon: boolean;
  isClosedLost: boolean;
  leadsCount: number;
}

export interface CreateFunnelStageRequest {
  name: string;
  order: number;
  colorHex: string;
  isClosedWon: boolean;
  isClosedLost: boolean;
}

export interface UpdateFunnelStageRequest {
  name: string;
  order: number;
  colorHex: string;
  isClosedWon: boolean;
  isClosedLost: boolean;
}

// ─── Lead Sources ─────────────────────────────────────────────────────────────

export interface LeadSourceDto {
  id: string;
  name: string;
  isActive: boolean;
  leadsCount: number;
}

export interface CreateLeadSourceRequest {
  name: string;
}

export interface UpdateLeadSourceRequest {
  name: string;
  isActive: boolean;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface LeadDto {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  parentPhone: string | null;
  sourceId: string | null;
  sourceName: string | null;
  notes: string | null;
  currentStageId: string;
  currentStageName: string;
  currentStageColorHex: string;
  assignedToId: string | null;
  assignedToName: string | null;
  convertedUserId: string | null;
  convertedAt: string | null;
  lostReason: string | null;
  expectedGroupId: string | null;
  expectedGroupName: string | null;
  createdAt: string;
  createdByName: string;
  updatedAt: string | null;
}

export interface LeadDetailDto extends LeadDto {
  stageHistory: LeadStageHistoryDto[];
  activities: LeadActivityDto[];
}

export interface CreateLeadRequest {
  fullName: string;
  phone: string;
  email?: string | null;
  parentPhone?: string | null;
  sourceId?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
  expectedGroupId?: string | null;
}

export interface UpdateLeadRequest {
  fullName: string;
  phone: string;
  email?: string | null;
  parentPhone?: string | null;
  sourceId?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
  expectedGroupId?: string | null;
}

export interface MoveLeadStageRequest {
  stageId: string;
  comment?: string | null;
}

export interface ConvertLeadRequest {
  login: string;
  password: string;
  groupId?: string | null;
  subjectPackageId?: string | null;
  status?: StudentStatus;
  flagIds?: string[];
  comment?: string;
}

export interface LoseLeadRequest {
  reason: string;
}

// ─── Board API (paginated) ────────────────────────────────────────────────────

export interface FunnelStageWithLeads {
  id: string;
  name: string;
  order: number;
  colorHex: string;
  isClosedWon: boolean;
  isClosedLost: boolean;
  totalCount: number;
  hasMore: boolean;
  leads: LeadDto[];
  isLoadingMore?: boolean; // UI only
}

export interface FunnelBoardResponse {
  stages: FunnelStageWithLeads[];
}

export interface StageLeadsResponse {
  stageId: string;
  totalCount: number;
  hasMore: boolean;
  leads: LeadDto[];
}

// ─── Stage History ────────────────────────────────────────────────────────────

export interface LeadStageHistoryDto {
  id: string;
  fromStageId: string | null;
  fromStageName: string | null;
  toStageId: string;
  toStageName: string;
  comment: string | null;
  changedByName: string;
  createdAt: string;
}

// ─── Activities ───────────────────────────────────────────────────────────────

export interface LeadActivityDto {
  id: string;
  leadId: string;
  name: string;
  type: LeadActivityType;
  typeName: string;
  description: string;
  scheduledAt: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdByName: string;
  createdAt: string;
}

export interface CreateLeadActivityRequest {
  leadId: string;
  type: LeadActivityType;
  description: string;
  scheduledAt?: string | null;
}

export interface UpdateLeadActivityRequest {
  description: string;
  scheduledAt?: string | null;
  isCompleted: boolean;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface FunnelAnalyticsDto {
  stageConversions: StageConversionDto[];
  sourceAnalytics: SourceAnalyticsDto[];
  totalLeads: number;
  convertedLeads: number;
  lostLeads: number;
  activeLeads: number;
  conversionRate: number;
}

export interface StageConversionDto {
  stageId: string;
  stageName: string;
  colorHex: string;
  leadsCount: number;
  percentage: number;
}

export interface SourceAnalyticsDto {
  sourceId: string | null;
  sourceName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}
