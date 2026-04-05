'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { BookOpenIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { LibraryMaterial } from '../../types/LibraryMaterial';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { BaseModal } from '../../components/ui/BaseModal';
import { useDebounce } from '../../hooks/useDebounce';
import { MaterialPreviewModal } from '../../components/ui/MaterialPreviewModal';

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.rtf',
  '.ppt', '.pptx', '.xls', '.xlsx', '.csv',
  '.jpg', '.jpeg', '.png', '.gif',
  '.zip', '.rar', '.7z', '.epub', '.djvu'
];

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150 MB

export default function LibraryPage() {
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [materials, setMaterials] = useState<LibraryMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const [searchTitle, setSearchTitle] = useState('');
  const debouncedSearch = useDebounce(searchTitle, 300);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<LibraryMaterial | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<LibraryMaterial | null>(null);

  const [uploadData, setUploadData] = useState({ title: '', description: '', file: null as File | null });
  const [editData, setEditData] = useState({ title: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const isStudent = user?.role === 'Student';
  const canUpload = !!user && !isStudent;

  const canEditDelete = (material: LibraryMaterial): boolean => {
    if (!user) return false;
    return (
      user.id === material.uploadedById ||
      user.role === 'Administrator' ||
      user.role === 'Owner'
    );
  };

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await AuthenticatedApiService.getLibraryMaterials(
        currentPage,
        pageSize,
        debouncedSearch || undefined
      );
      setMaterials(response.items);
      setTotalCount(response.totalCount);
      setTotalPages(Math.ceil(response.totalCount / pageSize));
    } catch {
      showError('Ошибка загрузки библиотеки');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, showError]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMaterials();
    }
  }, [isAuthenticated, user, loadMaterials]);

  // Reset to first page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleUpload = async () => {
    if (!uploadData.title.trim()) {
      showError('Введите название');
      return;
    }
    if (!uploadData.file) {
      showError('Выберите файл');
      return;
    }
    const ext = '.' + uploadData.file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showError('Недопустимый формат файла. Разрешены: ' + ALLOWED_EXTENSIONS.join(', '));
      return;
    }
    if (uploadData.file.size > MAX_FILE_SIZE) {
      showError('Размер файла не должен превышать 150 МБ');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('title', uploadData.title.trim());
      if (uploadData.description.trim()) {
        formData.append('description', uploadData.description.trim());
      }
      formData.append('file', uploadData.file);
      await AuthenticatedApiService.uploadLibraryMaterial(formData);
      showSuccess('Материал успешно загружен');
      setIsUploadModalOpen(false);
      setUploadData({ title: '', description: '', file: null });
      setFileInputKey(prev => prev + 1);
      loadMaterials();
    } catch {
      showError('Ошибка загрузки материала');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (material: LibraryMaterial) => {
    setSelectedMaterial(material);
    setEditData({ title: material.title, description: material.description || '' });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedMaterial || !editData.title.trim()) {
      showError('Название обязательно');
      return;
    }
    try {
      await AuthenticatedApiService.updateLibraryMaterial(selectedMaterial.id, {
        title: editData.title.trim(),
        description: editData.description.trim() || undefined
      });
      showSuccess('Материал обновлён');
      setIsEditModalOpen(false);
      loadMaterials();
    } catch {
      showError('Ошибка обновления материала');
    }
  };

  const handleDelete = (material: LibraryMaterial) => {
    setSelectedMaterial(material);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMaterial) return;
    try {
      setDeleting(true);
      await AuthenticatedApiService.deleteLibraryMaterial(selectedMaterial.id);
      showSuccess('Материал удалён');
      setIsDeleteModalOpen(false);
      setSelectedMaterial(null);
      loadMaterials();
    } catch {
      showError('Ошибка удаления материала');
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = (material: LibraryMaterial) => {
    setPreviewMaterial(material);
    setIsPreviewModalOpen(true);
  };

  const handleDownload = async (material: LibraryMaterial) => {
    try {
      await AuthenticatedApiService.downloadLibraryMaterial(material.id, material.originalFileName);
    } catch {
      showError('Ошибка скачивания файла');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getFileIcon = (contentType: string, fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (contentType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (ext === 'pdf' || contentType === 'application/pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📋';
    if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
    return '📁';
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 max-w-full overflow-x-hidden">
      <div className="w-full space-y-6 mt-16">
        <PageHeaderWithStats
          title="Библиотека"
          subtitle="Общие учебные материалы организации"
          icon={BookOpenIcon}
          gradientFrom="blue-500"
          gradientTo="indigo-600"
          actionLabel={canUpload ? 'Загрузить материал' : undefined}
          onAction={canUpload ? () => setIsUploadModalOpen(true) : undefined}
          stats={[
            { label: 'Всего материалов', value: totalCount, color: 'blue' },
            { label: 'На странице', value: materials.length, color: 'indigo' },
            { label: 'Страниц', value: totalPages, color: 'violet' }
          ]}
        />

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Поиск по названию
            </label>
            <input
              type="text"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="Введите название..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Materials Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
          ) : materials.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpenIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Материалы не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-custom">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">№</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Название</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Файл</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Загрузил</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Дата</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {materials.map((material, index) => (
                    <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg mx-auto">
                          {(currentPage - 1) * pageSize + index + 1}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {material.title}
                        </div>
                        {material.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">
                            {material.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFileIcon(material.contentType, material.originalFileName)}</span>
                          <div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
                              {material.originalFileName}
                            </div>
                            <div className="text-xs text-gray-400">{formatFileSize(material.fileSize)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {material.uploadedByName}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(material.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handlePreview(material)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                            title="Просмотр"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(material)}
                            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Скачать"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          {canEditDelete(material) && (
                            <>
                              <button
                                onClick={() => handleEdit(material)}
                                className="p-2 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                                title="Редактировать"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(material)}
                                className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Удалить"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Страница {currentPage} из {totalPages} · Всего: {totalCount}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <BaseModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadData({ title: '', description: '', file: null });
          setFileInputKey(prev => prev + 1);
        }}
        title="Загрузить материал в библиотеку"
        gradientFrom="from-blue-500"
        gradientTo="to-indigo-600"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              maxLength={255}
              placeholder="Введите название материала"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Описание
            </label>
            <textarea
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              maxLength={1000}
              rows={3}
              placeholder="Необязательное описание..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Файл <span className="text-red-500">*</span>
            </label>
            <input
              key={fileInputKey}
              type="file"
              onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              accept={ALLOWED_EXTENSIONS.join(',')}
            />
            <p className="mt-1 text-xs text-gray-400">Макс. 150 МБ · {ALLOWED_EXTENSIONS.join(', ')}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setIsUploadModalOpen(false); setUploadData({ title: '', description: '', file: null }); setFileInputKey(prev => prev + 1); }}
              disabled={uploading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50"
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Edit Modal */}
      <BaseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Редактировать материал"
        gradientFrom="from-amber-500"
        gradientTo="to-orange-600"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              maxLength={255}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Описание
            </label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              maxLength={1000}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Отмена
            </button>
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg"
            >
              Сохранить
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedMaterial(null); }}
        onConfirm={handleConfirmDelete}
        title="Удалить материал"
        message={`Вы уверены, что хотите удалить материал "${selectedMaterial?.title}"? Это действие необратимо.`}
        isLoading={deleting}
      />

      {previewMaterial && (
        <MaterialPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setPreviewMaterial(null);
          }}
          material={previewMaterial}
          onDownload={() => handleDownload(previewMaterial)}
          fetchBlob={(materialId) => AuthenticatedApiService.getLibraryMaterialBlob(materialId)}
        />
      )}
    </div>
  );
}
