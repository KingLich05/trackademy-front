'use client';

import { useCallback } from 'react';

export const usePhoneFormatter = () => {
  const formatPhoneDisplay = useCallback((value: string): string => {
    // Remove all non-digits except +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // If empty, return empty
    if (!cleaned) return '';
    
    // Защита от некорректного ввода: если строка не начинается с +, 8 или 7
    // но содержит другие символы до цифр, очищаем их
    const normalizedValue = cleaned.replace(/^[^+87\d]*/, '');
    
    // If starts with +7, format as +7 (XXX) XXX-XX-XX
    if (normalizedValue.startsWith('+7')) {
      const digits = normalizedValue.slice(2); // Remove +7
      if (digits.length === 0) {
        return '+7 (';
      } else if (digits.length <= 3) {
        return `+7 (${digits}`;
      } else if (digits.length <= 6) {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length <= 8) {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
      }
    }
    
    // If starts with 8, replace with +7 and format
    if (normalizedValue.startsWith('8')) {
      const digits = normalizedValue.slice(1);
      if (digits.length === 0) {
        return '+7 (';
      } else if (digits.length <= 3) {
        return `+7 (${digits}`;
      } else if (digits.length <= 6) {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length <= 8) {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
      }
    }
    
    // If starts with 7, add + and format
    if (normalizedValue.startsWith('7')) {
      const digits = normalizedValue.slice(1);
      if (digits.length === 0) {
        return '+7 (';
      } else if (digits.length <= 3) {
        return `+7 (${digits}`;
      } else if (digits.length <= 6) {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length <= 8) {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
      }
    }
    
    // For other cases (digits without country code)
    if (cleaned.length <= 3) {
      return `+7 (${cleaned}`;
    } else if (cleaned.length <= 6) {
      return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 8) {
      return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else {
      return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 10)}`;
    }
  }, []);

  const formatPhoneForApi = useCallback((value: string): string => {
    // Remove all non-digits except +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +7
    if (cleaned.startsWith('8')) {
      return `+7${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('7')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('+7')) {
      return cleaned;
    }
    
    // If just digits, assume it's Russian number
    if (cleaned.length === 10) {
      return `+7${cleaned}`;
    }
    
    return cleaned;
  }, []);

  const handlePhoneKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  }, []);

  return {
    formatPhoneDisplay,
    formatPhoneForApi,
    handlePhoneKeyDown,
  };
};