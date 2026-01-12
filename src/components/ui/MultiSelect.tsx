'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface MultiSelectOption {
  id: string;
  name: string;
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
                   bg-white dark:bg-gray-800
                   cursor-pointer transition-all duration-200 ${
          disabled 
            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-not-allowed' 
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
              selectedNames.map((name, index) => {
                const optionId = selectedValues[index];
                return (
                  <span
                    key={optionId}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md 
                             bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300
                             border border-blue-200 dark:border-blue-800"
                  >
                    {name}
                    {!disabled && (
                      <button
                        onClick={(e) => handleRemoveOption(optionId, e)}
                        className="ml-1 hover:text-blue-600 dark:hover:text-blue-200"
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
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Очистить все"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </button>
            )}
            <ChevronDownIcon 
              className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 
                       border border-gray-200 dark:border-gray-700
                       rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700">
          
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
                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer 
                               transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300'
                        : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="flex-1">{option.name}</span>
                    {isSelected && (
                      <CheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with selection count */}
          {selectedValues.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400">
              Выбрано: {selectedValues.length} из {options.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};