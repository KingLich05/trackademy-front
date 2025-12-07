'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ExportApiService } from '../../services/ExportApiService';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { Group, GroupsResponse } from '../../types/Group';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { attendanceApi } from '../../services/AttendanceApiService';
import { ExportAttendanceRequest, AttendanceStatus } from '../../types/Attendance';
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon, 
  UsersIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { canManageUsers } from '../../types/Role';

interface ExportCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  exportType: string;
  color: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  
  // Состояние для экспорта групп
  const [isGroupExportModalOpen, setIsGroupExportModalOpen] = useState(false);
  const [exportGroupId, setExportGroupId] = useState<string>('');
  const [includePayments, setIncludePayments] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);

  // Состояние для экспорта платежей
  const [isPaymentExportModalOpen, setIsPaymentExportModalOpen] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState({
    groupId: '',
    status: undefined as number | undefined,
    type: undefined as number | undefined,
    fromDate: '',
    toDate: ''
  });

  // Состояние для экспорта посещаемости
  const [isAttendanceExportModalOpen, setIsAttendanceExportModalOpen] = useState(false);
  const [attendanceFilters, setAttendanceFilters] = useState<ExportAttendanceRequest>({
    organizationId: user?.organizationId || '',
    fromDate: '',
    toDate: '',
    status: undefined,
    groupId: undefined,
    studentIds: undefined
  });
  const [attendanceStudents, setAttendanceStudents] = useState<Array<{id: string, name: string}>>([]);
  const [allStudents, setAllStudents] = useState<Array<{id: string, name: string}>>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Состояние для экспорта расписания
  const [isScheduleExportModalOpen, setIsScheduleExportModalOpen] = useState(false);
  const [scheduleFilters, setScheduleFilters] = useState({
    organizationId: user?.organizationId || '',
    groupId: '',
    teacherId: '',
    roomId: '',
    subjectId: '',
    startDate: '',
    endDate: '',
    exportType: 3 // Calendar по умолчанию для отчетов
  });
  const [teachers, setTeachers] = useState<{id: string; fullName?: string; name?: string}[]>([]);
  const [rooms, setRooms] = useState<{id: string; name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: string; name: string}[]>([]);

  // Проверяем права доступа
  if (!user || !canManageUsers(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Доступ запрещен</h1>
          <p className="text-gray-600 dark:text-gray-400">У вас нет прав для просмотра отчетов</p>
        </div>
      </div>
    );
  }

  const exportCards: ExportCard[] = [
    {
      title: 'Пользователи',
      description: 'Экспорт всех пользователей системы с подробной информацией',
      icon: UsersIcon,
      exportType: 'users',
      color: 'blue'
    },
    {
      title: 'Группы',
      description: 'Список всех групп с составом студентов и расписанием',
      icon: UserGroupIcon,
      exportType: 'groups',
      color: 'green'
    },
    {
      title: 'Платежи',
      description: 'Отчет по всем платежам, включая статусы и суммы',
      icon: CurrencyDollarIcon,
      exportType: 'payments',
      color: 'yellow'
    },
    {
      title: 'Посещаемость',
      description: 'Статистика посещаемости по студентам и группам',
      icon: ClipboardDocumentCheckIcon,
      exportType: 'attendance',
      color: 'purple'
    },
    {
      title: 'Расписание',
      description: 'Полное расписание занятий всех групп',
      icon: CalendarDaysIcon,
      exportType: 'schedules',
      color: 'indigo'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30',
      green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30',
      yellow: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      purple: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30',
      indigo: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
      red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
      orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30',
      teal: 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/30'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const handleExport = async (exportType: string, title: string) => {
    setIsExporting(exportType);
    try {

      switch (exportType) {
        case 'groups':
          // Открываем модальное окно для настройки экспорта групп
          await loadGroups();
          setIsGroupExportModalOpen(true);
          return;
        
        case 'users':
          await handleExportUsers();
          return;
        case 'payments':
          // Открываем модальное окно для настройки экспорта платежей
          await loadGroups();
          setIsPaymentExportModalOpen(true);
          return;
        case 'attendance':
          // Открываем модальное окно для настройки экспорта посещаемости
          await loadGroups();
          await loadAllStudents(); // Загружаем всех студентов по умолчанию
          const today = new Date();
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          setAttendanceFilters({
            organizationId: user?.organizationId || '',
            fromDate: firstDayOfMonth.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0],
            status: undefined,
            groupId: undefined,
            studentIds: undefined
          });
          setSelectedStudentIds([]);
          setAttendanceStudents([]); // Очищаем студентов группы, так как по умолчанию показываем всех
          setStudentSearchQuery('');
          setIsAttendanceExportModalOpen(true);
          return;
        case 'schedules':
          // Открываем модальное окно для настройки экспорта расписания
          await loadScheduleData();
          setIsScheduleExportModalOpen(true);
          return;
        default:
          showError('Неизвестный тип экспорта');
      }
    } catch (error) {
      console.error(`Error exporting ${exportType}:`, error);
      showError(`Ошибка при экспорте: ${title}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportUsers = async () => {
    if (!user?.organizationId) {
      showError('Организация не найдена');
      return;
    }

    setIsExporting('users');
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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess('Файл пользователей успешно загружен');
    } catch (error) {
      console.error('Ошибка при экспорте пользователей:', error);
      showError('Ошибка при экспорте пользователей');
    } finally {
      setIsExporting(null);
    }
  };

  const loadGroups = async () => {
    if (!user?.organizationId) return;
    
    try {
      const response = await AuthenticatedApiService.post<GroupsResponse>('/Group/get-groups', {
        pageNumber: 1,
        pageSize: 100,
        organizationId: user.organizationId
      });
      
      setGroups(response.items || []);
    } catch (error) {
      console.error('Ошибка при загрузке групп:', error);
      showError('Ошибка при загрузке групп');
    }
  };

  const loadStudentsForGroup = async (groupId: string) => {
    if (!user?.organizationId || !groupId) {
      setAttendanceStudents([]);
      return;
    }
    
    try {
      console.log('Загружаем студентов для группы:', groupId); // Для отладки
      
      // Попробуем загрузить студентов через API групп
      const groupResponse = await AuthenticatedApiService.post<{items: Array<{
        id: string, 
        name: string,
        students?: Array<{studentId: string, studentName: string}>
      }>}>('/Group/get-groups', {
        pageNumber: 1,
        pageSize: 100,
        organizationId: user.organizationId
      });
      
      if (groupResponse && groupResponse.items) {
        const selectedGroup = groupResponse.items.find(group => group.id === groupId);
        if (selectedGroup && selectedGroup.students) {
          console.log('Найдены студенты группы через API групп:', selectedGroup.students.length);
          const validStudents = selectedGroup.students.filter(student => student.studentId); // Используем studentId вместо id
          console.log('Валидные студенты:', validStudents);
          const mappedStudents = validStudents.map(student => ({
            id: student.studentId, // Маппим studentId в id
            name: student.studentName || 'Без имени' // Используем studentName вместо name
          }));
          console.log('Устанавливаем студентов группы:', mappedStudents);
          setAttendanceStudents(mappedStudents);
          return;
        }
      }
      
      // Если не получилось через группы, попробуем обычный запрос с groupId
      const response = await AuthenticatedApiService.post<{items: Array<{id: string, name: string}>}>('/User/get-users', {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: user.organizationId,
        roleIds: [1], // Student role
        groupId: groupId
      });
      
      if (response && response.items) {
        console.log('Получены студенты через User API:', response.items.length);
        const validStudents = response.items.filter(student => student.id); // Фильтруем студентов без ID
        setAttendanceStudents(validStudents.map(student => ({
          id: student.id,
          name: student.name || 'Без имени'
        })));
      } else {
        console.log('Нет студентов в группе');
        setAttendanceStudents([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке студентов группы:', error);
      showError('Ошибка при загрузке студентов группы');
      setAttendanceStudents([]);
    }
  };

  const loadAllStudents = async () => {
    if (!user?.organizationId) {
      setAllStudents([]);
      return;
    }
    
    try {
      const response = await AuthenticatedApiService.post<{items: Array<{id: string, name: string}>}>('/User/get-users', {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: user.organizationId,
        roleIds: [1] // Student role
      });
      
      if (response && response.items) {
        const validStudents = response.items.filter(student => student.id); // Фильтруем студентов без ID
        setAllStudents(validStudents.map(student => ({
          id: student.id,
          name: student.name || 'Без имени'
        })));
      }
    } catch (error) {
      console.error('Ошибка при загрузке всех студентов:', error);
      showError('Ошибка при загрузке студентов');
      setAllStudents([]);
    }
  };

  const handleExportGroups = async () => {
    if (!user?.organizationId) {
      showError('Организация не найдена');
      return;
    }

    setIsExporting('groups');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      const body: { organizationId: string; includePayments: boolean; groupId?: string } = {
        organizationId: user.organizationId,
        includePayments
      };

      if (exportGroupId) {
        body.groupId = exportGroupId;
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
      
      setIsGroupExportModalOpen(false);
      setExportGroupId('');
      setIncludePayments(true);
      showSuccess('Файл групп успешно загружен');
    } catch (error) {
      console.error('Ошибка при экспорте групп:', error);
      showError('Ошибка при экспорте групп');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPayments = async () => {
    if (!user?.organizationId) {
      showError('Организация не найдена');
      return;
    }

    setIsExporting('payments');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      const body: { 
        organizationId: string; 
        groupId?: string;
        status?: number;
        type?: number;
        periodFrom?: string;
        periodTo?: string;
      } = {
        organizationId: user.organizationId
      };

      if (paymentFilters.groupId) {
        body.groupId = paymentFilters.groupId;
      }
      if (paymentFilters.status !== undefined) {
        body.status = paymentFilters.status;
      }
      if (paymentFilters.type !== undefined) {
        body.type = paymentFilters.type;
      }
      if (paymentFilters.fromDate) {
        body.periodFrom = paymentFilters.fromDate;
      }
      if (paymentFilters.toDate) {
        body.periodTo = paymentFilters.toDate;
      }

      const response = await fetch('https://trackademy.kz/api/Export/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Ошибка экспорта платежей');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess('Файл платежей успешно загружен');
      setIsPaymentExportModalOpen(false);
      setPaymentFilters({
        groupId: '',
        status: undefined,
        type: undefined,
        fromDate: '',
        toDate: ''
      });
    } catch (error) {
      console.error('Error exporting payments:', error);
      showError('Ошибка при экспорте платежей');
    } finally {
      setIsExporting(null);
    }
  };

  const handlePaymentDateRangeChange = (startDate?: string, endDate?: string) => {
    setPaymentFilters(prev => ({
      ...prev,
      fromDate: startDate || '',
      toDate: endDate || ''
    }));
  };

  const handleExportAttendance = async () => {
    if (!user?.organizationId) {
      showError('Организация не найдена');
      return;
    }

    if (!attendanceFilters.fromDate || !attendanceFilters.toDate) {
      showError('Пожалуйста, выберите период для экспорта');
      return;
    }

    if (new Date(attendanceFilters.fromDate) > new Date(attendanceFilters.toDate)) {
      showError('Дата начала не может быть больше даты окончания');
      return;
    }

    setIsExporting('attendance');
    try {
      const exportRequest: ExportAttendanceRequest = {
        ...attendanceFilters,
        organizationId: user.organizationId,
        studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined
      };
      
      const blob = await attendanceApi.exportAttendance(exportRequest);
      
      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Формируем имя файла с датами
      const fromDate = new Date(attendanceFilters.fromDate).toLocaleDateString('ru-RU').replace(/\./g, '-');
      const toDate = new Date(attendanceFilters.toDate).toLocaleDateString('ru-RU').replace(/\./g, '-');
      link.download = `посещаемость_${fromDate}_${toDate}.xlsx`;
      
      // Скачиваем файл
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Освобождаем память
      URL.revokeObjectURL(url);
      
      showSuccess('Файл посещаемости успешно загружен');
      setIsAttendanceExportModalOpen(false);
      setAttendanceFilters({
        organizationId: user.organizationId,
        fromDate: '',
        toDate: '',
        status: undefined,
        groupId: undefined,
        studentIds: undefined
      });
      setSelectedStudentIds([]);
      setAttendanceStudents([]);
      setAllStudents([]);
    } catch (error) {
      console.error('Error exporting attendance:', error);
      showError('Ошибка при экспорте посещаемости');
    } finally {
      setIsExporting(null);
    }
  };

  const loadScheduleData = async () => {
    if (!user?.organizationId) return;
    
    try {
      // Загружаем группы (уже есть функция)
      await loadGroups();
      
      // Загружаем преподавателей
      const teachersResponse = await AuthenticatedApiService.getUsers({
        organizationId: user.organizationId,
        pageNumber: 1,
        pageSize: 1000,
        roleIds: [3] // Teachers only
      });
      setTeachers(teachersResponse.items || []);
      
      // Загружаем аудитории
      const roomsResponse = await AuthenticatedApiService.post<{items: {id: string; name: string}[]}>('/Room/GetAllRooms', {
        organizationId: user.organizationId,
        pageNumber: 1,
        pageSize: 1000
      });
      setRooms(roomsResponse.items || []);
      
      // Загружаем предметы
      const subjectsResponse = await AuthenticatedApiService.post<{items: {id: string; name: string}[]}>('/Subject/GetAllSubjects', {
        organizationId: user.organizationId,
        pageNumber: 1,
        pageSize: 1000
      });
      setSubjects(subjectsResponse.items || []);
      
    } catch (error) {
      console.error('Error loading schedule data:', error);
      showError('Ошибка при загрузке данных для фильтров');
    }
  };

  const handleScheduleDateRangeChange = (startDate?: string, endDate?: string) => {
    setScheduleFilters(prev => ({
      ...prev,
      startDate: startDate || '',
      endDate: endDate || ''
    }));
  };

  const handleExportSchedule = async () => {
    if (!user?.organizationId) {
      showError('Организация не найдена');
      return;
    }

    setIsExporting('schedules');
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
        exportType: scheduleFilters.exportType
      };

      if (scheduleFilters.groupId) body.groupId = scheduleFilters.groupId;
      if (scheduleFilters.teacherId) body.teacherId = scheduleFilters.teacherId;
      if (scheduleFilters.roomId) body.roomId = scheduleFilters.roomId;
      if (scheduleFilters.subjectId) body.subjectId = scheduleFilters.subjectId;
      if (scheduleFilters.startDate) body.startDate = scheduleFilters.startDate;
      if (scheduleFilters.endDate) body.endDate = scheduleFilters.endDate;

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
      const typeName = exportTypeNames[scheduleFilters.exportType as keyof typeof exportTypeNames] || 'расписание';
      a.download = `расписание_${typeName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess('Файл расписания успешно загружен');
      setIsScheduleExportModalOpen(false);
      setScheduleFilters({
        organizationId: user.organizationId,
        groupId: '',
        teacherId: '',
        roomId: '',
        subjectId: '',
        startDate: '',
        endDate: '',
        exportType: 3
      });
    } catch (error) {
      console.error('Error exporting schedule:', error);
      showError('Ошибка при экспорте расписания');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <>
      <div className="pt-16 space-y-6">
        {/* Заголовок страницы */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Отчеты</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Экспорт данных системы в различных форматах
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Описание */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Экспорт данных
          </h2>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            Выберите тип данных для экспорта. Все отчеты будут сформированы в формате Excel (.xlsx) и 
            содержат актуальную информацию на момент создания отчета.
          </p>
        </div>

        {/* Карточки экспорта */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exportCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.exportType}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer ${getColorClasses(card.color)}`}
                onClick={() => handleExport(card.exportType, card.title)}
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className="h-8 w-8" />
                  <DocumentArrowDownIcon 
                    className={`h-6 w-6 ${isExporting === card.exportType ? 'animate-bounce' : ''}`} 
                  />
                </div>
                
                <h3 className="text-lg font-semibold mb-2">
                  {card.title}
                </h3>
                
                <p className="text-sm opacity-80 mb-4">
                  {card.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/50 dark:bg-black/20">
                    Excel
                  </span>
                  
                  {isExporting === card.exportType && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <span className="text-xs">Экспорт...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Информация о форматах */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Информация об экспорте
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Форматы файлов:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Excel (.xlsx) - основной формат для всех отчетов</li>
                <li>• Включает фильтры и форматирование</li>
                <li>• Совместим с Microsoft Excel и LibreOffice</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Содержимое отчетов:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Актуальные данные на момент создания</li>
                <li>• Подробная информация по каждой записи</li>
                <li>• Возможность фильтрации и сортировки</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно экспорта групп */}
      {isGroupExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
                  Группа (опционально)
                </label>
                <select
                  value={exportGroupId}
                  onChange={(e) => setExportGroupId(e.target.value)}
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
                  setIsGroupExportModalOpen(false);
                  setExportGroupId('');
                  setIncludePayments(true);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleExportGroups}
                disabled={isExporting === 'groups'}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
              >
                {isExporting === 'groups' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Экспортировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно экспорта платежей */}
      {isPaymentExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Экспорт платежей
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Настройте фильтры для экспорта
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Группа */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Группа (опционально)
                </label>
                <select
                  value={paymentFilters.groupId}
                  onChange={(e) => setPaymentFilters(prev => ({ ...prev, groupId: e.target.value }))}
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

              {/* Статус */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус (опционально)
                </label>
                <select
                  value={paymentFilters.status || ''}
                  onChange={(e) => setPaymentFilters(prev => ({ 
                    ...prev, 
                    status: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все статусы</option>
                  <option value="1">Ожидает оплаты</option>
                  <option value="2">Оплачен</option>
                  <option value="3">Просрочен</option>
                  <option value="4">Отменен</option>
                  <option value="5">Возврат средств</option>
                  <option value="6">Частичный возврат</option>
                </select>
              </div>

              {/* Тип */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тип (опционально)
                </label>
                <select
                  value={paymentFilters.type || ''}
                  onChange={(e) => setPaymentFilters(prev => ({ 
                    ...prev, 
                    type: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все типы</option>
                  <option value="1">Ежемесячный</option>
                  <option value="2">Разовый</option>
                </select>
              </div>

              {/* Период */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Период
                </label>
                <DateRangePicker
                  startDate={paymentFilters.fromDate}
                  endDate={paymentFilters.toDate}
                  onDateChange={handlePaymentDateRangeChange}
                  placeholder="Выберите период"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsPaymentExportModalOpen(false);
                  setPaymentFilters({
                    groupId: '',
                    status: undefined,
                    type: undefined,
                    fromDate: '',
                    toDate: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleExportPayments}
                disabled={isExporting === 'payments'}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
              >
                {isExporting === 'payments' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Экспортировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно экспорта посещаемости */}
      {isAttendanceExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Экспорт посещаемости
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Выгрузите данные посещаемости в Excel
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Период дат - обязательное поле */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Период <span className="text-red-500">*</span>
                </label>
                <DateRangePicker
                  startDate={attendanceFilters.fromDate}
                  endDate={attendanceFilters.toDate}
                  onDateChange={(startDate, endDate) => 
                    setAttendanceFilters(prev => ({
                      ...prev,
                      fromDate: startDate || '',
                      toDate: endDate || ''
                    }))
                  }
                  placeholder="Выберите период"
                />
              </div>

              {/* Группа - опциональное поле */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Группа
                </label>
                <select
                  value={attendanceFilters.groupId || ''}
                  onChange={async (e) => {
                    const groupId = e.target.value;
                    setAttendanceFilters(prev => ({
                      ...prev,
                      groupId: groupId || undefined
                    }));
                    setSelectedStudentIds([]);
                    setStudentSearchQuery(''); // Сбрасываем поиск при смене группы
                    if (groupId) {
                      // Показать только студентов выбранной группы
                      await loadStudentsForGroup(groupId);
                    } else {
                      // Показать всех студентов организации
                      setAttendanceStudents([]); // Очищаем студентов группы
                      if (allStudents.length === 0) {
                        await loadAllStudents(); // Загружаем всех студентов, если их еще нет
                      }
                    }
                  }}
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

              {/* Студенты - зависит от выбранной группы */}
              {(() => {
                const currentStudents = attendanceFilters.groupId ? attendanceStudents : allStudents;
                console.log('Текущие студенты для отображения:', {
                  groupId: attendanceFilters.groupId,
                  attendanceStudents: attendanceStudents.length,
                  allStudents: allStudents.length,
                  currentStudents: currentStudents.length
                });
                
                if (currentStudents.length === 0) {
                  return (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <p className="text-sm">
                        {attendanceFilters.groupId ? 'В выбранной группе нет студентов' : 'Загрузка студентов...'}
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Студенты {attendanceFilters.groupId && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({groups.find(g => g.id === attendanceFilters.groupId)?.name} - {currentStudents.length} чел.)
                        </span>
                      )}
                      {!attendanceFilters.groupId && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          (все студенты - {currentStudents.length} чел.)
                        </span>
                      )}
                    </label>
                    
                    {/* Поиск студентов */}
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Поиск студентов..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-600">
                        <label className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-500 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(() => {
                              const filteredStudents = currentStudents.filter(student => 
                                student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
                              );
                              return filteredStudents.length > 0 && filteredStudents.every(student => selectedStudentIds.includes(student.id));
                            })()}
                            onChange={(e) => {
                              const filteredStudents = currentStudents.filter(student => 
                                student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
                              );
                              if (e.target.checked) {
                                const newIds = filteredStudents.map(s => s.id).filter(id => !selectedStudentIds.includes(id));
                                setSelectedStudentIds(prev => [...prev, ...newIds]);
                              } else {
                                const filteredIds = filteredStudents.map(s => s.id);
                                setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
                              }
                            }}
                            className="rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {studentSearchQuery ? 'Все найденные' : 'Все студенты'}
                          </span>
                        </label>
                      </div>
                      
                      {(() => {
                        const filteredStudents = currentStudents.filter(student => 
                          student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
                        );
                        
                        if (filteredStudents.length === 0) {
                          return (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                              <span className="text-sm">Студенты не найдены</span>
                            </div>
                          );
                        }
                        
                        return filteredStudents.map((student, index) => (
                          <div key={`${attendanceFilters.groupId ? 'group' : 'all'}-${student.id || `no-id-${index}`}`} className="p-2">
                            <label className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!student.id && selectedStudentIds.includes(student.id)}
                                onChange={(e) => {
                                  if (!student.id) return; // Не обрабатываем студентов без ID
                                  if (e.target.checked) {
                                    setSelectedStudentIds(prev => [...prev, student.id]);
                                  } else {
                                    setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                  }
                                }}
                                disabled={!student.id} // Отключаем чекбокс для студентов без ID
                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                              />
                              <span className={`text-sm ${student.id ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                {student.name} {!student.id && '(нет ID)'}
                              </span>
                            </label>
                          </div>
                        ));
                      })()}
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Выбрано: {selectedStudentIds.length} из {currentStudents.length}
                      </p>
                      {studentSearchQuery && (
                        <button
                          onClick={() => setStudentSearchQuery('')}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Сбросить поиск
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Статус посещения - опциональное поле */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус посещения
                </label>
                <select
                  value={attendanceFilters.status || ''}
                  onChange={(e) => setAttendanceFilters(prev => ({
                    ...prev,
                    status: e.target.value ? Number(e.target.value) as AttendanceStatus : undefined
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все статусы</option>
                  <option value="1">Присутствовал</option>
                  <option value="2">Отсутствовал</option>
                  <option value="3">Опоздал</option>
                  <option value="4">Уважительная причина</option>
                </select>
              </div>

              {/* Информация */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 {selectedStudentIds.length > 0
                    ? `Экспорт включит данные ${selectedStudentIds.length} выбранных студентов`
                    : attendanceFilters.groupId 
                      ? 'Экспорт включит данные всех студентов выбранной группы'
                      : 'Экспорт включит данные всех студентов вашей организации'
                  } за выбранный период
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsAttendanceExportModalOpen(false);
                  setAttendanceFilters({
                    organizationId: user?.organizationId || '',
                    fromDate: '',
                    toDate: '',
                    status: undefined,
                    groupId: undefined,
                    studentIds: undefined
                  });
                  setSelectedStudentIds([]);
                  setAttendanceStudents([]);
                  setAllStudents([]);
                  setStudentSearchQuery('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleExportAttendance}
                disabled={isExporting === 'attendance' || !attendanceFilters.fromDate || !attendanceFilters.toDate}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
              >
                {isExporting === 'attendance' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Экспортировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно экспорта расписания */}
      {isScheduleExportModalOpen && (
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
                  value={scheduleFilters.exportType}
                  onChange={(e) => setScheduleFilters(prev => ({ ...prev, exportType: Number(e.target.value) }))}
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
                  value={scheduleFilters.groupId}
                  onChange={(e) => setScheduleFilters(prev => ({ ...prev, groupId: e.target.value }))}
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
                  value={scheduleFilters.teacherId}
                  onChange={(e) => setScheduleFilters(prev => ({ ...prev, teacherId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Все преподаватели</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName || teacher.name}
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
                  value={scheduleFilters.roomId}
                  onChange={(e) => setScheduleFilters(prev => ({ ...prev, roomId: e.target.value }))}
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
                  value={scheduleFilters.subjectId}
                  onChange={(e) => setScheduleFilters(prev => ({ ...prev, subjectId: e.target.value }))}
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
                  startDate={scheduleFilters.startDate}
                  endDate={scheduleFilters.endDate}
                  onDateChange={handleScheduleDateRangeChange}
                  placeholder="Выберите период"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsScheduleExportModalOpen(false);
                  setScheduleFilters({
                    organizationId: user?.organizationId || '',
                    groupId: '',
                    teacherId: '',
                    roomId: '',
                    subjectId: '',
                    startDate: '',
                    endDate: '',
                    exportType: 3
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleExportSchedule}
                disabled={isExporting === 'schedules'}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
              >
                {isExporting === 'schedules' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Экспортировать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}