'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { StudentBalanceApiService } from '../../services/StudentBalanceApiService';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { Group } from '../../types/Group';
import { StudentGroupBalanceDetail } from '../../types/StudentBalance';
import { 
  CurrencyDollarIcon, 
  UserIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  AcademicCapIcon,
  UserGroupIcon,
  PlusCircleIcon,
  ReceiptPercentIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { RefundModal } from '../../components/RefundModal';
import { AddBalanceModal } from '../../components/AddBalanceModal';
import { DiscountModal } from '../../components/DiscountModal';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../contexts/ToastContext';

// Types based on API response
interface StudentPayment {
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentLogin: string;
  totalPaid: number;
  currentBalance: number;
  remainingLessons: number;
  isFrozen: boolean;
  frozenFrom: string | null;
  frozenTo: string | null;
  freezeReason: string | null;
  discountType: number | null;
  discountValue: number | null;
  discountReason: string | null;
}

interface GroupPayment {
  groupId: string;
  groupName: string;
  groupCode: string;
  totalPaid: number;
  students: StudentPayment[];
}

interface SubjectPayment {
  subjectId: string;
  subjectName: string;
  totalPaid: number;
  groups: GroupPayment[];
}

interface PaymentsGroupedResponse {
  subjects: SubjectPayment[];
}

interface Subject {
  id: string;
  name: string;
}

interface PaymentsGroupedResponse {
  subjects: SubjectPayment[];
}

export default function PaymentsGroupedPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Check if user is admin or owner
  const isAdmin = user?.role === 'Administrator' || user?.role === 'Owner';
  
  const [data, setData] = useState<PaymentsGroupedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  // Filters
  const [subjectIdFilter, setSubjectIdFilter] = useState('');
  const [groupIdFilter, setGroupIdFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const debouncedStudentSearch = useDebounce(studentSearch, 300);
  
  // Expansion state
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Modal state
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<StudentGroupBalanceDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundData, setRefundData] = useState<{
    studentId: string;
    groupId: string;
    studentName: string;
    groupName: string;
    availableBalance: number;
  } | null>(null);

  // Add Balance modal state
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [addBalanceData, setAddBalanceData] = useState<{
    studentId: string;
    groupId: string;
    studentName: string;
    groupName: string;
  } | null>(null);

  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountData, setDiscountData] = useState<{
    studentId: string;
    groupId: string;
    studentName: string;
    groupName: string;
  } | null>(null);

  const { showSuccess, showError } = useToast();
  
  // Available subjects and groups for filters - loaded from API
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
    }
  }, [isAdmin, router]);

  // Load filter options
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

  useEffect(() => {
    if (user?.organizationId) {
      loadFilterOptions();
    }
  }, [user?.organizationId]);

  const loadData = useCallback(async () => {
    if (!user?.organizationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const requestBody = {
        pageNumber: currentPage,
        pageSize: pageSize,
        ...(subjectIdFilter && { subjectId: subjectIdFilter }),
        ...(groupIdFilter && { groupId: groupIdFilter }),
        ...(debouncedStudentSearch && { studentSearch: debouncedStudentSearch })
      };
      
      const response = await StudentBalanceApiService.getPaymentsGrouped(
        user.organizationId,
        requestBody
      );
      
      setData(response);
    } catch (err) {
      console.error('Error loading payments data:', err);
      setError('Не удалось загрузить данные о платежах');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, currentPage, pageSize, subjectIdFilter, groupIdFilter, debouncedStudentSearch]);

  useEffect(() => {
    if (user?.organizationId) {
      loadData();
    }
  }, [loadData, user?.organizationId]);

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (data) {
      const allSubjects = new Set(data.subjects.map(s => s.subjectId));
      const allGroups = new Set(data.subjects.flatMap(s => s.groups.map(g => g.groupId)));
      setExpandedSubjects(allSubjects);
      setExpandedGroups(allGroups);
    }
  };

  const collapseAll = () => {
    setExpandedSubjects(new Set());
    setExpandedGroups(new Set());
  };

  const fetchStudentDetails = async (studentId: string, groupId: string) => {
    try {
      setDetailsLoading(true);
      const details = await StudentBalanceApiService.getStudentGroupBalanceDetails(studentId, groupId);
      setSelectedStudentDetails(details);
      setShowStudentDetailsModal(true);
    } catch (error) {
      showError('Не удалось загрузить детали студента');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStudentClick = (student: StudentPayment, groupId: string) => () => {
    fetchStudentDetails(student.studentId, groupId);
  };

  const handleRefundClick = (studentId: string, groupId: string, studentName: string, groupName: string, availableBalance: number) => {
    setRefundData({
      studentId,
      groupId,
      studentName,
      groupName,
      availableBalance
    });
    setShowRefundModal(true);
  };

  const handleRefundSuccess = () => {
    loadData();
    showSuccess('Возврат успешно выполнен');
  };

  const handleAddBalanceClick = (studentId: string, groupId: string, studentName: string, groupName: string) => {
    setAddBalanceData({
      studentId,
      groupId,
      studentName,
      groupName
    });
    setShowAddBalanceModal(true);
  };

  const handleAddBalanceConfirm = async (amount: number, description: string) => {
    if (!addBalanceData) return;

    try {
      await StudentBalanceApiService.addBalance({
        studentId: addBalanceData.studentId,
        groupId: addBalanceData.groupId,
        amount,
        description
      });
      showSuccess(`Баланс пополнен на ${amount.toLocaleString()} ₸`);
      setShowAddBalanceModal(false);
      loadData();
    } catch (error: unknown) {
      showError('Ошибка при пополнении баланса: ' + ((error as Error)?.message || 'Неизвестная ошибка'));
      throw error;
    }
  };

  const handleDiscountClick = (studentId: string, groupId: string, studentName: string, groupName: string) => {
    setDiscountData({
      studentId,
      groupId,
      studentName,
      groupName
    });
    setShowDiscountModal(true);
  };

  const handleDiscountConfirm = async (discountType: number, discountValue: number, discountReason: string) => {
    if (!discountData) return;

    try {
      await StudentBalanceApiService.applyDiscount({
        studentId: discountData.studentId,
        groupId: discountData.groupId,
        discountType,
        discountValue,
        discountReason
      });
      const discountText = discountType === 1 ? `${discountValue}%` : `${discountValue.toLocaleString()} ₸`;
      showSuccess(`Скидка ${discountText} применена`);
      setShowDiscountModal(false);
      loadData();
    } catch (error: unknown) {
      showError('Ошибка при применении скидки: ' + ((error as Error)?.message || 'Неизвестная ошибка'));
      throw error;
    }
  };

  const formatBalance = (amount: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' ₸';
  };

  const getBalanceColor = (balance: number): string => {
    if (balance < 0) return 'text-red-600 dark:text-red-400';
    if (balance === 0) return 'text-gray-600 dark:text-gray-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getBalanceBg = (balance: number): string => {
    if (balance < 0) return 'bg-red-50 dark:bg-red-900/10';
    return 'bg-white dark:bg-gray-800';
  };

  const totalPaidAllSubjects = data?.subjects.reduce((sum, subject) => sum + subject.totalPaid, 0) || 0;

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto mt-6">
        <PageHeaderWithStats
          title="Платежи по предметам"
          subtitle="Управление платежами студентов по предметам и группам"
          icon={CurrencyDollarIcon}
          gradientFrom="from-green-500"
          gradientTo="to-emerald-600"
          stats={[
            {
              label: 'Всего оплачено',
              value: formatBalance(totalPaidAllSubjects),
              color: 'green'
            },
            {
              label: 'Предметов',
              value: data?.subjects.length || 0,
              color: 'blue'
            },
            {
              label: 'Групп',
              value: data?.subjects.reduce((sum, s) => sum + s.groups.length, 0) || 0,
              color: 'purple'
            }
          ]}
        />

        {/* Filters */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Student Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Поиск студента
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Имя, телефон, логин..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Предмет
              </label>
              <select
                value={subjectIdFilter}
                onChange={(e) => setSubjectIdFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Все предметы</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            {/* Group Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Группа
              </label>
              <select
                value={groupIdFilter}
                onChange={(e) => setGroupIdFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Все группы</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name} ({group.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expand/Collapse buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={expandAll}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Развернуть все
            </button>
            <button
              onClick={collapseAll}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Свернуть все
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
            {error}
          </div>
        ) : data?.subjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Нет данных о платежах</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.subjects.map((subject) => (
              <div
                key={subject.subjectId}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Subject Header */}
                <div
                  onClick={() => toggleSubject(subject.subjectId)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-blue-50 dark:bg-blue-900/20"
                >
                  <div className="flex items-center gap-3">
                    {expandedSubjects.has(subject.subjectId) ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                    <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {subject.subjectName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Групп: {subject.groups.length}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Всего оплачено
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatBalance(subject.totalPaid)}
                    </div>
                  </div>
                </div>

                {/* Groups */}
                {expandedSubjects.has(subject.subjectId) && (
                  <div className="p-4 space-y-3">
                    {subject.groups.map((group) => (
                      <div
                        key={group.groupId}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                      >
                        {/* Group Header */}
                        <div
                          onClick={() => toggleGroup(group.groupId)}
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-gray-50 dark:bg-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            {expandedGroups.has(group.groupId) ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            )}
                            <UserGroupIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {group.groupName}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Код: {group.groupCode} • Студентов: {group.students.length}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Оплачено
                            </div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatBalance(group.totalPaid)}
                            </div>
                          </div>
                        </div>

                        {/* Students Table */}
                        {expandedGroups.has(group.groupId) && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Студент
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Контакт
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Оплачено
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Баланс
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Уроков
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Скидка
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Статус
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Действия
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {group.students.map((student) => (
                                  <tr
                                    key={student.studentId}
                                    onClick={handleStudentClick(student, group.groupId)}
                                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                      student.isFrozen ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                                    }`}
                                  >
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="text-blue-600 dark:text-blue-400 font-medium">
                                        {student.studentName}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {student.studentLogin}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                      {student.studentPhone}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatBalance(student.totalPaid)}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className={`text-sm font-bold ${getBalanceColor(student.currentBalance)}`}>
                                        {formatBalance(student.currentBalance)}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                      {student.remainingLessons}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {student.discountValue && student.discountValue > 0 ? (
                                        <div className="flex items-center gap-1">
                                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                            {student.discountType === 1 ? `${student.discountValue}%` : `${student.discountValue.toLocaleString()} ₸`}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {student.isFrozen ? (
                                        <div>
                                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                            Заморожен
                                          </span>
                                          {student.frozenFrom && student.frozenTo && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                              {new Date(student.frozenFrom).toLocaleDateString('ru-RU')} - {new Date(student.frozenTo).toLocaleDateString('ru-RU')}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                          Активен
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddBalanceClick(
                                              student.studentId,
                                              group.groupId,
                                              student.studentName,
                                              group.groupName
                                            );
                                          }}
                                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                                          title="Пополнить баланс"
                                        >
                                          <PlusCircleIcon className="h-4 w-4" />
                                          Пополнить
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDiscountClick(
                                              student.studentId,
                                              group.groupId,
                                              student.studentName,
                                              group.groupName
                                            );
                                          }}
                                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                                          title="Применить скидку"
                                        >
                                          <ReceiptPercentIcon className="h-4 w-4" />
                                          Скидка
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRefundClick(
                                              student.studentId,
                                              group.groupId,
                                              student.studentName,
                                              group.groupName,
                                              student.currentBalance
                                            );
                                          }}
                                          disabled={student.currentBalance <= 0}
                                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                          title="Возврат средств"
                                        >
                                          <ArrowPathIcon className="h-4 w-4" />
                                          Возврат
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showStudentDetailsModal && selectedStudentDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-4xl w-full max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <UserIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedStudentDetails.student.name}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {selectedStudentDetails.student.phone} • {selectedStudentDetails.group.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStudentDetailsModal(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              {detailsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Balance Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Текущий баланс
                        </div>
                        <div className={`font-bold text-2xl ${getBalanceColor(selectedStudentDetails.balance)}`}>
                          {formatBalance(selectedStudentDetails.balance)}
                        </div>
                      </div>
                      {selectedStudentDetails.discountValue > 0 && (
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Скидка
                          </div>
                          <div className="text-lg font-medium text-purple-600 dark:text-purple-400">
                            {selectedStudentDetails.discountTypeName}: {selectedStudentDetails.discountValue}
                            {selectedStudentDetails.discountType === 1 ? '%' : ' ₸'}
                          </div>
                          {selectedStudentDetails.discountReason && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {selectedStudentDetails.discountReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Attendances */}
                  {selectedStudentDetails.recentAttendances && selectedStudentDetails.recentAttendances.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Последние посещения
                      </h3>
                      <div className="space-y-2">
                        {selectedStudentDetails.recentAttendances.map((attendance) => (
                          <div
                            key={attendance.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {new Date(attendance.date).toLocaleDateString('ru-RU')}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {attendance.startTime.slice(0, 5)} - {attendance.endTime.slice(0, 5)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {attendance.statusName}
                              </div>
                              {attendance.grade !== null && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Оценка: {attendance.grade}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  {selectedStudentDetails.transactionHistory && selectedStudentDetails.transactionHistory.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        История транзакций
                      </h3>
                      <div className="space-y-2">
                        {selectedStudentDetails.transactionHistory.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                  transaction.type === 1 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {transaction.typeDisplayName}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(transaction.operationDate).toLocaleDateString('ru-RU')}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {transaction.description}
                              </div>
                              {transaction.processedByName && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Обработал: {transaction.processedByName}
                                </div>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <div className={`text-lg font-bold ${
                                transaction.typeDisplayName.toLowerCase().includes('возврат') || transaction.amount < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                {transaction.typeDisplayName.toLowerCase().includes('возврат')
                                  ? '-' + formatBalance(Math.abs(transaction.amount))
                                  : (transaction.amount > 0 ? '+' : '') + formatBalance(transaction.amount)
                                }
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Баланс: {formatBalance(transaction.balanceAfter)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && refundData && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          studentId={refundData.studentId}
          groupId={refundData.groupId}
          studentName={refundData.studentName}
          groupName={refundData.groupName}
          availableBalance={refundData.availableBalance}
          onRefundSuccess={handleRefundSuccess}
        />
      )}

      {/* Add Balance Modal */}
      {showAddBalanceModal && addBalanceData && (
        <AddBalanceModal
          isOpen={showAddBalanceModal}
          onClose={() => setShowAddBalanceModal(false)}
          onConfirm={handleAddBalanceConfirm}
          studentName={addBalanceData.studentName}
        />
      )}

      {/* Discount Modal */}
      {showDiscountModal && discountData && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          onConfirm={handleDiscountConfirm}
          studentName={discountData.studentName}
        />
      )}
    </div>
  );
}
