'use client';

import React, { useState, useEffect } from 'react';
import { BaseModal } from './ui/BaseModal';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';
import { StudentBalanceApiService, RefundRequest } from '../services/StudentBalanceApiService';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  groupId: string;
  studentName: string;
  groupName: string;
  availableBalance: number;
  onRefundSuccess?: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  studentId,
  groupId,
  studentName,
  groupName,
  availableBalance,
  onRefundSuccess
}) => {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const { showSuccess, showError } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setReason('');
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: { amount?: string; reason?: string } = {};

    // Validate amount
    const numAmount = parseFloat(amount);
    if (!amount || amount.trim() === '') {
      newErrors.amount = 'Сумма обязательна для заполнения';
    } else if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Сумма должна быть положительным числом';
    } else if (numAmount > availableBalance) {
      newErrors.amount = `Сумма возврата не может превышать доступный баланс (${availableBalance.toLocaleString()} ₸)`;
    }

    // Validate reason
    if (!reason || reason.trim() === '') {
      newErrors.reason = 'Причина возврата обязательна для заполнения';
    } else if (reason.trim().length < 3) {
      newErrors.reason = 'Причина должна содержать не менее 3 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setAmount(cleanValue);
    
    // Clear amount error when user starts typing
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    
    // Clear reason error when user starts typing
    if (errors.reason) {
      setErrors(prev => ({ ...prev, reason: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const refundRequest: RefundRequest = {
        amount: parseFloat(amount),
        reason: reason.trim()
      };

      await StudentBalanceApiService.refundBalance(studentId, groupId, refundRequest);
      
      showSuccess('Возврат средств успешно выполнен');
      onRefundSuccess?.();
      onClose();
    } catch (error: unknown) {
      showError((error as Error)?.message || 'Ошибка при выполнении возврата средств');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Возврат средств"
    >
      <div className="space-y-6">
        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Информация о возврате</h4>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Студент:</span>
              <span className="font-medium text-gray-900 dark:text-white">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Группа:</span>
              <span className="font-medium text-gray-900 dark:text-white">{groupName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Доступно для возврата:</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {availableBalance.toLocaleString()} ₸
              </span>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Сумма возврата <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 text-sm">₸</span>
            </div>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
              className={`block w-full pl-8 pr-3 py-3 border rounded-lg shadow-sm text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                errors.amount
                  ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500'
              } text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            />
          </div>
          {errors.amount && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.amount}</p>
          )}
        </div>

        {/* Reason Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Причина возврата <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            placeholder="Укажите причину возврата средств..."
            disabled={isSubmitting}
            rows={3}
            className={`block w-full px-3 py-3 border rounded-lg shadow-sm text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors resize-none ${
              errors.reason
                ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500'
            } text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {errors.reason && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
            {isSubmitting ? 'Выполняется...' : 'Выполнить возврат'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};