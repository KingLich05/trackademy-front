'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { canManageUsers } from '../../types/Role';
import { useDebounce } from '../../hooks/useDebounce';
import { StudentBalanceApiService } from '../../services/StudentBalanceApiService';
import { CurrencyDollarIcon, UserIcon, UserGroupIcon, PhoneIcon, MagnifyingGlassIcon, FunnelIcon, AcademicCapIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FlattenedBalance, formatBalance, formatDiscount, getDiscountTypeLabel, StudentBalanceRequest } from '../../types/StudentBalance';
import { Group } from '../../types/Group';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { useColumnVisibility, ColumnVisibilityControl } from '../../components/ui/ColumnVisibilityControl';

interface GroupedStudent {
  studentId: string;
  studentName: string;
  studentPhone: string;
  totalBalance: number;
  groups: {
    groupId: string;
    groupName: string;
    groupCode: string;
    subjectName: string;
    balance: number;
    discountType: number | null;
    discountValue: number;
    discountReason: string | null;
    isFrozen: boolean;
    updatedAt: string | null;
  }[];
  isFrozen: boolean; // Overall frozen status
}

interface RecentAttendance {
  id: string;
  studentId: string;
  studentName: string;
  studentLogin: string;
  groupId: string;
  lessonId: string;
  date: string;
  plannedLessonDate: string;
  status: number;
  statusName: string;
  subjectName: string;
  groupName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
}

interface TransactionHistory {
  id: string;
  student: {
    id: string;
    name: string;
    phone: string;
  };
  group: {
    id: string;
    name: string;
    code: string;
  };
  type: number;
  typeDisplayName: string;
  amount: number;
  balanceAfter: number;
  description: string;
  operationDate: string;
  processedBy: string | null;
  processedByName: string;
  metadata: string | null;
}

interface StudentBalanceDetail {
  id: string;
  student: {
    id: string;
    name: string;
    phone: string;
  };
  group: {
    id: string;
    name: string;
    code: string;
  };
  balance: number;
  discountType: number;
  discountTypeName: string;
  discountValue: number;
  discountReason: string | null;
  createdAt: string;
  updatedAt: string;
  recentAttendances: RecentAttendance[];
  transactionHistory: TransactionHistory[];
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [balanceData, setBalanceData] = useState<FlattenedBalance[]>([]);
  const [groupedStudents, setGroupedStudents] = useState<GroupedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentBalanceDetail[] | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  
  // Filter states
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const groupStudentsByStudent = (flatData: FlattenedBalance[]): GroupedStudent[] => {
    const grouped = flatData.reduce((acc, item) => {
      if (!acc[item.studentId]) {
        acc[item.studentId] = {
          studentId: item.studentId,
          studentName: item.studentName,
          studentPhone: item.studentPhone,
          totalBalance: 0,
          groups: [],
          isFrozen: false
        };
      }
      
      acc[item.studentId].totalBalance += item.balance;
      acc[item.studentId].groups.push({
        groupId: item.groupId,
        groupName: item.groupName,
        groupCode: item.groupCode,
        subjectName: item.subjectName,
        balance: item.balance,
        discountType: item.discountType,
        discountValue: item.discountValue || 0,
        discountReason: item.discountReason,
        isFrozen: item.isFrozen,
        updatedAt: item.updatedAt
      });
      
      if (item.isFrozen) {
        acc[item.studentId].isFrozen = true;
      }
      
      return acc;
    }, {} as Record<string, GroupedStudent>);
    
    return Object.values(grouped);
  };

