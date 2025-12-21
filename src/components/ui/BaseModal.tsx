'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  gradientFrom?: string;
  gradientTo?: string;
  customBackground?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'lg',
  gradientFrom = 'from-blue-500',
  gradientTo = 'to-purple-600',
  customBackground,
}) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-hidden border-0 ${customBackground || 'bg-white dark:bg-gray-800'}`}>
        {/* Header with gradient */}
        <div className={`relative bg-gradient-to-r ${gradientFrom} ${gradientTo} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {icon && (
                <div className="flex items-center justify-center">
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-white drop-shadow-lg">{title}</h2>
                {subtitle && (
                  <p className="text-white/90 text-sm font-medium drop-shadow">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/40 hover:scale-110 rounded-lg flex items-center justify-center transition-all duration-200"
              title="Закрыть"
            >
              <XMarkIcon className="w-5 h-5 text-white drop-shadow" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`p-4 sm:p-6 max-h-[calc(90vh-80px)] overflow-y-auto ${customBackground || 'bg-white dark:bg-gray-800'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};