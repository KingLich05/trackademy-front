'use client';

import React, { useState } from 'react';
import { BaseModal } from './ui/BaseModal';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface AddBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, description: string) => void;
  studentName: string;
  loading?: boolean;
}

export const AddBalanceModal: React.FC<AddBalanceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  loading = false
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({});

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setErrors({});
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: { amount?: string; description?: string } = {};

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Введите корректную сумму больше 0';
    }

    if (!description.trim()) {
      newErrors.description = 'Введите описание операции';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validateForm()) {
      onConfirm(parseFloat(amount), description.trim());
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

        <div className="relative">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-green-500 rounded-full"></div>
            Описание операции
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Например: Пополнение за февраль 2025"
            rows={3}
            className={`w-full px-4 py-3 border-2 transition-all duration-200 ${
              errors.description 
                ? 'border-red-400 focus:border-red-500 focus:ring-red-100' 
                : 'border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-100 dark:focus:ring-green-900/50'
            } rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:bg-white dark:focus:bg-gray-600 resize-none`}
            disabled={loading}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
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