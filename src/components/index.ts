// Универсальная система модальных окон
export { default as UniversalModal } from './ui/UniversalModal';
export { useUniversalModal } from '../hooks/useUniversalModal';
export { modalConfigs } from '../config/modalConfigs';
export type { EntityType, ModalMode } from '../config/modalConfigs';

// Готовые формы для использования
export { UserForm } from './forms/UserForm';
export { RoomForm, SubjectForm, GroupForm } from './forms';

// Валидаторы
export { 
  createUserValidator, 
  createRoomValidator, 
  createSubjectValidator, 
  createGroupValidator,
  createOrganizationValidator 
} from '../utils/validators';

// Экспорт модальных окон
export { ExportAttendanceModal } from './ExportAttendanceModal';
export { FreezeStudentModal } from './FreezeStudentModal';
export { AddBalanceModal } from './AddBalanceModal';
export { DiscountModal } from './DiscountModal';