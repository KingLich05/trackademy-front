import { 
  UserPlusIcon, 
  UserIcon, 
  HomeIcon, 
  PencilSquareIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

// Конфигурации для разных типов модалов
export const modalConfigs = {
  user: {
    create: {
      title: 'Добавить пользователя',
      subtitle: 'Создание нового пользователя в системе',
      icon: UserPlusIcon,
      gradientFrom: 'emerald-500', // Соответствует странице студентов
      gradientTo: 'lime-600',
      submitText: 'Создать пользователя',
      loadingText: 'Создание...'
    },
    edit: {
      title: 'Редактировать пользователя',
      subtitle: 'Изменение данных пользователя',
      icon: UserIcon,
      gradientFrom: 'emerald-500', // Соответствует странице студентов
      gradientTo: 'lime-600',
      submitText: 'Сохранить изменения',
      loadingText: 'Сохранение...'
    },
    view: {
      title: 'Информация о пользователе',
      subtitle: 'Просмотр данных пользователя',
      icon: UserIcon,
      gradientFrom: 'emerald-500',
      gradientTo: 'lime-600',
      submitText: 'Закрыть',
      loadingText: 'Загрузка...'
    }
  },
  room: {
    create: {
      title: 'Добавить кабинет',
      subtitle: 'Создание нового кабинета',
      icon: HomeIcon,
      gradientFrom: 'green-500', // Соответствует странице кабинетов
      gradientTo: 'emerald-600',
      submitText: 'Создать кабинет',
      loadingText: 'Создание...'
    },
    edit: {
      title: 'Редактировать кабинет',
      subtitle: 'Изменение данных кабинета',
      icon: PencilSquareIcon,
      gradientFrom: 'green-500', // Соответствует странице кабинетов
      gradientTo: 'emerald-600',
      submitText: 'Сохранить изменения',
      loadingText: 'Сохранение...'
    },
    view: {
      title: 'Информация о кабинете',
      subtitle: 'Просмотр данных кабинета',
      icon: HomeIcon,
      gradientFrom: 'green-500',
      gradientTo: 'emerald-600',
      submitText: 'Закрыть',
      loadingText: 'Загрузка...'
    }
  },
  subject: {
    create: {
      title: 'Добавить предмет',
      subtitle: 'Создание нового предмета',
      icon: BookOpenIcon,
      gradientFrom: 'blue-500', // Соответствует странице предметов
      gradientTo: 'purple-600',
      submitText: 'Создать предмет',
      loadingText: 'Создание...'
    },
    edit: {
      title: 'Редактировать предмет',
      subtitle: 'Изменение данных предмета',
      icon: PencilSquareIcon,
      gradientFrom: 'blue-500', // Соответствует странице предметов
      gradientTo: 'purple-600',
      submitText: 'Сохранить изменения',
      loadingText: 'Сохранение...'    },
    view: {
      title: 'Информация о предмете',
      subtitle: 'Просмотр данных предмета',
      icon: BookOpenIcon,
      gradientFrom: 'orange-500',
      gradientTo: 'amber-600',
      submitText: 'Закрыть',
      loadingText: 'Загрузка...'    }
  },
  group: {
    create: {
      title: 'Добавить группу',
      subtitle: 'Создание новой группы',
      icon: UserGroupIcon,
      gradientFrom: 'teal-500', // Соответствует странице групп
      gradientTo: 'cyan-600',
      submitText: 'Создать группу',
      loadingText: 'Создание...'
    },
    edit: {
      title: 'Редактировать группу',
      subtitle: 'Изменение данных группы',
      icon: PencilSquareIcon,
      gradientFrom: 'teal-500', // Соответствует странице групп
      gradientTo: 'cyan-600',
      submitText: 'Сохранить изменения',
      loadingText: 'Сохранение...'
    },
    view: {
      title: 'Информация о группе',
      subtitle: 'Просмотр данных группы',
      icon: UserGroupIcon,
      gradientFrom: 'teal-500',
      gradientTo: 'cyan-600',
      submitText: 'Закрыть',
      loadingText: 'Загрузка...'
    }
  },
  organization: {
    create: {
      title: 'Добавить организацию',
      subtitle: 'Создание новой организации',
      icon: BuildingOfficeIcon,
      gradientFrom: 'indigo-500', // Соответствует странице организаций
      gradientTo: 'purple-600',
      submitText: 'Создать организацию',
      loadingText: 'Создание...'
    },
    edit: {
      title: 'Редактировать организацию',
      subtitle: 'Изменение данных организации',
      icon: PencilSquareIcon,
      gradientFrom: 'indigo-500', // Соответствует странице организаций
      gradientTo: 'purple-600',
      submitText: 'Сохранить изменения',
      loadingText: 'Сохранение...'
    },
    view: {
      title: 'Информация об организации',
      subtitle: 'Просмотр данных организации',
      icon: BuildingOfficeIcon,
      gradientFrom: 'indigo-500',
      gradientTo: 'purple-600',
      submitText: 'Закрыть',
      loadingText: 'Загрузка...'
    }
  },
  schedule: {
    create: {
      title: 'Создать шаблон расписания',
      subtitle: 'Добавление нового шаблона расписания',
      icon: CalendarDaysIcon,
      gradientFrom: 'violet-500', // Соответствует странице расписаний
      gradientTo: 'purple-600',
      submitText: 'Создать шаблон',
      loadingText: 'Создание...'
    },
    edit: {
      title: 'Редактировать шаблон',
      subtitle: 'Изменение шаблона расписания',
      icon: PencilSquareIcon,
      gradientFrom: 'violet-500', // Соответствует странице расписаний
      gradientTo: 'purple-600',
      submitText: 'Сохранить изменения',
      loadingText: 'Сохранение...'
    },
    view: {
      title: 'Информация о расписании',
      subtitle: 'Просмотр данных расписания',
      icon: CalendarDaysIcon,
      gradientFrom: 'violet-500',
      gradientTo: 'purple-600',
      submitText: 'Закрыть',
      loadingText: 'Загрузка...'
    }
  }
};

export type EntityType = keyof typeof modalConfigs;
export type ModalMode = 'create' | 'edit' | 'view';