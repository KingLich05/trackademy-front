'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AcademicCapIcon, 
  UserGroupIcon, 
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  HeartIcon,
  GlobeAltIcon,
  PhoneIcon,
  MapPinIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useApiToast } from '../hooks/useApiToast';
import { useRouter } from 'next/navigation';
import { isBranchOwner } from '../types/Role';
import { DashboardApiService } from '../services/DashboardApiService';
import { DashboardSummary, DashboardStats, TeacherDashboardSummary, StudentDashboardSummary, UpcomingBirthday } from '../types/Dashboard';
import { StatsCard } from '../components/dashboard/StatsCard';
import { PageHeaderWithStats } from '../components/ui/PageHeaderWithStats';
import { DetailedDashboardView } from '../components/dashboard/DetailedDashboardView';
import Link from 'next/link';

// Компонент сайта-визитки для неавторизованных пользователей
function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    { text: "Управление студентами и преподавателями", icon: UserGroupIcon },
    { text: "Мониторинг оплат", icon: CurrencyDollarIcon },
    { text: "Система поощрения", icon: CheckCircleIcon },
    { text: "Бесплатная поддержка", icon: HeartIcon },
    { text: "Удобный интерфейс", icon: AcademicCapIcon },
    { text: "Система оповещения", icon: ClipboardDocumentListIcon }
  ];

  const benefits = [
    {
      icon: ChartBarIcon,
      title: "Полный контроль над процессами",
      description: "Аналитическая панель отражает состояние центра в реальном времени: наполняемость групп, загрузку преподавателей, ключевые финансовые метрики и гибкое расписание. Вся важная информация доступна в одном месте."
    },
    {
      icon: ShieldCheckIcon,
      title: "Прозрачность и безопасность",
      description: "Каждый пользователь работает в рамках своей роли и уровня доступа. Все действия фиксируются, а администраторы, преподаватели и студенты видят только релевантную для них информацию. Это снижает риск ошибок и обеспечивает защиту данных."
    },
    {
      icon: HeartIcon,
      title: "Рост лояльности клиентов",
      description: "Личный кабинет, уведомления, расписание в телефоне, напоминания об уроках и оплатах — родителям и ученикам удобно, а довольные клиенты охотнее остаются и приводят друзей."
    },
    {
      icon: GlobeAltIcon,
      title: "Управление из любой точки",
      description: "Весь центр доступен в одном месте: расписание, финансы, заявки и пользователи — всё работает в онлайн-режиме. Управление возможно дистанционно, независимо от вашего местоположения."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      {/* Навигация */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/20 dark:border-gray-700/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <AcademicCapIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Trackademy</span>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Главная
              </a>
              <a href="#contacts" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 text-sm font-medium transition-colors">
                Контакты
              </a>
              <Link href="/login" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 text-sm font-medium transition-colors">
                Войти
              </Link>
              <Link href="/register" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 text-sm font-medium transition-colors">
                Регистрация
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 p-2"
              >
                {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="flex flex-col space-y-2">
                <a href="#home" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 text-sm font-medium">
                  Главная
                </a>
                <a href="#contacts" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 text-sm font-medium">
                  Контакты
                </a>
                <Link href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium mx-3 mt-2 text-center">
                  Войти
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Современная <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">система управления</span> учебными центрами
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Полная автоматизация образовательного процесса: учет студентов, расписание, платежи, аналитика и многое другое
            </p>
            <div className="flex justify-center">
              <a href="#contacts" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors">
                Связаться с нами
              </a>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/20 dark:border-gray-700/20 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all">
                <feature.icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-4" />
                <p className="text-gray-900 dark:text-white font-medium">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Почему выбирают Trackademy?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Комплексное решение для эффективного управления образовательными процессами
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <benefit.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    📊 {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Contacts Section */}
      <section id="contacts" className="py-20 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Контакты
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Нужна консультация или помощь?
            </p>
          </div>

          <div className="flex justify-center max-w-2xl mx-auto">
            {/* Карточка связи */}
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-white/20 dark:border-gray-700/30 hover:border-indigo-300/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <PhoneIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Связаться с нами
                </h3>
                
                <div className="space-y-4">
                  <a 
                    href="https://wa.me/77020663888" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 border border-green-200 dark:border-green-700/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <PhoneIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                          +7 (702) 066-38-88
                        </div>
                      </div>
                    </div>
                  </a>
                  
                  <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                        <MapPinIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Адрес</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">Астана, Казахстан</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Структурированные данные для главной страницы */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Trackademy - Система управления учебными центрами",
            "description": "Современная система управления учебными центрами. Полная автоматизация образовательного процесса: учет студентов, расписание, платежи, аналитика.",
            "url": "https://trackademy.kz",
            "mainEntity": {
              "@type": "SoftwareApplication",
              "name": "Trackademy",
              "applicationCategory": "BusinessApplication",
              "description": "CRM система для управления учебными центрами",
              "operatingSystem": "Web Browser",
              "applicationSubCategory": "Education Management",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "KZT",
                "availability": "https://schema.org/InStock"
              }
            },
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Главная",
                  "item": "https://trackademy.kz"
                }
              ]
            }
          })
        }}
      />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <AcademicCapIcon className="h-8 w-8 text-indigo-400 mr-2" />
              <span className="text-xl font-bold">Trackademy</span>
            </div>
            <p className="text-gray-400 mb-6">
              Система управления учебными центрами
            </p>
            
            {/* Document Links */}
            <div className="flex justify-center space-x-8 mb-6">
              <Link 
                href="/documents/public-offer"
                className="text-gray-300 hover:text-white transition-colors text-sm underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Публичная оферта
              </Link>
              <Link 
                href="/documents/privacy-policy"
                className="text-gray-300 hover:text-white transition-colors text-sm underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Политика конфиденциальности
              </Link>
            </div>
            
            <p className="text-gray-500 text-sm">
              © 2026 Trackademy. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();
  const { } = useApiToast();
  const router = useRouter();
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [teacherSummary, setTeacherSummary] = useState<TeacherDashboardSummary | null>(null);
  const [studentSummary, setStudentSummary] = useState<StudentDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'overview' | 'detailed'>('overview');

  const isTeacher = user?.role === 'Teacher';
  const isStudent = user?.role === 'Student';

  // Загрузка данных аналитики
  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    setLoading(true);
    try {
      if (user.role === 'Teacher') {
        // Загрузка данных для преподавателя
        const result = await DashboardApiService.getTeacherSummary();
        setTeacherSummary(result);
        setSummary(null);
        setStudentSummary(null);
      } else if (user.role === 'Student') {
        // Загрузка данных для студента
        const result = await DashboardApiService.getStudentSummary();
        setStudentSummary(result);
        setSummary(null);
        setTeacherSummary(null);
      } else {
        // Загрузка данных для админа/супер-админа
        if (!user.organizationId) return;
        
        const currentFilters = {
          organizationId: user.organizationId
        };
        const result = await DashboardApiService.getSummary(currentFilters);
        setSummary(result);
        setTeacherSummary(null);
        setStudentSummary(null);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (isBranchOwner(user.role)) {
        router.push('/branch-owner');
        return;
      }
      loadDashboardData();
    }
  }, [isAuthenticated, user, loadDashboardData, router]);

  // Показываем сайт-визитку для неавторизованных пользователей
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Подготовка статистики
  const stats: DashboardStats[] = summary ? [
    {
      label: 'Всего студентов',
      value: summary.totalStudents,
      icon: AcademicCapIcon,
      color: 'blue',
      description: `Активных: ${summary.activeStudents}`
    },
    {
      label: 'Группы',
      value: summary.totalGroups,
      icon: UserGroupIcon,
      color: 'green',
      description: `Активных: ${summary.activeGroups}`
    },
    {
      label: 'Уроки сегодня',
      value: summary.lessonsToday,
      icon: CalendarDaysIcon,
      color: 'purple',
      description: `Завершено: ${summary.completedLessonsToday}`
    },
    {
      label: 'Посещаемость',
      value: `${summary.averageAttendanceRate}%`,
      icon: ChartBarIcon,
      color: summary.averageAttendanceRate >= 80 ? 'green' : summary.averageAttendanceRate >= 60 ? 'yellow' : 'red'
    },
    {
      label: 'Должники',
      value: summary.unpaidStudentsCount,
      icon: CurrencyDollarIcon,
      color: summary.unpaidStudentsCount > 0 ? 'red' : 'green',
      description: `Общий долг: ${summary.totalDebt}₸`
    },
    {
      label: 'Пробные студенты',
      value: summary.trialStudentsCount,
      icon: ClockIcon,
      color: 'orange'
    },
    {
      label: 'Проблемные группы',
      value: summary.lowPerformanceGroupsCount,
      icon: ExclamationTriangleIcon,
      color: summary.lowPerformanceGroupsCount > 0 ? 'red' : 'green'
    },
    {
      label: 'Замороженные студенты',
      value: summary.frozenStudentsCount,
      icon: ClockIcon,
      color: 'blue',
      description: summary.expiredFreezeCount > 0 ? `Истекло заморозок: ${summary.expiredFreezeCount}` : undefined
    }
  ] : [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-400 dark:bg-indigo-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
          </div>

          <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-12 text-center transform hover:scale-[1.02] transition-transform duration-300">
            {/* Logo/Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-5 rounded-2xl shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Добро пожаловать в Trackademy
            </h1>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Требуется авторизация
            </h3>
            
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg max-w-md mx-auto">
              Войдите в систему для доступа к панели управления и аналитике вашей академии
            </p>
            
            <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Войти в систему
              </Link>

            {/* Features */}
            <div className="mt-12 grid grid-cols-3 gap-6 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Аналитика</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Управление</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Расписание</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-6 mt-20">
        <div className="mx-auto" style={{ maxWidth: '95vw' }}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-700 p-8 max-w-md">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ошибка загрузки
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 md:px-6 py-4 md:py-6 pt-20 md:pt-24 max-w-full overflow-x-hidden">
      <div className="w-full space-y-6 max-w-full">
        {isStudent && studentSummary ? (
          /* Student Dashboard */
          <>
            {/* Header */}
            <PageHeaderWithStats
              title="Моя статистика успеваемости"
              subtitle="Обзор моей учебы"
              icon={AcademicCapIcon}
              gradientFrom="emerald-500"
              gradientTo="teal-600"
              stats={[
                { label: "Средний балл", value: studentSummary.averageGrade, color: "emerald" },
                { label: "Посещаемость", value: `${studentSummary.attendanceRate}%`, color: "blue" },
                { label: "Активных заданий", value: studentSummary.activeAssignments, color: "yellow" }
              ]}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard stat={{
                label: 'Средний балл',
                value: studentSummary.averageGrade,
                icon: ChartBarIcon,
                color: studentSummary.averageGrade >= 80 ? 'green' : studentSummary.averageGrade >= 60 ? 'yellow' : 'red',
                description: 'По всем предметам'
              }} />
              <StatsCard stat={{
                label: 'Посещаемость',
                value: `${studentSummary.attendanceRate}%`,
                icon: CalendarDaysIcon,
                color: studentSummary.attendanceRate >= 80 ? 'green' : studentSummary.attendanceRate >= 60 ? 'yellow' : 'red'
              }} />
              <StatsCard stat={{
                label: 'Активных заданий',
                value: studentSummary.activeAssignments,
                icon: ClipboardDocumentListIcon,
                color: studentSummary.activeAssignments > 0 ? 'blue' : 'green',
                description: 'Требуют выполнения'
              }} />
            </div>

            {/* Active Assignments */}
            {studentSummary.activeAssignmentsList && studentSummary.activeAssignmentsList.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <ClipboardDocumentListIcon className="h-6 w-6 mr-2 text-blue-500" />
                  Активные задания
                </h3>
                <div className="space-y-3">
                  {studentSummary.activeAssignmentsList.map((assignment) => (
                    <Link
                      key={assignment.assignmentId}
                      href="/my-homework"
                      className={`block p-4 rounded-lg border hover:shadow-md transition-all ${
                        assignment.isOverdue
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {assignment.isOverdue && (
                              <span className="px-2 py-0.5 text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full font-medium">
                                Просрочено
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                              {assignment.status}
                            </span>
                          </div>
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                            {assignment.description}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span>{assignment.subjectName}</span>
                            <span>•</span>
                            <span>{assignment.groupName}</span>
                            <span>•</span>
                            <span>До: {new Date(assignment.dueDate).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                          Открыть
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Schedule */}
            {studentSummary.todaySchedule && studentSummary.todaySchedule.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <CalendarDaysIcon className="h-6 w-6 mr-2 text-green-500" />
                  Расписание на сегодня
                </h3>
                <div className="space-y-3">
                  {studentSummary.todaySchedule.map((lesson) => (
                    <div
                      key={lesson.lessonId}
                      className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <ClockIcon className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {lesson.startTime.slice(0, 5)} - {lesson.endTime.slice(0, 5)}
                            </span>
                          </div>
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                            {lesson.subjectName}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <UserGroupIcon className="h-4 w-4" />
                              <span>{lesson.groupName}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <span>📍</span>
                              <span>{lesson.roomName}</span>
                            </div>
                            <span>•</span>
                            <span>Преподаватель: {lesson.teacherName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Grades */}
            {studentSummary.recentGrades && studentSummary.recentGrades.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-2 text-purple-500" />
                  Последние оценки
                </h3>
                <div className="space-y-2">
                  {studentSummary.recentGrades.map((grade, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {grade.subjectName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(grade.gradedAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold ${
                        grade.grade >= 80 ? 'text-green-600 dark:text-green-400' :
                        grade.grade >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {grade.grade}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Study Load */}
            {studentSummary.studyLoad && studentSummary.studyLoad.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center">
                  <CalendarDaysIcon className="h-6 w-6 mr-2 text-indigo-500" />
                  Учебная нагрузка по дням
                </h3>
                {(() => {
                  const maxLessons = Math.max(...studentSummary.studyLoad.map(d => d.lessonCount), 1);
                  const palette = [
                    { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-600 dark:text-indigo-400' },
                    { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-600 dark:text-violet-400' },
                    { bg: 'bg-blue-500',   light: 'bg-blue-50 dark:bg-blue-900/30',   border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-600 dark:text-blue-400'   },
                    { bg: 'bg-cyan-500',   light: 'bg-cyan-50 dark:bg-cyan-900/30',   border: 'border-cyan-200 dark:border-cyan-800',   text: 'text-cyan-600 dark:text-cyan-400'   },
                    { bg: 'bg-teal-500',   light: 'bg-teal-50 dark:bg-teal-900/30',   border: 'border-teal-200 dark:border-teal-800',   text: 'text-teal-600 dark:text-teal-400'   },
                    { bg: 'bg-emerald-500',light: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400' },
                    { bg: 'bg-sky-500',    light: 'bg-sky-50 dark:bg-sky-900/30',    border: 'border-sky-200 dark:border-sky-800',    text: 'text-sky-600 dark:text-sky-400'    },
                  ];
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {studentSummary.studyLoad.map((item, index) => {
                        const c = palette[index % palette.length];
                        const pct = Math.round((item.lessonCount / maxLessons) * 100);
                        return (
                          <div
                            key={index}
                            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border ${c.light} ${c.border}`}
                          >
                            {/* Day name */}
                            <span className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>
                              {item.day}
                            </span>

                            {/* Lesson count bubble */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${c.bg} shadow-md`}>
                              <span className="text-xl font-bold text-white leading-none">{item.lessonCount}</span>
                            </div>

                            {/* Label */}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {item.lessonCount === 1 ? 'урок' : item.lessonCount < 5 ? 'урока' : 'уроков'}
                            </span>

                            {/* Hours */}
                            <div className={`text-sm font-semibold ${c.text}`}>
                              {item.studyHours} ак.ч.
                            </div>

                            {/* Mini fill bar */}
                            <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${c.bg} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        ) : isTeacher && teacherSummary ? (
          /* Teacher Dashboard */
          <>
            {/* Header */}
            <PageHeaderWithStats
              title="Моя статистика успеваемости"
              subtitle="Обзор моих занятий и задач"
              icon={AcademicCapIcon}
              gradientFrom="purple-500"
              gradientTo="pink-600"
              stats={[
                { label: "Мои группы", value: teacherSummary.totalGroups, color: "purple" },
                { label: "Не проверено", value: teacherSummary.ungradedSubmissions, color: "yellow" },
                { label: "Уроков сегодня", value: teacherSummary.lessonsToday, color: "blue" }
              ]}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard stat={{
                label: 'Мои группы',
                value: teacherSummary.totalGroups,
                icon: UserGroupIcon,
                color: 'purple',
                description: 'Всего активных групп'
              }} />
              <StatsCard stat={{
                label: 'Не проверено',
                value: teacherSummary.ungradedSubmissions,
                icon: ClipboardDocumentListIcon,
                color: teacherSummary.ungradedSubmissions > 0 ? 'yellow' : 'green',
                description: 'Домашних заданий'
              }} />
              <StatsCard stat={{
                label: 'Уроков сегодня',
                value: teacherSummary.lessonsToday,
                icon: CalendarDaysIcon,
                color: 'blue',
                description: 'В расписании'
              }} />
            </div>

            {/* Today's Schedule */}
            {teacherSummary.todaySchedule && teacherSummary.todaySchedule.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <CalendarDaysIcon className="h-6 w-6 mr-2 text-blue-500" />
                  Расписание на сегодня
                </h3>
                <div className="space-y-3">
                  {teacherSummary.todaySchedule.map((lesson) => (
                    <div
                      key={lesson.lessonId}
                      className={`p-4 rounded-lg border ${
                        lesson.isPast
                          ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <ClockIcon className={`h-5 w-5 ${lesson.isPast ? 'text-gray-400' : 'text-blue-500'}`} />
                            <span className={`text-sm font-medium ${
                              lesson.isPast ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {lesson.startTime.slice(0, 5)} - {lesson.endTime.slice(0, 5)}
                            </span>
                            {lesson.isPast && (
                              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                                Завершено
                              </span>
                            )}
                          </div>
                          <h4 className={`text-base font-semibold mb-1 ${
                            lesson.isPast ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'
                          }`}>
                            {lesson.subjectName}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <UserGroupIcon className="h-4 w-4" />
                              <span>{lesson.groupName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>📍</span>
                              <span>{lesson.roomName}</span>
                            </div>
                          </div>
                          {lesson.attendanceRate !== null && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                Посещаемость: 
                              </span>
                              <span className={`ml-2 font-semibold ${
                                lesson.attendanceRate >= 80 ? 'text-green-600 dark:text-green-400' :
                                lesson.attendanceRate >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {lesson.attendanceRate}% ({lesson.presentCount}/{lesson.totalStudents})
                              </span>
                            </div>
                          )}
                        </div>
                        {!lesson.isPast && (
                          <Link
                            href={`/lessons`}
                            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Перейти
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {teacherSummary.todaySchedule && teacherSummary.todaySchedule.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <CalendarDaysIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">На сегодня уроков нет</p>
              </div>
            )}
          </>
        ) : !isTeacher && summary ? (
          /* Admin/SuperAdmin Dashboard */
          <>
            {/* Header */}
            <PageHeaderWithStats
              title="Аналитика"
              subtitle="Обзор ключевых показателей системы"
              icon={ChartBarIcon}
              gradientFrom="blue-500"
              gradientTo="purple-600"
              stats={[
                { label: "Всего студентов", value: summary.totalStudents, color: "blue" },
                { label: "Активные группы", value: summary.activeGroups, color: "green" },
                { label: "Посещаемость", value: `${summary.averageAttendanceRate}%`, color: "purple" }
              ]}
            />

            {/* Tabs */}
            <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-2xl p-1.5 shadow-sm border border-gray-100 dark:border-gray-700 w-fit">
              {([
                { key: 'overview', label: 'Обзор' },
                { key: 'detailed', label: 'Подробно' },
              ] as { key: 'overview' | 'detailed'; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setAdminTab(tab.key)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    adminTab === tab.key
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {adminTab === 'overview' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {stats.map((stat, index) => (
                    <StatsCard key={index} stat={stat} />
                  ))}
                </div>

                {/* Upcoming Birthdays */}
                {summary.upcomingBirthdays && summary.upcomingBirthdays.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-lg">
                        🎂
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Предстоящие дни рождения</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ближайшие 7 дней</p>
                      </div>
                      <span className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold">
                        {summary.upcomingBirthdays.length}
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {(summary.upcomingBirthdays as UpcomingBirthday[]).map((b) => {
                        const date = new Date(b.birthday);
                        const dateLabel = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                        const now = new Date();
                        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const thisYearBirthday = new Date(now.getFullYear(), date.getMonth(), date.getDate());
                        if (thisYearBirthday < todayMidnight) thisYearBirthday.setFullYear(now.getFullYear() + 1);
                        const daysLeft = Math.round((thisYearBirthday.getTime() - todayMidnight.getTime()) / 86400000);
                        const isToday = daysLeft === 0;
                        return (
                          <li key={b.studentId} className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 ${isToday ? 'bg-pink-50/60 dark:bg-pink-900/10' : ''}`}>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shrink-0">
                              <span className="text-white text-sm font-bold">{b.fullName.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.fullName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{b.phone}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{dateLabel}</p>
                              {isToday ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 dark:text-pink-400">
                                  🎉 Сегодня!
                                </span>
                              ) : (
                                <p className="text-xs text-gray-400 dark:text-gray-500">через {daysLeft} д.</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Last Updated */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Последнее обновление: {new Date(summary.lastUpdated).toLocaleString('ru-RU')}
                  </p>
                </div>
              </>
            )}

            {adminTab === 'detailed' && user?.organizationId && (
              <DetailedDashboardView organizationId={user.organizationId} />
            )}
          </>
        ) : null}

        {/* Loading State */}
        {loading && !summary && !teacherSummary && !studentSummary && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Загрузка данных аналитики...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
