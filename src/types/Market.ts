export enum CoinTransactionType {
  Reward = 1,
  Purchase = 2,
  AdminAdjustment = 3,
  Refund = 4,
}

export enum RewardEventType {
  AttendanceMarked = 1,
  ScoreReceived = 2,
  SubmissionCompleted = 3,
  BonusManual = 4,
}

export enum MarketItemType {
  Physical = 1,
  Virtual = 2,
}

export enum PurchaseStatus {
  Pending = 1,
  Fulfilled = 2,
  Cancelled = 3,
}

export interface CoinAccountDto {
  id: string;
  studentId: string;
  studentName: string;
  balance: number;
}

export interface CoinTransactionDto {
  id: string;
  type: CoinTransactionType;
  typeName: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface CoinAccountDetailedDto extends CoinAccountDto {
  recentTransactions: CoinTransactionDto[];
}

export interface RewardRuleDto {
  id: string;
  name: string;
  eventType: RewardEventType;
  eventTypeName: string;
  coinAmount: number;
  minScore: number | null;
  isActive: boolean;
}

export interface MarketItemDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  itemType: MarketItemType;
  itemTypeName: string;
  imageUrl: string | null;
  stockQuantity: number | null;
  maxPerStudent: number | null;
  isActive: boolean;
}

export interface PurchaseDto {
  id: string;
  studentId: string;
  studentName: string;
  itemId: string;
  itemName: string;
  pricePaid: number;
  status: PurchaseStatus;
  statusName: string;
  createdAt: string;
  processedAt: string | null;
}

export interface CreateRewardRuleRequest {
  organizationId: string;
  name: string;
  eventType: RewardEventType;
  coinAmount: number;
  minScore?: number | null;
}

export interface UpdateRewardRuleRequest {
  name: string;
  coinAmount: number;
  minScore?: number | null;
  isActive: boolean;
}

export interface CreateMarketItemRequest {
  organizationId: string;
  name: string;
  description?: string | null;
  price: number;
  itemType: MarketItemType;
  imageUrl?: string | null;
  stockQuantity?: number | null;
  maxPerStudent?: number | null;
}

export interface UpdateMarketItemRequest {
  name: string;
  description?: string | null;
  price: number;
  itemType: MarketItemType;
  imageUrl?: string | null;
  stockQuantity?: number | null;
  maxPerStudent?: number | null;
  isActive: boolean;
}

export interface AdminAdjustCoinRequest {
  studentId: string;
  amount: number;
  description: string;
}

export interface PurchaseItemRequest {
  marketItemId: string;
}
