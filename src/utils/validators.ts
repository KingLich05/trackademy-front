// Универсальные валидаторы для разных типов сущностей
import { UserFormData } from '../types/User';
import { RoomFormData } from '../types/Room';
import { SubjectFormData } from '../types/Subject';
import { GroupFormData } from '../types/Group';
import { OrganizationFormData } from '../types/Organization';

export const createUserValidator = (data: UserFormData & { id?: string }) => {
  const errors: Record<string, string> = {};

  if (!data.login?.trim()) {
    errors.login = 'Логин обязателен';
  } else if (data.login.length < 3) {
    errors.login = 'Логин должен содержать минимум 3 символа';
  }

  if (!data.fullName?.trim()) {
    errors.fullName = 'Полное имя обязательно';
  }

  if (!data.password && !data.id) { // password required only for create
    errors.password = 'Пароль обязателен';
  } else if (data.password && data.password.length < 6) {
    errors.password = 'Пароль должен содержать минимум 6 символов';
  }

  if (!data.phone?.trim()) {
    errors.phone = 'Номер телефона обязателен';
  }

  // Телефон родителя теперь необязательный для студентов
  // if (data.role === 1 && !data.parentPhone?.trim()) {
  //   errors.parentPhone = 'Номер телефона родителя обязателен для студентов';
  // }

  return errors;
};

export const createRoomValidator = (data: RoomFormData) => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Название кабинета обязательно';
  }

  if (!data.capacity || data.capacity < 1) {
    errors.capacity = 'Вместимость должна быть больше 0';
  }

  return errors;
};

export const createSubjectValidator = (data: SubjectFormData) => {
  const errors: Record<string, string> = {};

  // Проверка названия (обязательно, макс 200 символов)
  if (!data.name?.trim()) {
    errors.name = 'Название предмета обязательно';
  } else if (data.name.length > 200) {
    errors.name = 'Название не должно превышать 200 символов';
  }

  // Проверка описания (опционально, макс 1000 символов)
  if (data.description && data.description.length > 1000) {
    errors.description = 'Описание не должно превышать 1000 символов';
  }

  // Проверка цены (>= 0)
  if (data.price === undefined || data.price === null || data.price < 0) {
    errors.price = 'Цена обязательна и должна быть неотрицательной';
  }

  // Проверка типа оплаты (1, 2)
  const paymentTypeNum = Number(data.paymentType);
  if (paymentTypeNum === undefined || paymentTypeNum === null || ![1, 2].includes(paymentTypeNum)) {
    errors.paymentType = 'Выберите корректный тип оплаты';
  }

  // Проверка уроков в месяц (для ежемесячного типа)
  if (paymentTypeNum === 1 && (!data.lessonsPerMonth || data.lessonsPerMonth <= 0)) {
    errors.lessonsPerMonth = 'Количество уроков в месяц должно быть больше 0';
  }

  // Проверка общего количества уроков (для единоразового типа)
  if (paymentTypeNum === 2 && (!data.totalLessons || data.totalLessons <= 0)) {
    errors.totalLessons = 'Общее количество уроков должно быть больше 0';
  }

  // Проверка organizationId (UUID)
  if (!data.organizationId?.trim()) {
    errors.organizationId = 'ID организации обязателен';
  }

  return errors;
};

export const createGroupValidator = (data: Record<string, unknown>) => {
  const errors: Record<string, string> = {};

  const formData = data as unknown as GroupFormData;

  // Название, код и уровень группы не обязательны
  // if (!formData.name?.trim()) {
  //   errors.name = 'Название группы обязательно';
  // }

  // if (!formData.code?.trim()) {
  //   errors.code = 'Код группы обязателен';
  // }

  // if (!formData.level?.trim()) {
  //   errors.level = 'Уровень обязателен';
  // }

  if (!formData.subjectId?.trim()) {
    errors.subjectId = 'Предмет обязателен';
  }

  // Студенты не обязательны, но могут быть добавлены позже
  // if (!formData.studentIds || formData.studentIds.length === 0) {
  //   errors.studentIds = 'Выберите хотя бы одного студента';
  // }

  return errors;
};

export const createOrganizationValidator = (data: OrganizationFormData) => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Название организации обязательно';
  }

  if (!data.address?.trim()) {
    errors.address = 'Адрес обязателен';
  }

  return errors;
};