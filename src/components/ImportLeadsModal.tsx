'use client';

import React, { useState, useRef } from 'react';
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';

type LeadImportMode = 0 | 1 | 2;

interface LeadImportError {
  rowNumber: number;
  reason: string;
}

interface LeadImportResult {
  totalRows: number;
  successCount: number;
  importedLeads: number;
  errorCount: number;
  createdFunnels: number;
  createdStages: number;
  createdLeads: number;
  updatedLeads: number;
  skippedLeads: number;
  errors: LeadImportError[];
}

interface ImportLeadsModalProps {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MODE_OPTIONS: { value: LeadImportMode; label: string; desc: string }[] = [
  { value: 0, label: 'Только создание', desc: 'Импортировать только новые лиды, пропустить существующие' },
  { value: 1, label: 'Пропустить дубли', desc: 'Создать новые лиды, дублирующиеся — пропустить без ошибок' },
  { value: 2, label: 'Обновить существующие', desc: 'Создать новые и обновить уже существующие лиды' },
];

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({
  isOpen,
  organizationId,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<LeadImportMode>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isUploading) {
      const hadResult = !!importResult;
      setSelectedFile(null);
      setImportResult(null);
      setError(null);
      setMode(1);
      onClose();
      if (hadResult) onSuccess();
    }
  };

  const validateFile = (file: File): boolean => {
    const validExtensions = ['.xls', '.xlsx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError('Можно загружать только Excel файлы (.xls, .xlsx)');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await AuthenticatedApiService.importLeads(organizationId, selectedFile, mode);
      setImportResult(result);
      setSelectedFile(null);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при импорте файла');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <ArrowUpTrayIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Импорт лидов</h2>
                <p className="text-white/80 text-sm">Загрузите Excel файл со списком лидов</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="w-10 h-10 bg-white/20 hover:bg-white/40 hover:scale-110 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto space-y-5">
          {!importResult ? (
            <>
              {/* Mode selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Режим импорта
                </label>
                <div className="space-y-2">
                  {MODE_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        mode === opt.value
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        value={opt.value}
                        checked={mode === opt.value}
                        onChange={() => setMode(opt.value)}
                        className="mt-0.5 accent-violet-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* File drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragging
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <ArrowUpTrayIcon className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Перетащите файл сюда или нажмите для выбора
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  .xls, .xlsx — макс. 10 МБ
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Selected file */}
              {selectedFile && (
                <div className="p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                      <ArrowUpTrayIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024).toFixed(1)} КБ
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="flex-1 px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || isUploading}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Импорт...
                    </span>
                  ) : 'Импортировать'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Всего строк</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{importResult.totalRows}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 text-center">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Успешно</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{importResult.successCount}</p>
                </div>
                <div className={`rounded-xl p-4 border text-center ${
                  importResult.errorCount > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600'
                }`}>
                  <p className={`text-xs font-medium mb-1 ${
                    importResult.errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>Ошибки</p>
                  <p className={`text-2xl font-bold ${
                    importResult.errorCount > 0 ? 'text-red-900 dark:text-red-100' : 'text-gray-400 dark:text-gray-500'
                  }`}>{importResult.errorCount}</p>
                </div>
              </div>

              {/* Detailed breakdown */}
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-600">
                {[
                  { label: 'Создано воронок', value: importResult.createdFunnels, color: 'text-violet-600 dark:text-violet-400' },
                  { label: 'Создано этапов', value: importResult.createdStages, color: 'text-indigo-600 dark:text-indigo-400' },
                  { label: 'Создано лидов', value: importResult.createdLeads, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Обновлено лидов', value: importResult.updatedLeads, color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Пропущено лидов', value: importResult.skippedLeads, color: 'text-amber-600 dark:text-amber-400' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Errors */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <ExclamationTriangleIcon className={`w-4 h-4 ${importResult.errors.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  Ошибки ({importResult.errors.length})
                </h3>
                {importResult.errors.length === 0 ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Ошибок нет, все записи обработаны успешно</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">
                          Строка {err.rowNumber}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">{err.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setImportResult(null); setError(null); }}
                  className="flex-1 px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium text-sm transition-colors"
                >
                  Импортировать ещё
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all duration-200"
                >
                  Закрыть
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
