'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Group } from '../types/Group';
import { Subject } from '../types/Subject';
import { User } from '../types/User';
import { Room } from '../types/Room';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { MultiSelect } from './ui/MultiSelect';

// Legacy flat form data shape (this component is not currently in use)
interface LegacyScheduleFormData {
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  effectiveFrom: string | null;
  effectiveTo?: string | null;
  groupId: string | null;
  teacherId: string | null;
  roomId: string | null;
  organizationId: string;
}

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: LegacyScheduleFormData) => Promise<void>;
  organizationId: string;
}

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  organizationId
}) => {
  const [formData, setFormData] = useState<LegacyScheduleFormData>({
    daysOfWeek: [],
    startTime: null,
    endTime: null,
    effectiveFrom: new Date().toISOString().split('T')[0], // Today's date
    effectiveTo: null,
    groupId: null,
    teacherId: null,
    roomId: null,
    organizationId: organizationId
  });

  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Days of week options for MultiSelect
  const daysOfWeekOptions = [
    { id: '1', name: 'Понедельник' },
    { id: '2', name: 'Вторник' },
    { id: '3', name: 'Среда' },
    { id: '4', name: 'Четверг' },
    { id: '5', name: 'Пятница' },
    { id: '6', name: 'Суббота' },
    { id: '7', name: 'Воскресенье' }
  ];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        daysOfWeek: [],
        startTime: '',
        endTime: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        groupId: '',
        teacherId: '',
        roomId: '',
        organizationId: organizationId
      });
      loadData();
      setError(null);
    }
  }, [isOpen, organizationId]);

  const loadData = async () => {
    try {
      const [groupsData, subjectsData, teachersData, roomsData] = await Promise.all([
        // Load groups
        AuthenticatedApiService.post('/Group/get-groups', {
          pageNumber: 1,
          pageSize: 1000,
          organizationId: organizationId
        }),
        // Load subjects
        AuthenticatedApiService.post('/Subject/GetAllSubjects', {
          pageNumber: 1,
          pageSize: 1000,
          organizationId: organizationId
        }),
        // Load teachers (role 3)
        AuthenticatedApiService.getUsers({
          organizationId: organizationId,
          pageNumber: 1,
          pageSize: 1000,
          roleIds: [3] // Teachers only
        }),
        // Load rooms
        AuthenticatedApiService.post('/Room/GetAllRooms', {
          pageNumber: 1,
          pageSize: 1000,
          organizationId: organizationId
        })
      ]);

      setGroups((groupsData as { items: Group[] }).items || []);
      setTeachers(teachersData.items || []);
      setRooms((roomsData as { items: Room[] }).items || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Не удалось загрузить данные');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.daysOfWeek.length === 0) {
      setError('Выберите дни недели');
      return;
    }
    if (!formData.startTime) {
      setError('Укажите время начала');
      return;
    }
    if (!formData.endTime) {
      setError('Укажите время окончания');
      return;
    }
    if (!formData.effectiveFrom) {
      setError('Укажите дату начала действия');
      return;
    }
    if (!formData.groupId) {
      setError('Выберите группу');
      return;
    }
    if (!formData.teacherId) {
      setError('Выберите преподавателя');
      return;
    }
    if (!formData.roomId) {
      setError('Выберите кабинет');
      return;
    }

    // Time validation
    if (formData.startTime >= formData.endTime) {
      setError('Время начала должно быть раньше времени окончания');
      return;
    }

    try {
      setLoading(true);
      
      // Convert time to HH:MM:SS format and handle null values
      const submitData = {
        ...formData,
        startTime: formData.startTime ? formData.startTime + ':00' : null,
        endTime: formData.endTime ? formData.endTime + ':00' : null,
        effectiveFrom: formData.effectiveFrom || null,
        effectiveTo: formData.effectiveTo || null,
        groupId: formData.groupId || null,
        teacherId: formData.teacherId || null,
        roomId: formData.roomId || null
      };

      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Error creating schedule:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при создании шаблона расписания');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LegacyScheduleFormData, value: string | string[]) => {
    // Convert empty strings to null for nullable fields
    const processedValue = typeof value === 'string' && value === '' ? null : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  const handleDaysOfWeekChange = (selectedDays: string[]) => {
    const daysAsNumbers = selectedDays.map(day => parseInt(day, 10));
    setFormData(prev => ({
      ...prev,
      daysOfWeek: daysAsNumbers
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <CalendarDaysIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Создать шаблон расписания</h3>
                <p className="text-sm text-gray-500">Добавьте новый шаблон в систему</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Days of Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дни недели *
              </label>
              <MultiSelect
                options={daysOfWeekOptions}
                selectedValues={formData.daysOfWeek.map(day => day.toString())}
                onChange={handleDaysOfWeekChange}
                placeholder="Выберите дни недели..."
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Time */}
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Время начала *
                </label>
                <input
                  type="time"
                  id="startTime"
                  value={formData.startTime ?? ''}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* End Time */}
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Время окончания *
                </label>
                <input
                  type="time"
                  id="endTime"
                  value={formData.endTime ?? ''}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Effective From */}
              <div>
                <label htmlFor="effectiveFrom" className="block text-sm font-medium text-gray-700 mb-2">
                  Действует с *
                </label>
                <input
                  type="date"
                  id="effectiveFrom"
                  value={formData.effectiveFrom ?? ''}
                  onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Effective To */}
              <div>
                <label htmlFor="effectiveTo" className="block text-sm font-medium text-gray-700 mb-2">
                  Действует до
                </label>
                <input
                  type="date"
                  id="effectiveTo"
                  value={formData.effectiveTo ?? ''}
                  onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Group */}
            <div>
              <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
                Группа *
              </label>
              <select
                id="groupId"
                value={formData.groupId ?? ''}
                onChange={(e) => handleInputChange('groupId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Выберите группу</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher */}
            <div>
              <label htmlFor="teacher" className="block text-sm font-medium text-gray-700 mb-2">
                Преподаватель *
              </label>
              <select
                id="teacherId"
                value={formData.teacherId ?? ''}
                onChange={(e) => handleInputChange('teacherId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Выберите преподавателя</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Room */}
            <div>
              <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-2">
                Кабинет *
              </label>
              <select
                id="roomId"
                value={formData.roomId ?? ''}
                onChange={(e) => handleInputChange('roomId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Выберите кабинет</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Создание...' : 'Создать шаблон'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateScheduleModal;