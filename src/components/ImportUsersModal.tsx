'use client';

import React, { useState, useRef } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { ImportResult, ImportError } from '../types/User';
import { FixImportErrorModal } from './FixImportErrorModal';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { cleanUserFormData } from '../utils/apiHelpers';
import { API_BASE_URL } from '../lib/api-config';

interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<ImportResult>;
  organizationId: string;
}

export const ImportUsersModal: React.FC<ImportUsersModalProps> = ({
  isOpen,
  onClose,
  onImport,
  organizationId
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fixingError, setFixingError] = useState<ImportError | null>(null);
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setImportResult(null);
      setError(null);
      onClose();
    }
  };

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const validExtensions = ['.xls', '.xlsx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Можно загружать только Excel файлы (.xls, .xlsx)');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Размер файла не должен превышать 10 МБ');
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await onImport(selectedFile);
      setImportResult(result);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при импорте файла');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/User/download-template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Не удалось скачать шаблон');
      }

      // Получаем blob из ответа
      const blob = await response.blob();
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_users.xlsx'; // Имя файла для скачивания
      document.body.appendChild(link);
      link.click();
      
      // Очищаем
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при скачивании шаблона');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFixError = (errorData: ImportError) => {
    setFixingError(errorData);
    setIsFixModalOpen(true);
  };

  const handleCreateFixedUser = async (userData: {
    login: string;
    fullName: string;
    password: string;
    phone: string;
    parentPhone: string;
    birthday: string;
    role: number;
    organizationId: string;
    isTrial: boolean;
  }) => {
    // Создаем пользователя через API
    const cleanUserData = cleanUserFormData({
      login: userData.login,
      fullName: userData.fullName,
      password: userData.password,
      phone: userData.phone || null,
      parentPhone: userData.parentPhone || null,
      birthday: userData.birthday || null,
      role: userData.role,
      organizationId: userData.organizationId,
      isTrial: userData.isTrial
    });

    const response = await fetch(`${API_BASE_URL}/User/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(cleanUserData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Не удалось создать пользователя');
    }

    // Убираем исправленного пользователя из списка ошибок
    if (importResult && fixingError) {
      setImportResult({
        ...importResult,
        errors: importResult.errors.filter(e => e.rowNumber !== fixingError.rowNumber),
        errorCount: importResult.errorCount - 1,
        successCount: importResult.successCount + 1
      });
    }

    // Закрываем модалку исправления
    setIsFixModalOpen(false);
    setFixingError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <ArrowUpTrayIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Импорт пользователей</h2>
                <p className="text-white/80 text-sm">Загрузите Excel файл с данными пользователей</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="w-10 h-10 bg-white/20 hover:bg-white/40 hover:scale-110 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Закрыть"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {!importResult ? (
            <>
              {/* Download Template Button */}
              <div className="mb-6">
                <button
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isDownloadingTemplate ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-medium">Загрузка...</span>
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="w-5 h-5" />
                      <span className="font-medium">Скачать шаблон Excel</span>
                    </>
                  )}
                </button>
              </div>

              {/* File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500'
                }`}
              >
                <ArrowUpTrayIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Перетащите файл сюда или
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  Выберите файл
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Поддерживаемые форматы: .xls, .xlsx (макс. 10 МБ)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Selected File */}
              {selectedFile && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                        <DocumentArrowDownIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(selectedFile.size / 1024).toFixed(2)} КБ
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || isUploading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Импорт...
                    </span>
                  ) : (
                    'Импортировать'
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Import Results */}
              <div className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Всего строк</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{importResult.totalRows}</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Успешно</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{importResult.successCount}</p>
                  </div>
                  <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Ошибки</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">{importResult.errorCount}</p>
                  </div>
                </div>

                {/* Success Message */}
                {importResult.successCount > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircleIcon className="w-5 h-5" />
                      <span className="font-medium">
                        Успешно импортировано {importResult.successCount} пользовател{importResult.successCount === 1 ? 'ь' : importResult.successCount < 5 ? 'я' : 'ей'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Errors List */}
                {importResult.errors.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                      Ошибки импорта ({importResult.errors.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div
                          key={index}
                          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                {error.rowNumber}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white mb-1">
                                {error.fullName}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Телефон: {error.phone}
                              </p>
                              <ul className="space-y-1 mb-3">
                                {error.errors.map((err, errIndex) => (
                                  <li key={errIndex} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                    {err}
                                  </li>
                                ))}
                              </ul>
                              <button
                                onClick={() => handleFixError(error)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium text-sm"
                              >
                                <UserPlusIcon className="w-4 h-4" />
                                Создать вручную
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="mt-6">
                <button
                  onClick={handleClose}
                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  Закрыть
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fix Import Error Modal */}
      <FixImportErrorModal
        isOpen={isFixModalOpen}
        onClose={() => {
          setIsFixModalOpen(false);
          setFixingError(null);
        }}
        errorData={fixingError}
        onCreateUser={handleCreateFixedUser}
        organizationId={organizationId}
      />
    </div>
  );
};
