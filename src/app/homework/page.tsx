'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { ClipboardDocumentListIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Assignment, AssignmentFormData, AssignmentFilters, getSubmissionStatusText, getSubmissionStatusColor } from '../../types/Assignment';
import { Submission, SubmissionFilters, SubmissionStatus } from '../../types/Submission';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { useApiToast } from '../../hooks/useApiToast';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { BaseModal } from '../../components/ui/BaseModal';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { SubmissionDetailModal } from '../../components/ui/SubmissionDetailModal';
import { AssignmentPreviewModal } from '../../components/ui/AssignmentPreviewModal';

export default function HomeworkPage() {
  const { isAuthenticated, user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<Array<{id: string, name: string}>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<AssignmentFormData>({
    description: '',
    groupId: '',
    assignedDate: '',
    dueDate: '',
    attachmentFile: undefined
  });
  const [modalDueDate, setModalDueDate] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<'details' | 'students'>('details');
  const [studentFilter, setStudentFilter] = useState<'all' | 'submitted' | 'notSubmitted'>('all');
  
  // Submission detail modal state
  const [isSubmissionDetailOpen, setIsSubmissionDetailOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');

  // Assignment file preview state
  const [isAssignmentPreviewOpen, setIsAssignmentPreviewOpen] = useState(false);

  // Submissions tab state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsCurrentPage, setSubmissionsCurrentPage] = useState(1);
  const [submissionsTotalPages, setSubmissionsTotalPages] = useState(0);
  const [submissionsTotalCount, setSubmissionsTotalCount] = useState(0);
  const [submissionsTableLoading, setSubmissionsTableLoading] = useState(false);
  const [submissionFilters, setSubmissionFilters] = useState<{
    assignmentId: string;
    groupId: string;
    studentId: string;
    status: string;
    fromDate: string;
    toDate: string;
  }>({
    assignmentId: '',
    groupId: '',
    studentId: '',
    status: '',
    fromDate: '',
    toDate: ''
  });
  const [students, setStudents] = useState<Array<{id: string, name: string}>>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  const [filters, setFilters] = useState<{
    groupId: string;
    fromDate: string;
    toDate: string;
  }>({
    groupId: '',
    fromDate: '',
    toDate: ''
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const submissionFiltersRef = useRef(submissionFilters);
  submissionFiltersRef.current = submissionFilters;

  const { createOperation, updateOperation, deleteOperation, loadOperation } = useApiToast();
  const { showError } = useToast();

  const pageSize = 10;
  const initialLoadDone = useRef(false);
  const submissionsInitialLoadDone = useRef(false);

  const loadAssignments = useCallback(async (page: number, isTableOnly: boolean = true) => {
    if (isTableOnly) {
      setTableLoading(true);
    }

    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');

      if (!organizationId) {
        return;
      }

      const currentFilters = filtersRef.current;

      const requestBody: AssignmentFilters = {
        pageNumber: page,
        pageSize: pageSize,
        organizationId: organizationId
      };

      if (currentFilters.groupId) {
        requestBody.groupId = currentFilters.groupId;
      }
      if (currentFilters.fromDate) {
        requestBody.fromDate = currentFilters.fromDate; // Only date, no time
      }
      if (currentFilters.toDate) {
        requestBody.toDate = currentFilters.toDate; // Only date, no time
      }

      const response = await loadOperation(
        () => AuthenticatedApiService.getAssignments(requestBody),
        'задания'
      );

      if (response && response.items) {
        setAssignments(response.items);
        setCurrentPage(response.pageNumber);
        setTotalPages(response.totalPages);
        setTotalCount(response.totalCount);
      } else {
        setAssignments([]);
        setCurrentPage(1);
        setTotalPages(0);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      setAssignments([]);
      setCurrentPage(1);
      setTotalPages(0);
      setTotalCount(0);
    } finally {
      setTableLoading(false);
    }
  }, [user?.organizationId, loadOperation]);

  const loadGroups = useCallback(async () => {
    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
      if (!organizationId) return;

      const requestBody = {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: organizationId
      };

      const response = await AuthenticatedApiService.post<{items: Array<{id: string, name: string}>}>('/Group/get-groups', requestBody);
      if (response && response.items) {
        setGroups(response.items);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }, [user?.organizationId]);

  const loadStudents = useCallback(async () => {
    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
      if (!organizationId) return;

      const requestBody = {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: organizationId,
        roleIds: [1] // Student role
      };

      const response = await AuthenticatedApiService.post<{items: Array<{id: string, name: string}>}>('/User/get-users', requestBody);
      if (response && response.items) {
        setStudents(response.items.map(student => ({
          id: student.id,
          name: student.name || 'Без имени'
        })));
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }, [user?.organizationId]);

  const loadSubmissions = useCallback(async (page: number, isTableOnly: boolean = true) => {
    if (isTableOnly) {
      setSubmissionsTableLoading(true);
    }

    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');

      if (!organizationId) {
        return;
      }

      const currentFilters = submissionFiltersRef.current;

      const requestBody: SubmissionFilters = {
        pageNumber: page,
        pageSize: pageSize,
        organizationId: organizationId
      };

      if (currentFilters.assignmentId) {
        requestBody.assignmentId = currentFilters.assignmentId;
      }
      if (currentFilters.groupId) {
        requestBody.groupId = currentFilters.groupId;
      }
      if (currentFilters.studentId) {
        requestBody.studentId = currentFilters.studentId;
      }
      if (currentFilters.status) {
        requestBody.status = parseInt(currentFilters.status) as SubmissionStatus;
      }
      if (currentFilters.fromDate) {
        requestBody.fromDate = currentFilters.fromDate; // Only date, no time
      }
      if (currentFilters.toDate) {
        requestBody.toDate = currentFilters.toDate; // Only date, no time
      }

      const response = await loadOperation(
        () => AuthenticatedApiService.getSubmissions(requestBody),
        'работы студентов'
      );

      if (response && response.items) {
        setSubmissions(response.items);
        setSubmissionsCurrentPage(response.pageNumber);
        setSubmissionsTotalPages(response.totalPages);
        setSubmissionsTotalCount(response.totalCount);
      } else {
        setSubmissions([]);
        setSubmissionsCurrentPage(1);
        setSubmissionsTotalPages(0);
        setSubmissionsTotalCount(0);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
      setSubmissionsCurrentPage(1);
      setSubmissionsTotalPages(0);
      setSubmissionsTotalCount(0);
    } finally {
      setSubmissionsTableLoading(false);
    }
  }, [user?.organizationId, loadOperation]);

  useEffect(() => {
    if (isAuthenticated && user?.organizationId && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadGroups();
      loadStudents();
      loadAssignments(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.organizationId]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      return;
    }

    if (isAuthenticated && user?.organizationId) {
      setCurrentPage(1);
      loadAssignments(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.groupId, filters.fromDate, filters.toDate]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      groupId: '',
      fromDate: '',
      toDate: ''
    });
    setCurrentPage(1);
    loadAssignments(1, true);
  };

  const handleSubmissionFilterChange = (newFilters: Partial<typeof submissionFilters>) => {
    setSubmissionFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetSubmissionFilters = () => {
    setSubmissionFilters({
      assignmentId: '',
      groupId: '',
      studentId: '',
      status: '',
      fromDate: '',
      toDate: ''
    });
    setStudentSearchQuery('');
    setSubmissionsCurrentPage(1);
    loadSubmissions(1, true);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === submissionFilters.studentId);

  const handleStudentSelect = (studentId: string) => {
    handleSubmissionFilterChange({ studentId });
    setIsStudentDropdownOpen(false);
    const student = students.find(s => s.id === studentId);
    if (student) {
      setStudentSearchQuery(student.name);
    }
  };

  const getStatusLabel = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.Draft:
        return 'Черновик';
      case SubmissionStatus.Submitted:
        return 'На проверке';
      case SubmissionStatus.Graded:
        return 'Оценен';
      case SubmissionStatus.Returned:
        return 'На доработке';
      case SubmissionStatus.Overdue:
        return 'Просрочено';
      default:
        return 'Неизвестно';
    }
  };

  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.Draft:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case SubmissionStatus.Submitted:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case SubmissionStatus.Graded:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case SubmissionStatus.Returned:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case SubmissionStatus.Overdue:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleSubmissionsPageChange = (page: number) => {
    if (page !== submissionsCurrentPage && page >= 1 && page <= submissionsTotalPages) {
      loadSubmissions(page, true);
    }
  };

  const handleCreate = () => {
    setEditingAssignmentId(null);
    setModalMode('create');
    setFormData({
      description: '',
      groupId: '',
      assignedDate: '',
      dueDate: '',
      attachmentFile: undefined
    });
    setModalDueDate('');
    setIsAssignmentModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      setEditingAssignmentId(id);
      setModalMode('edit');
      setFormData({
        description: assignment.description,
        groupId: assignment.groupId,
        assignedDate: assignment.assignedDate.split('T')[0],
        dueDate: assignment.dueDate.split('T')[0],
        attachmentFile: undefined // При редактировании можно загрузить новый файл
      });
      setModalDueDate(assignment.dueDate.split('T')[0]);
      setIsAssignmentModalOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      setDeletingAssignment(assignment);
      setIsDeleteModalOpen(true);
    }
  };

  const handleSave = async () => {
    if (!formData.description || !formData.groupId || !modalDueDate || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      // Устанавливаем дату назначения как текущую дату
      const assignedDate = new Date().toISOString();
      const dueDate = new Date(modalDueDate).toISOString();

      if (modalMode === 'create') {
        const result = await createOperation(
          () => AuthenticatedApiService.createAssignment({
            description: formData.description,
            groupId: formData.groupId,
            assignedDate: assignedDate,
            dueDate: dueDate,
            attachmentFile: formData.attachmentFile
          }),
          'задание'
        );

        if (result.success) {
          await loadAssignments(currentPage, true);
          setIsAssignmentModalOpen(false);
        }
      } else {
        if (!editingAssignmentId) {
          return;
        }

        const result = await updateOperation(
          () => AuthenticatedApiService.updateAssignment(editingAssignmentId, {
            description: formData.description,
            assignedDate: assignedDate,
            dueDate: dueDate,
            attachmentFile: formData.attachmentFile
          }),
          'задание'
        );

        if (result.success) {
          await loadAssignments(currentPage, true);
          setIsAssignmentModalOpen(false);
          setEditingAssignmentId(null);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAssignment) return;

    const result = await deleteOperation(
      () => AuthenticatedApiService.deleteAssignment(deletingAssignment.id),
      'задание'
    );

    if (result.success) {
      await loadAssignments(currentPage, true);
    }
    setIsDeleteModalOpen(false);
    setDeletingAssignment(null);
  };

  const handlePageChange = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      loadAssignments(page, true);
    }
  };

  const handleRowClick = async (id: string) => {
    setDetailLoading(true);
    setIsDetailModalOpen(true);
    
    try {
      const assignment = await loadOperation(
        () => AuthenticatedApiService.getAssignmentById(id),
        'задание'
      );
      
      if (assignment) {
        setSelectedAssignment(assignment);
      }
    } catch (error) {
      console.error('Error loading assignment details:', error);
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadFile = async (assignmentId: string, fileName: string) => {
    try {
      const blob = await AuthenticatedApiService.downloadAssignmentFile(assignmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      showError('Ошибка при скачивании файла');
    }
  };

  const reloadSelectedAssignment = async () => {
    if (selectedAssignment) {
      try {
        const updatedAssignment = await AuthenticatedApiService.getAssignmentById(selectedAssignment.id);
        setSelectedAssignment(updatedAssignment);
      } catch (error) {
        console.error('Error reloading assignment details:', error);
      }
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    // Parse only the date part to avoid timezone conversion issues
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}.${month}.${year}`;
  };

  const renderPagination = () => {
    // Показываем пагинацию всегда, если есть totalPages или totalCount
    if (totalPages === 0 && totalCount === 0) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Показано <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> по{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> из{' '}
                <span className="font-medium">{totalCount}</span> результатов
              </p>
            </div>

            <div className="flex space-x-2">
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
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
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

  const renderSubmissionsPagination = () => {
    // Показываем пагинацию всегда, если есть submissionsTotalPages или submissionsTotalCount
    if (submissionsTotalPages === 0 && submissionsTotalCount === 0) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, submissionsCurrentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(submissionsTotalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Показано <span className="font-medium">{((submissionsCurrentPage - 1) * pageSize) + 1}</span> по{' '}
                <span className="font-medium">{Math.min(submissionsCurrentPage * pageSize, submissionsTotalCount)}</span> из{' '}
                <span className="font-medium">{submissionsTotalCount}</span> результатов
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleSubmissionsPageChange(submissionsCurrentPage - 1)}
                disabled={submissionsCurrentPage === 1}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                ←
              </button>

              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => handleSubmissionsPageChange(number)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${
                    submissionsCurrentPage === number
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {number}
                </button>
              ))}

              <button
                onClick={() => handleSubmissionsPageChange(submissionsCurrentPage + 1)}
                disabled={submissionsCurrentPage === submissionsTotalPages}
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
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <ClipboardDocumentListIcon className="w-10 h-10 text-purple-600 dark:text-purple-400 mx-auto mt-1" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Требуется авторизация</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Войдите в систему для управления домашними заданиями
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-20 max-w-full overflow-x-hidden">
      <div className="w-full space-y-6">
        <PageHeaderWithStats
          title="Домашнее задание"
          subtitle="Управление заданиями и проверка выполненных работ"
          icon={ClipboardDocumentListIcon}
          gradientFrom="purple-500"
          gradientTo="indigo-600"
          actionLabel="Добавить задание"
          onAction={handleCreate}
          stats={[
            { label: "Всего заданий", value: totalCount, color: "purple" },
            { label: "Текущая страница", value: currentPage, color: "indigo" },
            { label: "Всего страниц", value: totalPages, color: "blue" }
          ]}
        />

        {/* Filters */}
            {/* Filters */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Фильтры</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Group Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Группа
                  </label>
                  <select
                    value={filters.groupId}
                    onChange={(e) => handleFilterChange({ groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-white transition-all duration-200"
                  >
                    <option value="">Все группы</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Период
                  </label>
                  <DateRangePicker
                    startDate={filters.fromDate}
                    endDate={filters.toDate}
                    onDateChange={(fromDate, toDate) => {
                      handleFilterChange({ fromDate: fromDate || '', toDate: toDate || '' });
                    }}
                    placeholder="Выберите период"
                  />
                </div>
              </div>

              {/* Reset Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Сбросить фильтры
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {tableLoading && (
                <div className="p-8">
                  <div className="text-center">
                    <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mt-2"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Загрузка заданий...</p>
                  </div>
                </div>
              )}

              {!tableLoading && assignments.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          №
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Описание
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Группа
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Дата назначения
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Дедлайн
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {assignments.map((assignment, index) => (
                        <tr 
                          key={assignment.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                          onClick={() => handleRowClick(assignment.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm">
                              {(currentPage - 1) * pageSize + index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white max-w-md truncate">
                              {assignment.description || 'Без описания'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{assignment.group.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{assignment.group.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{formatDate(assignment.assignedDate)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              isOverdue(assignment.dueDate) 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {formatDate(assignment.dueDate)}
                            </div>
                            {isOverdue(assignment.dueDate) && (
                              <div className="text-xs text-red-500 dark:text-red-400">Просрочено</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(assignment.id)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                                title="Редактировать"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(assignment.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                                title="Удалить"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!tableLoading && assignments.length === 0 && (
                <div className="text-center py-16 p-6">
                  <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full w-16 h-16 mx-auto mb-6">
                    <ClipboardDocumentListIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mt-2" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {filters.groupId || filters.fromDate || filters.toDate ? 'Задания не найдены' : 'Нет заданий'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {filters.groupId || filters.fromDate || filters.toDate
                      ? 'Попробуйте изменить критерии поиска'
                      : 'Создайте первое задание для начала работы'
                    }
                  </p>
                  <button
                    onClick={filters.groupId || filters.fromDate || filters.toDate ? handleResetFilters : handleCreate}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105 inline-flex items-center"
                  >
                    {filters.groupId || filters.fromDate || filters.toDate ? (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Сбросить фильтры
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Создать задание
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {renderPagination()}
      </div>

      {/* Assignment Modal */}
      <BaseModal
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          if (!isSaving) {
            setIsAssignmentModalOpen(false);
            setEditingAssignmentId(null);
            setIsSaving(false);
          }
        }}
        title={modalMode === 'create' ? 'Создать задание' : 'Редактировать задание'}
        customBackground="bg-gray-800 dark:bg-gray-800"
        gradientFrom="from-purple-500"
        gradientTo="to-indigo-600"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Описание *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Опишите задание..."
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Группа *
            </label>
            <select
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
              disabled={modalMode === 'edit'}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Выберите группу</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {modalMode === 'edit' && (
              <p className="mt-1 text-xs text-gray-400">
                Группу нельзя изменить после создания задания
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Дедлайн *
            </label>
            <input
              type="date"
              value={modalDueDate}
              onChange={(e) => setModalDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Прикрепить файл {modalMode === 'edit' && '(необязательно)'}
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFormData({ ...formData, attachmentFile: file });
              }}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip,.rar"
            />
            <p className="mt-1 text-xs text-gray-400">
              {modalMode === 'edit' 
                ? 'Загрузите новый файл, чтобы заменить существующий. Если файл не выбран, текущий файл останется без изменений.' 
                : 'Максимальный размер: 10 МБ. Поддерживаемые форматы: PDF, DOC, DOCX, TXT, JPG, PNG, ZIP, RAR'}
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={() => {
                if (!isSaving) {
                  setIsAssignmentModalOpen(false);
                  setEditingAssignmentId(null);
                  setIsSaving(false);
                  // Очищаем файл при отмене
                  setFormData(prev => ({ ...prev, attachmentFile: undefined }));
                }
              }}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.description || !formData.groupId || !modalDueDate || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {modalMode === 'create' ? 'Создание...' : 'Сохранение...'}
                </>
              ) : (
                modalMode === 'create' ? 'Создать' : 'Сохранить'
              )}
            </button>
          </div>
        </div>
      </BaseModal>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingAssignment(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Удалить задание"
        message={`Вы уверены, что хотите удалить задание "${deletingAssignment?.description}"? Это действие нельзя отменить.`}
      />

      {/* Assignment Detail Modal */}
      <BaseModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedAssignment(null);
          setDetailActiveTab('details');
          setStudentFilter('all');
        }}
        title="Детали задания"
        customBackground="bg-gray-800 dark:bg-gray-800"
        gradientFrom="from-purple-500"
        gradientTo="to-indigo-600"
        maxWidth="4xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : selectedAssignment ? (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setDetailActiveTab('details')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  detailActiveTab === 'details'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Детали задания
              </button>
              <button
                onClick={() => setDetailActiveTab('students')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  detailActiveTab === 'students'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Студенты 
                {selectedAssignment.studentSubmissions && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300">
                    {selectedAssignment.studentSubmissions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            {detailActiveTab === 'details' ? (
          <div className="space-y-6">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Описание
              </label>
              <div className="bg-gray-700 rounded-lg p-4 text-white break-words overflow-wrap-anywhere">
                {selectedAssignment.description || 'Описание отсутствует'}
              </div>
            </div>

            {/* Group Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Группа
                </label>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-white font-medium">{selectedAssignment.group.name}</div>
                  <div className="text-gray-400 text-sm">{selectedAssignment.group.code}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Статус
                </label>
                <div className="bg-gray-700 rounded-lg p-4">
                  {isOverdue(selectedAssignment.dueDate) ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-red-400 font-medium">Просрочено</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-400 font-medium">Активно</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Дата назначения
                </label>
                <div className="bg-gray-700 rounded-lg p-4 text-white">
                  {formatDate(selectedAssignment.assignedDate)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Дедлайн
                </label>
                <div className={`bg-gray-700 rounded-lg p-4 font-medium ${
                  isOverdue(selectedAssignment.dueDate) 
                    ? 'text-red-400' 
                    : 'text-white'
                }`}>
                  {formatDate(selectedAssignment.dueDate)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Дата создания
                </label>
                <div className="bg-gray-700 rounded-lg p-4 text-white">
                  {formatDate(selectedAssignment.createdAt)}
                </div>
              </div>
            </div>

            {/* Attachment Info */}
            {selectedAssignment.hasAttachment && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Прикрепленный файл
                </label>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-medium">{selectedAssignment.attachmentName}</div>
                        {selectedAssignment.attachmentSize && (
                          <div className="text-gray-400 text-sm">
                            {(selectedAssignment.attachmentSize / 1024 / 1024).toFixed(2)} МБ
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsAssignmentPreviewOpen(true)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                      >
                        Превью
                      </button>
                      <button
                        onClick={() => handleDownloadFile(selectedAssignment.id, selectedAssignment.attachmentName!)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                      >
                        Скачать
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions for Details Tab */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-700">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedAssignment(null);
                  setDetailActiveTab('details');
                  setStudentFilter('all');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleEdit(selectedAssignment.id);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Редактировать
              </button>
            </div>
          </div>
            ) : (
              /* Students Tab */
              <div className="space-y-4">
                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStudentFilter('all')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      studentFilter === 'all'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Все ({selectedAssignment.studentSubmissions?.length || 0})
                  </button>
                  <button
                    onClick={() => setStudentFilter('submitted')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      studentFilter === 'submitted'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Сдавшие ({selectedAssignment.studentSubmissions?.filter(s => s.submission !== null && s.submission.status !== SubmissionStatus.Draft).length || 0})
                  </button>
                  <button
                    onClick={() => setStudentFilter('notSubmitted')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      studentFilter === 'notSubmitted'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Не сдавшие ({selectedAssignment.studentSubmissions?.filter(s => s.submission === null || s.submission.status === SubmissionStatus.Draft).length || 0})
                  </button>
                </div>

                {/* Students Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          №
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Студент
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Логин
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Статус
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Оценка
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Дата сдачи
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Дата проверки
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                      {selectedAssignment.studentSubmissions
                        ?.filter(student => {
                          // Treat drafts as not submitted for teachers
                          const hasValidSubmission = student.submission !== null && student.submission.status !== SubmissionStatus.Draft;
                          if (studentFilter === 'submitted') return hasValidSubmission;
                          if (studentFilter === 'notSubmitted') return !hasValidSubmission;
                          return true;
                        })
                        .map((student, index) => {
                          // Treat draft as null for display purposes
                          const displaySubmission = student.submission?.status === SubmissionStatus.Draft ? null : student.submission;
                          
                          return (
                          <tr 
                            key={student.studentId}
                            className="hover:bg-gray-700/50 cursor-pointer transition-colors"
                            onClick={() => {
                              if (displaySubmission) {
                                setSelectedSubmissionId(displaySubmission.id);
                                setSelectedStudentName(student.studentName);
                                setIsSubmissionDetailOpen(true);
                              }
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-400">{index + 1}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{student.studentName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-300">{student.studentLogin}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {displaySubmission ? (
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  displaySubmission.status === 1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                  displaySubmission.status === 2 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                  displaySubmission.status === 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  displaySubmission.status === 4 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                  {getStatusLabel(displaySubmission.status)}
                                </span>
                              ) : (
                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                  Не сдано
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {displaySubmission?.score !== null && displaySubmission?.score !== undefined ? (
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-white">{displaySubmission.score}</span>
                                  <span className="text-xs text-gray-400 ml-1">/100</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {displaySubmission?.submittedAt ? formatDate(displaySubmission.submittedAt) : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {displaySubmission?.gradedAt ? formatDate(displaySubmission.gradedAt) : '—'}
                            </td>
                          </tr>
                        )})}
                    </tbody>
                  </table>
                  {selectedAssignment.studentSubmissions?.filter(student => {
                    const hasValidSubmission = student.submission !== null && student.submission.status !== SubmissionStatus.Draft;
                    if (studentFilter === 'submitted') return hasValidSubmission;
                    if (studentFilter === 'notSubmitted') return !hasValidSubmission;
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      Нет студентов для отображения
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            Не удалось загрузить данные
          </div>
        )}
      </BaseModal>

      {/* Submission Detail Modal */}
      <SubmissionDetailModal
        isOpen={isSubmissionDetailOpen}
        onClose={() => {
          setIsSubmissionDetailOpen(false);
          setSelectedSubmissionId(null);
          setSelectedStudentName('');
        }}
        submissionId={selectedSubmissionId}
        studentName={selectedStudentName}
        userRole={user?.role}
        onUpdate={() => {
          // Reload assignments list after grading/returning
          loadAssignments(currentPage, true);
          // Also reload the selected assignment details to update the status
          reloadSelectedAssignment();
        }}
      />

      {/* Assignment File Preview Modal */}
      {selectedAssignment?.hasAttachment && (
        <AssignmentPreviewModal
          isOpen={isAssignmentPreviewOpen}
          onClose={() => setIsAssignmentPreviewOpen(false)}
          assignmentId={selectedAssignment.id}
          fileName={selectedAssignment.attachmentName || 'assignment.pdf'}
          fileSize={selectedAssignment.attachmentSize}
          onDownload={() => handleDownloadFile(selectedAssignment.id, selectedAssignment.attachmentName!)}
        />
      )}
    </div>
  );
}
