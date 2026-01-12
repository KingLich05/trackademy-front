'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface MultiSelectOption {
  id: string;
  name: string;
  secondaryText?: string; // для отображения логина или другой дополнительной информации
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Выберите опции...",
  disabled = false,
  maxHeight = "200px"
}) => {
export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Выберите опции...",
  disabled = false,
  maxHeight = "200px"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (optionId: string) => {
    const isSelected = selectedValues.includes(optionId);
    if (isSelected) {
      onChange(selectedValues.filter(id => id !== optionId));
    } else {
      onChange([...selectedValues, optionId]);
    }
  };

  const handleToggleOption = (optionId: string) => {
    const isSelected = selectedValues.includes(optionId);
    if (isSelected) {
      onChange(selectedValues.filter(id => id !== optionId));
    } else {
      onChange([...selectedValues, optionId]);
    }
  };

  const handleRemoveOption = (optionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(selectedValues.filter(id => id !== optionId));
  };

  const handleClearAll = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange([]);
  };

  const getSelectedNames = () => {
    return selectedValues
      .map(id => options.find(option => option.id === id)?.name)
      .filter(Boolean);
  };

  const selectedNames = getSelectedNames();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Input */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative w-full min-h-[42px] px-3 py-2 border rounded-md 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   cursor-pointer transition-all duration-200 ${
          disabled 
            ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed' 
            : isOpen 
              ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <div className="flex items-center justify-between min-h-[26px]">
          <div className="flex-1 flex flex-wrap gap-1">
            {selectedNames.length === 0 ? (
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {placeholder}
              </span>
            ) : (
              selectedValues.map((optionId) => {
                const option = options.find(opt => opt.id === optionId);
                if (!option) return null;
                
                return (
                  <span
                    key={optionId}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md 
                             bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300
                             border border-blue-200 dark:border-blue-700"
                  >
                    <span>
                      {option.name}
                      {option.secondaryText && (
                        <span className="ml-1 text-gray-600 dark:text-gray-400">({option.secondaryText})</span>
                      )}
                    </span>
                    {!disabled && (
                      <button
                        onClick={(e) => handleRemoveOption(optionId, e)}
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })
            )}
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            {selectedValues.length > 0 && !disabled && (
              <button
                onClick={handleClearAll}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                title="Очистить все"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400 dark:text-gray-400" />
              </button>
            )}
            <ChevronDownIcon 
              className={`h-4 w-4 text-gray-400 dark:text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 
                       border border-gray-200 dark:border-gray-600 
                       rounded-lg shadow-lg ring-1 ring-black dark:ring-gray-700 ring-opacity-5">

          {/* Options List */}
          <div className="max-h-60 overflow-auto py-1" style={{ maxHeight }}>
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Нет доступных опций
              </div>
            ) : (
              options.map((option) => {
                const isSelected = selectedValues.includes(option.id);
                return (
                  <div
                    key={option.id}
                    onClick={() => handleToggleOption(option.id)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer 
                               transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        isSelected 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {option.name}
                      </div>
                      {option.secondaryText && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {option.secondaryText}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CheckIcon className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with selection count */}
          {selectedValues.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-750 text-xs text-gray-500 dark:text-gray-400">
              Выбрано: {selectedValues.length} из {options.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};