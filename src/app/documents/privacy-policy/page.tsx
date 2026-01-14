'use client';

import { useState, useEffect } from 'react';
import { AuthenticatedApiService } from '../../../services/AuthenticatedApiService';
import { Document } from '../../../types/Document';
import { DocumentTextIcon, ArrowLeftIcon, EyeIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadPrivacyPolicyDocument();
  }, []);

  const loadPrivacyPolicyDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      // Получаем список документов
      const documents = await AuthenticatedApiService.getDocuments();
      
      // Находим политику конфиденциальности (тип 1)
      const privacyPolicyDoc = documents.find(doc => doc.type === 1);
      
      if (!privacyPolicyDoc) {
        setError('Документ политики конфиденциальности не найден');
        return;
      }

      setDocumentData(privacyPolicyDoc);

      // Загружаем содержимое документа
      const blob = await AuthenticatedApiService.getDocumentById(privacyPolicyDoc.id);
      const url = URL.createObjectURL(blob);
      setDocumentUrl(url);

    } catch (error) {
      console.error('Error loading privacy policy document:', error);
      setError('Не удалось загрузить документ политики конфиденциальности');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = () => {
    if (documentData && documentUrl) {
      const link = window.document.createElement('a');
      link.href = documentUrl;
      link.download = documentData.fileName || 'privacy-policy.pdf';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка документа...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <DocumentTextIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Ошибка загрузки документа
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadPrivacyPolicyDocument}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-16">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push('/')}
                className="group flex items-center justify-center w-10 h-10 bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700 border border-gray-200/50 dark:border-gray-600/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                title="Назад на главную"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                  <DocumentTextIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Политика конфиденциальности
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Защита персональных данных
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {documentUrl && (
                <>
                  <button
                    onClick={openInNewTab}
                    className="group inline-flex items-center px-4 py-2.5 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 hover:scale-105"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    Открыть в новом окне
                  </button>
                  <button
                    onClick={downloadDocument}
                    className="group inline-flex items-center px-6 py-2.5 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <svg className="h-4 w-4 mr-2 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Скачать
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview */}
      {documentUrl && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="relative bg-gray-50 dark:bg-gray-900" style={{ height: '800px' }}>
              <iframe
                src={documentUrl}
                className="w-full h-full border-0 rounded-2xl"
                title="Политика конфиденциальности"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}