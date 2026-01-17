import React, { useState, useEffect } from 'react';
import { BaseModal } from './ui/BaseModal';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { StudentBalanceApiService, AddBalanceRequest, DiscountRequest } from '../services/StudentBalanceApiService';
import { Group } from '../types/Group';
import { AddBalanceModal } from './AddBalanceModal';
import { DiscountModal } from './DiscountModal';
import { FreezeStudentModal } from './FreezeStudentModal';
import { useToast } from '../contexts/ToastContext';
import { 
  UserIcon, 
  XMarkIcon, 
  PlusCircleIcon, 
  ReceiptPercentIcon, 
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';

interface GroupStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  onPaymentCreate?: (studentId: string, studentName: string) => void;
  onAddStudents?: () => void; // Добавляем новый проп для обработки добавления студентов
}

interface StudentBalance {
  student: {
    id: string;
    name: string;
    phone: string;
  };
  group: {
    id: string;
    name: string;
    code: string;
  };
  balance: number;
  remainingLessons?: number;
  isFrozen?: boolean;
  frozenFrom?: string | null;
  frozenTo?: string | null;
  discountType: number | null;
  discountValue: number | null;
  discountReason: string | null;
  createdAt: string;
  updatedAt: string | null;
  subjectPrice: number;
  lessonCost: number;
}

