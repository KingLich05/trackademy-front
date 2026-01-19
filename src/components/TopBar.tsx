'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { getRoleName } from '../types/Role';
import { ChevronDownIcon, UserIcon, ArrowRightOnRectangleIcon, PhoneIcon, QuestionMarkCircleIcon, CogIcon } from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import { BaseModal } from './ui/BaseModal';

const TopBar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Автоматическое закрытие меню через 5 секунд
  useEffect(() => {
    if (isDropdownOpen) {
      timeoutRef.current = setTimeout(() => {
        setIsDropdownOpen(false);
      }, 5000); // 5 секунд
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    // Очистка таймера при размонтировании компонента
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isDropdownOpen]);

  // Закрытие меню при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen) {
        // Проверяем, что клик был не по элементам меню
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="profile-menu"]')) {
          setIsDropdownOpen(false);
        }
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Don't show TopBar on login page
  if (pathname === '/login' || !isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      {/* Desktop TopBar */}
      <div className="hidden lg:block fixed top-0 right-0 left-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg lg:ml-64 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Theme Toggle and Welcome */}
            <div className="flex-1 flex items-center space-x-4">
              <ThemeToggle />
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Добро пожаловать в <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Trackademy</span>
              </div>
            </div>

            {/* Right side - User menu */}
            <div className="relative" data-dropdown="profile-menu">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-3 px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 rounded-md"
                >
                {/* User Avatar */}
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                
                {/* User Info */}
                <div className="text-left hidden sm:block">
                  <div className="text-gray-900 dark:text-white font-medium text-sm">{user.fullName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {getRoleName(user.role)}
                  </div>
                </div>
                
                {/* Dropdown Arrow */}
                <ChevronDownIcon 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  {/* Invisible backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  
                  {/* Menu content */}
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{user.fullName}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {getRoleName(user.role)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-3" />
                        <span>Профиль</span>
                      </Link>

                      {/* Настройки - только для администратора */}
                      {(user.role === 'Administrator' || user.role === 'Owner') && (
                        <Link
                          href="/settings"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          <CogIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-3" />
                          <span>Настройки</span>
                        </Link>
                      )}

                      {/* Техническая поддержка - только для админов и владельцев */}
                      {(user.roleId === 2 || user.roleId === 4 || user.role === 'Administrator' || user.role === 'Owner') && (
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setShowSupportModal(true);
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-3" />
                          <span>Тех. поддержка</span>
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                        <span>Выйти</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile TopBar */}
      <div className="lg:hidden fixed top-0 right-0 left-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg z-40">
        <div className="px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left side - User info for mobile */}
            <Link 
              href="/profile"
              className="flex items-center space-x-3 flex-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">
                  {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 dark:text-white font-semibold text-sm truncate">{user.fullName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {getRoleName(user.role)} • {typeof user.organizationNames === 'string' ? user.organizationNames : user.organizationNames?.[0] || 'Организация'}
                </div>
              </div>
            </Link>

            {/* Right side - Theme toggle, Support and Logout button for mobile */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              
              {/* Кнопка поддержки для мобильных - только для админов */}
              {(user.role === 'Admin' || user.role === 'Owner') && (
                <button
                  onClick={() => setShowSupportModal(true)}
                  className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 hover:scale-110"
                  title="Техническая поддержка"
                >
                  <QuestionMarkCircleIcon className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={() => {
                  logout();
                }}
                className="p-3 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110"
                title="Выйти"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно технической поддержки */}
      <BaseModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        title="Техническая поддержка"
        subtitle="Помощь администраторам"
        icon={<QuestionMarkCircleIcon className="w-5 h-5" />}
        gradientFrom="from-blue-500"
        gradientTo="to-indigo-600"
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Контактная информация */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <PhoneIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Связаться с нами</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Телефон:</span>
                <div className="flex items-center gap-2">
                  <a href="tel:+77020663888" className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                    +7 702 066 3888
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText('+77020663888');
                        setIsCopied(true);
                        // Сброс состояния через 2 секунды
                        setTimeout(() => {
                          setIsCopied(false);
                        }, 2000);
                      } catch (err) {
                        console.error('Ошибка копирования:', err);
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all duration-200 transform active:scale-95 ${
                      isCopied 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 scale-105' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 hover:scale-105'
                    }`}
                    title={isCopied ? "Номер скопирован!" : "Скопировать номер"}
                  >
                    {isCopied ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">WhatsApp:</span>
                <a href="https://wa.me/77020663888" target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors">
                  Написать в WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Часто задаваемые вопросы */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Быстрая помощь</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>Перезагрузите страницу (Ctrl+F5) при проблемах с загрузкой</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>Очистите кэш браузера если данные не обновляются</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                <span>Проверьте интернет-соединение при ошибках API</span>
              </div>
            </div>
          </div>
        </div>
      </BaseModal>
    </>
  );
};

export default TopBar;