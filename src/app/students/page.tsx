'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { AcademicCapIcon, ArrowUpTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { User, UserFormData, ImportResult } from '../../types/User';
import UniversalModal from '../../components/ui/UniversalModal';
import { useUniversalModal } from '../../hooks/useUniversalModal';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { UserFilters, UserFilters as UserFiltersType } from '../../components/ui/UserFiltersUpdated';
import { UsersTable } from '../../components/ui/UsersTable';
import { useDebounce } from '../../hooks/useDebounce';
import { canManageUsers } from '../../types/Role';
import Link from 'next/link';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { useColumnVisibility, ColumnVisibilityControl } from '../../components/ui/ColumnVisibilityControl';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useApiToast } from '../../hooks/useApiToast';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { cleanUserFormData } from '../../utils/apiHelpers';
import { ImportUsersModal } from '../../components/ImportUsersModal';
import { BulkAddToGroupModal } from '../../components/BulkAddToGroupModal';
import { GroupSelectionModal } from '../../components/GroupSelectionModal';
import { MultiSelect } from '../../components/ui/MultiSelect';

export default function StudentsPage() {
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [students, setStudents] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Bulk add to group state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [selectedGroupForBulk, setSelectedGroupForBulk] = useState<{id: string, name: string} | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isGroupSelectionModalOpen, setIsGroupSelectionModalOpen] = useState(false);
  
  // Archive state
  const [showArchive, setShowArchive] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('createddate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Универсальная система модалов для пользователей
  const userModal = useUniversalModal('user', {
    login: '',
    fullName: '',
    password: '',
    phone: '',
    parentPhone: '',
    birthday: '',
    role: 1,
    organizationId: '',
    isTrial: false,
    groupIds: [] as string[]
  });
  
  // Toast уведомления для API операций
  const { createOperation, updateOperation, deleteOperation } = useApiToast();

  const [filters, setFilters] = useState<UserFiltersType>({
    search: '',
    roleIds: [],
    groupIds: [] as string[],
    isTrial: undefined,
    isDeleted: false // по умолчанию активные пользователи
  });
  const [groups, setGroups] = useState<Array<{id: string, name: string}>>([]);
  const [tableLoading, setTableLoading] = useState(false);
  
  // Column visibility management
  const { columns, toggleColumn, isColumnVisible } = useColumnVisibility([
    { key: 'number', label: '#', required: true },
    { key: 'user', label: 'Пользователь', required: true },
    { key: 'contacts', label: 'Контакты' },
    { key: 'role', label: 'Роль' },
    { key: 'group', label: 'Группа' },
    { key: 'createdDate', label: 'Дата создания' },
    { key: 'actions', label: 'Действия', required: true }
  ]);
  
  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(filters.search, 300);
  
  // Stringify arrays to avoid triggering effects when reference changes but content is the same
  const roleIdsStr = filters.roleIds.join(',');
  const groupIdsStr = filters.groupIds.join(',');
  // Serialize isTrial to string to track changes (always defined to keep deps array size constant)
  const isTrialStr = filters.isTrial === undefined ? 'all' : filters.isTrial === true ? 'trial' : 'regular';
  // Serialize isDeleted to string
  const isDeletedStr = filters.isDeleted === undefined ? 'all' : filters.isDeleted === true ? 'deleted' : 'active';
  
  // Use ref to store current filters to avoid recreating callbacks
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  
  const [pageSize, setPageSize] = useState(10);

  const loadStudents = useCallback(async (page: number, isTableOnly: boolean = true, customPageSize?: number) => {
    const actualPageSize = customPageSize ?? pageSize;
    console.log('loadStudents called with page:', page, 'pageSize:', actualPageSize);
    
    // Ранняя проверка аутентификации
    if (!isAuthenticated) {
      console.warn('User not authenticated, skipping loadStudents');
      return;
    }
    
    // Use current filters from ref
    const currentFilters = filtersRef.current;
    
    try {
      if (isTableOnly) {
        setTableLoading(true);
      } else {
        // Не нужно устанавливать loading, используем только tableLoading
      }
      setError(null);
      
      // Более надежное получение organizationId с правильной логикой
      let organizationId = user?.organizationId;
      
      // Если organizationId не найден в контексте, попробуем получить из localStorage
      if (!organizationId) {
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            const userObj = JSON.parse(userData);
            organizationId = userObj.organizationId;
            console.log('OrganizationId extracted from localStorage user:', organizationId);
          }
        } catch (e) {
          console.warn('Could not parse user data from localStorage:', e);
        }
      }
      
      const authToken = localStorage.getItem('authToken');
      
      if (!organizationId) {
        // Получаем данные пользователя из localStorage для логирования ошибки
        let localStorageUserData = null;
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            localStorageUserData = JSON.parse(userData);
          }
        } catch {
          console.warn('Could not parse user data for error logging');
        }

        console.error('Organization ID not found. User context:', user, 'LocalStorage user data:', localStorageUserData);
        setError('Не удается определить организацию пользователя');
        return;
      }

      if (!authToken) {
        setError('Требуется авторизация');
        return;
      }

      // Use current search term (debounced)
      const searchTerm = currentFilters.search;

      const data = await AuthenticatedApiService.getUsers({
        organizationId,
        pageNumber: page,
        pageSize: actualPageSize,
        search: searchTerm || undefined,
        roleIds: currentFilters.roleIds.length > 0 ? currentFilters.roleIds : undefined,
        groupIds: currentFilters.groupIds.length > 0 ? currentFilters.groupIds : undefined,
        isTrial: currentFilters.isTrial !== undefined ? currentFilters.isTrial : undefined,
        isDeleted: currentFilters.isDeleted !== undefined ? currentFilters.isDeleted : undefined,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      setStudents(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Failed to load students:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Не удалось загрузить список пользователей');
      }
    } finally {
      if (isTableOnly) {
        setTableLoading(false);
      } else {
        // Не нужно управлять loading, используем только tableLoading
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, debouncedSearchTerm, isAuthenticated, pageSize, roleIdsStr, groupIdsStr, isTrialStr, isDeletedStr, sortBy, sortOrder]);

  const loadGroups = useCallback(async () => {
    try {
      let organizationId = user?.organizationId;
      
      // Если organizationId не найден в контексте, попробуем получить из localStorage
      if (!organizationId) {
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            const userObj = JSON.parse(userData);
            organizationId = userObj.organizationId;
          }
        } catch (e) {
          console.warn('Could not parse user data from localStorage in loadGroups:', e);
        }
      }
      
      if (!organizationId) return;

      const groupsResponse = await AuthenticatedApiService.getGroups(organizationId, 1000);
      setGroups(groupsResponse?.items || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  const handleFilterChange = useCallback((newFilters: UserFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handlePageChange = useCallback((page: number) => {
    // Получаем organizationId из localStorage для логирования
    let localStorageOrgId = null;
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        localStorageOrgId = userObj.organizationId;
      }
    } catch {
      console.warn('Could not parse user data from localStorage for logging');
    }

    console.log('handlePageChange called:', { 
      page, 
      isAuthenticated, 
      userId: user?.id, 
      userOrganizationId: user?.organizationId,
      localStorageOrganizationId: localStorageOrgId
    });
    
    // Проверяем, что пользователь аутентифицирован перед сменой страницы
    if (!isAuthenticated) {
      console.warn('User not authenticated, skipping page change');
      return;
    }
    
    setCurrentPage(page);
    loadStudents(page, true); // Only update table
  }, [isAuthenticated, loadStudents]);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadStudents(1, true, newPageSize);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to desc
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Info and Page Size Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Показано{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {(currentPage - 1) * pageSize + 1}
            </span>
            {' '}–{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>
            {' '}из{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {totalCount}
            </span>
            {' '}результатов
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

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                     text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-1">
            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === number
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {number}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                     text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // Track if initial load is done
  const initialLoadDoneStudents = useRef(false);

  // Initial load - load students and groups once
  useEffect(() => {
    if (isAuthenticated && user?.organizationId && !initialLoadDoneStudents.current) {
      initialLoadDoneStudents.current = true;
      loadStudents(1, false);
      loadGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.organizationId]);

  // Reload students when filters change (debounced search, role, or group filters)
  useEffect(() => {
    // Only trigger if initial load is done
    if (!initialLoadDoneStudents.current) {
      return;
    }
    
    if (isAuthenticated && user?.organizationId) {
      setCurrentPage(1);
      loadStudents(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, roleIdsStr, groupIdsStr, isTrialStr, isDeletedStr, sortBy, sortOrder]);

  // Debug effect to track user context changes
  useEffect(() => {
    // Получаем organizationId из localStorage для логирования
    let localStorageOrgId = null;
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        localStorageOrgId = userObj.organizationId;
      }
    } catch {
      console.warn('Could not parse user data from localStorage for debug logging');
    }

    console.log('User context changed:', {
      isAuthenticated,
      userId: user?.id,
      userOrganizationId: user?.organizationId,
      userRole: user?.role,
      localStorageOrganizationId: localStorageOrgId,
      localStorageAuthToken: !!localStorage.getItem('authToken')
    });
  }, [isAuthenticated, user?.id, user?.organizationId]);

  // Check authentication after all hooks are called
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 page-container">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-md">
              <div className="text-blue-500 text-4xl mb-4">
                🔒
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Требуется авторизация
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Войдите в систему для управления пользователями
              </p>
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 
                         text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all 
                         duration-200 transform hover:-translate-y-0.5"
              >
                Войти в систему
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = (editUser: User) => {
    console.log('Starting edit for user:', { 
      editUserId: editUser.id, 
      editUserRole: editUser.role, 
      currentUserRole: user?.role,
      isCurrentUser: editUser.id === user?.id
    });
    
    setEditingUserId(editUser.id); // Сохраняем ID редактируемого пользователя
    userModal.openEditModal({
      login: editUser.login,
      fullName: editUser.name,
      password: '', // Пароль не заполняем при редактировании
      phone: editUser.phone,
      parentPhone: editUser.parentPhone || '',
      birthday: editUser.birthday || '',
      role: editUser.role,
      organizationId: editUser.organizationId || '',
      isTrial: editUser.isTrial || false,
      groupIds: editUser.groups?.map(g => g.id) || []
    });
  };

  const handleSaveEdit = async (id: string, formData: UserFormData) => {
    console.log('Starting user update:', { id, formData, authToken: !!localStorage.getItem('authToken') });
    
    // Clean data using utility function
    const cleanFormData = cleanUserFormData(formData);
    
    const result = await updateOperation(
      () => AuthenticatedApiService.putUpdateUser(id, cleanFormData),
      'пользователя'
    );
    
    console.log('Update result:', result);
    
    // Always reload data and close modal regardless of result
    if (result.success) {
      await loadStudents(currentPage, true);
    }
    setEditingUserId(null);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    
    const result = await deleteOperation(
      () => AuthenticatedApiService.deleteUser(deletingUser.id),
      'пользователя'
    );
    
    // Check if the deletion was successful
    if (!result.success) {
      throw new Error('Не удалось удалить пользователя. Попробуйте еще раз.');
    }
    
    await loadStudents(currentPage, true);
    handleCloseDeleteModal();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
  };

  const handleRestore = async (userId: string) => {
    const result = await updateOperation(
      () => AuthenticatedApiService.restoreUser(userId),
      'восстановление пользователя'
    );
    
    if (result.success) {
      await loadStudents(currentPage, true);
    }
  };

  const handleCloseModal = () => {
    setEditingUserId(null); // Очищаем ID редактируемого пользователя
    userModal.closeModal();
  };

  // Create user handlers
  const handleCreateUser = async (userData: UserFormData) => {
    // Clean data using utility function
    const cleanUserData = cleanUserFormData(userData);

    const result = await createOperation(
      async () => {
        const response = await fetch('https://trackademy.kz/api/User/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(cleanUserData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.error || errorData.message || 'Не удалось создать пользователя');
          (error as Error & { status: number }).status = response.status;
          throw error;
        }

        return response.json();
      },
      'пользователя'
    );

    // Reload data only on success
    if (result.success) {
      await loadStudents(currentPage, true);
      userModal.closeModal();
    }
    // If not successful, the error was already shown via toast
  };

  const handleImportUsers = async (file: File): Promise<ImportResult> => {
    if (!user?.organizationId) {
      throw new Error('Organization ID не найден');
    }

    const result = await AuthenticatedApiService.importUsersFromExcel(file, user.organizationId);
    
    // После успешного импорта обновляем список пользователей
    if (result.successCount > 0) {
      await loadStudents(currentPage, true);
    }
    
    return result;
  };

  const handleExportUsers = async () => {
    if (!user?.organizationId) {
      console.error('Organization ID не найден');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      const response = await fetch('https://trackademy.kz/api/Export/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId: user.organizationId }),
      });

      if (!response.ok) {
        throw new Error('Ошибка экспорта пользователей');
      }

      // Получаем blob и скачиваем файл
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка при экспорте пользователей:', error);
    }
  };

  // Bulk add to group handlers
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    const studentsOnPage = students.filter(user => user.role === 1);
    const studentIdsOnPage = studentsOnPage.map(student => student.id);
    setSelectedStudentIds(prev => {
      const newIds = [...prev];
      studentIdsOnPage.forEach(id => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      });
      return newIds;
    });
  };

  const handleDeselectAll = () => {
    const studentsOnPage = students.filter(user => user.role === 1);
    const studentIdsOnPage = studentsOnPage.map(student => student.id);
    setSelectedStudentIds(prev => prev.filter(id => !studentIdsOnPage.includes(id)));
  };

  const handleGroupSelect = (group: {id: string, name: string}) => {
    console.log('handleGroupSelect called with group:', group);
    console.log('selectedStudents:', selectedStudents);
    setSelectedGroupForBulk(group);
    setIsBulkAddModalOpen(true);
  };

  const handleRemoveStudentFromBulk = (studentId: string) => {
    setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
  };

  const handleBulkAddConfirm = async () => {
    console.log('🚀 FUNCTION handleBulkAddConfirm CALLED!');
    console.log('=== handleBulkAddConfirm STARTED ===');
    console.log('Initial state:', { 
      selectedGroupForBulk: selectedGroupForBulk?.name, 
      selectedStudentIds: selectedStudentIds.length,
      isBulkAddModalOpen,
      isBulkAdding
    });
    
    if (!selectedGroupForBulk || selectedStudentIds.length === 0) {
      console.log('Early return: no group or students');
      return;
    }

    console.log('Setting isBulkAdding to true');
    setIsBulkAdding(true);
    let success = false;
    
    try {
      console.log('Calling API...');
      const result = await AuthenticatedApiService.bulkAddStudentsToGroup(
        selectedGroupForBulk.id,
        selectedStudentIds
      );
      console.log('🎯 API call from STUDENTS PAGE - response:', result);

      // API возвращает либо строку, либо объект с message
      const message = typeof result === 'string' ? result : (result as { message?: string })?.message;
      
      console.log('Showing success toast');
      showSuccess(message || 'Студенты успешно добавлены в группу');

      console.log('Reloading students...');
      // Обновляем таблицу
      await loadStudents(currentPage, true);
      
      console.log('Reloading groups...');
      // Обновляем данные групп
      await loadGroups();
      
      success = true;
      console.log('Success flag set to true');
      
    } catch (error) {
      console.error('Failed to bulk add students to group:', error);
      success = false;
      console.log('Success flag set to false');
      
      // Извлекаем сообщение об ошибке
      let errorMessage = 'Не удалось добавить студентов в группу';
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message;
      }
      
      showError(errorMessage);
    } finally {
      console.log('=== FINALLY BLOCK ===');
      console.log('Success status:', success);
      console.log('Setting isBulkAdding to false');
      setIsBulkAdding(false);
      
      // ПРИНУДИТЕЛЬНО закрываем модалку ВСЕГДА
      console.log('FORCE CLOSING MODAL - Before state change');
      console.log('Current modal state:', { 
        isBulkAddModalOpen, 
        selectedGroupForBulk: !!selectedGroupForBulk, 
        selectedStudentIds: selectedStudentIds.length 
      });
      
      setIsBulkAddModalOpen(false);
      setSelectedGroupForBulk(null);
      setSelectedStudentIds([]);
      
      console.log('FORCE CLOSING MODAL - After state change calls');
      console.log('=== handleBulkAddConfirm FINISHED ===');
    }
  };

  const selectedStudents = students.filter(student => selectedStudentIds.includes(student.id));

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="mx-auto" style={{ maxWidth: '95vw' }}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-md">
              <div className="text-red-500 text-4xl mb-4">
                ⚠️
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ошибка загрузки
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error}
              </p>
              <button
                onClick={() => loadStudents(currentPage, true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 
                         text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all 
                         duration-200 transform hover:-translate-y-0.5"
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
        {/* Modern Header with Gradient */}
        <PageHeaderWithStats
          title={showArchive ? "Архив пользователей" : "Пользователи"}
          subtitle={showArchive ? "Просмотр удаленных пользователей системы" : "Управление пользователями системы"}
          icon={AcademicCapIcon}
          gradientFrom="emerald-500"
          gradientTo="lime-600"
          actionLabel={user && canManageUsers(user.role) ? "Добавить пользователя" : undefined}
          onAction={user && canManageUsers(user.role) ? () => userModal.openCreateModal() : undefined}
          extraActions={
            <div className="flex items-center gap-3">
              {user && canManageUsers(user.role) && (
                <>
                  <button
                    onClick={handleExportUsers}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium"
                    title="Экспорт пользователей"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Экспорт</span>
                  </button>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium"
                    title="Импорт пользователей"
                  >
                    <ArrowUpTrayIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Импорт</span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowArchive(!showArchive);
                  setFilters(prev => ({ ...prev, isDeleted: !showArchive }));
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  showArchive
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {showArchive ? 'Показать активные' : 'Архив'}
              </button>
              <ColumnVisibilityControl
                columns={columns}
                onColumnToggle={toggleColumn}
                variant="header"
              />
            </div>
          }
          stats={[
            { label: "Всего пользователей", value: totalCount, color: "emerald" },
            { label: "На странице", value: students.length, color: "lime" },
            { label: "Страниц", value: totalPages, color: "green" }
          ]}
        />

        {/* Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Filters Section - ВСЕГДА доступна */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <UserFilters
              onFilterChange={handleFilterChange}
              groups={groups}
              isLoading={false} // Фильтры НИКОГДА не блокируются
            />
          </div>

          {/* Bulk Add to Group Panel - не показываем в архиве */}
          {user && canManageUsers(user.role) && selectedStudentIds.length > 0 && !showArchive && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-900/20 dark:to-lime-900/20 border-b border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-emerald-500 rounded-lg text-white font-bold">
                    {selectedStudentIds.length}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Выбрано студентов: {selectedStudentIds.length}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Нажмите кнопку для массового добавления в группу
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGroupSelectionModalOpen(true)}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-lime-600 rounded-lg hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Добавить в группу
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-hidden">
            {/* Индикатор загрузки таблицы - НЕ блокирует фильтры */}
            {tableLoading && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-2">
                <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  <span>Обновление данных...</span>
                </div>
              </div>
            )}
            <UsersTable
              users={students}
              isLoading={tableLoading}
              currentUser={user ? {
                id: user.id,
                login: user.login,
                name: user.fullName,
                phone: '',
                parentPhone: '',
                birthday: '',
                role: user.role === 'Administrator' ? 2 : user.role === 'Owner' ? 4 : user.role === 'Teacher' ? 3 : 1,
                organizationId: user.organizationId || '',
                groups: [],
                isTrial: false,
                createdDate: new Date().toISOString()
              } : undefined}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRestore={handleRestore}
              showArchive={showArchive}
              showColumnControls={false}
              columnVisibility={isColumnVisible}
              currentPage={currentPage}
              itemsPerPage={pageSize}
              selectedStudentIds={selectedStudentIds}
              onSelectStudent={handleSelectStudent}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              {renderPagination()}
            </div>
          )}
        </div>
      </div>

      {/* Universal User Modal */}
      <UniversalModal
        isOpen={userModal.isOpen}
        mode={userModal.mode}
        title={userModal.getConfig().title}
        subtitle={userModal.getConfig().subtitle}
        icon={userModal.getConfig().icon}
        gradientFrom={userModal.getConfig().gradientFrom}
        gradientTo={userModal.getConfig().gradientTo}
        maxWidth="2xl"
        initialData={{
          login: '',
          fullName: '',
          password: '',
          phone: '',
          parentPhone: '',
          birthday: '',
          role: 1,
          organizationId: user?.organizationId || ''
        }}
        data={userModal.editData || undefined}
        onClose={handleCloseModal}
        validate={(data) => {
          const errors: Record<string, string> = {};
          
          // Validate required fields
          if (!data.login || (typeof data.login === 'string' && data.login.trim() === '')) {
            errors.login = 'Логин обязателен для заполнения';
          }
          
          if (!data.fullName || (typeof data.fullName === 'string' && data.fullName.trim() === '')) {
            errors.fullName = 'Полное имя обязательно для заполнения';
          }
          
          if (!data.phone || (typeof data.phone === 'string' && data.phone.trim() === '')) {
            errors.phone = 'Номер телефона обязателен для заполнения';
          }
          
          if (userModal.mode === 'create' && (!data.password || (typeof data.password === 'string' && data.password.trim() === ''))) {
            errors.password = 'Пароль обязателен для заполнения';
          }
          
          // Validate birthday
          if (data.birthday && typeof data.birthday === 'string' && data.birthday.trim() !== '') {
            const birthdayValue = data.birthday.trim();
            
            // Проверка на полноту даты (должна быть в формате YYYY-MM-DD)
            if (birthdayValue.length !== 10 || birthdayValue.split('-').length !== 3) {
              errors.birthday = 'Укажите полную дату рождения (год, месяц и день)';
            } else {
              const selectedDate = new Date(birthdayValue);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              // Проверка на будущее
              if (selectedDate > today) {
                errors.birthday = 'Дата рождения не может быть в будущем';
              } else {
                // Проверка на возраст (не более 100 лет)
                const hundredYearsAgo = new Date();
                hundredYearsAgo.setFullYear(today.getFullYear() - 100);
                hundredYearsAgo.setHours(0, 0, 0, 0);
                
                if (selectedDate < hundredYearsAgo) {
                  errors.birthday = 'Дата рождения не может быть более 100 лет назад';
                }
              }
            }
          }
          
          return errors;
        }}
        onSave={async (data: Record<string, unknown>) => {
          if (userModal.mode === 'create') {
            await handleCreateUser(data as unknown as UserFormData);
          } else {
            if (!editingUserId) {
              throw new Error('ID пользователя не найден для редактирования');
            }
            await handleSaveEdit(editingUserId, data as unknown as UserFormData);
          }
        }}
        submitText={userModal.getConfig().submitText}
        loadingText={userModal.getConfig().loadingText}
      >
        {({ formData, setFormData, errors: _errors }) => (
          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <fieldset>
                <legend className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Роль пользователя
                </legend>
              <div className="grid grid-cols-2 gap-3">
                <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  formData.role === 1 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value={1}
                    checked={formData.role === 1}
                    onChange={(e) => setFormData((prev: Record<string, unknown>) => ({ ...prev, role: Number.parseInt(e.target.value) }))}
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${formData.role === 1 ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    Студент
                  </span>
                  {formData.role === 1 && <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full"></div>}
                </label>
                <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  formData.role === 3 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value={3}
                    checked={formData.role === 3}
                    onChange={(e) => setFormData((prev: Record<string, unknown>) => ({ ...prev, role: Number.parseInt(e.target.value) }))}
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${formData.role === 3 ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    Преподаватель
                  </span>
                  {formData.role === 3 && <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full"></div>}
                </label>
              </div>
              </fieldset>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Login */}
              <div>
                <label htmlFor="login" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Логин <span className="text-red-500">*</span>
                </label>
                <input
                  id="login"
                  name="login"
                  type="text"
                  value={(formData.login as string) || ''}
                  onChange={(e) => setFormData((prev: Record<string, unknown>) => ({ ...prev, login: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    _errors.login ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Введите логин"
                  required
                />
                {_errors.login && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{_errors.login}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Полное имя <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={(formData.fullName as string) || ''}
                  onChange={(e) => setFormData((prev: Record<string, unknown>) => ({ ...prev, fullName: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    _errors.fullName ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Введите полное имя"
                  required
                />
                {_errors.fullName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{_errors.fullName}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Телефон <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={(formData.phone as string) || ''}
                  onChange={(value: string) => setFormData((prev: Record<string, unknown>) => ({ ...prev, phone: value }))}
                  error={_errors.phone}
                />
              </div>

              {/* Parent Phone - только для студентов */}
              {formData.role === 1 && (
                <div>
                  <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Телефон родителя <span className="text-gray-500 text-sm">(необязательно)</span>
                  </label>
                  <PhoneInput
                    value={(formData.parentPhone as string) || ''}
                    onChange={(value: string) => setFormData((prev: Record<string, unknown>) => ({ ...prev, parentPhone: value }))}
                    error={_errors.parentPhone}
                  />
                </div>
              )}

              {/* Birthday */}
              {/* Birthday */}
              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата рождения
                </label>
                <input
                  id="birthday"
                  type="date"
                  value={(formData.birthday as string) || ''}
                  onChange={(e) => setFormData((prev: Record<string, unknown>) => ({ ...prev, birthday: e.target.value }))}
                  min={(() => {
                    const date = new Date();
                    date.setFullYear(date.getFullYear() - 100);
                    return date.toISOString().split('T')[0];
                  })()}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {_errors.birthday && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{_errors.birthday}</p>
                )}
              </div>

              {/* Password и Trial Student Toggle для студентов при создании */}
              {userModal.mode === 'create' && formData.role === 1 && (
                <>
                  {/* Password - на всю ширину */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Пароль *
                    </label>
                    <PasswordInput
                      value={(formData.password as string) || ''}
                      onChange={(value: string) => setFormData((prev: Record<string, unknown>) => ({ ...prev, password: value }))}
                      required
                    />
                  </div>

                  {/* Group Selection для студентов */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Группы <span className="text-gray-500 text-sm">(необязательно)</span>
                    </label>
                    <MultiSelect
                      options={groups.map(g => ({ id: g.id, name: g.name }))}
                      selectedValues={(formData.groupIds as string[]) || []}
                      onChange={(values: string[]) => setFormData((prev: Record<string, unknown>) => ({ 
                        ...prev, 
                        groupIds: values
                      }))}
                      placeholder="Выберите группы..."
                    />
                  </div>
                  
                  {/* Trial Student Toggle - отдельно с отступом */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      На пробный урок
                    </label>
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => setFormData((prev: Record<string, unknown>) => ({ ...prev, isTrial: !(prev.isTrial as boolean) }))}
                    >
                      <input
                        type="checkbox"
                        checked={(formData.isTrial as boolean) || false}
                        onChange={(e) => setFormData((prev: Record<string, unknown>) => ({ ...prev, isTrial: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors duration-200 ease-in-out ${
                        (formData.isTrial as boolean) 
                          ? 'bg-emerald-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ease-in-out transform ${
                          (formData.isTrial as boolean) ? 'translate-x-6' : 'translate-x-0'
                        } shadow-md`}></div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Password - для не студентов при создании */}
              {userModal.mode === 'create' && formData.role !== 1 && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Пароль *
                  </label>
                  <PasswordInput
                    value={(formData.password as string) || ''}
                    onChange={(value: string) => setFormData((prev: Record<string, unknown>) => ({ ...prev, password: value }))}
                    required
                  />
                </div>
              )}

              {/* Trial Student Toggle - только при редактировании студента */}
              {userModal.mode === 'edit' && formData.role === 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    На пробный урок
                  </label>
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => setFormData((prev: Record<string, unknown>) => ({ ...prev, isTrial: !(prev.isTrial as boolean) }))}
                  >
                    <input
                      type="checkbox"
                      checked={(formData.isTrial as boolean) || false}
                      onChange={(e) => setFormData((prev: Record<string, unknown>) => ({ ...prev, isTrial: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors duration-200 ease-in-out ${
                      (formData.isTrial as boolean) 
                        ? 'bg-emerald-500' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ease-in-out transform ${
                        (formData.isTrial as boolean) ? 'translate-x-6' : 'translate-x-0'
                      } shadow-md`}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </UniversalModal>

      {/* Delete User Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Удалить пользователя"
        message="Вы действительно хотите удалить этого пользователя? Все данные пользователя будут безвозвратно потеряны."
        itemName={deletingUser?.name}
        danger={true}
      />

      {user?.organizationId ? (
        <ImportUsersModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportUsers}
          organizationId={user.organizationId}
        />
      ) : null}

      {/* Group Selection Modal */}
      <GroupSelectionModal
        isOpen={isGroupSelectionModalOpen}
        onClose={() => setIsGroupSelectionModalOpen(false)}
        groups={groups}
        onSelectGroup={handleGroupSelect}
        selectedCount={selectedStudentIds.length}
      />

      {/* Bulk Add to Group Modal */}
      <BulkAddToGroupModal
        key="students-page-modal"
        isOpen={isBulkAddModalOpen && !!selectedGroupForBulk}
        onClose={() => {
          console.log('BulkAddToGroupModal onClose called');
          setIsBulkAddModalOpen(false);
          setSelectedGroupForBulk(null);
        }}
        onConfirm={() => {
          console.log('=== BulkAddToGroupModal onConfirm CLICKED ===');
          console.log('About to call handleBulkAddConfirm');
          console.log('handleBulkAddConfirm function:', typeof handleBulkAddConfirm);
          try {
            handleBulkAddConfirm();
          } catch (error) {
            console.error('Error calling handleBulkAddConfirm:', error);
          }
        }}
        selectedStudents={selectedStudents}
        groupName={selectedGroupForBulk?.name || ''}
        isLoading={isBulkAdding}
        onRemoveStudent={handleRemoveStudentFromBulk}
      />
    </div>
  );
}
