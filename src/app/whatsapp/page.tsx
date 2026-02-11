'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { DocumentTextIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { isOwner, canManageUsers } from '../../types/Role';
import WhatsAppTemplates from '../../components/whatsapp/WhatsAppTemplates';
import WhatsAppLogs from '../../components/whatsapp/WhatsAppLogs';

export default function WhatsAppPage() {
  const { user } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Проверка прав доступа
  if (!user || (!isOwner(user.role) && !canManageUsers(user.role))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 pt-20 p-4">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Доступ запрещен
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Эта страница доступна только администраторам и владельцам системы.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      name: 'Шаблоны',
      icon: DocumentTextIcon,
      component: WhatsAppTemplates,
    },
    {
      name: 'Логи сообщений',
      icon: ClipboardDocumentListIcon,
      component: WhatsAppLogs,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 pt-20 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            WhatsApp Integration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Управление WhatsApp уведомлениями и настройками
          </p>
        </div>

        {/* Tabs */}
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            {/* Tab List */}
            <Tab.List className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-t-2xl">
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    `w-full flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                      selected
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm transform scale-105'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-600/50'
                    }`
                  }
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </Tab>
              ))}
            </Tab.List>

            {/* Tab Panels */}
            <Tab.Panels className="p-6">
              {tabs.map((tab, index) => (
                <Tab.Panel
                  key={index}
                  className="focus:outline-none"
                >
                  <tab.component />
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </div>
        </Tab.Group>
      </div>
    </div>
  );
}