  const fetchStudentDetails = async (studentId: string) => {
    setModalLoading(true);
    try {
      const response = await AuthenticatedApiService.get<StudentBalanceDetail[]>(
        `/StudentBalance/student/${studentId}`
      );
      setSelectedStudent(response);
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleStudentClick = (student: GroupedStudent) => {
    fetchStudentDetails(student.studentId);
    setShowModal(true);
  };
  
  // Column visibility
  const { columns, toggleColumn, isColumnVisible } = useColumnVisibility([
    { key: 'student', label: 'Студент', required: true },
    { key: 'phone', label: 'Телефон' },
    { key: 'balance', label: 'Общий баланс', required: true },
    { key: 'group', label: 'Кол-во групп' },
    { key: 'frozen', label: 'Состояние' }
  ]);

  useEffect(() => {
    if (!user) return;
    
    // Проверяем права доступа
    if (!canManageUsers(user.role)) {
      router.push('/');
      return;
    }
    
    if (user?.organizationId) {
      loadFilterOptions();
    }
  }, [user, router]);

  // Load data when filters change
  useEffect(() => {
    if (user?.organizationId) {
      loadStudentBalances();
    }
  }, [user?.organizationId, debouncedSearchTerm, selectedGroupId, selectedSubjectId, currentPage, pageSize]);

  const loadFilterOptions = async () => {
    if (!user?.organizationId) return;

    try {
      const baseRequest = {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: user.organizationId
      };

      // Load groups
      const groupsResponse = await AuthenticatedApiService.getGroups(user.organizationId, 1000);
      setGroups(groupsResponse?.items || []);

      // Load subjects
      const subjectsResponse = await AuthenticatedApiService.post<{ items: { id: string; name: string }[] }>(
        '/Subject/GetAllSubjects',
        baseRequest
      );
      setSubjects(subjectsResponse?.items || []);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };



  const loadStudentBalances = useCallback(async () => {
    if (!user?.organizationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const request: StudentBalanceRequest = {
        pageNumber: currentPage,
        pageSize: pageSize,
        organizationId: user.organizationId
      };
      
      if (debouncedSearchTerm) request.studentSearch = debouncedSearchTerm;
      if (selectedGroupId) request.groupId = selectedGroupId;
      if (selectedSubjectId) request.subjectId = selectedSubjectId;
      
      const response = await StudentBalanceApiService.getStudentBalances(request);
      const flattenedData = StudentBalanceApiService.flattenBalances(response.items);
      
      setBalanceData(flattenedData);
      setGroupedStudents(groupStudentsByStudent(flattenedData));
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setHasNextPage(response.hasNextPage);
      setHasPreviousPage(response.hasPreviousPage);
    } catch (err) {
      console.error('Failed to load student balances:', err);
      setError('Ошибка загрузки данных о балансах студентов');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, debouncedSearchTerm, selectedGroupId, selectedSubjectId, currentPage, pageSize]);

  // Calculate stats from grouped students
  const totalBalances = groupedStudents.length;
  const totalAmount = groupedStudents.reduce((sum, student) => sum + student.totalBalance, 0);
  const positiveBalances = groupedStudents.filter(student => student.totalBalance > 0).length;
  const negativeBalances = groupedStudents.filter(student => student.totalBalance < 0).length;
  const withDiscounts = balanceData.filter(balance => balance.discountValue && balance.discountValue > 0).length;
  const frozenBalances = groupedStudents.filter(student => student.isFrozen).length;

  // Проверка прав доступа
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!canManageUsers(user.role)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">У вас нет прав доступа к этой странице</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600 dark:text-green-400';
    if (balance < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getBalanceBg = (balance: number, isFrozen?: boolean) => {
    if (isFrozen) return 'bg-blue-50 dark:bg-blue-900/20';
    if (balance > 0) return 'bg-green-50 dark:bg-green-900/20';
    if (balance < 0) return 'bg-red-50 dark:bg-red-900/20';
    return 'bg-gray-50 dark:bg-gray-800';
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedGroupId('');
    setSelectedSubjectId('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || selectedGroupId || selectedSubjectId;

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
                onClick={loadStudentBalances}
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
      <div className="w-full space-y-6 min-w-0">
        {/* Header */}
        <PageHeaderWithStats
          title="Платежи"
          subtitle="Управление балансами студентов"
          icon={CurrencyDollarIcon}
          gradientFrom="green-500"
          gradientTo="emerald-600"
          extraActions={
            <ColumnVisibilityControl
              columns={columns}
              onColumnToggle={toggleColumn}
              variant="header"
            />
          }
          stats={[
            { label: "Всего записей", value: totalBalances, color: "green" },
            { label: "Общая сумма", value: `${new Intl.NumberFormat('ru-RU').format(totalAmount)} ₸`, color: "emerald" },
            { label: "Положительных", value: positiveBalances, color: "blue" },
            { label: "Отрицательных", value: negativeBalances, color: "red" },
            { label: "Со скидками", value: withDiscounts, color: "purple" },
            { label: "Замороженных", value: frozenBalances, color: "orange" }
          ]}
        />

        {/* Search and Filters */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по имени студента, телефону, группе..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 rounded-lg border transition-colors duration-200 flex items-center gap-2 ${
                  hasActiveFilters || showFilters
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                Фильтры
                {hasActiveFilters && (
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {[searchTerm, selectedGroupId, selectedSubjectId].filter(Boolean).length}
                  </span>
                )}
              </button>
              <button
                onClick={loadStudentBalances}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Обновление...' : 'Обновить'}
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Group Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Группа
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => {
                      setSelectedGroupId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Предмет
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Все предметы</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters */}
                <div className="flex items-end">
                  <button
                    onClick={handleResetFilters}
                    disabled={!hasActiveFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Загрузка данных...</p>
            </div>
          ) : balanceData.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full w-16 h-16 mx-auto mb-4">
                <CurrencyDollarIcon className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mt-2" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {searchTerm ? 'Нет результатов' : 'Нет данных о балансах'}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Данные о балансах студентов отсутствуют'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto scrollbar-custom min-w-0">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-700 dark:to-gray-600">
                    <tr>
                      {isColumnVisible('student') && (
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider whitespace-nowrap">
                          Студент
                        </th>
                      )}
                      {isColumnVisible('phone') && (
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider whitespace-nowrap">
                          Телефон
                        </th>
                      )}
                      {isColumnVisible('balance') && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          Общий баланс
                        </th>
                      )}
                      {isColumnVisible('group') && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          Кол-во групп
                        </th>
                      )}
                      {isColumnVisible('frozen') && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          Состояние
                        </th>
                      )}
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {groupedStudents.map((student, index) => (
                      <tr 
                        key={student.studentId} 
                        className={`cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 ${getBalanceBg(student.totalBalance, student.isFrozen)}`}
                        onClick={() => handleStudentClick(student)}
                      >

                        {isColumnVisible('student') && (
                          <td className="px-2 sm:px-4 py-3">
                            <div className="flex items-center">
                              <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg mr-3">
                                <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.studentName}
                              </div>
                            </div>
                          </td>
                        )}
                        {isColumnVisible('phone') && (
                          <td className="px-2 sm:px-4 py-3">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 min-w-0">
                              <PhoneIcon className="h-4 w-4 mr-2" />
                              {student.studentPhone}
                            </div>
                          </td>
                        )}
                        {isColumnVisible('balance') && (
                          <td className="px-4 py-3 text-right">
                            <div className={`text-sm font-semibold ${getBalanceColor(student.totalBalance)}`}>
                              {formatBalance(student.totalBalance)}
                            </div>
                          </td>
                        )}
                        {isColumnVisible('group') && (
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg mr-3">
                                <UserGroupIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.groups.length} группы
                              </div>
                            </div>
                          </td>
                        )}
                        {isColumnVisible('frozen') && (
                          <td className="px-4 py-3">
                            {student.isFrozen ? (
                              <div className="flex items-center space-x-1">
                                <AcademicCapIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  Заморожено
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Активно
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <button
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                          >
                            Подробнее
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-4">
                {groupedStudents.map((student) => (
                  <div 
                    key={student.studentId}
                    className={`cursor-pointer rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-600/50 ${getBalanceBg(student.totalBalance, student.isFrozen)}`}
                    onClick={() => handleStudentClick(student)}
                  >
                    {/* Student Info */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg mr-3">
                          <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {student.studentName}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <PhoneIcon className="h-3 w-3 mr-1" />
                            {student.studentPhone}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className={`text-sm font-semibold ${getBalanceColor(student.totalBalance)}`}>
                          {formatBalance(student.totalBalance)}
                        </div>
                        {student.isFrozen && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-1">
                            Заморожено
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Groups Info */}
                    <div className="p-3 bg-white/60 dark:bg-gray-700/60 rounded-lg border border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Группы</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.groups.length} группы
                          </div>
                        </div>
                        <button className="text-blue-600 text-xs font-medium">
                          Подробнее
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4 mt-6">
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
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPreviousPage}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg
                               hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                               dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200
                               transition-colors duration-200"
                    >
                      Назад
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              page === currentPage
                                ? 'bg-green-600 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNextPage}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg
                               hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                               dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200
                               transition-colors duration-200"
                    >
                      Вперед
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-4xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <UserIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedStudent?.[0]?.student?.name || 'Загрузка...'}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {selectedStudent?.[0]?.student?.phone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              {modalLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedStudent && selectedStudent.length > 0 ? (
                <div className="space-y-6">
                  {/* Overall Balance Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Общий баланс по всем группам
                      </div>
                      <div className={`font-bold text-2xl ${getBalanceColor(selectedStudent.reduce((sum, item) => sum + item.balance, 0))}`}>
                        {formatBalance(selectedStudent.reduce((sum, item) => sum + item.balance, 0))}
                      </div>
                    </div>
                  </div>

                  {/* Groups List */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Балансы по группам ({selectedStudent.length})
                    </h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedStudent.map((item) => (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg border ${getBalanceBg(item.balance)} border-gray-200 dark:border-gray-600`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {item.group.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Код: {item.group.code}
                              </div>
                            </div>
                            <div className={`font-bold text-lg ${getBalanceColor(item.balance)}`}>
                              {formatBalance(item.balance)}
                            </div>
                          </div>
                          
                          {/* Discount Info for this group */}
                          {item.discountValue && item.discountValue > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-3 mb-3">
                              <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                                Скидка: {item.discountTypeName}
                              </div>
                              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                                {item.discountType === 0 ? `${item.discountValue} ₸` : `${item.discountValue}%`}
                              </div>
                              {item.discountReason && (
                                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                  Причина: {item.discountReason}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Обновлено: {formatDate(item.updatedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Attendances */}
                  {selectedStudent.some(item => item.recentAttendances && item.recentAttendances.length > 0) && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Последние посещения
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedStudent.map(item => 
                          item.recentAttendances?.map(attendance => (
                            <div
                              key={attendance.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {attendance.subjectName} - {attendance.groupName}
                                  </div>
                                  <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    attendance.status === 1 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {attendance.statusName}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(attendance.date)} • {attendance.startTime} - {attendance.endTime} • {attendance.teacherName}
                                </div>
                              </div>
                            </div>
                          )) || []
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  {selectedStudent.some(item => item.transactionHistory && item.transactionHistory.length > 0) && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        История транзакций
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedStudent.map(item => 
                          item.transactionHistory?.map(transaction => (
                            <div
                              key={transaction.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {transaction.typeDisplayName}
                                  </div>
                                  <div className={`font-semibold ${
                                    transaction.amount > 0 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {transaction.amount > 0 ? '+' : ''}{formatBalance(transaction.amount)}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                  {transaction.description}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(transaction.operationDate)} • {transaction.processedByName} • Баланс: {formatBalance(transaction.balanceAfter)}
                                </div>
                              </div>
                            </div>
                          )) || []
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Не удалось загрузить данные студента
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}