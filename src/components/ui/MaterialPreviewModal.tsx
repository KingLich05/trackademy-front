'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

type PreviewableFile = {
  id: string;
  title: string;
  description?: string | null;
  originalFileName: string;
  contentType: string;
  fileSize: number;
};

interface MaterialPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: PreviewableFile;
  onDownload: () => void;
  fetchBlob: (materialId: string) => Promise<Blob>;
  canDownload?: boolean;
}

export function MaterialPreviewModal({ isOpen, onClose, material, onDownload, fetchBlob, canDownload = true }: MaterialPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup URL when modal closes
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setWordHtml(null);
      setLoading(true);
      setError(null);
      return;
    }

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const blob = await fetchBlob(material.id);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);

        // Для Word документов пробуем конвертировать в HTML
        if (isWordDoc(material.contentType, material.originalFileName)) {
          try {
            const mammoth = (await import('mammoth')).default;
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setWordHtml(result.value);
          } catch (err) {
            console.error('Failed to convert Word document:', err);
            // Не устанавливаем error, просто покажем fallback
          }
        }
      } catch (err) {
        console.error('Failed to load preview:', err);
        setError('Не удалось загрузить превью файла');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [isOpen, material.id]);

  if (!isOpen) return null;

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const isPDF = (contentType: string, filename: string): boolean => {
    return contentType === 'application/pdf' || getFileExtension(filename) === 'pdf';
  };

  const isImage = (contentType: string): boolean => {
    return contentType.startsWith('image/');
  };

  const isVideo = (contentType: string): boolean => {
    return contentType.startsWith('video/');
  };

  const isAudio = (contentType: string): boolean => {
    return contentType.startsWith('audio/');
  };

  const isWordDoc = (contentType: string, filename: string): boolean => {
    const ext = getFileExtension(filename);
    return (
      contentType.includes('msword') ||
      contentType.includes('wordprocessingml') ||
      ['doc', 'docx'].includes(ext)
    );
  };

  const isOfficeDoc = (contentType: string, filename: string): boolean => {
    const ext = getFileExtension(filename);
    return (
      contentType.includes('msword') ||
      contentType.includes('ms-excel') ||
      contentType.includes('ms-powerpoint') ||
      contentType.includes('openxmlformats') ||
      ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)
    );
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
            {canDownload && (
              <button
                onClick={onDownload}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Скачать файл
              </button>
            )}
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
    if (isPDF(material.contentType, material.originalFileName)) {
      const pdfSrc = canDownload ? previewUrl : `${previewUrl}#toolbar=0&navpanes=0`;
      return (
        <iframe
          src={pdfSrc}
          className="w-full h-[600px] border-0 rounded-lg"
          title={material.title}
        />
      );
    }

    // Image Preview
    if (isImage(material.contentType)) {
      return (
        <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <img
            src={previewUrl}
            alt={material.title}
            className="max-w-full max-h-[600px] object-contain rounded-lg"
          />
        </div>
      );
    }

    // Video Preview
    if (isVideo(material.contentType)) {
      return (
        <video
          controls
          className="w-full max-h-[600px] rounded-lg bg-black"
          src={previewUrl}
        >
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      );
    }

    // Audio Preview
    if (isAudio(material.contentType)) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="w-full max-w-2xl">
            <audio controls className="w-full" src={previewUrl}>
              Ваш браузер не поддерживает воспроизведение аудио.
            </audio>
          </div>
        </div>
      );
    }

    // Word Documents - показываем конвертированный HTML
    if (isWordDoc(material.contentType, material.originalFileName)) {
      if (wordHtml) {
        return (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-inner">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-12 rounded-lg shadow-lg overflow-auto max-h-[600px] border border-gray-200 dark:border-gray-700">
              <style dangerouslySetInnerHTML={{ __html: `
                .word-content * {
                  color: inherit !important;
                }
                .word-content {
                  line-height: 1.8;
                  font-size: 16px;
                }
                .word-content p {
                  margin-bottom: 1em;
                }
                .word-content h1, .word-content h2, .word-content h3 {
                  margin-top: 1.5em;
                  margin-bottom: 0.75em;
                  font-weight: 600;
                }
                .word-content ul, .word-content ol {
                  margin-left: 2em;
                  margin-bottom: 1em;
                }
                .word-content li {
                  margin-bottom: 0.5em;
                }
              `}} />
              {/* БЕЗОПАСНОЕ отображение - НЕ используем dangerouslySetInnerHTML */}
              <div className="word-content text-gray-900 dark:text-gray-100">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    🔒 Превью Word документов временно отключено по соображениям безопасности
                  </p>
                </div>
                {canDownload && (
                  <button
                    onClick={onDownload}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Скачать для просмотра
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }
      // Fallback если конвертация не удалась
      const ext = getFileExtension(material.originalFileName);
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <DocumentTextIcon className="w-20 h-20 text-gray-400 dark:text-gray-500 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Word документ
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Превью для этого файла временно недоступно.<br />
              Скачайте файл для просмотра в Microsoft Word.
            </p>
            {canDownload && (
              <button
                onClick={onDownload}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Скачать {material.originalFileName}
              </button>
            )}
          </div>
        </div>
      );
    }

    // Other Office Documents (Excel, PowerPoint)
    if (isOfficeDoc(material.contentType, material.originalFileName)) {
      const ext = getFileExtension(material.originalFileName);
      const docTypeNames: Record<string, string> = {
        'xls': 'Excel таблица',
        'xlsx': 'Excel таблица',
        'ppt': 'PowerPoint презентация',
        'pptx': 'PowerPoint презентация'
      };
      
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <DocumentTextIcon className="w-20 h-20 text-gray-400 dark:text-gray-500 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {docTypeNames[ext] || 'Office документ'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Превью для этого типа файла недоступно в браузере.<br />
              Скачайте файл для просмотра в соответствующей программе.
            </p>
            {canDownload && (
              <button
                onClick={onDownload}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Скачать {material.originalFileName}
              </button>
            )}
          </div>
        </div>
      );
    }

    // Text files
    if (material.contentType.startsWith('text/')) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[600px] border-0 rounded-lg bg-white dark:bg-gray-900"
          title={material.title}
        />
      );
    }

    // Unsupported format
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Превью для этого типа файла недоступно
          </p>
          {canDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Скачать файл
            </button>
          )}
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
              {material.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {material.originalFileName} • {(material.fileSize / 1024 / 1024).toFixed(2)} МБ
            </p>
            {material.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {material.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {canDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                title="Скачать"
              >
                <ArrowDownTrayIcon className="w-6 h-6" />
              </button>
            )}
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
