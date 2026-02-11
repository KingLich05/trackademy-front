'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppApiService } from '../../services/WhatsAppApiService';
import { WhatsAppConfig, WhatsAppConfigRequest, WHATSAPP_PROVIDERS } from '../../types/WhatsApp';
import { useToast } from '../../contexts/ToastContext';

export default function WhatsAppConfigComponent() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [formData, setFormData] = useState<WhatsAppConfigRequest>({
    provider: 1,
    apiUrl: '',
    token: '',
    instanceId: '',
    isEnabled: true,
    retryAttempts: 3,
    retryDelaySeconds: 5,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Загрузка конфигурации при монтировании
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      const response = await WhatsAppApiService.getConfig(user.organizationId);
      
      if (response) {
        setConfig(response);
        setFormData({
          provider: response.provider,
          apiUrl: response.apiUrl,
          token: '', // токен не возвращается
          instanceId: response.instanceId,
          isEnabled: response.isEnabled,
          retryAttempts: response.retryAttempts,
          retryDelaySeconds: response.retryDelaySeconds,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showError('Ошибка загрузки конфигурации: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.apiUrl) {
      newErrors.apiUrl = 'URL API обязателен';
    } else if (!WhatsAppApiService.validateApiUrl(formData.apiUrl)) {
      newErrors.apiUrl = 'Неверный формат URL';
    }

    if (!formData.token) {
      newErrors.token = 'Токен API обязателен';
    }

    if (!formData.instanceId) {
      newErrors.instanceId = 'ID инстанса обязателен';
    }

    if (!WhatsAppApiService.validateRetryAttempts(formData.retryAttempts)) {
      newErrors.retryAttempts = 'Количество попыток должно быть от 0 до 10';
    }

    if (!WhatsAppApiService.validateRetryDelay(formData.retryDelaySeconds)) {
      newErrors.retryDelaySeconds = 'Задержка должна быть от 1 до 300 секунд';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.organizationId || !validateForm()) return;

    try {
      setSaving(true);
      const response = await WhatsAppApiService.saveConfig(user.organizationId, formData);
      
      showSuccess(response.message);
      setTestResult(null); // Сброс результата теста
      await loadConfig(); // Перезагрузка конфигурации
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showError('Ошибка сохранения: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!user?.organizationId) return;

    try {
      setTesting(true);
      setTestResult(null);
      
      const response = await WhatsAppApiService.testConnection(user.organizationId);
      
      setTestResult({
        success: response.isConnected,
        message: response.message,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setTestResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field: keyof WhatsAppConfigRequest, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Очистка ошибки поля при изменении
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Настройка WhatsApp провайдера
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Настройте подключение к WhatsApp API для отправки уведомлений
        </p>
      </div>

      {/* Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Основные настройки */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
            Основные параметры
          </h4>

          {/* Провайдер */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              WhatsApp провайдер
            </label>
            <div className="relative">
              <select
                value={formData.provider}
                onChange={(e) => handleInputChange('provider', Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         appearance-none cursor-pointer transition-colors"
              >
                {WHATSAPP_PROVIDERS.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.name} - {provider.description}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* URL API */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL API
            </label>
            <input
              type="url"
              value={formData.apiUrl}
              onChange={(e) => handleInputChange('apiUrl', e.target.value)}
              placeholder="https://api.ultramsg.com"
              className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 transition-colors
                       ${errors.apiUrl ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.apiUrl && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.apiUrl}</p>
            )}
          </div>

          {/* Токен API */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Токен API
            </label>
            <input
              type="password"
              value={formData.token}
              onChange={(e) => handleInputChange('token', e.target.value)}
              placeholder={config?.hasToken ? '••••••••••••••••' : 'Введите токен API'}
              className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 transition-colors
                       ${errors.token ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.token && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.token}</p>
            )}
            {config?.hasToken && !formData.token && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Оставьте пустым, чтобы сохранить существующий токен
              </p>
            )}
          </div>

          {/* ID инстанса */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ID инстанса
            </label>
            <input
              type="text"
              value={formData.instanceId}
              onChange={(e) => handleInputChange('instanceId', e.target.value)}
              placeholder="instance12345"
              className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 transition-colors
                       ${errors.instanceId ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.instanceId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.instanceId}</p>
            )}
          </div>
        </div>

        {/* Дополнительные настройки */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
            Дополнительные параметры
          </h4>

          {/* Включен */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => handleInputChange('isEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2
                         dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Включить WhatsApp уведомления
              </span>
            </label>
          </div>

          {/* Количество попыток */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Количество попыток отправки
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.retryAttempts}
              onChange={(e) => handleInputChange('retryAttempts', Number(e.target.value))}
              className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 transition-colors
                       ${errors.retryAttempts ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.retryAttempts && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.retryAttempts}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              От 0 до 10 попыток при ошибке отправки
            </p>
          </div>

          {/* Задержка между попытками */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Задержка между попытками (секунды)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={formData.retryDelaySeconds}
              onChange={(e) => handleInputChange('retryDelaySeconds', Number(e.target.value))}
              className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 transition-colors
                       ${errors.retryDelaySeconds ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.retryDelaySeconds && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.retryDelaySeconds}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              От 1 до 300 секунд между попытками
            </p>
          </div>

          {/* Результат тестирования */}
          {testResult && (
            <div className={`p-4 rounded-xl border ${
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  testResult.success
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  {testResult.message}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        {config && (
          <button
            onClick={handleTest}
            disabled={testing || !formData.isEnabled}
            className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                     border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? 'Тестирование...' : 'Тестировать соединение'}
          </button>
        )}
        
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(errors).length > 0}
          className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 
                   rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 
                   focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed 
                   transition-all duration-200 transform hover:scale-105"
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
}