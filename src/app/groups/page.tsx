'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { UserGroupIcon, PencilIcon, TrashIcon, EyeIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '../../hooks/useDebounce';
import { Group, GroupFormData, GroupsResponse } from '../../types/Group';
import { User } from '../../types/User';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { UniversalModal, useUniversalModal, createGroupValidator } from '../../components';
import { GroupFormUniversal } from '../../components/forms/GroupFormUniversal';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { useColumnVisibility, ColumnVisibilityControl } from '../../components/ui/ColumnVisibilityControl';
import { useApiToast } from '../../hooks/useApiToast';
import { useToast } from '../../contexts/ToastContext';
import { GroupStudentsModal } from '../../components/GroupStudentsModal';
import { StudentSelectionModal } from '../../components/StudentSelectionModal';
import { BulkAddToGroupModal } from '../../components/BulkAddToGroupModal';

import { BaseModal } from '../../components/ui/BaseModal';
import { FreezeStudentModal } from '../../components/FreezeStudentModal';

export default function GroupsPage() {
  const { isAuthenticated, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Состояния для модалок платежей
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Состояния для добавления студентов в группу
  const [isStudentSelectionModalOpen, setIsStudentSelectionModalOpen] = useState(false);
  const [selectedStudentsForGroup, setSelectedStudentsForGroup] = useState<User[]>([]);
  const [targetGroupForStudents, setTargetGroupForStudents] = useState<Group | null>(null);



  // Состояния для модалок заморозки
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isUnfreezeModalOpen, setIsUnfreezeModalOpen] = useState(false);
  const [freezingStudentId, setFreezingStudentId] = useState<string>('');
  const [freezingStudentName, setFreezingStudentName] = useState<string>('');
  const [freezeLoading, setFreezeLoading] = useState(false);

  // Состояния для модалки просмотра деталей группы
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Состояния для экспорта
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportGroupIds, setExportGroupIds] = useState<string[]>([]);
  const [includePayments, setIncludePayments] = useState(true);

  // Фильтры для групп
  const [filters, setFilters] = useState<{
    subjectId: string;
    search: string;
  }>({
    subjectId: '',
    search: ''
  });
  const [subjects, setSubjects] = useState<Array<{id: string, name: string}>>([]);

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(filters.search, 300);

  // Ref для доступа к актуальным фильтрам в useCallback
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const debouncedSearchRef = useRef(debouncedSearchTerm);
  debouncedSearchRef.current = debouncedSearchTerm;

  const handleExportGroups = async () => {
    if (!user?.organizationId) {
      console.error('Organization ID не найден');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      const body: { organizationId: string; includePayments: boolean; groupIds?: string[] } = {
        organizationId: user.organizationId,
        includePayments
      };

      if (exportGroupIds.length > 0) {
        body.groupIds = exportGroupIds;
      }

      const response = await fetch('https://trackademy.kz/api/Export/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Ошибка экспорта групп');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `groups_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setIsExportModalOpen(false);
      setExportGroupIds([]);
      setIncludePayments(true);
    } catch (error) {
      console.error('Ошибка при экспорте групп:', error);
    }
  };

  // Универсальная система модалов для групп
  const groupModal = useUniversalModal('group', {
    name: '',
    code: '',
    level: '',
    subjectId: '',
    studentIds: [] as string[],
    organizationId: ''
  });
  
  // Toast уведомления для API операций
  const { createOperation, updateOperation, deleteOperation, loadOperation } = useApiToast();
  const { showToast } = useToast();
  
  const [pageSize, setPageSize] = useState(10);

  // Управление видимостью колонок
  const { columns, toggleColumn, isColumnVisible } = useColumnVisibility([
    { key: 'number', label: '№', required: true },
    { key: 'name', label: 'Название группы', required: true },
    { key: 'code', label: 'Код', required: false },
    { key: 'level', label: 'Уровень', required: false },
    { key: 'subject', label: 'Предмет', required: false },
    { key: 'students', label: 'Студенты', required: true },
    { key: 'actions', label: 'Действия', required: true }
  ]);

  const loadGroups = useCallback(async (page: number = currentPage, isTableOnly: boolean = true, customPageSize?: number) => {
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

      const currentFilters = filtersRef.current;
      const currentSearch = debouncedSearchRef.current;

      const requestBody: {
        pageNumber: number;
        pageSize: number;
        organizationId: string;
        subjectId?: string;
        search?: string;
      } = {
        pageNumber: page,
        pageSize: actualPageSize,
        organizationId: organizationId
      };

      // Add optional filters
      if (currentFilters.subjectId) {
        requestBody.subjectId = currentFilters.subjectId;
      }
      if (currentSearch) {
        requestBody.search = currentSearch;
      }

      const response = await loadOperation(
        () => AuthenticatedApiService.post<GroupsResponse>('/Group/get-groups', requestBody),
        'группы'
      );
      
      if (response && response.items) {
        setGroups(response.items);
        setCurrentPage(response.pageNumber);
        setTotalPages(response.totalPages);
        setTotalCount(response.totalCount);
      } else {
        setGroups([]);
        setCurrentPage(1);
        setTotalPages(0);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setError('Ошибка при загрузке групп');
      setGroups([]);
      setCurrentPage(1);
      setTotalPages(0);
      setTotalCount(0);
    } finally {
      setTableLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, pageSize]);

  // Load subjects for filter
  const loadSubjects = useCallback(async () => {
    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
      if (!organizationId) return;

      const requestBody = {
        pageNumber: 1,
        pageSize: 1000, // Get all subjects
        organizationId: organizationId
      };

      const response = await AuthenticatedApiService.post<{items: Array<{id: string, name: string}>}>('/Subject/GetAllSubjects', requestBody);
      if (response && response.items) {
        setSubjects(response.items);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  }, [user?.organizationId]);

  // Track if initial load is done
  const initialLoadDone = useRef(false);

  // Initial load - load both groups and subjects once
  useEffect(() => {
    if (isAuthenticated && user?.organizationId && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadSubjects();
      loadGroups(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.organizationId]);

  // Reload groups when filters change (debounced search or subject filter)
  useEffect(() => {
    // Only trigger if initial load is done and we actually have filters
    if (!initialLoadDone.current) {
      return;
    }
    
    if (isAuthenticated && user?.organizationId) {
      setCurrentPage(1);
      loadGroups(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, filters.subjectId]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      subjectId: '',
      search: ''
    });
    // When resetting filters, reload all groups
    setCurrentPage(1);
    loadGroups(1, true);
  };

  const handleCreate = () => {
    setEditingGroupId(null);
    groupModal.openCreateModal();
  };

  const handleEdit = (id: string) => {
    const group = groups.find(g => g.id === id);
    if (group) {
      setEditingGroupId(id);
      groupModal.openEditModal({
        name: group.name,
        code: group.code,
        level: group.level,
        subjectId: typeof group.subject === 'object' ? group.subject.subjectId : group.subject,
        studentIds: group.students.map(s => s.studentId),
        organizationId: ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }
  };

  const handleDelete = (id: string) => {
    const group = groups.find(g => g.id === id);
    if (group) {
      setDeletingGroup(group);
      setIsDeleteModalOpen(true);
    }
  };

  const handleView = async (id: string) => {
    try {
      setDetailLoading(true);
      setIsDetailModalOpen(true);
      
      const groupDetail = await AuthenticatedApiService.get<Group>(`/Group/${id}`);
      setViewingGroup(groupDetail);
    } catch (error) {
      console.error('Error loading group details:', error);
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Обработчики для создания платежей
  const handleShowStudents = (group: Group) => {
    setSelectedGroup(group);
    setIsStudentsModalOpen(true);
  };





  const handleCloseStudentsModal = () => {
    setIsStudentsModalOpen(false);
    setSelectedGroup(null);
  };

  // Функция для открытия модала добавления студентов
  const handleAddStudentsToGroup = () => {
    if (!selectedGroup) return;
    setTargetGroupForStudents(selectedGroup);
    setIsStudentSelectionModalOpen(true);
  };

  // Функция для добавления студентов в группу
  const handleBulkAddToGroup = async () => {
    console.log('🚀 handleBulkAddToGroup STARTED');
    if (!targetGroupForStudents || selectedStudentsForGroup.length === 0) return;

    try {
      console.log('Calling API from GROUPS PAGE...');
      const response = await AuthenticatedApiService.post('/Group/bulk-add-students', {
        groupId: targetGroupForStudents.id,
        studentIds: selectedStudentsForGroup.map(s => s.id)
      }) as { success?: boolean };
      
      console.log('API response from GROUPS PAGE:', response);

      // Показываем успех независимо от формата ответа (если нет ошибки)
      showToast('Запись успешно обновлена', 'success');
      
      // Перезагружаем список групп
      await loadGroups(currentPage, true);
      
      console.log('FORCE CLOSING MODAL from GROUPS PAGE');
      // ПРИНУДИТЕЛЬНО закрываем модальные окна
      setSelectedStudentsForGroup([]);
      setTargetGroupForStudents(null);
      
      // Если групповая модалка была открыта, обновляем её тоже
      if (isStudentsModalOpen && selectedGroup?.id === targetGroupForStudents.id) {
        // Модалка автоматически обновится при следующем открытии
      }
      
      console.log('Modal closed from GROUPS PAGE');
    } catch (error: unknown) {
      console.error('Error adding students to group:', error);
      showToast('Ошибка при добавлении студентов в группу: ' + ((error as Error)?.message || 'Неизвестная ошибка'), 'error');
    }
  };



  const handleFreezeStudent = (studentId: string, studentName: string) => {
    setFreezingStudentId(studentId);
    setFreezingStudentName(studentName);
    setIsFreezeModalOpen(true);
  };

  const handleUnfreezeStudent = (studentId: string, studentName: string) => {
    setFreezingStudentId(studentId);
    setFreezingStudentName(studentName);
    setIsUnfreezeModalOpen(true);
  };

  const handleConfirmFreeze = async (startDate: string, endDate: string, reason: string) => {
    if (!selectedGroup || !freezingStudentId) return;

    setFreezeLoading(true);
    try {
      await createOperation(
        () => AuthenticatedApiService.freezeStudent(
          freezingStudentId,
          selectedGroup.id,
          startDate,
          endDate,
          reason
        ),
        'заморозка студента'
      );

      setIsFreezeModalOpen(false);
      setIsStudentsModalOpen(false);
      setFreezingStudentId('');
      setFreezingStudentName('');
      setSelectedGroup(null);
      
      // Обновляем список групп чтобы увидеть изменения
      await loadGroups(currentPage, true);
    } catch (error) {
      console.error('Error freezing student:', error);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleConfirmUnfreeze = async () => {
    if (!selectedGroup || !freezingStudentId) return;

    setFreezeLoading(true);
    try {
      await createOperation(
        () => AuthenticatedApiService.unfreezeStudent(
          freezingStudentId,
          selectedGroup.id
        ),
        'разморозка студента'
      );

      setIsUnfreezeModalOpen(false);
      setIsStudentsModalOpen(false);
      setFreezingStudentId('');
      setFreezingStudentName('');
      setSelectedGroup(null);
      
      // Обновляем список групп чтобы увидеть изменения
      await loadGroups(currentPage, true);
    } catch (error) {
      console.error('Error unfreezing student:', error);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleCreateGroup = async (formData: GroupFormData) => {
    const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
    
    if (!organizationId) {
      throw new Error('Не удается определить организацию пользователя');
    }

    const dataToSend = {
      ...formData,
      organizationId: organizationId
    };

    const result = await createOperation(
      () => AuthenticatedApiService.post('/Group/create-group', dataToSend),
      'группу'
    );
    
    // Always reload data and close modal regardless of result
    if (result.success) {
      await loadGroups(currentPage, true);
    }
    groupModal.closeModal();
  };

  const handleEditGroup = async (formData: GroupFormData) => {
    if (!editingGroupId) {
      throw new Error('ID группы не найден');
    }
    
    const dataToSend = {
      ...formData
    };
    
    const result = await updateOperation(
      () => AuthenticatedApiService.put(`/Group/${editingGroupId}`, dataToSend),
      'группу'
    );
    
    // Always reload data and close modal regardless of result
    if (result.success) {
      await loadGroups(currentPage, true);
    }
    setEditingGroupId(null);
    groupModal.closeModal();
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    
    await deleteOperation(
      () => AuthenticatedApiService.delete(`/Group/${deletingGroup.id}`),
      'группу'
    );
    
    await loadGroups(currentPage, true);
    setIsDeleteModalOpen(false);
    setDeletingGroup(null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadGroups(1, true, newPageSize);
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
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 flex justify-between sm:hidden w-full">
            <button
              onClick={() => loadGroups(currentPage - 1, true)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Предыдущая
            </button>
            <button
              onClick={() => loadGroups(currentPage + 1, true)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Следующая
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Показано <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> по{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> из{' '}
                <span className="font-medium">{totalCount}</span> результатов
              </p>
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
            
            <div className="flex space-x-2">
              <button
                onClick={() => loadGroups(currentPage - 1, true)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                ←
              </button>
              
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => loadGroups(number, true)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${
                    currentPage === number
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {number}
                </button>
              ))}
              
              <button
                onClick={() => loadGroups(currentPage + 1, true)}
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <UserGroupIcon className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mt-1" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Требуется авторизация</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Войдите в систему для управления группами
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                onClick={() => loadGroups(currentPage, false)}
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 pt-20 md:pt-24">
      <div className="w-full space-y-6">
        {/* Modern Header Card */}
        <PageHeaderWithStats
          title="Группы"
          subtitle="Управление учебными группами организации"
          icon={UserGroupIcon}
          gradientFrom="teal-500"
          gradientTo="cyan-600"
          actionLabel="Добавить группу"
          onAction={handleCreate}
          extraActions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium"
                title="Экспорт групп"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Экспорт</span>
              </button>
              <ColumnVisibilityControl
                columns={columns}
                onColumnToggle={toggleColumn}
                variant="header"
              />
            </div>
          }
          stats={[
            { label: "Всего групп", value: totalCount, color: "teal" },
            { label: "Текущая страница", value: currentPage, color: "cyan" },
            { label: "Всего страниц", value: totalPages, color: "blue" }
          ]}
        />

        {/* Filters Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Фильтры</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Поиск по названию группы или имени студента
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                placeholder="Введите название или имя студента..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm text-gray-900 dark:text-white transition-all duration-200"
              />
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Предмет
              </label>
              <select
                value={filters.subjectId}
                onChange={(e) => handleFilterChange({ subjectId: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm text-gray-900 dark:text-white transition-all duration-200"
              >
                <option value="">Все предметы</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Сбросить фильтры
            </button>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Loading State */}
          {tableLoading && (
            <div className="p-8">
              <div className="text-center">
                <div className="p-4 bg-teal-100 dark:bg-teal-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-400 mx-auto mt-2"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Загрузка групп...</p>
              </div>
            </div>
          )}

          {/* Desktop Table View */}
          {!tableLoading && groups.length > 0 && (
            <div className="hidden md:block">
              <div className="overflow-x-auto scrollbar-custom">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      {isColumnVisible('number') && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '50px' }}>#</th>
                      )}
                      {isColumnVisible('name') && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '20%' }}>Название группы</th>
                      )}
                      {isColumnVisible('code') && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '15%' }}>Код</th>
                      )}
                      {isColumnVisible('level') && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '15%' }}>Уровень</th>
                      )}
                      {isColumnVisible('subject') && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '20%' }}>Предмет</th>
                      )}
                      {isColumnVisible('students') && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '15%' }}>Студенты</th>
                      )}
                      {isColumnVisible('actions') && (
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '120px' }}>Действия</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {groups.map((group, index) => (
                      <tr 
                        key={group.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer"
                        onClick={(e) => {
                          // Не открывать модалку если кликнули на кнопки действий
                          const target = e.target as HTMLElement;
                          if (!target.closest('button')) {
                            handleView(group.id);
                          }
                        }}
                      >
                        {isColumnVisible('number') && (
                          <td className="px-3 py-3">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">{(currentPage - 1) * pageSize + index + 1}</span>
                              </div>
                            </div>
                          </td>
                        )}
                        {isColumnVisible('name') && (
                          <td className="px-3 py-3">
                            <div className="flex items-center space-x-3">
                              <UserGroupIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{group.name}</div>
                            </div>
                          </td>
                        )}
                        {isColumnVisible('code') && (
                          <td className="px-3 py-3">
                            <div className="text-gray-900 dark:text-gray-100 truncate">{group.code}</div>
                          </td>
                        )}
                        {isColumnVisible('level') && (
                          <td className="px-3 py-3">
                            <div className="text-gray-900 dark:text-gray-100 truncate">{group.level}</div>
                          </td>
                        )}
                        {isColumnVisible('subject') && (
                          <td className="px-3 py-3">
                            <div className="text-gray-900 dark:text-gray-100 truncate">
                              {typeof group.subject === 'object' ? group.subject.subjectName : group.subject}
                            </div>
                          </td>
                        )}
                        {isColumnVisible('students') && (
                          <td className="px-3 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowStudents(group);
                              }}
                              className="text-teal-600 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300 flex items-center hover:bg-teal-50 dark:hover:bg-teal-900/20 px-2 py-1 rounded transition-colors"
                              title="Создать платеж для студента"
                            >
                              <span className="font-medium">{group.students.length}</span>
                              <EyeIcon className="h-4 w-4 ml-1" />
                            </button>
                          </td>
                        )}
                        {isColumnVisible('actions') && (
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(group.id);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                title="Редактировать группу"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(group.id);
                                }}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                title="Удалить группу"
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
            </div>
          )}

          {/* Mobile Card View */}
          {!tableLoading && groups.length > 0 && (
            <div className="block md:hidden space-y-4 p-6">
              {groups.map((group, index) => (
                <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{(currentPage - 1) * pageSize + index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Код: {group.code}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Уровень:</span>
                      <span className="text-gray-600 dark:text-gray-400">{group.level}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Предмет:</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {typeof group.subject === 'object' ? group.subject.subjectName : group.subject}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Студенты:</span>
                      <button
                        onClick={() => handleShowStudents(group)}
                        className="text-teal-600 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300 flex items-center"
                      >
                        <span className="font-medium">{group.students.length}</span>
                        <EyeIcon className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={() => handleEdit(group.id)}
                      className="flex-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      title="Редактировать группу"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Редактировать
                    </button>
                    <button 
                      onClick={() => handleDelete(group.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      title="Удалить группу"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!tableLoading && groups.length === 0 && (
            <EmptyState
              icon={UserGroupIcon}
              title={filters.search || filters.subjectId ? "Группы не найдены" : "Нет групп"}
              description={
                filters.search || filters.subjectId
                  ? "Попробуйте изменить критерии поиска"
                  : "Начните с добавления первой группы"
              }
              actionLabel={filters.search || filters.subjectId ? "Сбросить фильтры" : "Добавить группу"}
              onAction={filters.search || filters.subjectId ? handleResetFilters : handleCreate}
            />
          )}
        </div>

        {/* Pagination */}
        {renderPagination()}
      </div>

      {/* Delete Group Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteGroup}
        title="Удалить группу"
        message={`Вы уверены, что хотите удалить группу "${deletingGroup?.name}"? Это действие нельзя отменить.`}
      />

      {/* Universal Group Modal */}
      <UniversalModal
        isOpen={groupModal.isOpen}
        mode={groupModal.mode}
        title={groupModal.getConfig().title}
        subtitle={groupModal.getConfig().subtitle}
        icon={groupModal.getConfig().icon}
        gradientFrom={groupModal.getConfig().gradientFrom}
        gradientTo={groupModal.getConfig().gradientTo}
        maxWidth="2xl"
        initialData={{
          name: '',
          code: '',
          level: '',
          subjectId: '',
          studentIds: [],
          organizationId: user?.organizationId || '',
          ...(groupModal.editData || {})
        }}
        data={groupModal.editData || undefined}
        onClose={() => {
          setEditingGroupId(null);
          groupModal.closeModal();
        }}
        validate={createGroupValidator}
        onSave={async (data: Record<string, unknown>) => {
          const groupData = data as unknown as GroupFormData;
          if (groupModal.mode === 'create') {
            await handleCreateGroup(groupData);
          } else {
            await handleEditGroup(groupData);
          }
        }}
        submitText={groupModal.getConfig().submitText}
        loadingText={groupModal.getConfig().loadingText}
      >
        {({ formData, setFormData, errors, setErrors, isSubmitting }) => (
          <GroupFormUniversal 
            formData={formData as unknown as GroupFormData}
            setFormData={setFormData as unknown as (data: GroupFormData | ((prev: GroupFormData) => GroupFormData)) => void}
            errors={errors}
            setErrors={setErrors}
            isSubmitting={isSubmitting}
            organizationId={user?.organizationId || ''}
          />
        )}
      </UniversalModal>

      {/* Модалка со списком студентов группы */}
      <GroupStudentsModal
        isOpen={isStudentsModalOpen}
        onClose={handleCloseStudentsModal}
        group={selectedGroup}
      />



      {/* Модалка просмотра деталей группы */}
      <BaseModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setViewingGroup(null);
        }}
        title="Детали группы"
        customBackground="bg-gray-800 dark:bg-gray-800"
        gradientFrom="from-teal-500"
        gradientTo="to-cyan-600"
        maxWidth="4xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
          </div>
        ) : viewingGroup ? (
          <div className="space-y-6">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Название группы
                </label>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-white font-medium">{viewingGroup.name}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Код группы
                </label>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-white">{viewingGroup.code || '—'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Уровень
                </label>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-white">{viewingGroup.level || '—'}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Предмет
                </label>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-white font-medium">
                    {typeof viewingGroup.subject === 'object' && viewingGroup.subject?.subjectName 
                      ? viewingGroup.subject.subjectName 
                      : typeof viewingGroup.subject === 'string' 
                        ? viewingGroup.subject 
                        : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Список студентов */}
            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Студенты
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-teal-500/20 text-teal-300">
                    {viewingGroup.students.length}
                  </span>
                </h3>
              </div>
              
              {viewingGroup.students.length === 0 ? (
                <div className="bg-gray-700 rounded-lg p-8 text-center">
                  <p className="text-gray-400">В группе пока нет студентов</p>
                </div>
              ) : (
                <div className="bg-gray-700 rounded-lg divide-y divide-gray-600 max-h-96 overflow-y-auto">
                  {viewingGroup.students.map((student, index) => (
                    <div 
                      key={student.studentId} 
                      className="p-4 hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{student.studentName}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            Группа не найдена
          </div>
        )}
      </BaseModal>

      {/* Модалка заморозки студента */}
      <FreezeStudentModal
        isOpen={isFreezeModalOpen}
        onClose={() => {
          setIsFreezeModalOpen(false);
          setFreezingStudentId('');
          setFreezingStudentName('');
        }}
        studentName={freezingStudentName}
        onConfirm={handleConfirmFreeze}
        loading={freezeLoading}
      />

      {/* Модалка разморозки студента */}
      {isUnfreezeModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Разморозить студента
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {freezingStudentName}
              </p>
            </div>
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300">
                Вы уверены, что хотите разморозить этого студента? Система автоматически пересчитает пропущенные уроки и продлит платеж.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsUnfreezeModalOpen(false);
                  setFreezingStudentId('');
                  setFreezingStudentName('');
                }}
                disabled={freezeLoading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmUnfreeze}
                disabled={freezeLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {freezeLoading ? 'Разморозка...' : 'Разморозить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка экспорта групп */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Экспорт групп
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Выберите параметры экспорта
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Группы (опционально)
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
                  <div className="space-y-2">
                    <label className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportGroupIds.length === 0}
                        onChange={() => setExportGroupIds([])}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Все группы
                      </span>
                    </label>
                    {groups.map(group => (
                      <label key={group.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportGroupIds.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportGroupIds(prev => [...prev, group.id]);
                            } else {
                              setExportGroupIds(prev => prev.filter(id => id !== group.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {group.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includePayments"
                  checked={includePayments}
                  onChange={(e) => setIncludePayments(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="includePayments" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Включить платежи
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsExportModalOpen(false);
                  setExportGroupIds([]);
                  setIncludePayments(true);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleExportGroups}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg transition-all"
              >
                Экспортировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальные окна для добавления студентов в группу */}
      <StudentSelectionModal
        isOpen={isStudentSelectionModalOpen}
        onClose={() => setIsStudentSelectionModalOpen(false)}
        onSelect={(students) => {
          setSelectedStudentsForGroup(students);
          setIsStudentSelectionModalOpen(false);
        }}
        selectedStudents={selectedStudentsForGroup}
        title="Выберите студентов для добавления в группу"
        groupId={targetGroupForStudents?.id}
        organizationId={user?.organizationId || ''}
      />

      {targetGroupForStudents && selectedStudentsForGroup.length > 0 && (
        <BulkAddToGroupModal
          isOpen={selectedStudentsForGroup.length > 0}
          onClose={() => {
            setSelectedStudentsForGroup([]);
            setTargetGroupForStudents(null);
          }}
          onConfirm={handleBulkAddToGroup}
          selectedStudents={selectedStudentsForGroup}
          groupName={targetGroupForStudents.name}
          onRemoveStudent={(studentId) => {
            setSelectedStudentsForGroup(prev => prev.filter(s => s.id !== studentId));
          }}
        />
      )}
    </div>
  );
}