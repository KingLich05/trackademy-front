'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { CalendarDaysIcon, PencilIcon, TrashIcon, PlusIcon, DocumentArrowDownIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { useColumnVisibility, ColumnVisibilityControl } from '../../components/ui/ColumnVisibilityControl';
import { 
  Schedule, 
  ScheduleFormData, 
  SchedulesResponse, 
  ScheduleFilters,
  formatTimeRange,
  generateSubjectColor
} from '../../types/Schedule';
import { canManageUsers } from '../../types/Role';
import { Group } from '../../types/Group';
import { Subject } from '../../types/Subject';
import { User } from '../../types/User';
import { useApiToast } from '../../hooks/useApiToast';
import { Room } from '../../types/Room';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { DaysOfWeekDisplay } from '../../components/ui/DaysOfWeekDisplay';
import { ScheduleCalendar } from '../../components/ui/ScheduleCalendar';
import { ViewToggle, ViewMode } from '../../components/ui/ViewToggle';
import UniversalModal from '../../components/ui/UniversalModal';
import { useUniversalModal } from '../../hooks/useUniversalModal';
import { TimeInput } from '../../components/ui/TimeInput';
import { DaysOfWeekSelector } from '../../components/ui/DaysOfWeekSelector';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import Link from 'next/link';

