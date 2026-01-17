'use client';

import React, { useState } from 'react';
import { BaseModal } from './ui/BaseModal';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface AddBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, description: string) => void;
  studentName: string;
  subjectPrice?: number;
  discountedPrice?: number;
  discountType?: number | null;
  discountValue?: number | null;
  loading?: boolean;
}

export const AddBalanceModal: React.FC<AddBalanceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  subjectPrice,
  discountedPrice,
  discountType,
  discountValue,
  loading = false
}) => {
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ amount?: string }>({});

  const handleClose = () => {
    setAmount('');
    setErrors({});
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: { amount?: string } = {};

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Введите корректную сумму больше 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validateForm()) {
      const currentDate = new Date();
      const monthNames = [
        'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
        'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
      ];
      const monthName = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear();
      const description = `пополнение за ${monthName} ${year}`;
      
      onConfirm(parseFloat(amount), description);
      handleClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Пополнение баланса"
      subtitle={`Студент: ${studentName}`}
      icon={<div className="p-2 bg-white rounded-xl shadow-lg border-2 border-green-200">
        <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
      </div>}
      gradientFrom="from-green-500"
      gradientTo="to-emerald-600"
      maxWidth="md"
    >
      <div className="p-6 space-y-6 bg-white dark:bg-gray-800 rounded-xl">
        {subjectPrice && (
          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Базовая цена предмета:</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{subjectPrice.toLocaleString()} ₸</span>
              </div>
            </div>
            
            {discountedPrice && discountedPrice !== subjectPrice && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Цена со скидкой:</span>
                    <span className="text-lg font-bold text-green-900 dark:text-green-100">{discountedPrice.toLocaleString()} ₸</span>
                  </div>
                  {discountType !== null && discountValue !== null && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Скидка: {discountType === 1 
                        ? `${discountValue?.toLocaleString()} ₸` 
                        : `${discountValue}%`
                      } • Экономия: {(subjectPrice - discountedPrice).toLocaleString()} ₸
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-green-500 rounded-full"></div>
            Сумма пополнения (₸)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-green-600 font-bold text-lg">₸</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="100"
              className={`w-full pl-10 pr-4 py-3 border-2 transition-all duration-200 ${
                errors.amount 
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/50'
              } rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:bg-white dark:focus:bg-gray-600`}
              disabled={loading}
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Пополнение...
              </>
            ) : (
              'Пополнить баланс'
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};