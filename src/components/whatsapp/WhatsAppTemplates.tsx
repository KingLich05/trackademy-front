'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, EyeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppApiService } from '../../services/WhatsAppApiService';
import { WhatsAppTemplate, WhatsAppTemplateRequest, NOTIFICATION_TYPES, LANGUAGES } from '../../types/WhatsApp';
import { useToast } from '../../contexts/ToastContext';

export default function WhatsAppTemplates() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<WhatsAppTemplateRequest>({
    type: 1,
    language: 1,
    templateText: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewVariables, setPreviewVariables] = useState<string[]>([]);

  // Загрузка шаблонов при монтировании
  useEffect(() => {
    loadTemplates();
  }, []);

  // Извлечение переменных при изменении текста шаблона
  useEffect(() => {
    const variables = WhatsAppApiService.extractVariablesFromTemplate(formData.templateText);
    setPreviewVariables(variables);
  }, [formData.templateText]);

  const loadTemplates = async () => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      const response = await WhatsAppApiService.getTemplates(user.organizationId);
      setTemplates(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showError('Ошибка загрузки шаблонов: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      type: 1,
      language: 1,
      templateText: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setFormData({
      type: template.type,
      language: template.language,
      templateText: template.templateText,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({
      type: 1,
      language: 1,
      templateText: '',
    });
    setErrors({});
    setPreviewVariables([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const validation = WhatsAppApiService.validateTemplateText(formData.templateText);
    if (!validation.isValid) {
      newErrors.templateText = validation.errors.join(', ');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.organizationId || !validateForm()) return;

    try {
      setSaving(true);
      const response = await WhatsAppApiService.saveTemplate(user.organizationId, formData);
      
      showSuccess(response.message);
      closeModal();
      await loadTemplates();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showError('Ошибка сохранения: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof WhatsAppTemplateRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const getTemplatesByType = () => {
    return NOTIFICATION_TYPES.map(notificationType => {
      const typeTemplates = templates.filter(t => t.type === notificationType.value);
      return {
        ...notificationType,
        templates: typeTemplates,
      };
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Шаблоны сообщений
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Создавайте и редактируйте шаблоны для различных типов уведомлений
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 
                   rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 
                   focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105
                   flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Новый шаблон</span>
        </button>
      </div>

      {/* Templates List */}
      <div className="space-y-6">
        {getTemplatesByType().map(notificationType => (
          <div key={notificationType.value} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                {notificationType.displayName}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Шаблоны для уведомлений типа &quot;{notificationType.name}&quot;
              </p>
            </div>
            
            <div className="p-4">
              {notificationType.templates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                    <EyeIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Нет шаблонов для данного типа уведомлений
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notificationType.templates.map(template => (
                    <div key={template.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {WhatsAppApiService.getLanguageDisplayName(template.language)}
                        </span>
                        <button
                          onClick={() => openEditModal(template)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <span className="font-medium">Переменные:</span>{' '}
                        {template.variables.length > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400">
                            {template.variables.map(v => `{${v}}`).join(', ')}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">нет</span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-20 overflow-y-auto">
                        {template.templateText}
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-600">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          template.isActive 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {template.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {template.updatedAt && new Date(template.updatedAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
            onClick={closeModal}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg p-4">
            <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                  <h3 className="text-lg font-medium text-white">
                    {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
                  </h3>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-4">
                  {/* Тип уведомления */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Тип уведомления
                    </label>
                    <div className="relative">
                      <select
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                 appearance-none cursor-pointer transition-colors"
                      >
                        {NOTIFICATION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.displayName}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Язык */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Язык
                    </label>
                    <div className="relative">
                      <select
                        value={formData.language}
                        onChange={(e) => handleInputChange('language', Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                 appearance-none cursor-pointer transition-colors"
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.value} value={lang.value}>
                            {lang.displayName}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Текст шаблона */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Текст шаблона
                    </label>
                    <textarea
                      value={formData.templateText}
                      onChange={(e) => handleInputChange('templateText', e.target.value)}
                      rows={6}
                      placeholder="Введите текст шаблона. Используйте {переменная} для вставки динамических значений."
                      className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 transition-colors resize-none
                               ${errors.templateText ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    {errors.templateText && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.templateText}</p>
                    )}
                    
                    {/* Найденные переменные */}
                    {previewVariables.length > 0 && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                          Найденные переменные:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {previewVariables.map(variable => (
                            <span
                              key={variable}
                              className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full"
                            >
                              {'{' + variable + '}'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 
                             border border-gray-300 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || Object.keys(errors).length > 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 
                             rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 
                             focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed 
                             transition-all duration-200 transform hover:scale-105"
                  >
                    {saving ? 'Сохранение...' : editingTemplate ? 'Обновить' : 'Создать'}
                  </button>
                </div>
              </div>
          </div>
        </>
      )}
    </div>
  );
}