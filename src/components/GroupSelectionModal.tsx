'use client';

import React from 'react';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface Group {
  id: string;
  name: string;
  subjectId?: string;
}

interface GroupSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onSelectGroup: (group: Group) => void;
  selectedCount: number;
}

export const GroupSelectionModal: React.FC<GroupSelectionModalProps> = ({
  isOpen,
  onClose,
  groups,
  onSelectGroup,
  selectedCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay with blur */}
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal */}
        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-lime-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Выберите группу
                  </h3>
                  <p className="text-sm text-white/80 mt-0.5">
                    Выбрано студентов: {selectedCount}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Нет доступных групп
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => {
                      onSelectGroup(group);
                      onClose();
                    }}
                    className="w-full flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all group border-2 border-transparent hover:border-emerald-500 dark:hover:border-emerald-600"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-lime-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {group.name}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