export default function SchedulesPage() {
  const { isAuthenticated, user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  
  // Filter states
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [filters, setFilters] = useState<ScheduleFilters>({
    pageNumber: 1,
    pageSize: 10,
    organizationId: user?.organizationId || '',
    groupId: '',
    teacherId: '',
    roomId: '',
    subjectId: '',
    includeDeleted: false
  });

  // Modal states
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('table');

  // Универсальная система модалов для расписаний
  const scheduleModal = useUniversalModal('schedule', {
    daysOfWeek: '', // Handle as string for form input
    startTime: '',
    endTime: '',
    effectiveFrom: '',
    effectiveTo: '',
    groupId: '',
    teacherId: '',
    roomId: '',
    organizationId: ''
  });
  
  // Toast уведомления для API операций
  const { createOperation, updateOperation, deleteOperation, loadOperation, handleApiOperation } = useApiToast();

  const [pageSize, setPageSize] = useState(10);
  
  // Состояние для экспорта расписания
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    organizationId: user?.organizationId || '',
    groupId: '',
    teacherId: '',
    roomId: '',
    subjectId: '',
    startDate: '',
    endDate: '',
    exportType: 1 // Template по умолчанию для страницы расписания
  });

  // Управление видимостью колонок
  const { columns, toggleColumn, isColumnVisible } = useColumnVisibility([
    { key: 'number', label: '№', required: true },
    { key: 'group', label: 'Группа', required: true },
    { key: 'subject', label: 'Предмет' },
    { key: 'teacher', label: 'Преподаватель' },
    { key: 'room', label: 'Кабинет' },
    { key: 'days', label: 'Дни недели' },
    { key: 'time', label: 'Время' },
    { key: 'period', label: 'Окончание' },
    { key: 'actions', label: 'Действия', required: true }
  ]);

  const loadSchedules = useCallback(async (page: number = currentPage, isTableOnly: boolean = true, customPageSize?: number) => {
    const actualPageSize = customPageSize ?? pageSize;
    if (isTableOnly) {
      setTableLoading(true);
    }

    try {
      const requestBody: ScheduleFilters = {
        ...filters,
        pageNumber: page,
        pageSize: isTableOnly ? actualPageSize : 1000, // Load all for calendar views
        organizationId: user?.organizationId || '',
        includeDeleted: showArchive
      };

      // Remove empty filter values
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key as keyof ScheduleFilters] === '') {
          delete requestBody[key as keyof ScheduleFilters];
        }
      });

      const data = await loadOperation(
        () => AuthenticatedApiService.post<SchedulesResponse>('/Schedule/get-all-schedules', requestBody),
        'расписания'
      );
      
      setSchedules(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      setError('Не удалось загрузить список шаблонов расписаний');
    } finally {
      if (isTableOnly) {
        setTableLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, filters.groupId, filters.subjectId, filters.teacherId, filters.roomId, pageSize, showArchive]);

  const loadFilterData = useCallback(async () => {
    try {
      const [groupsData, subjectsData, teachersData, roomsData] = await Promise.all([
        // Load groups
        AuthenticatedApiService.post('/Group/get-groups', {
          pageNumber: 1,
          pageSize: 1000,
          organizationId: user?.organizationId
        }),
        // Load subjects
        AuthenticatedApiService.post('/Subject/GetAllSubjects', {
          pageNumber: 1,
          pageSize: 1000,
          organizationId: user?.organizationId
        }),
        // Load teachers (role 3)
        AuthenticatedApiService.getUsers({
          organizationId: user?.organizationId || '',
          pageNumber: 1,
          pageSize: 1000,
          roleIds: [3] // Teachers only
        }),
        // Load rooms
        AuthenticatedApiService.post('/Room/GetAllRooms', {
          pageNumber: 1,
          pageSize: 1000,
          organizationId: user?.organizationId
        })
      ]);

      setGroups((groupsData as { items: Group[] }).items || []);
      setSubjects((subjectsData as { items: Subject[] }).items || []);
      setTeachers(teachersData.items || []);
      setRooms((roomsData as { items: Room[] }).items || []);
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  }, [user?.organizationId]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user?.organizationId) {
      setFilters(prev => ({ ...prev, organizationId: user.organizationId || '' }));
      loadFilterData();
      loadSchedules(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.organizationId]);

  // Reload data when view changes
  useEffect(() => {
    if (isAuthenticated && user?.organizationId) {
      // For table view, use pagination
      if (currentView === 'table') {
        loadSchedules(currentPage, true);
      } else {
        // For calendar views, load all data
        loadSchedules(1, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Reload data when archive mode changes
  useEffect(() => {
    if (isAuthenticated && user?.organizationId) {
      loadSchedules(1, true);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchive]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadSchedules(page, true);
  };

  const handleFilterChange = (newFilters: Partial<ScheduleFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setCurrentPage(1);
    
    // Immediately load with new filters instead of waiting for state update
    loadSchedulesWithFilters(1, updatedFilters);
  };

  const handleResetFilters = () => {
    const resetFilters: ScheduleFilters = {
      pageNumber: 1,
      pageSize: 10,
      organizationId: user?.organizationId || '',
      groupId: '',
      teacherId: '',
      roomId: '',
      subjectId: '',
      includeDeleted: showArchive
    };
    setFilters(resetFilters);
    setCurrentPage(1);
    loadSchedulesWithFilters(1, resetFilters);
  };

  const loadSchedulesWithFilters = async (page: number, currentFilters: ScheduleFilters) => {
    try {
      setTableLoading(true);

      const requestBody: ScheduleFilters = {
        ...currentFilters,
        pageNumber: page,
        pageSize: pageSize,
        organizationId: user?.organizationId || '',
        includeDeleted: showArchive
      };

      // Remove empty filter values
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key as keyof ScheduleFilters] === '') {
          delete requestBody[key as keyof ScheduleFilters];
        }
      });

      const data = await AuthenticatedApiService.post<SchedulesResponse>('/Schedule/get-all-schedules', requestBody);
      
      setSchedules(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      setError('Не удалось загрузить список шаблонов расписаний');
    } finally {
      setTableLoading(false);
    }
  };

  const handleCreate = () => {
    handleCreateUniversal();
  };

  const handleExportDateRangeChange = (startDate?: string, endDate?: string) => {
    setExportFilters(prev => ({
      ...prev,
      startDate: startDate || '',
      endDate: endDate || ''
    }));
  };

  const handleExport = async () => {
    if (!user?.organizationId) {
      return;
    }

    setIsExporting(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      const body: { 
        organizationId: string; 
        exportType: number;
        groupId?: string;
        teacherId?: string;
        roomId?: string;
        subjectId?: string;
        startDate?: string;
        endDate?: string;
      } = {
        organizationId: user.organizationId,
        exportType: exportFilters.exportType
      };

      if (exportFilters.groupId) body.groupId = exportFilters.groupId;
      if (exportFilters.teacherId) body.teacherId = exportFilters.teacherId;
      if (exportFilters.roomId) body.roomId = exportFilters.roomId;
      if (exportFilters.subjectId) body.subjectId = exportFilters.subjectId;
      if (exportFilters.startDate) body.startDate = exportFilters.startDate;
      if (exportFilters.endDate) body.endDate = exportFilters.endDate;

      const response = await fetch('https://trackademy.kz/api/Export/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Ошибка экспорта расписания');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const exportTypeNames = {
        1: 'шаблон',
        2: 'фактическое', 
        3: 'календарное'
      };
      const typeName = exportTypeNames[exportFilters.exportType as keyof typeof exportTypeNames] || 'расписание';
      a.download = `расписание_${typeName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // showSuccess('Файл расписания успешно загружен');
      setIsExportModalOpen(false);
      setExportFilters({
        organizationId: user.organizationId,
        groupId: '',
        teacherId: '',
        roomId: '',
        subjectId: '',
        startDate: '',
        endDate: '',
        exportType: 1
      });
    } catch (error) {
      console.error('Error exporting schedule:', error);
      // showError('Ошибка при экспорте расписания');
    } finally {
      setIsExporting(false);
    }
  };

  // Validation function for schedule forms
  const validateScheduleForm = (data: Record<string, unknown>): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    // Validate days of week
    const daysOfWeekStr = data.daysOfWeek as string;
    if (!daysOfWeekStr || daysOfWeekStr.trim() === '') {
      errors.daysOfWeek = 'Необходимо выбрать хотя бы один день недели';
    } else {
      const daysArray = daysOfWeekStr.split(',').map(day => parseInt(day.trim())).filter(day => !isNaN(day));
      if (daysArray.length === 0) {
        errors.daysOfWeek = 'Необходимо выбрать хотя бы один день недели';
      }
    }
    
    // Validate start time
    if (!data.startTime || (typeof data.startTime === 'string' && data.startTime.trim() === '')) {
      errors.startTime = 'Время начала обязательно для заполнения';
    }
    
    // Validate end time
    if (!data.endTime || (typeof data.endTime === 'string' && data.endTime.trim() === '')) {
      errors.endTime = 'Время окончания обязательно для заполнения';
    }
    
    // Validate time range
    if (data.startTime && data.endTime && 
        typeof data.startTime === 'string' && typeof data.endTime === 'string' &&
        data.startTime.trim() !== '' && data.endTime.trim() !== '') {
      if (data.startTime >= data.endTime) {
        errors.endTime = 'Время окончания должно быть позже времени начала';
      }
    }
    
    // Validate effective from date
    if (!data.effectiveFrom || (typeof data.effectiveFrom === 'string' && data.effectiveFrom.trim() === '')) {
      errors.effectiveFrom = 'Дата начала действия обязательна для заполнения';
    }
    
    // Validate effective to date (должна быть не раньше effective from)
    if (data.effectiveFrom && data.effectiveTo && 
        typeof data.effectiveFrom === 'string' && typeof data.effectiveTo === 'string' &&
        data.effectiveFrom.trim() !== '' && data.effectiveTo.trim() !== '') {
      const fromDate = new Date(data.effectiveFrom);
      const toDate = new Date(data.effectiveTo);
      
      if (toDate < fromDate) {
        errors.effectiveTo = 'Дата окончания не может быть раньше даты начала';
      }
    }
    
    // Validate group
    if (!data.groupId || (typeof data.groupId === 'string' && data.groupId.trim() === '')) {
      errors.groupId = 'Необходимо выбрать группу';
    }
    
    // Validate teacher
    if (!data.teacherId || (typeof data.teacherId === 'string' && data.teacherId.trim() === '')) {
      errors.teacherId = 'Необходимо выбрать преподавателя';
    }
    
    // Validate room
    if (!data.roomId || (typeof data.roomId === 'string' && data.roomId.trim() === '')) {
      errors.roomId = 'Необходимо выбрать аудиторию';
    }
    
    return errors;
  };

  // Обработчики для универсальной системы модалов
  const handleCreateUniversal = () => {
    scheduleModal.openCreateModal();
  };

  // Функция для удаления секунд из времени (для отображения в форме)
  const formatTimeForDisplay = (time: string): string => {
    if (!time) return '';
    // Если время в формате ЧЧ:ММ:СС, убираем секунды
    const parts = time.split(':');
    if (parts.length === 3) {
      return `${parts[0]}:${parts[1]}`;
    }
    return time;
  };

  const handleEditUniversal = (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
      scheduleModal.openEditModal({
        daysOfWeek: schedule.daysOfWeek.join(','), // Convert array to string for form
        startTime: formatTimeForDisplay(schedule.startTime),
        endTime: formatTimeForDisplay(schedule.endTime),
        effectiveFrom: schedule.effectiveFrom,
        effectiveTo: schedule.effectiveTo || '',
        groupId: schedule.group.id,
        teacherId: schedule.teacher.id,
        roomId: schedule.room.id,
        organizationId: user?.organizationId || ''
      });
    }
  };

  // Функция для преобразования времени в формат ЧЧ:ММ:СС
  const formatTimeWithSeconds = (time: string | null): string | null => {
    if (!time || time.trim() === '') return null;
    // Если время уже содержит секунды, возвращаем как есть
    if (time.includes(':') && time.split(':').length === 3) {
      return time;
    }
    // Если время в формате ЧЧ:ММ, добавляем :00
    if (time.includes(':') && time.split(':').length === 2) {
      return `${time}:00`;
    }
    return time;
  };

  // Handlers for Universal Modal save operations
  const handleSaveCreate = async (formData: Record<string, unknown>) => {
    const daysOfWeekStr = formData.daysOfWeek as string;
    const daysOfWeekArray = daysOfWeekStr ? 
      daysOfWeekStr.split(',').map(day => parseInt(day.trim())).filter(day => !isNaN(day)) : [];
    
    const scheduleData: ScheduleFormData = {
      daysOfWeek: daysOfWeekArray,
      startTime: formatTimeWithSeconds(formData.startTime && (formData.startTime as string).trim() !== '' ? formData.startTime as string : null),
      endTime: formatTimeWithSeconds(formData.endTime && (formData.endTime as string).trim() !== '' ? formData.endTime as string : null),
      effectiveFrom: formData.effectiveFrom && (formData.effectiveFrom as string).trim() !== '' ? formData.effectiveFrom as string : null,
      effectiveTo: formData.effectiveTo && (formData.effectiveTo as string).trim() !== '' ? formData.effectiveTo as string : null,
      groupId: formData.groupId && (formData.groupId as string).trim() !== '' ? formData.groupId as string : null,
      teacherId: formData.teacherId && (formData.teacherId as string).trim() !== '' ? formData.teacherId as string : null,
      roomId: formData.roomId && (formData.roomId as string).trim() !== '' ? formData.roomId as string : null,
      organizationId: user?.organizationId || ''
    };
    
    const result = await createOperation(
      () => AuthenticatedApiService.post('/Schedule/create-schedule', scheduleData),
      'расписание'
    );
    
    // Always reload data and close modal regardless of result
    if (result.success) {
      await loadSchedules(currentPage, true);
    }
    scheduleModal.closeModal();
  };

  const handleSaveEdit = async (formData: Record<string, unknown>) => {
    const daysOfWeekStr = formData.daysOfWeek as string;
    const daysOfWeekArray = daysOfWeekStr ? 
      daysOfWeekStr.split(',').map(day => parseInt(day.trim())).filter(day => !isNaN(day)) : [];
    
    const updateData = {
      daysOfWeek: daysOfWeekArray,
      startTime: formatTimeWithSeconds(formData.startTime && (formData.startTime as string).trim() !== '' ? formData.startTime as string : null),
      endTime: formatTimeWithSeconds(formData.endTime && (formData.endTime as string).trim() !== '' ? formData.endTime as string : null),
      effectiveFrom: formData.effectiveFrom && (formData.effectiveFrom as string).trim() !== '' ? formData.effectiveFrom as string : null,
      effectiveTo: formData.effectiveTo && (formData.effectiveTo as string).trim() !== '' ? formData.effectiveTo as string : null,
      groupId: formData.groupId && (formData.groupId as string).trim() !== '' ? formData.groupId as string : null,
      teacherId: formData.teacherId && (formData.teacherId as string).trim() !== '' ? formData.teacherId as string : null,
      roomId: formData.roomId && (formData.roomId as string).trim() !== '' ? formData.roomId as string : null
    };
    
    if (scheduleModal.editData) {
      // Find the schedule to get its ID
      const scheduleToEdit = schedules.find(s => 
        s.group.id === scheduleModal.editData?.groupId &&
        s.teacher.id === scheduleModal.editData?.teacherId &&
        s.room.id === scheduleModal.editData?.roomId
      );
      
      if (scheduleToEdit) {
        const result = await updateOperation(
          () => AuthenticatedApiService.put(`/Schedule/update-schedule/${scheduleToEdit.id}`, updateData),
          'расписание'
        );
        
        // Always reload data and close modal regardless of result
        if (result.success) {
          await loadSchedules(currentPage, true);
        }
        scheduleModal.closeModal();
      }
    }
  };

  const handleDelete = (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
      setDeletingSchedule(schedule);
      setIsDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSchedule) return;
    
    await deleteOperation(
      () => AuthenticatedApiService.delete(`/Schedule/${deletingSchedule.id}`),
      'расписание'
    );
    
    await loadSchedules(currentPage, true);
    handleCloseDeleteModal();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingSchedule(null);
  };

  const handleRestore = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    const result = await handleApiOperation(
      () => AuthenticatedApiService.post(`/Schedule/restore/${id}`, {}),
      {
        successMessage: 'Запись успешно восстановлена',
        errorMessage: 'Не удалось восстановить запись'
      }
    );

    if (result.success) {
      await loadSchedules(currentPage, true);
    }
  };

  // Check authentication and permissions
  if (!isAuthenticated) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Требуется авторизация</h3>
          <p className="mt-1 text-sm text-gray-500">
            Войдите в систему для управления шаблонами расписаний
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Войти в систему
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has admin permissions (roles 2 or 4)
  if (user && !canManageUsers(user.role)) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <CalendarDaysIcon className="w-full h-full" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Недостаточно прав</h3>
          <p className="mt-1 text-sm text-gray-500">
            Доступ к шаблонам расписаний имеют только администраторы
          </p>
        </div>
      </div>
    );
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setFilters({ ...filters, pageNumber: 1, pageSize: newPageSize });
    loadSchedules(1, true, newPageSize);
  };

  const renderPagination = () => {
    if (totalPages <= 1 && totalCount <= pageSize) return null;

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
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex-1 flex justify-between sm:hidden w-full">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Предыдущая
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Предыдущая
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors duration-200 ${
                    number === currentPage
                      ? 'z-10 bg-violet-50 dark:bg-violet-900/50 border-violet-500 dark:border-violet-400 text-violet-600 dark:text-violet-300'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Следующая
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            <p className="font-medium">Ошибка загрузки</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => loadSchedules(currentPage, true)}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 page-content">
      <div className="w-full space-y-6">
        {/* Modern Header Card */}
        <PageHeaderWithStats
          title={showArchive ? "Архив расписаний" : "Шаблоны расписаний"}
          subtitle={showArchive ? "Просмотр удаленных шаблонов расписания" : "Управление расписанием занятий организации"}
          icon={CalendarDaysIcon}
          gradientFrom="violet-500"
          gradientTo="purple-600"
          actionLabel="Создать шаблон"
          onAction={handleCreate}
          extraActions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Экспорт
              </button>
              <button
                onClick={() => {
                  setShowArchive(!showArchive);
                  setFilters(prev => ({ ...prev, includeDeleted: !showArchive, pageNumber: 1 }));
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
            { label: "Всего шаблонов", value: totalCount, color: "violet" },
            { label: "Страниц", value: totalPages, color: "indigo" }
          ]}
        />

        {/* Content Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">

          {/* Filters Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-violet-50 dark:from-gray-800 dark:to-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Group Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Группа</label>
                <select
                  value={filters.groupId || ''}
                  onChange={(e) => handleFilterChange({ groupId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm text-gray-900 dark:text-white transition-all duration-200"
                >
                  <option value="">Все группы</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Предмет</label>
                <select
                  value={filters.subjectId || ''}
                  onChange={(e) => handleFilterChange({ subjectId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm text-gray-900 dark:text-white transition-all duration-200"
                >
                  <option value="">Все предметы</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Преподаватель</label>
                <select
                  value={filters.teacherId || ''}
                  onChange={(e) => handleFilterChange({ teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm text-gray-900 dark:text-white transition-all duration-200"
                >
                  <option value="">Все преподаватели</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Кабинет</label>
                <select
                  value={filters.roomId || ''}
                  onChange={(e) => handleFilterChange({ roomId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm text-gray-900 dark:text-white transition-all duration-200"
                >
                  <option value="">Все кабинеты</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Filters Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Сбросить фильтры
              </button>
            </div>
          </div>

          {/* Loading State */}
          {tableLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-200 border-t-violet-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Загрузка шаблонов расписаний...</p>
            </div>
          )}

          {/* Mobile Card View */}
          {!tableLoading && (
            <div className="block md:hidden">
              {schedules.length === 0 ? (
                <div className="text-center py-16 p-6">
                  <div className="p-4 bg-violet-100 dark:bg-violet-900/30 rounded-full w-16 h-16 mx-auto mb-6">
                    <CalendarDaysIcon className="h-8 w-8 text-violet-600 dark:text-violet-400 mx-auto mt-2" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Нет шаблонов расписаний</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Создайте первый шаблон расписания для начала работы
                  </p>
                  <button
                    onClick={handleCreate}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105 inline-flex items-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Создать шаблон
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {schedules.map((schedule, index) => (
                    <div
                      key={schedule.id}
                      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200 ${
                        showArchive ? 'opacity-75 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium rounded-lg shadow-sm">
                            {(filters.pageNumber - 1) * pageSize + index + 1}
                          </div>
                          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                            <CalendarDaysIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {schedule.group.name}
                              </h3>
                              {showArchive && (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                  Архив
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {schedule.subject.subjectName}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {showArchive ? (
                            <>
                              <button
                                onClick={() => handleRestore(schedule.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                title="Восстановить"
                              >
                                <ArrowUturnLeftIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(schedule.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                title="Удалить окончательно"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditUniversal(schedule.id)}
                                className="text-violet-600 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                title="Редактировать"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(schedule.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                title="Удалить"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <span className="font-medium mr-2">Преподаватель:</span>
                          {schedule.teacher.name}
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <span className="font-medium mr-2">Кабинет:</span>
                          {schedule.room.name}
                        </div>
                        <div className="flex items-start text-gray-600 dark:text-gray-400">
                          <span className="font-medium mr-2 mt-1">Дни:</span>
                          <DaysOfWeekDisplay daysOfWeek={schedule.daysOfWeek} size="sm" />
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <span className="font-medium mr-2">Время:</span>
                          {formatTimeRange(schedule.startTime, schedule.endTime)}
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <span className="font-medium mr-2">Окончание:</span>
                          {schedule.effectiveTo ? new Date(schedule.effectiveTo).toLocaleDateString('ru-RU') : 'Бессрочно'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Desktop Table View */}
          {!tableLoading && (
            <div className="hidden md:block">
              {/* View Toggle */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <ViewToggle 
                  currentView={currentView}
                  onViewChange={setCurrentView}
                />
              </div>

              {schedules.length === 0 ? (
                <div className="text-center py-16 p-6">
                  <div className="p-4 bg-violet-100 dark:bg-violet-900/30 rounded-full w-16 h-16 mx-auto mb-6">
                    <CalendarDaysIcon className="h-8 w-8 text-violet-600 dark:text-violet-400 mx-auto mt-2" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Нет шаблонов расписаний</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Создайте первый шаблон расписания для начала работы
                  </p>
                  <button
                    onClick={handleCreate}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105 inline-flex items-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Создать шаблон
                  </button>
                </div>
              ) : (
                <>
                  {/* Table View */}
                  {currentView === 'table' && (
                    <div className="overflow-x-auto scrollbar-custom">
                      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                    <thead className="bg-gradient-to-r from-gray-50 to-violet-50 dark:from-gray-700 dark:to-gray-600">
                      <tr>
                        {isColumnVisible('number') && (
                          <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '50px' }}>
                            №
                          </th>
                        )}
                        {isColumnVisible('group') && (
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '15%' }}>
                            Группа
                          </th>
                        )}
                        {isColumnVisible('subject') && (
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '15%' }}>
                            Предмет
                          </th>
                        )}
                        {isColumnVisible('teacher') && (
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '15%' }}>
                            Преподаватель
                          </th>
                        )}
                        {isColumnVisible('room') && (
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '12%' }}>
                            Кабинет
                          </th>
                        )}
                        {isColumnVisible('days') && (
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '20%' }}>
                            Дни недели
                          </th>
                        )}
                        {isColumnVisible('time') && (
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '10%' }}>
                            Время
                          </th>
                        )}
                        {isColumnVisible('period') && (
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '10%' }}>
                            Окончание
                          </th>
                        )}
                        {isColumnVisible('actions') && (
                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider" style={{ width: '120px' }}>
                            Действия
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {schedules.map((schedule, index) => (
                        <tr key={schedule.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/30'} ${
                          showArchive ? 'opacity-75 bg-red-50 dark:bg-red-900/10' : ''
                        }`}>
                          {isColumnVisible('number') && (
                            <td className="px-2 py-3 text-center">
                              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium rounded-lg shadow-sm mx-auto">
                                {(filters.pageNumber - 1) * pageSize + index + 1}
                              </div>
                            </td>
                          )}
                          {isColumnVisible('group') && (
                            <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <span className="truncate">{schedule.group.name}</span>
                                {showArchive && (
                                  <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full whitespace-nowrap">
                                    Архив
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {isColumnVisible('subject') && (
                            <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                                  style={{ backgroundColor: generateSubjectColor(schedule.subject.subjectName) }}
                                ></div>
                                <span className="truncate">{schedule.subject.subjectName}</span>
                              </div>
                            </td>
                          )}
                          {isColumnVisible('teacher') && (
                            <td className="px-3 py-3 text-sm text-gray-900 dark:text-white truncate">
                              {schedule.teacher.name}
                            </td>
                          )}
                          {isColumnVisible('room') && (
                            <td className="px-3 py-3 text-sm text-gray-900 dark:text-white truncate">
                              {schedule.room.name}
                            </td>
                          )}
                          {isColumnVisible('days') && (
                            <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                              <DaysOfWeekDisplay daysOfWeek={schedule.daysOfWeek} size="sm" />
                            </td>
                          )}
                          {isColumnVisible('time') && (
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {formatTimeRange(schedule.startTime, schedule.endTime)}
                            </td>
                          )}
                          {isColumnVisible('period') && (
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {schedule.effectiveTo ? new Date(schedule.effectiveTo).toLocaleDateString('ru-RU') : 'Бессрочно'}
                            </td>
                          )}
                          {isColumnVisible('actions') && (
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {showArchive ? (
                                  <>
                                    <button
                                      onClick={() => handleRestore(schedule.id)}
                                      className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-md transition-all duration-200"
                                      title="Восстановить"
                                    >
                                      <ArrowUturnLeftIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(schedule.id)}
                                      className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-md transition-all duration-200"
                                      title="Удалить окончательно"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleEditUniversal(schedule.id)}
                                      className="p-1.5 text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 rounded-md transition-all duration-200"
                                      title="Редактировать"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(schedule.id)}
                                      className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-md transition-all duration-200"
                                      title="Удалить"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    </div>
                  )}

                  {/* Calendar Views */}
                  {currentView !== 'table' && (
                    <div className="p-6">
                      <ScheduleCalendar
                        schedules={schedules}
                        viewType={currentView}
                        onEventClick={(schedule: Schedule) => handleEditUniversal(schedule.id)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        {/* Pagination - only for table view */}
        {currentView === 'table' && renderPagination()}
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          title="Удалить шаблон расписания"
          message={`Вы уверены, что хотите удалить шаблон расписания для группы "${deletingSchedule?.group?.name}"?`}
          itemName={deletingSchedule?.group?.name}
        />

        {/* Universal Schedule Modal */}
        <UniversalModal
          isOpen={scheduleModal.isOpen}
          onClose={scheduleModal.closeModal}
          mode={scheduleModal.mode}
          title={scheduleModal.getConfig().title}
          subtitle={scheduleModal.getConfig().subtitle}
          icon={scheduleModal.getConfig().icon}
          gradientFrom={scheduleModal.getConfig().gradientFrom}
          gradientTo={scheduleModal.getConfig().gradientTo}
          initialData={scheduleModal.initialData}
          data={scheduleModal.editData || undefined}
          onSave={scheduleModal.mode === 'create' ? handleSaveCreate : handleSaveEdit}
          validate={validateScheduleForm}
          submitText={scheduleModal.getConfig().submitText}
          loadingText={scheduleModal.getConfig().loadingText}
        >
          {({ formData, setFormData, errors }) => (
            <div className="space-y-4">
              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дни недели
                </label>
                <div data-field="daysOfWeek">
                  <DaysOfWeekSelector
                    value={formData.daysOfWeek ? 
                      (typeof formData.daysOfWeek === 'string' 
                        ? formData.daysOfWeek.split(',').map(day => parseInt(day.trim())).filter(day => !isNaN(day))
                        : formData.daysOfWeek as number[]
                      ) : []
                    }
                    onChange={(days) => setFormData({ ...formData, daysOfWeek: days.join(',') })}
                    error={errors.daysOfWeek}
                  />
                </div>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Время начала
                </label>
                <TimeInput
                  value={formData.startTime || ''}
                  onChange={(value) => setFormData({ ...formData, startTime: value || '' })}
                  placeholder="ЧЧ:ММ"
                  required
                  error={errors.startTime}
                  data-field="startTime"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Время окончания
                </label>
                <TimeInput
                  value={formData.endTime || ''}
                  onChange={(value) => setFormData({ ...formData, endTime: value || '' })}
                  placeholder="ЧЧ:ММ"
                  required
                  error={errors.endTime}
                  data-field="endTime"
                />
              </div>

              {/* Effective From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Действует с
                </label>
                <input
                  type="date"
                  value={formData.effectiveFrom || ''}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    errors.effectiveFrom 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  data-field="effectiveFrom"
                  required
                />
                {errors.effectiveFrom && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.effectiveFrom}</p>
                )}
              </div>

              {/* Effective To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Действует до
                </label>
                <input
                  type="date"
                  value={formData.effectiveTo || ''}
                  onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                  min={formData.effectiveFrom || ''}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    errors.effectiveTo 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  data-field="effectiveTo"
                />
                {errors.effectiveTo && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.effectiveTo}</p>
                )}
              </div>

              {/* Group Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Группа
                </label>
                <select
                  value={formData.groupId || ''}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    errors.groupId 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  data-field="groupId"
                  required
                >
                  <option value="">Выберите группу</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {errors.groupId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.groupId}</p>
                )}
              </div>

              {/* Teacher Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Преподаватель
                </label>
                <select
                  value={formData.teacherId || ''}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    errors.teacherId 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  data-field="teacherId"
                  required
                >
                  <option value="">Выберите преподавателя</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name || teacher.login} ({teacher.login})
                    </option>
                  ))}
                </select>
                {errors.teacherId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.teacherId}</p>
                )}
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Аудитория
                </label>
                <select
                  value={formData.roomId || ''}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    errors.roomId 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  data-field="roomId"
                  required
                >
                  <option value="">Выберите аудиторию</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                {errors.roomId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.roomId}</p>
                )}
              </div>
            </div>
          )}
        </UniversalModal>

        {/* Модальное окно экспорта */}
        {isExportModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Экспорт расписания
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Настройте параметры экспорта
                </p>
              </div>
              <div className="p-6 space-y-4">
                {/* Тип экспорта */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип экспорта <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={exportFilters.exportType}
                    onChange={(e) => setExportFilters(prev => ({ ...prev, exportType: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>Шаблон расписания</option>
                    <option value={2}>Фактическое расписание</option>
                    <option value={3}>Календарное представление</option>
                  </select>
                </div>

                {/* Группа */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Группа (опционально)
                  </label>
                  <select
                    value={exportFilters.groupId}
                    onChange={(e) => setExportFilters(prev => ({ ...prev, groupId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Все группы</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Преподаватель */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Преподаватель (опционально)
                  </label>
                  <select
                    value={exportFilters.teacherId}
                    onChange={(e) => setExportFilters(prev => ({ ...prev, teacherId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Все преподаватели</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Аудитория */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Аудитория (опционально)
                  </label>
                  <select
                    value={exportFilters.roomId}
                    onChange={(e) => setExportFilters(prev => ({ ...prev, roomId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Все аудитории</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Предмет */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Предмет (опционально)
                  </label>
                  <select
                    value={exportFilters.subjectId}
                    onChange={(e) => setExportFilters(prev => ({ ...prev, subjectId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Все предметы</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Период */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Период (опционально)
                  </label>
                  <DateRangePicker
                    startDate={exportFilters.startDate}
                    endDate={exportFilters.endDate}
                    onDateChange={handleExportDateRangeChange}
                    placeholder="Выберите период"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setIsExportModalOpen(false);
                    setExportFilters({
                      organizationId: user?.organizationId || '',
                      groupId: '',
                      teacherId: '',
                      roomId: '',
                      subjectId: '',
                      startDate: '',
                      endDate: '',
                      exportType: 1
                    });
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
                >
                  {isExporting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  Экспортировать
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}