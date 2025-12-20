import { AuthenticatedApiService } from './AuthenticatedApiService';
import { StudentBalanceRequest, StudentBalanceResponse, StudentBalanceItem, FlattenedBalance } from '../types/StudentBalance';

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