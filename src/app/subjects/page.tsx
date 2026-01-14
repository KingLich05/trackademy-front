'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { BookOpenIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Subject, SubjectFormData, PaymentType, getPaymentTypeLabel } from '../../types/Subject';
import { UniversalModal, useUniversalModal, SubjectForm, createSubjectValidator } from '../../components';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { useColumnVisibility, ColumnVisibilityControl } from '../../components/ui/ColumnVisibilityControl';
import { useApiToast } from '../../hooks/useApiToast';
import Link from 'next/link';

interface SubjectsResponse {
  items: Subject[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export default function SubjectsPage() {
  const { isAuthenticated, user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // Универсальная система модалов
  const initialData: Record<string, unknown> = {
    name: '',
    description: '',
    price: 0,
    paymentType: undefined, // Без значения по умолчанию
    lessonsPerMonth: 0,
    totalLessons: 0,
    organizationId: user?.organizationId || ''
  };
  
  const subjectModal = useUniversalModal('subject', initialData);

  // API Toast уведомления
  const { createOperation, updateOperation, deleteOperation, loadOperation } = useApiToast();

  // Управление видимостью колонок
  const { columns, toggleColumn, isColumnVisible } = useColumnVisibility([
    { key: 'number', label: '№', required: true },
    { key: 'name', label: 'Название предмета', required: true },
    { key: 'description', label: 'Описание', required: false },
    { key: 'price', label: 'Цена', required: false },
    { key: 'paymentType', label: 'Тип оплаты', required: false },
    { key: 'lessonsPerMonth', label: 'Уроков/месяц', required: false },
    { key: 'totalLessons', label: 'Всего уроков', required: false },
    { key: 'actions', label: 'Действия', required: true }
  ]);

  const loadSubjects = useCallback(async (page: number = currentPage, isTableOnly: boolean = true, customPageSize?: number) => {
    const actualPageSize = customPageSize ?? pageSize;
    if (isTableOnly) {
      setTableLoading(true);
    }
    setError(null);
    
    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
      
      if (!organizationId) {
        setError('Не удается определить организацию пользователя');
        return;
      }

      const requestBody = {
        pageNumber: page,
        pageSize: actualPageSize,
        organizationId: organizationId
      };

      const data = await loadOperation(
        () => AuthenticatedApiService.post<SubjectsResponse>('/Subject/GetAllSubjects', requestBody),
        'предметы'
      );
      
      setSubjects(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      setError('Не удалось загрузить список предметов');
    } finally {
      if (isTableOnly) {
        setTableLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, pageSize]);

  useEffect(() => {
    if (isAuthenticated && user?.organizationId) {
      loadSubjects(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.organizationId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadSubjects(page, true);
  };

  // Check authentication after all hooks are called
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Требуется авторизация</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Войдите в систему для управления предметами организации
              </p>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                Войти в систему
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    subjectModal.openCreateModal();
  };

  const handleSaveCreate = async (formData: Record<string, unknown>) => {
    const subjectData = formData as SubjectFormData;
    const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
    
    if (!organizationId) {
      throw new Error('Не удается определить организацию пользователя');
    }

    const dataToSend = {
      ...subjectData,
      organizationId: organizationId,
    };

    const result = await createOperation(
      () => AuthenticatedApiService.post('/Subject/create', dataToSend),
      'Предмет'
    );
    
    // Только если операция успешна - перезагружаем и закрываем модал
    if (result.success) {
      await loadSubjects(currentPage, true);
      subjectModal.closeModal();
    }
    // Если ошибка - модал остается открытым, toast уже показан
  };

  const handleEdit = (id: string) => {
    const subject = subjects.find(s => s.id === id);
    console.log('handleEdit called with id:', id, 'found subject:', subject);
    
    if (subject) {
      const editData = {
        id: subject.id,
        name: subject.name,
        description: subject.description || '',
        price: subject.price,
        paymentType: subject.paymentType,
        lessonsPerMonth: subject.lessonsPerMonth,
        totalLessons: subject.totalLessons,
        organizationId: subject.organizationId
      } as SubjectFormData & { id: string };
      
      console.log('Edit data prepared:', editData);
      subjectModal.openEditModal(editData);
      console.log('Modal opened');
    }
  };

  const handleSaveEdit = async (formData: Record<string, unknown>, subjectId?: string) => {
    console.log('handleSaveEdit called with:', { formData, subjectId });
    
    if (!subjectId) {
      console.log('No subjectId provided');
      return;
    }
    
    const subjectData = formData as SubjectFormData;
    console.log('Subject data to send:', subjectData);
    
    const result = await updateOperation(
      () => AuthenticatedApiService.put(`/Subject/${subjectId}`, subjectData),
      'Предмет'
    );
    
    console.log('Update result:', result);
    
    // Только если операция успешна - перезагружаем и закрываем модал
    if (result.success) {
      await loadSubjects(currentPage, true);
      subjectModal.closeModal();
    }
    // Если ошибка - модал остается открытым, toast уже показан
  };

  const handleDelete = (id: string) => {
    const subject = subjects.find(s => s.id === id);
    if (subject) {
      setDeletingSubject(subject);
      setIsDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubject) return;
    
    const result = await deleteOperation(
      () => AuthenticatedApiService.delete(`/Subject/${deletingSubject.id}`),
      'Предмет'
    );
    
    // Только если операция успешна - перезагружаем и закрываем модал
    if (result.success) {
      await loadSubjects(currentPage, true);
      handleCloseDeleteModal();
    }
    // Если ошибка - модал остается открытым, toast уже показан
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingSubject(null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadSubjects(1, true, newPageSize);
  };

  const renderPagination = () => {
    // Показываем пагинацию всегда, если есть totalPages или totalCount
    if (totalPages === 0 && totalCount === 0) return null;
    
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-t border-gray-200/50 dark:border-gray-600/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Mobile Pagination */}
          <div className="flex justify-center sm:hidden w-full">
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Предыдущая
              </button>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg">
                {currentPage} из {totalPages}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Следующая
              </button>
            </div>
          </div>

          {/* Desktop Pagination */}
          <div className="hidden sm:flex sm:items-center sm:justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Показано <span className="font-semibold text-blue-600 dark:text-blue-400">{(currentPage - 1) * pageSize + 1}</span> до{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">{Math.min(currentPage * pageSize, totalCount)}</span> из{' '}
                <span className="font-semibold text-purple-600 dark:text-purple-400">{totalCount}</span> результатов
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  На странице:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                ←
              </button>
              
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${
                    currentPage === number
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {number}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl border border-red-200/50 dark:border-red-700/50 p-6">
            <div className="text-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600 dark:text-red-400 mx-auto mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ошибка загрузки</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{error}</p>
              <button
                onClick={() => loadSubjects(currentPage, true)}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 page-container">
      <div className="w-full space-y-6">
        {/* Modern Header Card */}
        <PageHeaderWithStats
          title="Предметы"
          subtitle="Управление предметами организации"
          icon={BookOpenIcon}
          gradientFrom="blue-500"
          gradientTo="purple-600"
          actionLabel="Добавить предмет"
          onAction={handleCreate}
          extraActions={
            <ColumnVisibilityControl
              columns={columns}
              onColumnToggle={toggleColumn}
              variant="header"
            />
          }
          stats={[
            { label: "Всего предметов", value: totalCount, color: "violet" },
            { label: "Текущая страница", value: currentPage, color: "purple" },
            { label: "Всего страниц", value: totalPages, color: "indigo" }
          ]}
        />

        {/* Content Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Loading State */}
          {tableLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Загрузка предметов...</p>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block">{!tableLoading && (
            <div className="overflow-x-auto scrollbar-custom">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600">
                  <tr>
                    {isColumnVisible('number') && (
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '50px' }}>
                        №
                      </th>
                    )}
                    {isColumnVisible('name') && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '20%' }}>
                        Название предмета
                      </th>
                    )}
                    {isColumnVisible('description') && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '30%' }}>
                        Описание
                      </th>
                    )}
                    {isColumnVisible('price') && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '15%' }}>
                        Цена
                      </th>
                    )}
                    {isColumnVisible('paymentType') && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '15%' }}>
                        Тип оплаты
                      </th>
                    )}
                    {(isColumnVisible('lessonsPerMonth') || isColumnVisible('totalLessons')) && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '12%' }}>
                        Уроки
                      </th>
                    )}
                    {isColumnVisible('actions') && (
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '100px' }}>
                        Действия
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {subjects.map((subject, index) => (
                    <tr key={subject.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200">
                      {isColumnVisible('number') && (
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg shadow-sm mx-auto">
                            {(currentPage - 1) * pageSize + index + 1}
                          </div>
                        </td>
                      )}
                      {isColumnVisible('name') && (
                        <td className="px-3 py-3 truncate">
                          <div className="flex items-center">
                            <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg mr-3">
                              <BookOpenIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{subject.name}</div>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('description') && (
                        <td className="px-3 py-3">
                          <div className="text-sm text-gray-600 dark:text-gray-300 truncate" title={subject.description}>
                            {subject.description || (
                              <span className="italic text-gray-400 dark:text-gray-500">Описание отсутствует</span>
                            )}
                          </div>
                        </td>
                      )}
                      {isColumnVisible('price') && (
                        <td className="px-3 py-3 truncate">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            <span>{subject.price.toLocaleString()} тенге</span>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('paymentType') && (
                        <td className="px-3 py-3 truncate">
                          <div className="text-sm text-gray-900 dark:text-white">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              subject.paymentType === PaymentType.Monthly
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : subject.paymentType === PaymentType.OneTime
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {getPaymentTypeLabel(subject.paymentType)}
                            </span>
                          </div>
                        </td>
                      )}
                      {(isColumnVisible('lessonsPerMonth') || isColumnVisible('totalLessons')) && (
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                          <div className="flex flex-col">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {subject.paymentType === PaymentType.Monthly ? 'Уроков/мес' : 'Всего уроков'}
                            </div>
                            <div className="font-medium">
                              {subject.paymentType === PaymentType.Monthly ? subject.lessonsPerMonth : subject.totalLessons}
                            </div>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('actions') && (
                        <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => handleEdit(subject.id)}
                              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                              title="Редактировать"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(subject.id)}
                              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                              title="Удалить"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">{!tableLoading && (
            <div className="space-y-4 p-4">
              {subjects.map((subject, index) => (
                <div key={subject.id} className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg shadow-sm">
                        {(currentPage - 1) * pageSize + index + 1}
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg mr-2">
                          <BookOpenIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{subject.name}</h3>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEdit(subject.id)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(subject.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {subject.description && (
                    <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200/30 dark:border-gray-600/30">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {subject.description}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200/30 dark:border-green-600/30">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Цена</div>
                      <div className="text-sm font-medium text-green-700 dark:text-green-300">
                        {subject.price.toLocaleString()} тенге
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200/30 dark:border-blue-600/30">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Тип оплаты</div>
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {getPaymentTypeLabel(subject.paymentType)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Lessons Configuration */}
                  <div className="mt-3">
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200/30 dark:border-purple-600/30">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {subject.paymentType === PaymentType.Monthly ? 'Уроков/мес' : 'Всего уроков'}
                      </div>
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {subject.paymentType === PaymentType.Monthly ? subject.lessonsPerMonth : subject.totalLessons}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Empty State */}
          {subjects.length === 0 && !tableLoading && (
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full w-16 h-16 mx-auto mb-4">
                <BookOpenIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mt-2" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Нет предметов</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Начните с добавления первого предмета в вашу организацию
              </p>
              <div className="mt-6">
                <button 
                  onClick={handleCreate}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Добавить предмет
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {renderPagination()}
        </div>
      </div>

      {/* Universal Subject Modal */}
      <UniversalModal
        isOpen={subjectModal.isOpen}
        onClose={subjectModal.closeModal}
        mode={subjectModal.mode}
        title={subjectModal.getConfig().title}
        subtitle={subjectModal.getConfig().subtitle}
        icon={subjectModal.getConfig().icon}
        gradientFrom={subjectModal.getConfig().gradientFrom}
        gradientTo={subjectModal.getConfig().gradientTo}
        initialData={subjectModal.initialData}
        data={subjectModal.editData || undefined}
        onSave={subjectModal.mode === 'create' ? handleSaveCreate : handleSaveEdit}
        validate={(data) => {
          const validationResult = createSubjectValidator(data as SubjectFormData);
          console.log('Validation result:', validationResult);
          return validationResult;
        }}
        submitText={subjectModal.getConfig().submitText}
        loadingText={subjectModal.getConfig().loadingText}
      >
        {(props) => <SubjectForm {...(props as unknown as Parameters<typeof SubjectForm>[0])} />}
      </UniversalModal>

      {/* Delete Subject Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Удаление предмета"
        message={`Вы уверены, что хотите удалить предмет "${deletingSubject?.name}"?`}
        itemName={deletingSubject?.name}
      />
    </div>
  );
}
