'use client';

import React, { useState, useEffect } from 'react';
import { usePhoneFormatter } from '../../hooks/usePhoneFormatter';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  name?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = "+7 (___) ___-__-__",
  required = false,
  error,
  disabled = false,
  className = "",
  label,
  name
}) => {
  const { formatPhoneDisplay, formatPhoneForApi, handlePhoneKeyDown } = usePhoneFormatter();
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setDisplayValue(formatPhoneDisplay(value));
  }, [value, formatPhoneDisplay]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Если пользователь пытается удалить или изменить "+7", восстанавливаем его
    if (!inputValue.startsWith('+7')) {
      // Если значение не начинается с +7, форматируем его правильно
      const formatted = formatPhoneDisplay(inputValue);
      setDisplayValue(formatted);
      const apiValue = formatPhoneForApi(formatted);
      onChange(apiValue);
      return;
    }
    
    const formatted = formatPhoneDisplay(inputValue);
    setDisplayValue(formatted);
    
    // Отправляем в API формате
    const apiValue = formatPhoneForApi(formatted);
    onChange(apiValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const selectionStart = target.selectionStart || 0;
    
    // Предотвращаем удаление или изменение "+7 (" в начале
    if (selectionStart < 4 && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      return;
    }
    
    // Предотвращаем ввод в область "+7 ("
    if (selectionStart < 4 && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && 
        e.key !== 'Tab' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      return;
    }
    
    // Вызываем оригинальный обработчик
    handlePhoneKeyDown(e);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    // Если курсор находится перед "+7 (", перемещаем его после
    if (target.selectionStart! < 4 && displayValue.length > 0) {
      setTimeout(() => {
        target.setSelectionRange(4, 4);
      }, 0);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    handleSelect(e);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!displayValue) {
      setDisplayValue('+7 (');
    }
  };

  const handleBlurInternal = () => {
    setIsFocused(false);
    if (displayValue === '+7 (') {
      setDisplayValue('');
      onChange('');
    }
    onBlur?.();
  };

  const baseClasses = `
    w-full px-4 py-3 border rounded-xl 
    focus:outline-none focus:ring-2 focus:border-transparent 
    transition-all duration-200 text-gray-900 dark:text-white
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    ${error 
      ? 'border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-500' 
      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="tel"
          name={name}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onMouseUp={handleMouseUp}
          onFocus={handleFocus}
          onBlur={handleBlurInternal}
          placeholder={isFocused ? '' : placeholder}
          required={required}
          disabled={disabled}
          className={`${baseClasses} ${className}`}
          autoComplete="tel"
        />
        
        {/* Индикатор валидности */}
        {displayValue && !error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}
      
      {!error && displayValue && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Формат: +7 (XXX) XXX-XX-XX
        </p>
      )}
    </div>
  );
};