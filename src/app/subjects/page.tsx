'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { BookOpenIcon, PencilIcon, TrashIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Subject, SubjectFormData, SubjectPackage, PaymentType, getPaymentTypeLabel } from '../../types/Subject';
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
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // Универсальная система модалов
  const defaultPackage: SubjectPackage = {
    name: '',
    description: '',
    price: 0,
    paymentType: PaymentType.Monthly,
    lessonsPerMonth: 0,
    totalLessons: 0,
    hasFreezeOption: false,
    hasMakeUpLessons: false,
  };

  const initialData: Record<string, unknown> = {
    name: '',
    description: '',
    subjectPackages: [{ ...defaultPackage }],
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
    { key: 'packages', label: 'Пакеты', required: false },
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
    if (subject) {
      subjectModal.openEditModal({
        id: subject.id,
        name: subject.name,
        description: subject.description || '',
        subjectPackages: (subject.subjectPackages || []).map(pkg => ({ ...pkg })),
        organizationId: subject.organizationId
      } as SubjectFormData & { id: string });
    }
  };

  const handleSaveEdit = async (formData: Record<string, unknown>, subjectId?: string) => {
    if (!subjectId) return;
    
    const subjectData = formData as SubjectFormData;
    const result = await updateOperation(
      () => AuthenticatedApiService.updateSubject(subjectId, subjectData),
      'Предмет'
    );
    
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-container max-w-full overflow-x-hidden">
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
            { label: "Всего предметов", value: subjects.length, total: totalCount, color: "violet" },
            { label: "На странице", value: subjects.length, color: "purple" },
            { label: "Страниц", value: currentPage, total: totalPages, color: "indigo" }
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
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600">
                  <tr>
                    {isColumnVisible('number') && (
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '50px' }}>
                        №
                      </th>
                    )}
                    {isColumnVisible('name') && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '25%' }}>
                        Название предмета
                      </th>
                    )}
                    {isColumnVisible('description') && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '30%' }}>
                        Описание
                      </th>
                    )}
                    {isColumnVisible('packages') && (
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        Пакеты
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
                  {subjects.map((subject, index) => {
                    const isExpanded = expandedSubjectId === subject.id;
                    const pkgs = subject.subjectPackages || [];
                    return (
                      <React.Fragment key={subject.id}>
                        <tr
                          className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 cursor-pointer"
                          onClick={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                        >
                          {isColumnVisible('number') && (
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg shadow-sm mx-auto">
                                {(currentPage - 1) * pageSize + index + 1}
                              </div>
                            </td>
                          )}
                          {isColumnVisible('name') && (
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 dark:text-gray-500">
                                  {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                                </span>
                                <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg">
                                  <BookOpenIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{subject.name}</span>
                              </div>
                            </td>
                          )}
                          {isColumnVisible('description') && (
                            <td className="px-3 py-3">
                              <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                                {subject.description || <span className="italic text-gray-400 dark:text-gray-500">—</span>}
                              </span>
                            </td>
                          )}
                          {isColumnVisible('packages') && (
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {pkgs.slice(0, 3).map((pkg, pi) => (
                                  <span
                                    key={pi}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                                  >
                                    {pkg.name}
                                  </span>
                                ))}
                                {pkgs.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                    +{pkgs.length - 3}
                                  </span>
                                )}
                                {pkgs.length === 0 && (
                                  <span className="text-xs text-gray-400 italic">Нет пакетов</span>
                                )}
                              </div>
                            </td>
                          )}
                          {isColumnVisible('actions') && (
                            <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center space-x-2">
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
                        {isExpanded && pkgs.length > 0 && (
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td colSpan={10} className="p-0">
                              <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-gray-800/80 dark:to-gray-700/50 border-t border-blue-200/40 dark:border-blue-900/30 px-6 py-5">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="h-0.5 w-4 rounded-full bg-gradient-to-r from-blue-400 to-violet-500" />
                                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    Пакеты — {subject.name}
                                  </span>
                                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                  <span className="text-xs font-medium text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
                                    {pkgs.length} {pkgs.length === 1 ? 'пакет' : pkgs.length < 5 ? 'пакета' : 'пакетов'}
                                  </span>
                                </div>
                                {/* Package cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {pkgs.map((pkg, pi) => (
                                    <div
                                      key={pi}
                                      className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-600/60 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                                    >
                                      {/* Colored top stripe based on payment type */}
                                      <div className={`h-1 w-full ${pkg.paymentType === PaymentType.Monthly ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`} />
                                      <div className="p-4">
                                        {/* Package name + type badge */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">{pkg.name}</h4>
                                          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${pkg.paymentType === PaymentType.Monthly ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                                            {getPaymentTypeLabel(pkg.paymentType)}
                                          </span>
                                        </div>
                                        {pkg.description && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{pkg.description}</p>
                                        )}
                                        {/* Stats grid */}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-2.5 border border-green-100 dark:border-green-800/30">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Цена</div>
                                            <div className="text-sm font-bold text-green-700 dark:text-green-400">{pkg.price.toLocaleString()} ₸</div>
                                          </div>
                                          {pkg.pricePerLesson != null && pkg.pricePerLesson > 0 ? (
                                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-2.5 border border-purple-100 dark:border-purple-800/30">
                                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">За урок</div>
                                              <div className="text-sm font-bold text-purple-700 dark:text-purple-400">{pkg.pricePerLesson.toLocaleString()} ₸</div>
                                            </div>
                                          ) : (
                                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/30">
                                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                                                {pkg.paymentType === PaymentType.Monthly ? 'Ур/месяц' : 'Уроков всего'}
                                              </div>
                                              <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                {pkg.paymentType === PaymentType.Monthly ? pkg.lessonsPerMonth : pkg.totalLessons}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        {/* Options */}
                                        <div className="flex gap-2">
                                          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${pkg.hasFreezeOption ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800/40' : 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700 line-through'}`}>
                                            ❄️ Заморозка
                                          </span>
                                          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${pkg.hasMakeUpLessons ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40' : 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700 line-through'}`}>
                                            🔄 Отработка
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">{!tableLoading && (
            <div className="space-y-4 p-4">
              {subjects.map((subject, index) => {
                const pkgs = subject.subjectPackages || [];
                return (
                <div key={subject.id} className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200">
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
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {subject.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{subject.description}</p>
                  )}
                  {/* Packages */}
                  {pkgs.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Пакеты ({pkgs.length})</div>
                      {pkgs.map((pkg, pi) => (
                        <div key={pi} className="bg-white/70 dark:bg-gray-800/70 rounded-lg border border-gray-200/40 dark:border-gray-600/40 p-2.5">
                          <div className="font-medium text-sm text-gray-900 dark:text-white mb-1.5">{pkg.name}</div>
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                              {pkg.price.toLocaleString()} ₸
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-medium ${pkg.paymentType === PaymentType.Monthly ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                              {getPaymentTypeLabel(pkg.paymentType)}
                            </span>
                            {pkg.paymentType === PaymentType.Monthly ? (
                              <span className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{pkg.lessonsPerMonth} ур/мес</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{pkg.totalLessons} уроков</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
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
          const errors: Record<string, string> = {};
          const formData = data as SubjectFormData;

          if (!formData.name?.trim()) {
            errors.name = 'Название обязательно';
          }

          const pkgs = (formData.subjectPackages as SubjectPackage[]) || [];
          if (pkgs.length === 0) {
            errors.subjectPackages = 'Добавьте хотя бы один пакет';
          }
          pkgs.forEach((pkg, i) => {
            if (!pkg.name?.trim()) errors[`pkg_${i}_name`] = 'Название пакета обязательно';
            if (pkg.price === undefined || Number(pkg.price) < 0) errors[`pkg_${i}_price`] = 'Цена обязательна';
          });

          return errors;
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
