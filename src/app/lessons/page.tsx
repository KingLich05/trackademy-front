'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarView, Lesson, LessonFilters, LessonsResponse, getWeekStart, getWeekEnd, getMonthStart, getMonthEnd } from '@/types/Lesson';
import { Schedule } from '@/types/Schedule';
import { Group } from '@/types/Group';
import { Room } from '@/types/Room';
import { Subject } from '@/types/Subject';
import { User } from '@/types/User';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import DayView from '@/components/calendar/DayView';
import WeekView from '@/components/calendar/WeekView';
import MonthView from '@/components/calendar/MonthView';
import ListView from '@/components/calendar/ListView';
import RangeCalendarView from '@/components/calendar/RangeCalendarView';
import LessonDetailModal from '@/components/calendar/LessonDetailModal';
import TeacherWorkHoursModal from '@/components/TeacherWorkHoursModal';
import { BaseModal } from '@/components/ui/BaseModal';
import { TimeInput } from '@/components/ui/TimeInput';
import { PageHeaderWithStats } from '@/components/ui/PageHeaderWithStats';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { useApiToast } from '@/hooks/useApiToast';

export default function LessonsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Toast уведомления для API операций
  const { loadOperation } = useApiToast();

  const isStudent = user?.role === 'Student';
  const isTeacher = user?.role === 'Teacher';
  const isAdminOrOwner = user?.role === 'Administrator' || user?.role === 'Owner';

  // State management
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showTeacherWorkHoursModal, setShowTeacherWorkHoursModal] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [rangeViewMode, setRangeViewMode] = useState<'list' | 'calendar'>('list');
  
  // Filter options state
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Filter selections
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Create lesson form data
  const [createLessonData, setCreateLessonData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    groupId: '',
    teacherId: '',
    roomId: '',
    note: ''
  });

  // Функция для получения названия текущего дня недели
  const getCurrentDayName = () => {
    const today = new Date();
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[today.getDay()];
  };

  // Check authorization
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadSchedules();
      loadFilterOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) {
      loadLessons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, selectedTeacher, selectedRoom, selectedSubject, currentDate, view, dateFrom, dateTo, user]);

  const loadSchedules = async () => {
    if (!user?.organizationId) {
      console.error('User organization not found');
      return;
    }

    try {
      const requestBody = {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: user.organizationId
      };

      const response = await loadOperation(
        () => AuthenticatedApiService.post<{ items: Schedule[] }>('/Schedule/get-all-schedules', requestBody),
        'расписания'
      );
      setSchedules(response.items);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadFilterOptions = async () => {
    if (!user?.organizationId) return;

    try {
      const baseRequest = {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: user.organizationId
      };

      // Load groups
      const groupsResponse = await AuthenticatedApiService.post<{ items: Group[] }>(
        '/Group/get-groups',
        baseRequest
      );
      setGroups(groupsResponse.items);

      // Load teachers (role 3 = teacher)
      const teachersResponse = await AuthenticatedApiService.getUsers({
        organizationId: user.organizationId,
        pageNumber: 1,
        pageSize: 1000,
        roleIds: [3] // 3 = teacher role
      });
      setTeachers(teachersResponse.items);

      // Load rooms
      const roomsResponse = await AuthenticatedApiService.post<{ items: Room[] }>(
        '/Room/GetAllRooms',
        baseRequest
      );
      setRooms(roomsResponse.items);

      // Load subjects
      const subjectsResponse = await AuthenticatedApiService.post<{ items: Subject[] }>(
        '/Subject/GetAllSubjects',
        baseRequest
      );
      setSubjects(subjectsResponse.items);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadLessons = useCallback(async () => {
    if (!user?.organizationId) {
      console.error('User organization not found');
      return;
    }

    setLoading(true);
    try {
      const filters: LessonFilters = {
        pageNumber: 1,
        pageSize: 1000, // Large page size for calendar views
      };



      // Add group filter if selected
      if (selectedGroup) {
        filters.groupId = selectedGroup;
      }

      // Add teacher filter if selected
      if (selectedTeacher) {
        filters.teacherId = selectedTeacher;
      }

      // Add room filter if selected
      if (selectedRoom) {
        filters.roomId = selectedRoom;
      }

      // Add subject filter if selected
      if (selectedSubject) {
        filters.subjectId = selectedSubject;
      }

      // Add date range based on current view
      const { fromDate, toDate } = getDateRangeForView(currentDate, view);
      filters.fromDate = fromDate;
      filters.toDate = toDate;

      // Create request body with organization from user
      const requestBody = {
        ...filters,
        organizationId: user.organizationId
      };

      const response = await loadOperation(
        () => AuthenticatedApiService.post<LessonsResponse>('/Lesson/by-schedule', requestBody),
        'уроки'
      );

      setLessons(response.items);
      
      // Обновляем selectedLesson если он открыт
      if (selectedLesson && showLessonModal) {
        const updatedLesson = response.items.find(lesson => lesson.id === selectedLesson.id);
        if (updatedLesson) {
          setSelectedLesson(updatedLesson);
        }
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, selectedTeacher, selectedRoom, selectedSubject, currentDate, view, dateFrom, dateTo, user?.organizationId, loadOperation, selectedLesson, showLessonModal]);

  const handleCreateLesson = async () => {
    try {
      await loadOperation(
        () => AuthenticatedApiService.createCustomLesson(createLessonData),
        'дополнительный урок'
      );
      
      // Reset form and close modal
      setCreateLessonData({
        date: '',
        startTime: '',
        endTime: '',
        groupId: '',
        teacherId: '',
        roomId: '',
        note: ''
      });
      setShowCreateLessonModal(false);
      
      // Reload lessons
      await loadLessons();
    } catch (error) {
      console.error('Error creating custom lesson:', error);
    }
  };

  const getDateRangeForView = (date: Date, viewType: CalendarView): { fromDate: string; toDate: string } => {
    // Используем локальное форматирование даты для избежания UTC сдвигов
    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // If custom date range is set, use it
    if (dateFrom && dateTo) {
      return {
        fromDate: dateFrom,
        toDate: dateTo
      };
    }

    switch (viewType) {
      case 'day': {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return {
          fromDate: formatDate(dayStart),
          toDate: formatDate(dayEnd)
        };
      }
      case 'week': {
        const weekStart = getWeekStart(date);
        const weekEnd = getWeekEnd(date);
        return {
          fromDate: formatDate(weekStart),
          toDate: formatDate(weekEnd)
        };
      }
      case 'month': {
        const monthStart = getMonthStart(date);
        const monthEnd = getMonthEnd(date);
        return {
          fromDate: formatDate(monthStart),
          toDate: formatDate(monthEnd)
        };
      }
      case 'list': {
        // For list view, load current month
        const monthStart = getMonthStart(date);
        const monthEnd = getMonthEnd(date);
        return {
          fromDate: formatDate(monthStart),
          toDate: formatDate(monthEnd)
        };
      }
      default:
        return {
          fromDate: formatDate(date),
          toDate: formatDate(date)
        };
    }
  };

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'list':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    // Clear custom date range when going to today
    setDateFrom(undefined);
    setDateTo(undefined);
    setRangeViewMode('list');
  };

  const handleDateRangeChange = (startDate?: string, endDate?: string) => {
    setDateFrom(startDate);
    setDateTo(endDate);
    // Clear current date navigation when using custom range
    if (startDate && endDate) {
      // Set current date to the start of the range for display purposes
      setCurrentDate(new Date(startDate));
    }
  };

  const clearDateRange = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setRangeViewMode('list');
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  };

  // Format current date for display
  const getCurrentDateText = (): string => {
    // If custom date range is selected, show it
    if (dateFrom && dateTo) {
      const startDate = new Date(dateFrom).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const endDate = new Date(dateTo).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return `${startDate} - ${endDate}`;
    }
    
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (view) {
      case 'day':
        options.weekday = 'long';
        options.day = 'numeric';
        options.month = 'long';
        options.year = 'numeric';
        break;
      case 'week': {
        const weekStart = getWeekStart(currentDate);
        const weekEnd = getWeekEnd(currentDate);
        return `${weekStart.getDate()} ${weekStart.toLocaleDateString('ru-RU', { month: 'long' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
      }
      case 'month':
        options.month = 'long';
        options.year = 'numeric';
        break;
      case 'list':
        options.month = 'long';
        options.year = 'numeric';
        break;
    }
    
    return currentDate.toLocaleDateString('ru-RU', options);
  };

  const getViewTitle = (): string => {
    // If custom date range is selected, show range view mode
    if (dateFrom && dateTo) {
      return rangeViewMode === 'list' ? 'Период (Список)' : 'Период (Календарь)';
    }
    
    switch (view) {
      case 'day': return 'День';
      case 'week': return 'Неделя';
      case 'month': return 'Месяц';
      case 'list': return 'Список';
      default: return '';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-20 max-w-full overflow-x-hidden">
      <div className="w-full space-y-6">
        {/* Modern Header with Gradient */}
        <PageHeaderWithStats
        title="Расписание занятий"
        subtitle="Просмотр и управление расписанием в разных форматах"
        icon={CalendarIcon}
        gradientFrom="violet-500"
        gradientTo="purple-600"
        actionLabel={isAdminOrOwner ? "Добавить урок" : undefined}
        onAction={isAdminOrOwner ? () => setShowCreateLessonModal(true) : undefined}
        stats={[
          { 
            label: "Всего занятий", 
            value: lessons.length, 
            color: "violet" as const
          },
          { 
            label: getCurrentDayName(), 
            value: lessons.filter(lesson => {
              const today = new Date();
              const lessonDate = new Date(lesson.date);
              return lessonDate.toDateString() === today.toDateString();
            }).length, 
            color: "purple" as const
          },
          { 
            label: "Расписаний", 
            value: schedules.length, 
            color: "indigo" as const
          }
        ]}
      />

      {/* Content Section */}
      <div className="space-y-6">
        {/* Navigation and Calendar Content Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Filters Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-violet-50 dark:from-gray-800 dark:to-gray-700">
            <div className={`grid grid-cols-1 ${isStudent ? 'md:grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
              {/* Group Filter - Hidden for students */}
              {!isStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Группа</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
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
              )}

              {/* Teacher Filter - Hidden for students and teachers */}
              {!isStudent && !isTeacher && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Преподаватель</label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
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
              )}

              {/* Room Filter - Hidden for students */}
              {!isStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Кабинет</label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
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
              )}

              {/* Subject Filter - Hidden for students */}
              {!isStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Предмет</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
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
              )}

              {/* View selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Вид {(dateFrom && dateTo) && <span className="text-violet-600 dark:text-violet-400">(период)</span>}
                </label>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(['day', 'week', 'month', 'list'] as CalendarView[]).map((viewType) => (
                    <button
                      key={viewType}
                      onClick={() => setView(viewType)}
                      disabled={!!(dateFrom && dateTo)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        view === viewType && !(dateFrom && dateTo)
                          ? 'bg-white dark:bg-gray-600 text-violet-600 dark:text-violet-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      } ${(dateFrom && dateTo) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {viewType === 'day' ? 'День' : 
                       viewType === 'week' ? 'Неделя' : 
                       viewType === 'month' ? 'Месяц' : 'Список'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear filters button and Teacher Work Hours button */}
            <div className="mt-4 flex justify-between items-center">
              <div>
                {isAdminOrOwner && user?.organizationId && (
                  <button
                    onClick={() => setShowTeacherWorkHoursModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <AcademicCapIcon className="h-5 w-5" />
                    Учет занятий преподавателей
                  </button>
                )}
              </div>
              
              {(selectedGroup || selectedTeacher || selectedRoom || selectedSubject) && (
                <button
                  onClick={() => {
                    setSelectedGroup('');
                    setSelectedTeacher('');
                    setSelectedRoom('');
                    setSelectedSubject('');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Очистить фильтры
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="p-6 bg-gradient-to-r from-gray-50 to-violet-50 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-gray-200 dark:border-gray-700">
            {/* Date Range Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Выбор диапазона дат</label>
              <div className="flex items-center gap-3">
                <DateRangePicker
                  startDate={dateFrom}
                  endDate={dateTo}
                  onDateChange={handleDateRangeChange}
                  placeholder="Выберите период занятий"
                />
                
                {(dateFrom || dateTo) && (
                  <button
                    onClick={clearDateRange}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors"
                  >
                    Очистить
                  </button>
                )}
              </div>
              
              {/* Range View Mode Selector */}
              {(dateFrom && dateTo) && (
                <div className="flex items-center gap-2 mt-3">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Режим просмотра:</label>
                  <div className="flex bg-gray-100 dark:bg-gray-600 rounded-lg p-1">
                    <button
                      onClick={() => setRangeViewMode('list')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                        rangeViewMode === 'list'
                          ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Список
                    </button>
                    <button
                      onClick={() => setRangeViewMode('calendar')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                        rangeViewMode === 'calendar'
                          ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Календарь
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getCurrentDateText()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {getViewTitle()}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateDate('prev')}
                  disabled={!!(dateFrom || dateTo)}
                  className="bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-800/50 text-violet-700 dark:text-violet-300 p-2 rounded-lg transition-all duration-200 hover:scale-105 flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={goToToday}
                  disabled={!!(dateFrom || dateTo)}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {getCurrentDayName()}
                </button>
                
                <button
                  onClick={() => navigateDate('next')}
                  disabled={!!(dateFrom || dateTo)}
                  className="bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-800/50 text-violet-700 dark:text-violet-300 p-2 rounded-lg transition-all duration-200 hover:scale-105 flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          {loading ? (
            <div className="flex justify-center items-center h-64 p-8">
              <div className="text-center">
                <div className="p-4 bg-violet-100 dark:bg-violet-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 dark:border-violet-400 mx-auto mt-2"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Загрузка календаря...</p>
              </div>
            </div>
          ) : (
            <div className="h-[700px]">
              {/* If custom date range is selected, show based on rangeViewMode */}
              {(dateFrom && dateTo) ? (
                rangeViewMode === 'list' ? (
                  <ListView
                    lessons={lessons}
                    onLessonClick={handleLessonClick}
                  />
                ) : (
                  <RangeCalendarView
                    dateFrom={new Date(dateFrom)}
                    dateTo={new Date(dateTo)}
                    lessons={lessons}
                    onLessonClick={handleLessonClick}
                  />
                )
              ) : (
                <>
                  {view === 'day' && (
                    <DayView
                      date={currentDate}
                      lessons={lessons}
                      onLessonClick={handleLessonClick}
                    />
                  )}
                  
                  {view === 'week' && (
                    <WeekView
                      date={currentDate}
                      lessons={lessons}
                      onLessonClick={handleLessonClick}
                    />
                  )}
                  
                  {view === 'month' && (
                    <MonthView
                      date={currentDate}
                      lessons={lessons}
                      onLessonClick={handleLessonClick}
                    />
                  )}
                  
                  {view === 'list' && (
                    <ListView
                      lessons={lessons}
                      onLessonClick={handleLessonClick}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lesson Details Modal */}
      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          isOpen={showLessonModal}
          onClose={() => setShowLessonModal(false)}
          onUpdate={loadLessons}
        />
      )}

      {/* Teacher Work Hours Modal */}
      {isAdminOrOwner && user?.organizationId && (
        <TeacherWorkHoursModal
          isOpen={showTeacherWorkHoursModal}
          onClose={() => setShowTeacherWorkHoursModal(false)}
          organizationId={user.organizationId}
        />
      )}

      {/* Create Lesson Modal */}
      <BaseModal
        isOpen={showCreateLessonModal}
        onClose={() => setShowCreateLessonModal(false)}
        title="Создать дополнительный урок"
        gradientFrom="from-violet-500"
        gradientTo="to-purple-600"
      >
        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Дата</label>
            <input
              type="date"
              value={createLessonData.date}
              onChange={(e) => setCreateLessonData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Время начала</label>
              <TimeInput
                value={createLessonData.startTime}
                onChange={(value) => setCreateLessonData(prev => ({ ...prev, startTime: value || '' }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Время окончания</label>
              <TimeInput
                value={createLessonData.endTime}
                onChange={(value) => setCreateLessonData(prev => ({ ...prev, endTime: value || '' }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Group */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Группа</label>
            <select
              value={createLessonData.groupId}
              onChange={(e) => setCreateLessonData(prev => ({ ...prev, groupId: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Выберите группу</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}/{typeof group.subject === 'object' ? group.subject.subjectName : group.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Преподаватель</label>
            <select
              value={createLessonData.teacherId}
              onChange={(e) => setCreateLessonData(prev => ({ ...prev, teacherId: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Выберите преподавателя</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>

          {/* Room */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Кабинет</label>
            <select
              value={createLessonData.roomId}
              onChange={(e) => setCreateLessonData(prev => ({ ...prev, roomId: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Выберите кабинет</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Заметка</label>
            <textarea
              value={createLessonData.note}
              onChange={(e) => setCreateLessonData(prev => ({ ...prev, note: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={3}
              placeholder="Дополнительная информация о занятии (необязательно)"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowCreateLessonModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateLesson}
              disabled={!createLessonData.date || !createLessonData.startTime || !createLessonData.endTime || 
                       !createLessonData.groupId || !createLessonData.teacherId || !createLessonData.roomId}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Создать урок
            </button>
          </div>
        </div>
      </BaseModal>
      </div>
    </div>
  );
}