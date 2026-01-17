'use client';

import React, { useState } from 'react';
import { BaseModal } from './ui/BaseModal';
import { ReceiptPercentIcon } from '@heroicons/react/24/outline';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (discountType: number, discountValue: number, discountReason: string) => void;
  onRemove?: () => void;
  studentName: string;
  loading?: boolean;
  currentDiscountType?: number | null;
  currentDiscountValue?: number | null;
  currentDiscountReason?: string | null;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onRemove,
  studentName,
  loading = false,
  currentDiscountType,
  currentDiscountValue,
  currentDiscountReason
}) => {
  const [discountType, setDiscountType] = useState<number>(currentDiscountType || 1); // 1 = процент, 2 = фиксированная сумма
  const [discountValue, setDiscountValue] = useState(currentDiscountValue?.toString() || '');
  const [discountReason, setDiscountReason] = useState(currentDiscountReason || '');
  const [errors, setErrors] = useState<{ discountValue?: string; discountReason?: string }>({});

  // Обновляем состояние при изменении props
  React.useEffect(() => {
    if (isOpen) {
      setDiscountType(currentDiscountType || 1);
      setDiscountValue(currentDiscountValue?.toString() || '');
      setDiscountReason(currentDiscountReason || '');
      setErrors({});
    }
  }, [isOpen, currentDiscountType, currentDiscountValue, currentDiscountReason]);

  const handleDiscountValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Если это процентная скидка, ограничиваем максимум 99
    if (discountType === 1) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 99) {
        return; // Не обновляем состояние, если больше 99
      }
    }
    
    setDiscountValue(value);
  };

  const handleClose = () => {
    setDiscountType(1);
    setDiscountValue('');
    setDiscountReason('');
    setErrors({});
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: { discountValue?: string; discountReason?: string } = {};

    const valueNum = parseFloat(discountValue);
    if (!discountValue || isNaN(valueNum) || valueNum <= 0) {
      newErrors.discountValue = 'Введите корректное значение скидки больше 0';
    } else if (discountType === 1 && valueNum > 100) {
      newErrors.discountValue = 'Процент скидки не может быть больше 100%';
    } else if (discountType === 1 && valueNum > 99) {
      newErrors.discountValue = 'Процент скидки не может быть больше 99%';
    }

    if (!discountReason.trim()) {
      newErrors.discountReason = 'Введите причину предоставления скидки';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validateForm()) {
      onConfirm(discountType, parseFloat(discountValue), discountReason.trim());
      handleClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Предоставление скидки"
      subtitle={`Студент: ${studentName}`}
      icon={<div className="p-2 bg-white rounded-xl shadow-lg border-2 border-purple-200">
        <ReceiptPercentIcon className="w-6 h-6 text-purple-600" />
      </div>}
      gradientFrom="from-purple-500"
      gradientTo="to-indigo-600"
      maxWidth="md"
    >
      <div className="p-6 space-y-6 bg-white dark:bg-gray-800 rounded-xl">
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
            Тип скидки
          </label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(parseInt(e.target.value))}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/50 focus:border-purple-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200"
            disabled={loading}
          >
            <option value={1}>Процентная скидка (%)</option>
            <option value={2}>Фиксированная сумма (₸)</option>
          </select>
        </div>

        <div className="relative">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
            Размер скидки {discountType === 1 ? '(%)' : '(₸)'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-purple-600 font-bold text-lg">{discountType === 1 ? '%' : '₸'}</span>
            </div>
            <input
              type="number"
              value={discountValue}
              onChange={handleDiscountValueChange}
              placeholder="0"
              min="0"
              max={discountType === 1 ? "99" : undefined}
              step={discountType === 1 ? "1" : "100"}
              className={`w-full pl-10 pr-4 py-3 border-2 transition-all duration-200 ${
                errors.discountValue 
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-100 dark:focus:ring-purple-900/50'
              } rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:bg-white dark:focus:bg-gray-600`}
              disabled={loading}
            />
          </div>
          {errors.discountValue && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.discountValue}</p>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
            Причина предоставления скидки
          </label>
          <textarea
            value={discountReason}
            onChange={(e) => setDiscountReason(e.target.value)}
            placeholder="Например: Многодетная семья, отличная успеваемость"
            rows={3}
            className={`w-full px-4 py-3 border-2 transition-all duration-200 ${
              errors.discountReason 
                ? 'border-red-400 focus:border-red-500 focus:ring-red-100' 
                : 'border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-100 dark:focus:ring-purple-900/50'
            } rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:bg-white dark:focus:bg-gray-600 resize-none`}
            disabled={loading}
          />
          {errors.discountReason && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.discountReason}</p>
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
          
          {/* Кнопка удаления скидки показывается только если у студента есть скидка */}
          {onRemove && currentDiscountValue && currentDiscountValue > 0 && (
            <button
              onClick={() => {
                if (onRemove) onRemove();
              }}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Удаление...
                </>
              ) : (
                'Удалить скидку'
              )}
            </button>
          )}
          
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Применение...
              </>
            ) : (
              'Применить скидку'
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};