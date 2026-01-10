'use client';

import React, { useState, useEffect } from 'react';
import { Document, DocumentUploadData, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../../types/Document';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { 
  DocumentTextIcon, 
  ArrowUpTrayIcon, 
  EyeIcon, 
  TrashIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import OwnerProtectedRoute from '../../components/OwnerProtectedRoute';
import { useApiToast } from '../../hooks/useApiToast';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';

function DocumentsPage() {
  const { isAuthenticated } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadData, setUploadData] = useState<Partial<DocumentUploadData>>({
    name: '',
    type: 'Other'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);

  // API Toast notifications
  const { createOperation, deleteOperation, loadOperation } = useApiToast();

  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Требуется авторизация</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Войдите в систему для управления документами
          </p>
        </div>
      </div>
    );
  }

  const loadDocuments = async () => {
    try {
      const documents = await loadOperation(
        () => AuthenticatedApiService.getDocuments(),
        'документы'
      );
      
      setDocuments(documents);
      setError(null);
    } catch (error) {
      setError('Ошибка загрузки документов');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.name || !uploadData.type || !selectedFile) {
      return;
    }

    setIsUploading(true);
    try {
      await createOperation(
        () => AuthenticatedApiService.uploadDocument({
          name: uploadData.name!,
          type: uploadData.type!,
          file: selectedFile
        }),
        'документ'
      );

      await loadDocuments();
      handleCloseUploadModal();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (document: Document) => {
    setDeletingDocument(document);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDocument) return;

    try {
      await deleteOperation(
        () => AuthenticatedApiService.deleteDocument(deletingDocument.id),
        'документ'
      );

      await loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      handleCloseDeleteModal();
    }
  };

  const handleView = async (document: Document) => {
    try {
      const blob = await AuthenticatedApiService.getDocumentById(document.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Cleanup the URL after some time
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadData({ name: '', type: 'Other' });
    setSelectedFile(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingDocument(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill name if not set
      if (!uploadData.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadData(prev => ({ ...prev, name: nameWithoutExt }));
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
        
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <PageHeaderWithStats
          title="Документы"
          subtitle="Управление документами системы"
          icon={DocumentTextIcon}
          gradientFrom="blue-500"
          gradientTo="indigo-600"
          actionLabel="Загрузить документ"
          onAction={() => setIsUploadModalOpen(true)}
          stats={[]}
        />
        
        <div className="card text-center py-12">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <DocumentTextIcon className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Ошибка загрузки
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadDocuments}
            className="btn-primary"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 pt-12">
      <PageHeaderWithStats
        title="Документы"
        subtitle="Управление документами системы"
        icon={DocumentTextIcon}
        gradientFrom="blue-500"
        gradientTo="indigo-600"
        actionLabel="Загрузить документ"
        onAction={() => setIsUploadModalOpen(true)}
        stats={[
          { label: "Всего документов", value: documents.length, color: "blue" },
          { 
            label: "Публичные оферты", 
            value: documents.filter(d => d.type === 1).length, 
            color: "green" 
          },
          { 
            label: "Политики конфиденциальности", 
            value: documents.filter(d => d.type === 2).length, 
            color: "purple" 
          }
        ]}
      />

      {/* Content Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        {documents.length === 0 ? (
          <div className="text-center py-16 p-6">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto mb-6">
              <DocumentTextIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mt-2" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Нет документов</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Загрузите первый документ для начала работы
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105 inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Загрузить документ
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                        <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 break-words">
                          {document.fileName}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {DOCUMENT_TYPES[document.type]}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(document)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        title="Просмотр"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(document)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        title="Удалить"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <strong>Файл:</strong> <span className="break-all">{document.fileName}</span>
                    </div>
                    <div>
                      <strong>Размер:</strong> {formatFileSize(document.fileSize)}
                    </div>
                    <div>
                      <strong>Дата загрузки:</strong> {formatDate(document.uploadedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
                  <ArrowUpTrayIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Загрузить документ
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Добавьте новый документ в систему
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название документа <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadData.name || ''}
                    onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Введите название документа"
                    required
                  />
                </div>

                {/* Type Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип документа <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={uploadData.type || 'Other'}
                    onChange={(e) => setUploadData(prev => ({ 
                      ...prev, 
                      type: e.target.value as 'PublicOffer' | 'PrivacyPolicy' | 'Other'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* File Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Файл <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    accept=".pdf,.doc,.docx,.txt"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Выбран файл: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseUploadModal}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadData.name || !uploadData.type || !selectedFile || isUploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Загружается...
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                      Загрузить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Удалить документ"
        message={`Вы уверены, что хотите удалить документ "${deletingDocument?.fileName}"? Это действие нельзя отменить.`}
        onConfirm={handleConfirmDelete}
        onClose={handleCloseDeleteModal}
      />
    </div>
  );
}

// Wrap the entire component with OwnerProtectedRoute
export default function DocumentsPageWithProtection() {
  return (
    <OwnerProtectedRoute>
      <DocumentsPage />
    </OwnerProtectedRoute>
  );
}