export const GroupStudentsModal: React.FC<GroupStudentsModalProps> = ({
  isOpen,
  onClose,
  group,
  onPaymentCreate,
  onAddStudents
}) => {
  const [studentBalances, setStudentBalances] = useState<StudentBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentBalance | null>(null);
  
  // Модальные окна
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isFreezeOpen, setIsFreezeOpen] = useState(false);
  const [isUnfreezeOpen, setIsUnfreezeOpen] = useState(false);
  
  // Состояния загрузки для операций
  const [addingBalance, setAddingBalance] = useState(false);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [removingDiscount, setRemovingDiscount] = useState(false);
  const [freezingStudent, setFreezingStudent] = useState(false);

  const { showToast, showSuccess, showError } = useToast();

  useEffect(() => {
    if (isOpen && group?.id) {
      loadStudents();
    }
  }, [isOpen, group?.id]);

  const loadStudents = async () => {
    if (!group?.id) return;
    
    setLoading(true);
    try {
      const response = await AuthenticatedApiService.get<StudentBalance[]>(
        `/StudentBalance/group/${group.id}/all`
      );
      setStudentBalances(response);
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudentBalances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBalance = async (amount: number, description: string) => {
    if (!selectedStudent || !group?.id) return;

    setAddingBalance(true);
    try {
      const request: AddBalanceRequest = {
        studentId: selectedStudent.student.id,
        groupId: group.id,
        amount,
        description
      };

      await StudentBalanceApiService.addBalance(request);
      showSuccess(`Баланс пополнен на ${amount.toLocaleString()} ₸`);
      setIsAddBalanceOpen(false);
      // Принудительно перезагружаем данные
      await loadStudents();
    } catch (error: unknown) {
      showError('Ошибка при пополнении баланса: ' + ((error as Error)?.message || 'Неизвестная ошибка'));
    } finally {
      setAddingBalance(false);
    }
  };

  const handleApplyDiscount = async (discountType: number, discountValue: number, discountReason: string) => {
    if (!selectedStudent || !group?.id) return;

    setApplyingDiscount(true);
    try {
      const request: DiscountRequest = {
        studentId: selectedStudent.student.id,
        groupId: group.id,
        discountType,
        discountValue,
        discountReason
      };

      await StudentBalanceApiService.applyDiscount(request);
      const discountText = discountType === 1 ? `${discountValue}%` : `${discountValue.toLocaleString()} ₸`;
      showSuccess(`Скидка ${discountText} применена`);
      setIsDiscountOpen(false);
      // Принудительно перезагружаем данные
      await loadStudents();
    } catch (error: unknown) {
      showError('Ошибка при применении скидки: ' + ((error as Error)?.message || 'Неизвестная ошибка'));
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = async () => {
    if (!selectedStudent || !group?.id) return;
    
    setRemovingDiscount(true);
    try {
      await StudentBalanceApiService.removeDiscount(selectedStudent.student.id, group.id);
      showSuccess(`Скидка удалена для ${selectedStudent.student.name}`);
      setIsDiscountOpen(false);
      // Принудительно перезагружаем данные
      await loadStudents();
    } catch (error: unknown) {
      showError('Ошибка при удалении скидки: ' + ((error as Error)?.message || 'Неизвестная ошибка'));
    } finally {
      setRemovingDiscount(false);
    }
  };

  const handleFreezeStudent = async (startDate: string, endDate: string, reason: string) => {
    if (!selectedStudent || !group?.id) return;

    setFreezingStudent(true);
    try {
      await AuthenticatedApiService.post('/Group/freeze-student', {
        studentId: selectedStudent.student.id,
        groupId: group.id,
        frozenFrom: startDate,
        frozenTo: endDate,
        freezeReason: reason
      });
      
      showSuccess(`Студент ${selectedStudent.student.name} заморожен`);
      setIsFreezeOpen(false);
      // Небольшая задержка для обновления на сервере
      await new Promise(resolve => setTimeout(resolve, 500));
      // Принудительно перезагружаем данные
      await loadStudents();
    } catch (error: unknown) {
      showError('Ошибка при заморозке студента: ' + ((error as Error)?.message || 'Неизвестная ошибка'));
    } finally {
      setFreezingStudent(false);
    }
  };

  const handleUnfreezeStudent = async () => {
    if (!selectedStudent || !group?.id) return;

    setFreezingStudent(true);
    try {
      await AuthenticatedApiService.post('/Group/unfreeze-student', {
        studentId: selectedStudent.student.id,
        groupId: group.id
      });
      
      showSuccess(`Студент ${selectedStudent.student.name} разморожен`);
      setIsUnfreezeOpen(false);
      // Небольшая задержка для обновления на сервере
      await new Promise(resolve => setTimeout(resolve, 500));
      // Принудительно перезагружаем данные
      await loadStudents();
    } catch (error: unknown) {
      showError('Ошибка при разморозке студента: ' + ((error as Error)?.message || 'Неизвестная ошибка'));
    } finally {
      setFreezingStudent(false);
    }
  };

  const handleClose = () => {
    setStudentBalances([]);
    setSelectedStudent(null);
    setIsAddBalanceOpen(false);
    setIsDiscountOpen(false);
    setIsFreezeOpen(false);
    setIsUnfreezeOpen(false);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Студенты группы "${group?.name || ''}"`}
      customBackground="bg-white dark:bg-gray-900"
      maxWidth="xl"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
              <UserIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Управление студентами
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Всего студентов: {studentBalances.length}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Загрузка студентов...
            </p>
          </div>
        ) : studentBalances.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mb-4">
              <UserIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Нет студентов
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              В этой группе пока нет студентов
            </p>
            {onAddStudents && (
              <button
                onClick={() => {
                  onAddStudents();
                  handleClose();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <PlusCircleIcon className="h-5 w-5" />
                Добавить студентов
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 max-h-[60vh] overflow-y-auto overflow-x-hidden">
            {studentBalances.map((studentBalance) => (
              <div
                key={studentBalance.student.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 border min-w-0 ${
                  studentBalance.isFrozen 
                    ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      studentBalance.isFrozen 
                        ? 'bg-slate-200 dark:bg-slate-700' 
                        : 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30'
                    }`}>
                      <UserIcon className={`w-5 h-5 ${
                        studentBalance.isFrozen 
                          ? 'text-slate-600 dark:text-slate-400' 
                          : 'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate flex-shrink">
                            {studentBalance.student.name}
                          </h4>
                          {studentBalance.isFrozen && (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 flex-shrink-0">
                                <LockClosedIcon className="w-3 h-3 mr-0.5" />
                                Заморожен
                              </span>
                              {(studentBalance.frozenFrom || studentBalance.frozenTo) && (
                                <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {studentBalance.frozenFrom && new Date(studentBalance.frozenFrom).toLocaleDateString('ru-RU')}
                                  {(studentBalance.frozenFrom && studentBalance.frozenTo) && ' - '}
                                  {studentBalance.frozenTo && new Date(studentBalance.frozenTo).toLocaleDateString('ru-RU')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          📱 {studentBalance.student.phone}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          studentBalance.balance >= 0 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          💰 {studentBalance.balance.toLocaleString()} ₸
                        </div>
                        
                        <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          💳 {studentBalance.subjectPrice.toLocaleString()} ₸
                        </div>
                        
                        {studentBalance.discountType && 
                         studentBalance.discountValue != null && 
                         studentBalance.discountValue > 0 && (
                          <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            🎯 {studentBalance.discountType === 1 
                              ? `${studentBalance.discountValue}%` 
                              : `${studentBalance.discountValue.toLocaleString()} ₸`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-wrap justify-start">
                    <button
                      onClick={() => {
                        setSelectedStudent(studentBalance);
                        setIsAddBalanceOpen(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded transition-colors"
                      title="Пополнить баланс"
                    >
                      <PlusCircleIcon className="w-3 h-3" />
                      Пополнить
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedStudent(studentBalance);
                        setIsDiscountOpen(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 rounded transition-colors"
                      title="Применить скидку"
                    >
                      <ReceiptPercentIcon className="w-3 h-3" />
                      Скидка
                    </button>
                    
                    {studentBalance.isFrozen ? (
                      <button
                        onClick={() => {
                          setSelectedStudent(studentBalance);
                          setIsUnfreezeOpen(true);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded transition-colors"
                        title="Разморозить студента"
                      >
                        <LockOpenIcon className="w-3 h-3" />
                        Разморозить
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedStudent(studentBalance);
                          setIsFreezeOpen(true);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 rounded transition-colors"
                        title="Заморозить студента"
                      >
                        <LockClosedIcon className="w-3 h-3" />
                        Заморозить
                      </button>
                    )}
                  </div>
                </div>
                
                {onPaymentCreate && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => onPaymentCreate(studentBalance.student.id, studentBalance.student.name)}
                      className="w-full px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded transition-all duration-200"
                    >
                      💳 Создать платеж
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Модальные окна */}
      <AddBalanceModal
        isOpen={isAddBalanceOpen}
        onClose={() => setIsAddBalanceOpen(false)}
        onConfirm={handleAddBalance}
        studentName={selectedStudent?.student.name || ''}
        subjectPrice={selectedStudent?.subjectPrice}
        discountedPrice={selectedStudent?.lessonCost}
        discountType={selectedStudent?.discountType}
        discountValue={selectedStudent?.discountValue}
        loading={addingBalance}
      />
      
      <DiscountModal
        isOpen={isDiscountOpen}
        onClose={() => setIsDiscountOpen(false)}
        onConfirm={handleApplyDiscount}
        onRemove={handleRemoveDiscount}
        studentName={selectedStudent?.student.name || ''}
        loading={applyingDiscount || removingDiscount}
        currentDiscountType={selectedStudent?.discountType}
        currentDiscountValue={selectedStudent?.discountValue}
        currentDiscountReason={selectedStudent?.discountReason}
      />
      
      <FreezeStudentModal
        isOpen={isFreezeOpen}
        onClose={() => setIsFreezeOpen(false)}
        studentName={selectedStudent?.student.name || ''}
        onConfirm={handleFreezeStudent}
        loading={freezingStudent}
      />
      
      {/* Модальное окно разморозки */}
      <BaseModal
        isOpen={isUnfreezeOpen}
        onClose={() => setIsUnfreezeOpen(false)}
        title="Разморозка студента"
        subtitle={`Вы уверены, что хотите разморозить студента: ${selectedStudent?.student.name}?`}
        icon={<LockOpenIcon className="w-5 h-5" />}
        gradientFrom="from-blue-500"
        gradientTo="to-cyan-600"
        maxWidth="md"
      >
        <div className="p-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsUnfreezeOpen(false)}
              disabled={freezingStudent}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              onClick={handleUnfreezeStudent}
              disabled={freezingStudent}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {freezingStudent ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Разморозка...
                </>
              ) : (
                'Разморозить'
              )}
            </button>
          </div>
        </div>
      </BaseModal>
    </BaseModal>
  );
};