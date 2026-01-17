import { AuthenticatedApiService } from './AuthenticatedApiService';
import { StudentBalanceRequest, StudentBalanceResponse, StudentBalanceItem, FlattenedBalance } from '../types/StudentBalance';

export interface AddBalanceRequest {
  studentId: string;
  groupId: string;
  amount: number;
  description: string;
}

export interface DiscountRequest {
  studentId: string;
  groupId: string;
  discountType: number;
  discountValue: number;
  discountReason: string;
}

export interface RefundRequest {
  amount: number;
  reason: string;
}

export class StudentBalanceApiService {
  /**
   * Получить балансы студентов с фильтрацией и поиском
   */
  static async getStudentBalances(request: StudentBalanceRequest): Promise<StudentBalanceResponse> {
    return AuthenticatedApiService.post<StudentBalanceResponse>(
      `/StudentBalance/organization/${request.organizationId}/all`,
      request
    );
  }

  /**
   * Пополнить баланс студента
   */
  static async addBalance(request: AddBalanceRequest): Promise<void> {
    return AuthenticatedApiService.post<void>(
      '/StudentBalance/add-balance',
      request
    );
  }

  /**
   * Применить скидку к балансу студента
   */
  static async applyDiscount(request: DiscountRequest): Promise<void> {
    return AuthenticatedApiService.put<void>(
      '/StudentBalance/discount',
      request
    );
  }

  /**
   * Удалить скидку у студента
   */
  static async removeDiscount(studentId: string, groupId: string): Promise<void> {
    return AuthenticatedApiService.delete<void>(
      `/StudentBalance/groups/${groupId}/students/${studentId}/discount`
    );
  }

  /**
   * Возврат средств студенту
   */
  static async refundBalance(studentId: string, groupId: string, request: RefundRequest): Promise<void> {
    return AuthenticatedApiService.post<void>(
      `/StudentBalance/refund/${studentId}/group/${groupId}`,
      request
    );
  }

  /**
   * Преобразовать сгруппированные данные в плоский массив для таблицы
   */
  static flattenBalances(items: StudentBalanceItem[]): FlattenedBalance[] {
    const flattened: FlattenedBalance[] = [];
    
    items.forEach(item => {
      item.groupBalances.forEach(balance => {
        flattened.push({
          studentId: item.student.id,
          studentName: item.student.name,
          studentPhone: item.student.phone,
          groupId: balance.groupId,
          groupName: balance.groupName,
          groupCode: balance.groupCode,
          subjectName: balance.subjectName,
          balance: balance.balance,
          remainingLessons: balance.remainingLessons || 0,
          discountType: balance.discountType,
          discountValue: balance.discountValue,
          discountReason: balance.discountReason,
          isFrozen: balance.isFrozen,
          createdAt: balance.createdAt,
          updatedAt: balance.updatedAt
        });
      });
    });
    
    return flattened;
  }
}