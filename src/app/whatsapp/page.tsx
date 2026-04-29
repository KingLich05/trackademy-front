'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isOwner, canManageUsers } from '../../types/Role';
import WhatsAppLogs from '../../components/whatsapp/WhatsAppLogs';
import WhatsAppNotificationSettings from '../../components/whatsapp/WhatsAppNotificationSettings';
import {
  ClipboardDocumentListIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const TABS = [
  { id: 'notifications', label: 'Уведомления', icon: BellIcon },
  { id: 'logs', label: 'Логи', icon: ClipboardDocumentListIcon },
];

export default function WhatsAppPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications');

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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">оступ запрещен</h3>
            <p className="text-gray-600 dark:text-gray-400">
              та страница доступна только администраторам и владельцам системы.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-container">
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 dark:from-green-800 dark:via-emerald-900 dark:to-teal-950" />
        <div className="relative px-8 py-8 flex items-center gap-4">
          <div className="flex-shrink-0 w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.853L.057 23.804a.5.5 0 00.614.63l6.151-1.612A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.792 9.792 0 01-5.031-1.385l-.36-.214-3.733.979.997-3.648-.235-.374A9.787 9.787 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
          </div>
          <div>
            <span className="text-green-200 text-xs font-medium uppercase tracking-wider">Интеграция</span>
            <h1 className="text-2xl font-bold text-white leading-tight">WhatsApp</h1>
            <p className="text-green-100/80 text-sm mt-0.5">Управление уведомлениями и настройками</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'notifications' && <WhatsAppNotificationSettings />}
          {activeTab === 'logs' && <WhatsAppLogs />}
        </div>
      </div>
    </div>
  );
}