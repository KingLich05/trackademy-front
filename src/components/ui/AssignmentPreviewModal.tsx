'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';

interface AssignmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  fileName: string;
  fileSize?: number;
  onDownload: () => void;
}

export function AssignmentPreviewModal({ 
  isOpen, 
  onClose, 
  assignmentId, 
  fileName, 
  fileSize, 
  onDownload 
}: AssignmentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup URL when modal closes
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setLoading(true);
      setError(null);
      return;
    }

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const blob = await AuthenticatedApiService.downloadAssignmentFile(assignmentId);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        console.error('Failed to load assignment preview:', err);
        setError('Не удалось загрузить превью файла');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [isOpen, assignmentId]);

  if (!isOpen) return null;

  const isPDF = (filename: string): boolean => {
    return filename.toLowerCase().endsWith('.pdf');
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Скачать файл
            </button>
          </div>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Превью недоступно</p>
        </div>
      );
    }

    // PDF Preview
    if (isPDF(fileName)) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[600px] border-0 rounded-lg"
          title={fileName}
        />
      );
    }

    // Unsupported format fallback
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Превью для этого типа файла недоступно
          </p>
          <button
            onClick={onDownload}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Скачать файл
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              Предпросмотр файла
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {fileName} {fileSize && `• ${(fileSize / 1024 / 1024).toFixed(2)} МБ`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={onDownload}
              className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              title="Скачать"
            >
              <ArrowDownTrayIcon className="w-6 h-6" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Закрыть"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}